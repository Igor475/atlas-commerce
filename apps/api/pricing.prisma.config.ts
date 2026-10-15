import { defineConfig } from "prisma/config";
import { pricingUrl } from "./src/modules/pricing/infrastructure/pricing-config.ts";
const value = process.env.PRICING_MIGRATION_URL;
export default defineConfig({
  schema: "prisma-pricing/schema.prisma",
  migrations: { path: "prisma-pricing/migrations" },
  ...(value
    ? {
        datasource: {
          url: pricingUrl(value, process.env.PRICING_CONSENT, true),
        },
      }
    : {}),
});
