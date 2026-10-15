import { Module } from "@nestjs/common";
import { CATALOG_RUNTIME, composeCatalog } from "./catalog-runtime.js";
import { CatalogController } from "./presentation/catalog.controller.js";
export {
  CATALOG_RUNTIME,
  CatalogRuntime,
  composeCatalog,
  unavailablePricing,
} from "./catalog-runtime.js";
@Module({
  controllers: [CatalogController],
  providers: [
    { provide: CATALOG_RUNTIME, useFactory: () => composeCatalog(process.env) },
  ],
})
export class CatalogModule {}
