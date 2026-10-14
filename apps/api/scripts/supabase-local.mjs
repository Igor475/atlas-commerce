// INT-02 LOCAL preparation only. Fixed disposable project; never accepts a database URL.
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  existsSync,
  rmSync,
  lstatSync,
  appendFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
const api = resolve(fileURLToPath(new URL("../", import.meta.url)));
const repo = resolve(api, "../..");
const project = "atlas-int02-readonly-local";
const composeArgs = [
  "compose",
  "-p",
  project,
  "-f",
  "apps/api/compose.spike.yml",
];
let owned = false;
let temp;
const env = Object.fromEntries(
  Object.keys(process.env)
    .filter(
      (key) =>
        !key.startsWith("PG") &&
        !key.startsWith("SPIKE_") &&
        !key.startsWith("PERSISTENCE_") &&
        !key.startsWith("ATLAS_SUPABASE_") &&
        !key.startsWith("IDENTITY_") &&
        key !== "DATABASE_URL" &&
        key !== "DEBUG",
    )
    .map((key) => [key, process.env[key]]),
);
function command(binary, args, input, cwd = repo, childEnv = env) {
  const result = spawnSync(binary, args, {
    cwd,
    env: childEnv,
    input,
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0)
    throw new Error(
      "LOCAL_COMMAND_FAILED_" +
        basename(binary)
          .toUpperCase()
          .replace(/[^A-Z0-9_]/g, "_") +
        "_" +
        String(args[0])
          .toUpperCase()
          .replace(/[^A-Z0-9_]/g, "_"),
    );
  return result.stdout;
}
function compose(...args) {
  return command("docker", [...composeArgs, ...args]);
}
function cleanup() {
  if (owned) {
    const removal = spawnSync("docker", [...composeArgs, "down", "--volumes"], {
      cwd: repo,
      env,
      stdio: "ignore",
      timeout: 60000,
    });
    if (removal.status !== 0) {
      console.error("LOCAL_TEST_CLEANUP_FAILED");
      process.exitCode = 1;
    }
    owned = false;
  }
  if (temp) {
    const target = resolve(temp);
    if (
      dirname(target) === resolve(tmpdir()) &&
      basename(target).startsWith("atlas-int02-") &&
      !lstatSync(target).isSymbolicLink()
    )
      rmSync(target, { recursive: true, force: true });
    temp = undefined;
  }
}
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    cleanup();
    process.exit(130);
  });
