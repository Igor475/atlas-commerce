import { defineConfig } from "prisma/config";
import {
  disposableUrl,
  rejectAmbientPg,
} from "./src/infrastructure/persistence/spike-config.ts";
const value = process.env.SPIKE_MIGRATION_URL;
if (value) rejectAmbientPg();
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  ...(value
    ? {
        datasource: { url: disposableUrl(value, process.env.SPIKE_DISPOSABLE) },
      }
    : {}),
});
