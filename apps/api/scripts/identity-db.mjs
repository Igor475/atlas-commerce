import pg from "pg";
// Only the dedicated disposable fixture. No .env loading or remote URL fallback.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const mode = process.argv[2];
if (!["migrate", "test"].includes(mode))
  throw new Error("IDENTITY_COMMAND_INVALID");
if (!process.version.startsWith("v24."))
  throw new Error("IDENTITY_NODE24_REQUIRED");
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) =>
      !key.startsWith("PG") &&
      !key.startsWith("SPIKE_") &&
      !key.startsWith("PERSISTENCE_") &&
      !["DATABASE_URL", "DEBUG", "IDENTITY_MIGRATION_URL"].includes(key),
  ),
);
env.IDENTITY_DISPOSABLE = "1";
const migrationUrl =
  "postgresql://atlas_identity_migrator@127.0.0.1:55436/atlas_identity_id01?schema=identity";
env.IDENTITY_MIGRATION_URL = migrationUrl;
const proof = new pg.Pool({
  host: "127.0.0.1",
  port: 55436,
  database: "atlas_identity_id01",
  user: "atlas_identity_migrator",
  password: "",
  ssl: false,
  max: 1,
  connectionTimeoutMillis: 1000,
});
let owned;
try {
  const checked = await proof.query(
    "SELECT current_setting('atlas.identity_fixture',true) AS marker,current_database() AS db,current_user AS role",
  );
  const target = checked.rows[0];
  owned =
    target?.marker === "atlas-id01-disposable" &&
    target.db === "atlas_identity_id01" &&
    target.role === "atlas_identity_migrator";
} catch {
  owned = false;
} finally {
  await proof.end();
}
if (!owned) {
  console.error("IDENTITY_DISPOSABLE_FIXTURE_REQUIRED");
  process.exit(1);
}
const args =
  mode === "migrate"
    ? [
        fileURLToPath(
          new URL("../node_modules/prisma/build/index.js", import.meta.url),
        ),
        "migrate",
        "deploy",
        "--config",
        "identity.prisma.config.ts",
      ]
    : [
        fileURLToPath(
          new URL("../../../node_modules/vitest/vitest.mjs", import.meta.url),
        ),
        "run",
        "--config",
        "test/identity/vitest.config.ts",
      ];
const result = spawnSync(process.execPath, args, {
  env,
  encoding: "utf8",
  timeout: 180000,
});
for (const output of [result.stdout, result.stderr])
  if (output)
    process.stdout.write(
      output.replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[REDACTED_DB_URL]"),
    );
if (result.error)
  console.error("IDENTITY_COMMAND_UNAVAILABLE", result.error.code ?? "UNKNOWN");
process.exitCode = result.status ?? 1;
