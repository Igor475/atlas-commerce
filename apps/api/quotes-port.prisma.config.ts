import { defineConfig } from "prisma/config";
import {
  quoteMigrationUrl,
  type QuotePhase,
} from "./src/modules/quotes/infrastructure/quote-config.ts";
const phase = process.env.QUOTES_PORT_PHASE as QuotePhase;
export default defineConfig({
  schema: "prisma-orders-ports/schema.prisma",
  migrations: { path: `prisma-quotes-ports/${phase}/migrations` },
  datasource: {
    url: quoteMigrationUrl(
      process.env.QUOTES_PORT_URL ?? "",
      process.env.QUOTES_CONSENT,
      phase,
    ),
  },
});
