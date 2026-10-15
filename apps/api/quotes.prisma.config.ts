import { defineConfig } from "prisma/config";
import { quoteUrl } from "./src/modules/quotes/infrastructure/quote-config.ts";
const value = process.env.QUOTES_MIGRATION_URL;
export default defineConfig({
  schema: "prisma-quotes/schema.prisma",
  migrations: { path: "prisma-quotes/migrations" },
  ...(value
    ? {
        datasource: {
          url: quoteUrl(value, process.env.QUOTES_CONSENT, "migrator"),
        },
      }
    : {}),
});
