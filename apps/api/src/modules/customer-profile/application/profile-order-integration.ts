import {
  quoteRequest,
  type QuoteRequest,
  type QuoteResult,
} from "../../quotes/domain/quote.js";
import type { QuotePolicy } from "../../quotes/application/checkout-quotes.js";
import type { PreparedOrderIntent } from "../../orders/domain/preparation.js";
import { cpUuid, type AddressSnapshot } from "../domain/address.js";
export class IntegrationError extends Error {
  constructor(
    readonly code:
      | "INVALID_REQUEST"
      | "UNAUTHENTICATED"
      | "RESOURCE_NOT_FOUND"
      | "STALE_INPUT"
      | "CONFLICT"
      | "INTEGRATION_UNAVAILABLE",
  ) {
    super(code);
  }
}
export interface IntegrationPrincipal {
  actorId: string;
  eligible: true;
  sessionClass: "CUSTOMER";
  evidence: "CPINT_TEST_ONLY";
}
export interface IntegratedPreparation {
  preparation: PreparedOrderIntent;
  addressSnapshot: AddressSnapshot | null;
}
export interface IntegratedProfileStore {
  issue(
    actor: string,
    input: ReturnType<typeof quoteRequest>,
    policy: string,
    option: string | null,
  ): Promise<QuoteResult>;
  quote(actor: string, id: string): Promise<QuoteResult>;
  prepare(
    actor: string,
    key: string,
    quote: string,
  ): Promise<IntegratedPreparation>;
  read(actor: string, id: string): Promise<IntegratedPreparation>;
  close(): Promise<void>;
}
export class ProfileOrderIntegration {
  constructor(
    private readonly store: IntegratedProfileStore,
    private readonly identity: { current(): Promise<IntegrationPrincipal> },
    private readonly policy: QuotePolicy,
  ) {}
  private async actor() {
    const p = await this.identity.current();
    if (
      !p ||
      !cpUuid.test(p.actorId) ||
      p.eligible !== true ||
      p.sessionClass !== "CUSTOMER" ||
      p.evidence !== "CPINT_TEST_ONLY"
    )
      throw new IntegrationError("UNAUTHENTICATED");
    return p.actorId;
  }
  async issue(request: QuoteRequest) {
    const input = quoteRequest(request),
      actor = await this.actor(),
      policy = await this.policy.authorize(actor);
    if (
      policy?.purpose !== "TEST_ONLY" ||
      !cpUuid.test(policy.policyId) ||
      (policy.option !== null && !/^TEST_[A-Z_]{1,40}$/.test(policy.option))
    )
      throw new IntegrationError("INVALID_REQUEST");
    return this.store.issue(actor, input, policy.policyId, policy.option);
  }
  async prepare(request: { key: string; quoteId: string }) {
    if (
      !request ||
      Object.keys(request).some((k) => !["key", "quoteId"].includes(k)) ||
      !cpUuid.test(request.key) ||
      !cpUuid.test(request.quoteId)
    )
      throw new IntegrationError("INVALID_REQUEST");
    return this.store.prepare(await this.actor(), request.key, request.quoteId);
  }
  async read(id: string) {
    if (!cpUuid.test(id)) throw new IntegrationError("RESOURCE_NOT_FOUND");
    return this.store.read(await this.actor(), id);
  }
  async quote(id: string) {
    if (!cpUuid.test(id)) throw new IntegrationError("RESOURCE_NOT_FOUND");
    return this.store.quote(await this.actor(), id);
  }
  close() {
    return this.store.close();
  }
}
