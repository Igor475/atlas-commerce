import { defineConfig } from "prisma/config";
import { catalogUrl } from "./src/modules/catalog/infrastructure/catalog-config.ts";
const value = process.env.CATALOG_MIGRATION_URL;
export default defineConfig({
  schema: "prisma-catalog/schema.prisma",
  migrations: { path: "prisma-catalog/migrations" },
  ...(value
    ? {
        datasource: {
          url: catalogUrl(value, process.env.CATALOG_CONSENT, true),
        },
      }
    : {}),
});
