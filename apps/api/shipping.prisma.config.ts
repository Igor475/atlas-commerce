import { defineConfig } from "prisma/config";
import {
  shippingMigrationUrl,
  type ShippingPhase,
} from "./src/modules/shipping/infrastructure/shipping-config.ts";
const phase = process.env.SHIP_PHASE as ShippingPhase;
export default defineConfig({
  schema: "prisma-orders-ports/schema.prisma",
  migrations: { path: `prisma-shipping/${phase}/migrations` },
  datasource: {
    url: shippingMigrationUrl(
      process.env.SHIP_MIGRATION_URL ?? "",
      process.env.SHIP_CONSENT,
      phase,
    ),
  },
});
