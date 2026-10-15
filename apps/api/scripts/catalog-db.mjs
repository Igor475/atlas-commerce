import pg from "pg";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const mode = process.argv[2];
if (
  process.argv.length !== 3 ||
  !["migrate", "test"].includes(mode) ||
  !process.version.startsWith("v24.")
)
  throw new Error("CATALOG_COMMAND_INVALID");
// Caller cannot select a destination. Never load dotenv or forward provider credentials.
const keys = [
  "PATH",
  "Path",
  "SystemRoot",
  "SYSTEMROOT",
  "WINDIR",
  "TEMP",
  "TMP",
  "HOME",
  "USERPROFILE",
  "COMSPEC",
  "PATHEXT",
  "APPDATA",
  "LOCALAPPDATA",
  "CI",
];
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => keys.includes(key)),
);
env.CATALOG_CONSENT = "CAT-01";
env.CATALOG_MIGRATION_URL =
  "postgresql://atlas_catalog_migrator@127.0.0.1:55439/atlas_catalog_cat01?schema=catalog";
const pool = new pg.Pool({
  host: "127.0.0.1",
  port: 55439,
  database: "atlas_catalog_cat01",
  user: "atlas_catalog_migrator",
  password: "",
  ssl: false,
  max: 1,
  connectionTimeoutMillis: 1000,
  query_timeout: 2000,
});
let valid;
try {
  const row = (
    await pool.query(
      "SELECT current_database() AS db,current_user AS role,current_setting('atlas.catalog_fixture',true) AS marker,current_setting('server_version_num')::int AS version",
    )
  ).rows[0];
  valid =
    row?.db === "atlas_catalog_cat01" &&
    row.role === "atlas_catalog_migrator" &&
    row.marker === "atlas-cat01-disposable" &&
    row.version >= 170000 &&
    row.version < 180000;
} catch {
  valid = false;
} finally {
  await pool.end();
}
if (!valid) {
  console.error("CATALOG_DISPOSABLE_FIXTURE_REQUIRED");
  process.exit(1);
}
if (mode === "test") delete env.CATALOG_MIGRATION_URL;
const args =
  mode === "migrate"
    ? [
        fileURLToPath(
          new URL("../node_modules/prisma/build/index.js", import.meta.url),
        ),
        "migrate",
        "deploy",
        "--config",
        "catalog.prisma.config.ts",
      ]
    : [
        fileURLToPath(
          new URL("../../../node_modules/vitest/vitest.mjs", import.meta.url),
        ),
        "run",
        "--config",
        "test/catalog/vitest.config.ts",
      ];
const result = spawnSync(process.execPath, args, {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  env,
  encoding: "utf8",
  timeout: 180000,
  maxBuffer: 4 * 1024 * 1024,
});
for (const output of [result.stdout, result.stderr])
  if (output)
    process.stdout.write(
      output.replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[REDACTED_DB_URL]"),
    );
if (result.error) console.error("CATALOG_COMMAND_UNAVAILABLE");
process.exitCode = result.status ?? 1;
