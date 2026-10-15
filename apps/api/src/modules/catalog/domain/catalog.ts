export const productTypes = [
  "PHYSICAL_BOOK",
  "EBOOK",
  "DIGITAL_MAGAZINE",
  "KIT",
] as const;
export type ProductType = (typeof productTypes)[number];
export type CatalogCode =
  | "INVALID_REQUEST"
  | "RESOURCE_NOT_FOUND"
  | "DEPENDENCY_UNAVAILABLE"
  | "RATE_LIMITED";
export class CatalogError extends Error {
  constructor(readonly code: CatalogCode) {
    super(code);
  }
}
export interface EditorialProduct {
  id: string;
  title: string;
  productType: ProductType;
  description: string;
}
export interface PublicPrice {
  currency: "BRL";
  amountCents: number;
  source: string;
}
export function validPrice(
  value: PublicPrice | undefined,
): asserts value is PublicPrice {
  if (
    !value ||
    value.currency !== "BRL" ||
    !Number.isSafeInteger(value.amountCents) ||
    value.amountCents < 0 ||
    !/^[A-Za-z0-9._:-]{1,80}$/.test(value.source)
  )
    throw new CatalogError("DEPENDENCY_UNAVAILABLE");
}
// Technical boundary for simple kits; nested kits require a separate decision.
export function validateComposition(
  kitId: string,
  components: { id: string; type: ProductType; quantity: number }[],
): void {
  if (
    !components.length ||
    components.length > 100 ||
    new Set(components.map((c) => c.id)).size !== components.length ||
    components.some(
      (c) =>
        c.id === kitId ||
        c.type === "KIT" ||
        !Number.isSafeInteger(c.quantity) ||
        c.quantity < 1 ||
        c.quantity > 9999,
    )
  )
    throw new CatalogError("INVALID_REQUEST");
}
