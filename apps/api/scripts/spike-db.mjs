// Explicit disposable-only CLI. Never loads .env or prints connection strings.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const mode = process.argv[2];
if (!["migrate", "test", "diff"].includes(mode))
  throw new Error("Expected migrate, test or diff");
const env = {
  ...Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) =>
        !key.startsWith("PG") && key !== "DEBUG" && key !== "DATABASE_URL",
    ),
  ),
  SPIKE_DISPOSABLE: "1",
};
const local =
  "postgresql://atlas_spike@127.0.0.1:55434/atlas_spike_f0404?schema=spike";
env.SPIKE_DATABASE_URL ??= local;
env.SPIKE_MIGRATION_URL ??= local;
// Config also guards CLI; tests guard runtime before any DB connection.
const cliArgs =
  mode === "migrate"
    ? ["migrate", "deploy"]
    : mode === "diff"
      ? [
          "migrate",
          "diff",
          "--from-config-datasource",
          "--to-schema",
          "prisma/schema.prisma",
          "--exit-code",
        ]
      : ["run", "--config", "vitest.spike.config.ts"];
const cli =
  mode === "test"
    ? "../../../node_modules/vitest/vitest.mjs"
    : "../node_modules/prisma/build/index.js";
const result = spawnSync(
  process.execPath,
  [fileURLToPath(new URL(cli, import.meta.url)), ...cliArgs],
  { env, encoding: "utf8" },
);
for (const output of [result.stdout, result.stderr]) {
  if (output)
    process.stdout.write(
      output
        .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[REDACTED_DB_URL]")
        .replace(
          /^.*Datasource .*$/gm,
          "Datasource: isolated fixture (details redacted)",
        ),
    );
}
if (result.error) console.error("Unable to launch isolated spike command");
process.exitCode = result.status ?? 1;
