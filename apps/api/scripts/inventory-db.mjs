import pg from "pg";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const mode = process.argv[2];
if (
  process.argv.length !== 3 ||
  !["migrate", "test"].includes(mode) ||
  !process.version.startsWith("v24.")
)
  throw new Error("INVENTORY_COMMAND_INVALID");
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
env.INVENTORY_CONSENT = "INV-01";
env.INVENTORY_MIGRATION_URL =
  "postgresql://atlas_inventory_migrator@127.0.0.1:55439/atlas_catalog_cat01?schema=inventory";
const pool = new pg.Pool({
  host: "127.0.0.1",
  port: 55439,
  database: "atlas_catalog_cat01",
  user: "atlas_inventory_migrator",
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
      "SELECT current_database() AS db,current_user AS role,current_setting('atlas.inventory_fixture',true) AS marker,current_setting('atlas.catalog_fixture',true) AS catalog,current_setting('atlas.pricing_fixture',true) AS pricing,current_setting('server_version_num')::int AS version,(SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='catalog') AS catalog_owner,(SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='pricing') AS pricing_owner,to_regclass('catalog.product') AS product_table,(SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='pricing' AND c.relname='price_revision' AND c.relkind='r') AS price_table",
    )
  ).rows[0];
  valid =
    row?.db === "atlas_catalog_cat01" &&
    row.role === "atlas_inventory_migrator" &&
    row.marker === "atlas-inv01-disposable" &&
    row.catalog === "atlas-cat01-disposable" &&
    row.catalog_owner === "atlas_catalog_migrator" &&
    row.pricing === "atlas-pric01-disposable" &&
    row.pricing_owner === "atlas_pricing_migrator" &&
    row.price_table !== null &&
    row.product_table !== null &&
    row.version >= 170000 &&
    row.version < 180000;
} catch {
  valid = false;
} finally {
  await pool.end();
}
if (!valid) {
  console.error("INVENTORY_DISPOSABLE_FIXTURE_REQUIRED");
  process.exit(1);
}
if (mode === "test") {
  delete env.INVENTORY_MIGRATION_URL;
  env.CATALOG_MODE = "local-disposable";
  env.CATALOG_CONSENT = "CAT-01";
  env.CATALOG_RUNTIME_URL =
    "postgresql://atlas_catalog_runtime@127.0.0.1:55439/atlas_catalog_cat01?schema=catalog";
  env.INVENTORY_MODE = "local-disposable";
  env.PRICING_MODE = "local-disposable";
  env.PRICING_CONSENT = "PRIC-01";
  env.PRICING_RUNTIME_URL =
    "postgresql://atlas_pricing_runtime@127.0.0.1:55439/atlas_catalog_cat01?schema=pricing";
  env.INVENTORY_RUNTIME_URL =
    "postgresql://atlas_inventory_runtime@127.0.0.1:55439/atlas_catalog_cat01?schema=inventory";
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
        "inventory.prisma.config.ts",
      ]
    : [
        fileURLToPath(
          new URL("../../../node_modules/vitest/vitest.mjs", import.meta.url),
        ),
        "run",
        "--config",
        "test/inventory/vitest.config.ts",
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
if (result.error) console.error("INVENTORY_COMMAND_UNAVAILABLE");
process.exitCode = result.status ?? 1;
