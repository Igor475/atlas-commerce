import { Module } from "@nestjs/common";

import { HealthModule } from "./health/health.module.js";
import { IdentityModule } from "./modules/identity/identity.module.js";

@Module({
  imports: [IdentityModule, HealthModule],
})
export class AppModule {}
