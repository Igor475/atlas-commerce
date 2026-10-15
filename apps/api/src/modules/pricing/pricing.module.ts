import { Module, type OnModuleDestroy } from "@nestjs/common";
import {
  PUBLIC_BASE_PRICING,
  PublicPrices,
  type PublicBasePricing,
} from "./application/public-prices.js";
import { PricingUnavailable } from "./domain/price.js";
import { PricingDatabase } from "./infrastructure/pricing-database.js";
import { pricingEnabled } from "./infrastructure/pricing-config.js";
class PricingRuntime implements PublicBasePricing, OnModuleDestroy {
  private readonly reader?: PublicPrices;
  constructor(private readonly repository?: PricingDatabase) {
    if (repository) this.reader = new PublicPrices(repository);
  }
  async read(ids: readonly string[]) {
    if (!this.reader) throw new PricingUnavailable();
    return this.reader.read(ids);
  }
  async onModuleDestroy() {
    await this.repository?.close();
  }
}
export function composePricing(
  env: NodeJS.ProcessEnv,
): PublicBasePricing & OnModuleDestroy {
  return new PricingRuntime(
    pricingEnabled(env)
      ? new PricingDatabase(env.PRICING_RUNTIME_URL!, env.PRICING_CONSENT)
      : undefined,
  );
}
@Module({
  providers: [
    {
      provide: PUBLIC_BASE_PRICING,
      useFactory: () => composePricing(process.env),
    },
  ],
  exports: [PUBLIC_BASE_PRICING],
})
export class PricingModule {}
