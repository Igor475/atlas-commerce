export const quoteUuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export class QuoteError extends Error {
  constructor(
    readonly code:
      | "INVALID_QUOTE"
      | "COUPON_UNSUPPORTED"
      | "QUOTE_UNAVAILABLE"
      | "QUOTE_REJECTED"
      | "RESOURCE_NOT_FOUND"
      | "UNAUTHENTICATED",
  ) {
    super(code);
  }
}
export interface QuoteRequest {
  items: readonly { productId: string; quantity: number }[];
  couponCode?: string;
  shippingAddressId?: string;
}
export interface QuoteResult {
  quoteId: string;
  expiresAt: string;
  total: { currency: "BRL"; amountCents: number };
  note?: string;
}
export function quoteRequest(input: QuoteRequest) {
  if (
    !input ||
    typeof input !== "object" ||
    Object.keys(input).some(
      (k) => !["items", "couponCode", "shippingAddressId"].includes(k),
    )
  )
    throw new QuoteError("INVALID_QUOTE");
  if (Object.hasOwn(input, "couponCode"))
    throw new QuoteError("COUPON_UNSUPPORTED");
  if (
    Object.hasOwn(input, "shippingAddressId") &&
    !quoteUuid.test(input.shippingAddressId ?? "")
  )
    throw new QuoteError("INVALID_QUOTE");
  if (
    !Array.isArray(input.items) ||
    input.items.length < 1 ||
    input.items.length > 100
  )
    throw new QuoteError("INVALID_QUOTE");
  const quantities = new Map<string, number>();
  for (const item of input.items) {
    if (
      !item ||
      typeof item !== "object" ||
      Object.keys(item).some((k) => !["productId", "quantity"].includes(k)) ||
      !quoteUuid.test(item.productId) ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 9999
    )
      throw new QuoteError("INVALID_QUOTE");
    const n = (quantities.get(item.productId) ?? 0) + item.quantity;
    if (n > 9999) throw new QuoteError("INVALID_QUOTE");
    quantities.set(item.productId, n);
  }
  return {
    items: [...quantities]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, quantity]) => ({ id, quantity })),
    addressId: input.shippingAddressId ?? null,
  };
}
export function quoteProjection(result: QuoteResult) {
  if (
    !result ||
    !quoteUuid.test(result.quoteId) ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(result.expiresAt) ||
    Number.isNaN(Date.parse(result.expiresAt)) ||
    result.total?.currency !== "BRL" ||
    !Number.isSafeInteger(result.total.amountCents) ||
    result.total.amountCents < 1
  )
    throw new QuoteError("QUOTE_UNAVAILABLE");
  return result;
}
