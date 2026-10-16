import pg from "pg";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const [mode] = process.argv.slice(2);
if (
  !process.version.startsWith("v24.") ||
  process.argv.length !== 3 ||
  !["migrate", "test"].includes(mode)
)
  throw new Error("PROFILE_COMMAND_INVALID");
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
  port: 55441,
  database: "atlas_profile_cp01",
  user: "atlas_profile_migrator",
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
      "SELECT current_database() db,current_user role,current_setting('server_version_num')::int version,current_setting('atlas.profile_fixture',true) marker",
    )
  ).rows[0];
  valid =
    r.db === "atlas_profile_cp01" &&
    r.role === "atlas_profile_migrator" &&
    r.version >= 170000 &&
    r.version < 180000 &&
    r.marker === "atlas-cp01-disposable";
} catch {
  valid = false;
} finally {
  await pool.end();
}
if (!valid) {
  console.error("PROFILE_DISPOSABLE_FIXTURE_REQUIRED");
  process.exit(1);
}
env.PROFILE_CONSENT = "CP-01";
let args;
if (mode === "migrate") {
  env.PROFILE_MIGRATION_URL =
    "postgresql://atlas_profile_migrator@127.0.0.1:55441/atlas_profile_cp01?schema=customer_profile";
  args = [
    fileURLToPath(
      new URL("../node_modules/prisma/build/index.js", import.meta.url),
    ),
    "migrate",
    "deploy",
    "--config",
    "profile.prisma.config.ts",
  ];
} else {
  env.PROFILE_MODE = "local-disposable";
  args = [
    fileURLToPath(
      new URL("../../../node_modules/vitest/vitest.mjs", import.meta.url),
    ),
    "run",
    "--config",
    "test/customer-profile/vitest.config.ts",
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
if (result.error) console.error("PROFILE_COMMAND_UNAVAILABLE");
process.exitCode = result.status ?? 1;
