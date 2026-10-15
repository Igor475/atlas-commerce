import { Module } from "@nestjs/common";
import { CATALOG_RUNTIME, composeCatalog } from "./catalog-runtime.js";
import { CatalogController } from "./presentation/catalog.controller.js";
import { PricingModule } from "../pricing/pricing.module.js";
import { PUBLIC_BASE_PRICING } from "../pricing/application/public-prices.js";
import type { PublicPricing } from "./application/catalog-reader.js";
export {
  CATALOG_RUNTIME,
  CatalogRuntime,
  composeCatalog,
  unavailablePricing,
} from "./catalog-runtime.js";
@Module({
  imports: [PricingModule],
  controllers: [CatalogController],
  providers: [
    {
      provide: CATALOG_RUNTIME,
      inject: [PUBLIC_BASE_PRICING],
      useFactory: (pricing: PublicPricing) =>
        composeCatalog(process.env, pricing),
    },
  ],
})
export class CatalogModule {}
