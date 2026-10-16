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
      ["profile", "quotes", "orders"].includes(phase))
  )
)
  throw new Error("CPINT_COMMAND_INVALID");
const owner =
  mode === "test" ? "atlas_profile_migrator" : `atlas_${phase}_migrator`;
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
      "SELECT current_database() db,current_user role,current_setting('atlas.profile_integration',true) marker,current_setting('server_version_num')::int v",
    )
  ).rows[0];
  valid =
    r.db === "atlas_catalog_cat01" &&
    r.role === owner &&
    r.marker === "atlas-cpint01-disposable" &&
    r.v >= 170000 &&
    r.v < 180000;
} catch {
  valid = false;
} finally {
  await pool.end();
}
if (!valid) {
  console.error("CPINT_DISPOSABLE_FIXTURE_REQUIRED");
  process.exit(1);
}
env.CPINT_CONSENT = "CP-02";
let args;
if (mode === "migrate") {
  env.CPINT_PHASE = phase;
  env.CPINT_MIGRATION_URL = `postgresql://${owner}@127.0.0.1:55439/atlas_catalog_cat01?schema=${phase}_cpint_history`;
  args = [
    fileURLToPath(
      new URL("../node_modules/prisma/build/index.js", import.meta.url),
    ),
    "migrate",
    "deploy",
    "--config",
    "profile-orders.prisma.config.ts",
  ];
} else {
  env.CPINT_MODE = "local-disposable";
  args = [
    fileURLToPath(
      new URL("../../../node_modules/vitest/vitest.mjs", import.meta.url),
    ),
    "run",
    "--config",
    "test/profile-integration/vitest.config.ts",
  ];
}
const r = spawnSync(process.execPath, args, {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  env,
  encoding: "utf8",
  timeout: 180000,
  maxBuffer: 6 * 1024 * 1024,
});
for (const output of [r.stdout, r.stderr])
  if (output)
    process.stdout.write(
      output.replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[REDACTED_DB_URL]"),
    );
process.exitCode = r.status ?? 1;