try {
  if (process.argv.length !== 2) throw new Error("LOCAL_ARGUMENTS_NOT_ALLOWED");
  if (
    env.DOCKER_HOST &&
    !env.DOCKER_HOST.startsWith("unix://") &&
    !env.DOCKER_HOST.startsWith("npipe://")
  )
    throw new Error("LOCAL_DOCKER_REQUIRED");
  const endpoint = command("docker", [
    "context",
    "inspect",
    "--format",
    '{{(index .Endpoints "docker").Host}}',
  ]).trim();
  if (!endpoint.startsWith("unix://") && !endpoint.startsWith("npipe://"))
    throw new Error("LOCAL_DOCKER_CONTEXT_REQUIRED");
  const occupants = command("docker", [
    "ps",
    "--filter",
    "publish=55434",
    "--format",
    "{{.ID}}",
  ])
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  if (occupants.length)
    throw new Error("DISPOSABLE_PORT_OCCUPIED_BY_ANOTHER_PROJECT");
  // Never adopt or remove resources left by another invocation.
  for (const resource of ["container", "network", "volume"]) {
    if (
      command("docker", [
        resource,
        "ls",
        ...(resource === "container" ? ["--all"] : []),
        "--filter",
        "label=com.docker.compose.project=" + project,
        "--quiet",
      ]).trim()
    )
      throw new Error("LOCAL_PROJECT_ALREADY_EXISTS");
  }
  if (process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, "owned=true\n");
  owned = true;
  compose("up", "-d", "--wait");
  const container = compose("ps", "-q", "postgres").trim();
  if (!/^[a-f0-9]{12,64}$/.test(container))
    throw new Error("LOCAL_CONTAINER_REQUIRED");
  if (
    command("docker", [
      "inspect",
      "--format",
      '{{index .Config.Labels "com.docker.compose.project"}}',
      container,
    ]).trim() !== project
  )
    throw new Error("LOCAL_PROJECT_MISMATCH");
  command(
    "docker",
    [
      "exec",
      "-i",
      container,
      "psql",
      "-U",
      "atlas_spike",
      "-d",
      "atlas_spike_f0404",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    readFileSync(join(api, "test/supabase-l1/readonly-fixture.sql"), "utf8"),
  );
  temp = mkdtempSync(join(tmpdir(), "atlas-int02-"));
  const openssl =
    process.platform === "win32" &&
    existsSync("C:/Program Files/Git/usr/bin/openssl.exe")
      ? "C:/Program Files/Git/usr/bin/openssl.exe"
      : "openssl";
  command(
    openssl,
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      join(temp, "ca.key"),
      "-out",
      join(temp, "ca.pem"),
      "-days",
      "2",
      "-subj",
      "/CN=Atlas-F0405-Disposable-CA",
      "-addext",
      "basicConstraints=critical,CA:TRUE",
    ],
    undefined,
    temp,
  );
  command(
    openssl,
    [
      "req",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      join(temp, "server.key"),
      "-out",
      join(temp, "server.csr"),
      "-subj",
      "/CN=localhost",
      "-addext",
      "subjectAltName=DNS:localhost",
    ],
    undefined,
    temp,
  );
  command(
    openssl,
    [
      "x509",
      "-req",
      "-in",
      join(temp, "server.csr"),
      "-CA",
      join(temp, "ca.pem"),
      "-CAkey",
      join(temp, "ca.key"),
      "-CAcreateserial",
      "-out",
      join(temp, "server.pem"),
      "-days",
      "2",
      "-copy_extensions",
      "copy",
    ],
    undefined,
    temp,
  );
  command(
    openssl,
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      join(temp, "wrong.key"),
      "-out",
      join(temp, "wrong.pem"),
      "-days",
      "2",
      "-subj",
      "/CN=Atlas-F0405-Wrong-CA",
      "-addext",
      "basicConstraints=critical,CA:TRUE",
    ],
    undefined,
    temp,
  );
  for (const name of ["server.key", "server.pem"])
    command("docker", [
      "cp",
      join(temp, name),
      container + ":/var/lib/postgresql/data/" + name,
    ]);
  command("docker", [
    "exec",
    "-u",
    "root",
    container,
    "chown",
    "postgres:postgres",
    "/var/lib/postgresql/data/server.key",
    "/var/lib/postgresql/data/server.pem",
  ]);
  command("docker", [
    "exec",
    "-u",
    "root",
    container,
    "chmod",
    "600",
    "/var/lib/postgresql/data/server.key",
  ]);
  for (const sql of [
    "ALTER SYSTEM SET ssl='on'",
    "ALTER SYSTEM SET ssl_cert_file='/var/lib/postgresql/data/server.pem'",
    "ALTER SYSTEM SET ssl_key_file='/var/lib/postgresql/data/server.key'",
  ])
    command("docker", [
      "exec",
      container,
      "psql",
      "-U",
      "atlas_spike",
      "-d",
      "atlas_spike_f0404",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      sql,
    ]);
  compose("restart", "postgres");
  compose("up", "-d", "--wait");
  const testEnv = {
    ...env,
    SUPABASE_L1_LOCAL_TEST: "1",
    CONNECTION_TEST_CA_FILE: join(temp, "ca.pem"),
    CONNECTION_TEST_WRONG_CA_FILE: join(temp, "wrong.pem"),
    PERSISTENCE_ENABLED: "true",
    PERSISTENCE_PROFILE: "local-disposable",
    PERSISTENCE_LOCAL_DISPOSABLE: "1",
  };
  const result = spawnSync(
    process.execPath,
    [
      resolve(repo, "node_modules/vitest/vitest.mjs"),
      "run",
      "--config",
      "test/supabase-l1/vitest.config.ts",
    ],
    {
      cwd: api,
      env: testEnv,
      encoding: "utf8",
      timeout: 180000,
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  for (const output of [result.stdout, result.stderr])
    if (output)
      process.stdout.write(
        output.replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[REDACTED_DB_URL]"),
      );
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(
    error instanceof Error && /^[A-Z_0-9]+$/.test(error.message)
      ? error.message
      : "LOCAL_CONNECTION_TEST_SETUP_FAILED",
  );
  process.exitCode = 1;
} finally {
  cleanup();
}
