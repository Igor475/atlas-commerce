import { defineConfig } from "prisma/config";
import { inventoryUrl } from "./src/modules/inventory/infrastructure/inventory-config.ts";
const value = process.env.INVENTORY_MIGRATION_URL;
export default defineConfig({
  schema: "prisma-inventory/schema.prisma",
  migrations: { path: "prisma-inventory/migrations" },
  ...(value
    ? {
        datasource: {
          url: inventoryUrl(value, process.env.INVENTORY_CONSENT, "migrator"),
        },
      }
    : {}),
});
