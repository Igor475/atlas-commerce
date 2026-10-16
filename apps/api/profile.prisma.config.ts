import { defineConfig } from "prisma/config";
import { profileUrl } from "./src/modules/customer-profile/infrastructure/profile-config.ts";
const value = process.env.PROFILE_MIGRATION_URL;
export default defineConfig({
  schema: "prisma-profile/schema.prisma",
  migrations: { path: "prisma-profile/migrations" },
  ...(value
    ? {
        datasource: {
          url: profileUrl(value, process.env.PROFILE_CONSENT, "migrator"),
        },
      }
    : {}),
});
