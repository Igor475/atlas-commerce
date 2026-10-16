import { defineConfig } from "prisma/config";
import {
  integrationMigrationUrl,
  type IntegrationPhase,
} from "./src/modules/customer-profile/infrastructure/profile-integration-config.ts";
const phase = process.env.CPINT_PHASE as IntegrationPhase;
export default defineConfig({
  schema: "prisma-orders-ports/schema.prisma",
  migrations: { path: `prisma-profile-integration/${phase}/migrations` },
  datasource: {
    url: integrationMigrationUrl(
      process.env.CPINT_MIGRATION_URL ?? "",
      process.env.CPINT_CONSENT,
      phase,
    ),
  },
});
