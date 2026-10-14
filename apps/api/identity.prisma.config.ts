import { defineConfig } from "prisma/config";
import { identityDatabaseUrl } from "./src/modules/identity/infrastructure/identity-config.ts";
const value = process.env.IDENTITY_MIGRATION_URL;
export default defineConfig({
  schema: "prisma-identity/schema.prisma",
  migrations: { path: "prisma-identity/migrations" },
  ...(value
    ? {
        datasource: {
          url: identityDatabaseUrl(value, process.env.IDENTITY_DISPOSABLE),
        },
      }
    : {}),
});
