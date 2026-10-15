import { createHash } from "node:crypto";
import {
  expand,
  validateIntent,
  InventoryError,
  uuid,
  type Intent,
  type Offer,
  type PhysicalLine,
  type ReservationResult,
} from "../domain/inventory.js";
// Only a server-owned Catalog application adapter may supply eligible, published composition.
export interface AuthorizedComposition {
  read(ids: readonly string[]): Promise<ReadonlyMap<string, Offer>>;
}
export interface InventoryStore {
  reserve(
    intent: Intent,
    fingerprint: string,
    lines: readonly PhysicalLine[],
  ): Promise<ReservationResult>;
  expire(id: string): Promise<ReservationResult>;
  close(): Promise<void>;
}
export interface TrustedDecision {
  decide(
    id: string,
    action: "CONFIRMED" | "RELEASED",
  ): Promise<{ ref: string; permitted: boolean }>;
  apply(
    id: string,
    action: "CONFIRMED" | "RELEASED",
    ref: string,
  ): Promise<ReservationResult>;
}
export class InventoryService {
  constructor(
    private readonly store: InventoryStore,
    private readonly catalog: AuthorizedComposition,
    private readonly decision?: TrustedDecision,
  ) {}
  async reserve(intent: Intent) {
    validateIntent(intent);
    // Snapshot the server-owned invocation before the asynchronous Catalog boundary.
    intent = {
      key: intent.key,
      commercialRef: intent.commercialRef,
      items: intent.items.map((i) => ({ ...i })),
    };
    const ids = [...new Set(intent.items.map((i) => i.id))].sort();
    const offers = await this.catalog.read(ids);
    const lines = expand(intent, offers);
    const content = {
      commercialRef: intent.commercialRef,
      items: [...intent.items].sort(
        (a, b) => a.id.localeCompare(b.id) || a.quantity - b.quantity,
      ),
      offers: ids.map((id) => offers.get(id)),
      lines,
    };
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(content))
      .digest("hex");
    return this.store.reserve(intent, fingerprint, lines);
  }
  expire(id: string) {
    return this.store.expire(id);
  }
  async transition(id: string, action: "CONFIRMED" | "RELEASED") {
    if (
      !this.decision ||
      !uuid.test(id) ||
      !["CONFIRMED", "RELEASED"].includes(action)
    )
      throw new InventoryError("DECISION_DENIED");
    const decision = await this.decision.decide(id, action);
    if (!decision.permitted) throw new InventoryError("DECISION_DENIED");
    const result = await this.decision.apply(id, action, decision.ref);
    if (result.state === "REFUSED")
      throw new InventoryError("RESERVATION_REFUSED");
    return result;
  }
  close() {
    return this.store.close();
  }
  onModuleDestroy() {
    return this.close();
  }
}
