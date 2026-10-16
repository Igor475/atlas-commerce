import { defineConfig } from "prisma/config";
import {
  consumptionMigrationUrl,
  type ConsumptionPhase,
} from "./src/modules/orders/infrastructure/quote-consumption-config.ts";
const phase = process.env.QUSE_PHASE as ConsumptionPhase;
export default defineConfig({
  schema: "prisma-orders-ports/schema.prisma",
  migrations: { path: "prisma-quote-consumption/migrations" },
  datasource: {
    url: consumptionMigrationUrl(
      process.env.QUSE_MIGRATION_URL ?? "",
      process.env.QUSE_CONSENT,
      phase,
    ),
  },
});
