import { Module } from "@nestjs/common";

import { HealthModule } from "./health/health.module.js";
import { IdentityModule } from "./modules/identity/identity.module.js";
import { CatalogModule } from "./modules/catalog/catalog.module.js";

@Module({
  imports: [IdentityModule, HealthModule, CatalogModule],
})
export class AppModule {}
