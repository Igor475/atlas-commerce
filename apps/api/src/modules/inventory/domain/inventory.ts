export type InventoryCode =
  | "INVALID_INTENT"
  | "INTENT_CONFLICT"
  | "INSUFFICIENT_STOCK"
  | "DECISION_DENIED"
  | "RESERVATION_REFUSED"
  | "INVENTORY_UNAVAILABLE";
export class InventoryError extends Error {
  constructor(readonly code: InventoryCode) {
    super(code);
  }
}
export const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export interface PhysicalLine {
  sku: string;
  quantity: number;
}
export interface Offer {
  id: string;
  type: "PHYSICAL_BOOK" | "EBOOK" | "DIGITAL_MAGAZINE" | "KIT";
  version: number;
  components?: readonly {
    id: string;
    type: "PHYSICAL_BOOK" | "EBOOK" | "DIGITAL_MAGAZINE";
    quantity: number;
  }[];
}
export interface Intent {
  key: string;
  commercialRef: string;
  items: readonly { id: string; quantity: number }[];
}
export interface ReservationResult {
  id: string | null;
  state:
    "ACTIVE" | "CONFIRMED" | "EXPIRED" | "RELEASED" | "NO_PHYSICAL" | "REFUSED";
  expiresAt: string | null;
}
function quantity(n: number) {
  if (!Number.isSafeInteger(n) || n < 1 || n > 2147483647)
    throw new InventoryError("INVALID_INTENT");
  return n;
}
export function validateIntent(intent: Intent) {
  if (
    !intent ||
    typeof intent !== "object" ||
    !uuid.test(intent.key) ||
    !uuid.test(intent.commercialRef) ||
    !Array.isArray(intent.items) ||
    !intent.items.length ||
    intent.items.length > 100
  )
    throw new InventoryError("INVALID_INTENT");
  for (const item of intent.items) {
    if (!item || !uuid.test(item.id))
      throw new InventoryError("INVALID_INTENT");
    quantity(item.quantity);
  }
}
export function expand(
  intent: Intent,
  offers: ReadonlyMap<string, Offer>,
): PhysicalLine[] {
  validateIntent(intent);
  const totals = new Map<string, number>();
  const add = (id: string, n: number) => {
    if (!uuid.test(id)) throw new InventoryError("INVALID_INTENT");
    totals.set(id, quantity((totals.get(id) ?? 0) + quantity(n)));
  };
  for (const item of intent.items) {
    const offer = offers.get(item.id);
    if (!offer || offer.id !== item.id || offer.version !== 1)
      throw new InventoryError("INVALID_INTENT");
    if (offer.type === "KIT") {
      const c = offer.components;
      if (
        !Array.isArray(c) ||
        !c.length ||
        c.length > 100 ||
        c.some((part) => !part) ||
        new Set(c.map((v) => v.id)).size !== c.length
      )
        throw new InventoryError("INVALID_INTENT");
      for (const part of c) {
        if (
          !part ||
          !uuid.test(part.id) ||
          part.id === offer.id ||
          !["PHYSICAL_BOOK", "EBOOK", "DIGITAL_MAGAZINE"].includes(part.type)
        )
          throw new InventoryError("INVALID_INTENT");
        quantity(part.quantity);
        if (part.type === "PHYSICAL_BOOK")
          add(part.id, quantity(item.quantity * part.quantity));
      }
    } else if (offer.type === "PHYSICAL_BOOK") {
      if (offer.components !== undefined)
        throw new InventoryError("INVALID_INTENT");
      add(offer.id, item.quantity);
    } else if (
      !["EBOOK", "DIGITAL_MAGAZINE"].includes(offer.type) ||
      offer.components !== undefined
    )
      throw new InventoryError("INVALID_INTENT");
  }
  if (totals.size > 100) throw new InventoryError("INVALID_INTENT");
  return [...totals]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sku, n]) => ({ sku, quantity: n }));
}
