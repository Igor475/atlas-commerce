export const orderUuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export type OrdersCode =
  | "INVALID_PREPARATION"
  | "PREPARATION_CONFLICT"
  | "PREPARATION_NOT_ELIGIBLE"
  | "RESOURCE_NOT_FOUND"
  | "UNAUTHENTICATED"
  | "ORDERS_UNAVAILABLE";
export class OrdersError extends Error {
  constructor(readonly code: OrdersCode) {
    super(code);
  }
}
export interface PreparationRequest {
  key: string;
  items: readonly { id: string; quantity: number }[];
}
export interface PreparedOrderIntent {
  id: string;
  kind: "TEST_ONLY_PREPARATION";
  baseSubtotal: { currency: "BRL"; amountCents: number };
  reservationExpiresAt: string | null;
  lines: readonly {
    productId: string;
    sku: string;
    title: string;
    productType: string;
    editionId: string | null;
    quantity: number;
    baseUnitCents: number;
    components: readonly {
      productId: string;
      sku: string;
      title: string;
      productType: string;
      editionId: string;
      quantity: number;
    }[];
  }[];
}
export function preparationRequest(
  input: PreparationRequest,
): PreparationRequest {
  if (
    !input ||
    typeof input !== "object" ||
    Object.keys(input).some((k) => !["key", "items"].includes(k)) ||
    !orderUuid.test(input.key) ||
    !Array.isArray(input.items) ||
    !input.items.length ||
    input.items.length > 100
  )
    throw new OrdersError("INVALID_PREPARATION");
  const lines = new Map<string, number>();
  for (const item of input.items) {
    if (
      !item ||
      typeof item !== "object" ||
      Object.keys(item).some((k) => !["id", "quantity"].includes(k)) ||
      !orderUuid.test(item.id) ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 9999
    )
      throw new OrdersError("INVALID_PREPARATION");
    const n = (lines.get(item.id) ?? 0) + item.quantity;
    if (n > 9999) throw new OrdersError("INVALID_PREPARATION");
    lines.set(item.id, n);
  }
  return {
    key: input.key,
    items: [...lines]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, quantity]) => ({ id, quantity })),
  };
}
export function validateProjection(
  result: PreparedOrderIntent,
): PreparedOrderIntent {
  if (
    !result ||
    !orderUuid.test(result.id) ||
    result.kind !== "TEST_ONLY_PREPARATION" ||
    result.baseSubtotal?.currency !== "BRL" ||
    !Number.isSafeInteger(result.baseSubtotal.amountCents) ||
    result.baseSubtotal.amountCents < 1 ||
    !Array.isArray(result.lines) ||
    !result.lines.length ||
    !Object.hasOwn(result, "reservationExpiresAt")
  )
    throw new OrdersError("ORDERS_UNAVAILABLE");
  let physical = false,
    subtotal = 0n;
  for (const line of result.lines) {
    if (
      !line ||
      !orderUuid.test(line.productId) ||
      typeof line.sku !== "string" ||
      !line.sku ||
      typeof line.title !== "string" ||
      !line.title ||
      !Number.isSafeInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 9999 ||
      !Number.isSafeInteger(line.baseUnitCents) ||
      line.baseUnitCents < 1 ||
      !["PHYSICAL_BOOK", "EBOOK", "DIGITAL_MAGAZINE", "KIT"].includes(
        line.productType,
      ) ||
      !Array.isArray(line.components)
    )
      throw new OrdersError("ORDERS_UNAVAILABLE");
    if (
      line.productType === "KIT"
        ? line.editionId !== null || !line.components.length
        : !orderUuid.test(line.editionId ?? "") || line.components.length !== 0
    )
      throw new OrdersError("ORDERS_UNAVAILABLE");
    for (const component of line.components) {
      if (
        !component ||
        !orderUuid.test(component.productId) ||
        !orderUuid.test(component.editionId) ||
        !["PHYSICAL_BOOK", "EBOOK", "DIGITAL_MAGAZINE"].includes(
          component.productType,
        ) ||
        !Number.isSafeInteger(component.quantity) ||
        component.quantity < 1 ||
        component.quantity > 9999 ||
        typeof component.sku !== "string" ||
        !component.sku ||
        typeof component.title !== "string" ||
        !component.title
      )
        throw new OrdersError("ORDERS_UNAVAILABLE");
    }
    subtotal += BigInt(line.quantity) * BigInt(line.baseUnitCents);
    physical ||=
      line.productType === "PHYSICAL_BOOK" ||
      line.components.some(
        (c: PreparedOrderIntent["lines"][number]["components"][number]) =>
          c.productType === "PHYSICAL_BOOK",
      );
  }
  if (
    subtotal !== BigInt(result.baseSubtotal.amountCents) ||
    (physical
      ? typeof result.reservationExpiresAt !== "string" ||
        !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(
          result.reservationExpiresAt,
        ) ||
        Number.isNaN(Date.parse(result.reservationExpiresAt))
      : result.reservationExpiresAt !== null)
  )
    throw new OrdersError("ORDERS_UNAVAILABLE");
  return result;
}
