import pg from "pg";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const [mode, phase] = process.argv.slice(2);
if (
  !process.version.startsWith("v24.") ||
  !(
    (mode === "test" && process.argv.length === 3) ||
    (mode === "migrate" &&
      process.argv.length === 4 &&
      ["catalog", "pricing", "inventory", "orders"].includes(phase))
  )
)
  throw new Error("ORDERS_COMMAND_INVALID");
// Fixed destinations, no dotenv and no forwarded provider/database environment.
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
  Object.entries(process.env).filter(([k]) => keys.includes(k)),
);
const owner =
  mode === "test" ? "atlas_orders_migrator" : `atlas_${phase}_migrator`;
const pool = new pg.Pool({
  host: "127.0.0.1",
  port: 55439,
  database: "atlas_catalog_cat01",
  user: owner,
  password: "",
  ssl: false,
  max: 1,
  connectionTimeoutMillis: 1000,
  query_timeout: 2000,
});
let valid;
try {
  const r = (
    await pool.query(
      "SELECT current_database() db,current_user role,current_setting('server_version_num')::int version,current_setting('atlas.orders_fixture',true) marker,current_setting('atlas.catalog_fixture',true) cat,current_setting('atlas.pricing_fixture',true) price,current_setting('atlas.inventory_fixture',true) inv,(SELECT count(*) FROM pg_namespace n WHERE (n.nspname,n.nspowner::regrole::text) IN (('catalog','atlas_catalog_migrator'),('pricing','atlas_pricing_migrator'),('inventory','atlas_inventory_migrator'))) owners",
    )
  ).rows[0];
  valid =
    r?.db === "atlas_catalog_cat01" &&
    r.role === owner &&
    r.version >= 170000 &&
    r.version < 180000 &&
    r.marker === "atlas-ord01-disposable" &&
    r.cat === "atlas-cat01-disposable" &&
    r.price === "atlas-pric01-disposable" &&
    r.inv === "atlas-inv01-disposable" &&
    Number(r.owners) === 3;
} catch {
  valid = false;
} finally {
  await pool.end();
}
if (!valid) {
  console.error("ORDERS_DISPOSABLE_FIXTURE_REQUIRED");
  process.exit(1);
}
env.ORDERS_CONSENT = "ORD-01";
let args;
if (mode === "migrate") {
  if (phase === "orders")
    env.ORDERS_MIGRATION_URL = `postgresql://${owner}@127.0.0.1:55439/atlas_catalog_cat01?schema=orders`;
  else {
    env.ORDERS_PORT_PHASE = phase;
    env.ORDERS_PORT_URL = `postgresql://${owner}@127.0.0.1:55439/atlas_catalog_cat01?schema=${phase}_ord01_history`;
  }
  args = [
    fileURLToPath(
      new URL("../node_modules/prisma/build/index.js", import.meta.url),
    ),
    "migrate",
    "deploy",
    "--config",
    phase === "orders"
      ? "orders.prisma.config.ts"
      : "orders-port.prisma.config.ts",
  ];
} else {
  env.ORDERS_MODE = "local-disposable";
  args = [
    fileURLToPath(
      new URL("../../../node_modules/vitest/vitest.mjs", import.meta.url),
    ),
    "run",
    "--config",
    "test/orders/vitest.config.ts",
  ];
}
const result = spawnSync(process.execPath, args, {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  env,
  encoding: "utf8",
  timeout: 180000,
  maxBuffer: 6 * 1024 * 1024,
});
for (const output of [result.stdout, result.stderr])
  if (output)
    process.stdout.write(
      output.replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[REDACTED_DB_URL]"),
    );
if (result.error) console.error("ORDERS_COMMAND_UNAVAILABLE");
process.exitCode = result.status ?? 1;
