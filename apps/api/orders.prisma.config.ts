import { defineConfig } from "prisma/config";
import { ordersUrl } from "./src/modules/orders/infrastructure/orders-config.ts";
const value = process.env.ORDERS_MIGRATION_URL;
export default defineConfig({
  schema: "prisma-orders/schema.prisma",
  migrations: { path: "prisma-orders/migrations" },
  ...(value
    ? {
        datasource: {
          url: ordersUrl(value, process.env.ORDERS_CONSENT, "migrator"),
        },
      }
    : {}),
});
