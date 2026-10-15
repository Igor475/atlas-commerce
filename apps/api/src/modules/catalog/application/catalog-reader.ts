import {
  CatalogError,
  validPrice,
  type EditorialProduct,
  type PublicPrice,
} from "../domain/catalog.js";
export interface CatalogRepository {
  page(after: string | null, limit: number): Promise<EditorialProduct[]>;
  get(id: string): Promise<EditorialProduct | undefined>;
  close(): Promise<void>;
}
export interface PublicPricing {
  read(ids: readonly string[]): Promise<ReadonlyMap<string, PublicPrice>>;
}
export class CatalogReader {
  constructor(
    private readonly repository: CatalogRepository,
    private readonly pricing: PublicPricing,
  ) {}
  private async project(products: EditorialProduct[]) {
    const prices = await this.pricing.read(products.map((p) => p.id));
    return products.map((p) => {
      const price = prices.get(p.id);
      validPrice(price);
      // Text stays data in JSON; consumers must use contextual escaping, never innerHTML.
      return {
        id: p.id,
        title: p.title,
        productType: p.productType,
        price: { currency: price.currency, amountCents: price.amountCents },
        previewAvailable: false,
        description: p.description,
      };
    });
  }
  async page(after: string | null, limit: number) {
    const rows = await this.repository.page(after, limit + 1);
    return {
      items: await this.project(rows.slice(0, limit)),
      last: rows.length > limit ? rows[limit - 1]!.id : null,
    };
  }
  async get(id: string) {
    const row = await this.repository.get(id);
    if (!row) throw new CatalogError("RESOURCE_NOT_FOUND");
    return (await this.project([row]))[0]!;
  }
}
