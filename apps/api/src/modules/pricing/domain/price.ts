export const MAX_CENTS = 9007199254740991n;
export class PricingUnavailable extends Error {
  constructor() {
    super("DEPENDENCY_UNAVAILABLE");
  }
}
export interface BasePrice {
  currency: "BRL";
  amountCents: number;
  source: string;
}
export interface PriceRow {
  productId: string;
  amountCents: bigint;
  currency: string;
  source: string;
}
export function publicPrice(row: PriceRow): BasePrice {
  if (
    typeof row.amountCents !== "bigint" ||
    row.amountCents < 0n ||
    row.amountCents > MAX_CENTS ||
    row.currency !== "BRL" ||
    typeof row.source !== "string" ||
    !/^[A-Za-z0-9._:-]{1,80}$/.test(row.source)
  )
    throw new PricingUnavailable();
  // Zero is representable money, but a free-product policy is NOT authorized by PRIC-01.
  if (row.amountCents === 0n) throw new PricingUnavailable();
  return {
    currency: "BRL",
    amountCents: Number(row.amountCents),
    source: row.source,
  };
}
