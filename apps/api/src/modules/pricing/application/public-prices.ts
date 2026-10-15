import {
  PricingUnavailable,
  publicPrice,
  type BasePrice,
  type PriceRow,
} from "../domain/price.js";
export const PUBLIC_BASE_PRICING = Symbol("PUBLIC_BASE_PRICING");
export interface PriceRepository {
  current(ids: readonly string[]): Promise<PriceRow[]>;
  close(): Promise<void>;
}
export interface PublicBasePricing {
  read(ids: readonly string[]): Promise<ReadonlyMap<string, BasePrice>>;
}
export class PublicPrices implements PublicBasePricing {
  constructor(private readonly repository: PriceRepository) {}
  async read(ids: readonly string[]): Promise<ReadonlyMap<string, BasePrice>> {
    if (
      ids.length > 100 ||
      new Set(ids).size !== ids.length ||
      ids.some(
        (id) =>
          !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
            id,
          ),
      )
    )
      throw new PricingUnavailable();
    if (!ids.length) return new Map();
    const rows = await this.repository.current(ids),
      result = new Map<string, BasePrice>();
    for (const row of rows) {
      if (!ids.includes(row.productId) || result.has(row.productId))
        throw new PricingUnavailable();
      result.set(row.productId, publicPrice(row));
    }
    if (result.size !== ids.length) throw new PricingUnavailable();
    return result;
  }
}
