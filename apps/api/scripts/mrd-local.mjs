// Own disposable resources only; no remote database/Docker or ambient credentials.
import { spawnSync, spawn } from "node:child_process";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  openSync,
  closeSync,
  unlinkSync,
  lstatSync,
  rmSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
const repo = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const api = join(repo, "apps/api");
const image =
  "postgres:17.10-bookworm@sha256:9b18b78397054fce88a9552e9d5a3ad5bb7fd258c5b3cc1c5028e46373d6ea8f";
const runId = randomUUID();
const harnessStarted = performance.now();
const project = "atlas-mrd-" + runId;
const root = join(tmpdir(), project);
const lock = join(tmpdir(), "atlas-mrd-port-55438.lock");
let lockFd;
let rootOwned = false;
let child;
let container;
let volume;
let network;
let success = false;
let terminating = false;
// Explicit process environment: provider secrets are never forwarded.
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) =>
    [
      "PATH",
      "Path",
      "SystemRoot",
      "SYSTEMROOT",
      "WINDIR",
      "ComSpec",
      "COMSPEC",
      "PATHEXT",
      "TEMP",
      "TMP",
      "TMPDIR",
      "HOME",
      "USERPROFILE",
      "APPDATA",
      "LOCALAPPDATA",
      "USERDOMAIN",
      "USERNAME",
      "SystemDrive",
      "PROGRAMFILES",
      "ProgramFiles",
      "CI",
      "GITHUB_ACTIONS",
      "DOCKER_HOST",
      "DOCKER_CONTEXT",
      "DOCKER_CONFIG",
    ].includes(key),
  ),
);
function command(binary, args, input, cwd = repo) {
  const remaining = 180000 - (performance.now() - harnessStarted);
  if (remaining <= 0) throw Error("MRD_TIMEOUT");
  const r = spawnSync(binary, args, {
    cwd,
    env,
    input,
    encoding: "utf8",
    timeout: Math.max(1, Math.min(30000, remaining)),
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  if (r.status !== 0)
    throw Error(
      "MRD_LOCAL_COMMAND_FAILED_" +
        basename(binary)
          .replace(/[^a-z]/gi, "_")
          .toUpperCase() +
        "_" +
        String(args[0])
          .replace(/[^a-z]/gi, "_")
          .toUpperCase(),
    );
  return r.stdout.trim();
}
function docker(...args) {
  return command("docker", args);
}
function file(name, content) {
  writeFileSync(join(root, name), content, { mode: 0o600, flag: "wx" });
}
function owned(kind, id) {
  return (
    docker(
      kind,
      "inspect",
      "--format",
      '{{index .Labels "atlas.mrd.run"}}',
      id,
    ) === runId
  );
}
function containerOwned() {
  return (
    docker(
      "inspect",
      "--format",
      '{{index .Config.Labels "atlas.mrd.run"}}',
      container,
    ) === runId
  );
}
function cleanup() {
  const reserved = rootOwned || lockFd !== undefined;
  let failed = false;
  try {
    if (container) {
      if (!containerOwned()) throw Error();
      docker("rm", "-f", container);
      container = undefined;
    }
  } catch {
    failed = true;
  }
  try {
    if (volume) {
      if (!owned("volume", volume)) throw Error();
      docker("volume", "rm", volume);
      volume = undefined;
    }
  } catch {
    failed = true;
  }
  try {
    if (network) {
      if (!owned("network", network)) throw Error();
      docker("network", "rm", network);
      network = undefined;
    }
  } catch {
    failed = true;
  }
  try {
    if (rootOwned && !container && !volume && !network) {
      if (
        dirname(resolve(root)) !== resolve(tmpdir()) ||
        lstatSync(root).isSymbolicLink() ||
        realpathSync(root) !== resolve(root) ||
        readFileSync(join(root, "owner"), "utf8") !== runId
      )
        throw Error();
      rmSync(root, { recursive: true, force: true });
      rootOwned = false;
    }
    if (lockFd !== undefined && !container && !volume && !network) {
      if (
        lstatSync(lock).isSymbolicLink() ||
        readFileSync(lock, "utf8") !== runId
      )
        throw Error();
      closeSync(lockFd);
      lockFd = undefined;
      unlinkSync(lock);
    }
  } catch {
    failed = true;
  }
  if (reserved) {
    try {
      for (const kind of ["container", "volume", "network"]) {
        if (
          docker(
            kind,
            "ls",
            ...(kind === "container" ? ["--all"] : []),
            "--filter",
            "label=atlas.mrd.run=" + runId,
            "--quiet",
          )
        )
          throw Error();
      }
    } catch {
      failed = true;
    }
  }
  if (failed) {
    process.exitCode = 1;
    console.error("MRD_CLEANUP_FAILED");
  } else
    console.log(
      reserved ? "MRD_OWN_RESOURCES_CLEANED" : "MRD_NO_RESOURCES_RESERVED",
    );
}
function admin(sql) {
  return command(
    "docker",
    [
      "exec",
      "-i",
      container,
      "psql",
      "-U",
      "atlas_mrd_fixture_admin",
      "-d",
      "atlas_mrd_g2",
      "-v",
      "ON_ERROR_STOP=1",
      "-At",
    ],
    sql,
  );
}
function finish(signal) {
  if (terminating) return;
  terminating = true;
  child?.kill(signal);
  cleanup();
  process.exitCode = 130;
}
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => finish(signal));
try {
  if (process.argv.length !== 2) throw Error("MRD_ARGUMENT_INVALID");
  if (
    process.env.DOCKER_HOST &&
    !/^(unix|npipe):\/\//.test(process.env.DOCKER_HOST)
  )
    throw Error("MRD_LOCAL_DOCKER_REQUIRED");
  const endpoint = docker(
    "context",
    "inspect",
    "--format",
    '{{(index .Endpoints "docker").Host}}',
  );
  if (!/^(unix|npipe):\/\//.test(endpoint))
    throw Error("MRD_LOCAL_DOCKER_REQUIRED");
  lockFd = openSync(lock, "wx", 0o600);
  writeFileSync(lockFd, runId);
  if (docker("ps", "--filter", "publish=55438", "--quiet"))
    throw Error("MRD_PORT_OCCUPIED");
  for (const kind of ["container", "volume", "network"]) {
    if (
      docker(
        kind,
        "ls",
        ...(kind === "container" ? ["--all"] : []),
        "--filter",
        "label=atlas.mrd.run=" + runId,
        "--quiet",
      )
    )
      throw Error("MRD_RESOURCE_PREEXISTS");
  }
  mkdirSync(root, { mode: 0o700 });
  rootOwned = true;
  file("owner", runId);
  if (process.platform === "win32")
    command("icacls", [
      root,
      "/inheritance:r",
      "/grant:r",
      process.env.USERDOMAIN + "\\" + process.env.USERNAME + ":(OI)(CI)F",
    ]);
  docker("image", "inspect", image);
  volume = docker(
    "volume",
    "create",
    "--label",
    "atlas.mrd.run=" + runId,
    project + "-data",
  );
  network = docker(
    "network",
    "create",
    "--label",
    "atlas.mrd.run=" + runId,
    project + "-net",
  );
  container = docker(
    "create",
    "--pull=never",
    "--name",
    project,
    "--label",
    "atlas.mrd.run=" + runId,
    "--network",
    network,
    "--publish",
    "127.0.0.1:55438:5432",
    "--mount",
    "type=volume,source=" + volume + ",target=/var/lib/postgresql/data",
    "--env",
    "POSTGRES_USER=atlas_mrd_fixture_admin",
    "--env",
    "POSTGRES_DB=atlas_mrd_g2",
    "--env",
    "POSTGRES_HOST_AUTH_METHOD=trust",
    image,
  );
  if (!/^[a-f0-9]{64}$/.test(container) || !containerOwned())
    throw Error("MRD_RESOURCE_OWNERSHIP_FAILED");
  const ports = JSON.parse(
    docker(
      "inspect",
      "--format",
      "{{json .HostConfig.PortBindings}}",
      container,
    ),
  );
  if (
    Object.keys(ports).length !== 1 ||
    ports["5432/tcp"]?.length !== 1 ||
    ports["5432/tcp"][0].HostIp !== "127.0.0.1" ||
    ports["5432/tcp"][0].HostPort !== "55438"
  )
    throw Error("MRD_PORT_BINDING_REJECTED");
  docker("start", container);
  console.log("MRD_FIXTURE_STARTED");
  for (let i = 0; i < 30; i++) {
    const waitBudget = 180000 - (performance.now() - harnessStarted);
    if (waitBudget <= 0) throw Error("MRD_TIMEOUT");
    const r = spawnSync(
      "docker",
      [
        "exec",
        container,
        "pg_isready",
        "-h",
        "127.0.0.1",
        "-U",
        "atlas_mrd_fixture_admin",
        "-d",
        "atlas_mrd_g2",
      ],
      {
        env,
        stdio: "ignore",
        timeout: Math.max(1, Math.min(10000, waitBudget)),
        windowsHide: true,
      },
    );
    if (r.status === 0) break;
    if (i === 29) {
      const logs = spawnSync("docker", ["logs", "--tail", "40", container], {
        env,
        encoding: "utf8",
        timeout: 10000,
        windowsHide: true,
      });
      const text = String(logs.stdout) + String(logs.stderr);
      console.error(
        "MRD_BOOTSTRAP_DIAGNOSTIC_" +
          (/permission denied/i.test(text)
            ? "PERMISSION"
            : /exec format/i.test(text)
              ? "PLATFORM"
              : /error|fatal/i.test(text)
                ? "POSTGRES_ERROR"
                : "NOT_READY"),
      );
      throw Error("MRD_DB_UNAVAILABLE");
    }
    const pauseBudget = 180000 - (performance.now() - harnessStarted);
    if (pauseBudget <= 0) throw Error("MRD_TIMEOUT");
    await new Promise((r) => setTimeout(r, Math.min(500, pauseBudget)));
  }
  const password = randomBytes(32).toString("hex");
  console.log("MRD_POSTGRES_READY");
  admin(
    "CREATE ROLE atlas_mrd_local LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '" +
      password +
      "';",
  );
  const openssl =
    process.platform === "win32"
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
      join(root, "ca.key"),
      "-out",
      join(root, "ca.pem"),
      "-days",
      "2",
      "-subj",
      "/CN=Atlas-MRD-local-CA",
      "-addext",
      "basicConstraints=critical,CA:TRUE",
    ],
    undefined,
    root,
  );
  command(
    openssl,
    [
      "req",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      join(root, "server.key"),
      "-out",
      join(root, "server.csr"),
      "-subj",
      "/CN=Atlas-MRD-local",
      "-addext",
      "subjectAltName=IP:127.0.0.1",
    ],
    undefined,
    root,
  );
  command(
    openssl,
    [
      "x509",
      "-req",
      "-in",
      join(root, "server.csr"),
      "-CA",
      join(root, "ca.pem"),
      "-CAkey",
      join(root, "ca.key"),
      "-CAcreateserial",
      "-out",
      join(root, "server.pem"),
      "-days",
      "2",
      "-copy_extensions",
      "copy",
    ],
    undefined,
    root,
  );
  for (const name of [
    "ca.key",
    "ca.pem",
    "server.key",
    "server.csr",
    "server.pem",
    "ca.srl",
  ]) {
    // POSIX openssl may create public-readable files; harden all local material.
    const { chmodSync } = await import("node:fs");
    chmodSync(join(root, name), 0o600);
  }
  for (const name of ["server.key", "server.pem"])
    docker(
      "cp",
      join(root, name),
      container + ":/var/lib/postgresql/data/" + name,
    );
  docker(
    "exec",
    "-u",
    "root",
    container,
    "chown",
    "postgres:postgres",
    "/var/lib/postgresql/data/server.key",
    "/var/lib/postgresql/data/server.pem",
  );
  docker(
    "exec",
    "-u",
    "root",
    container,
    "chmod",
    "600",
    "/var/lib/postgresql/data/server.key",
  );
  file(
    "pg_hba.conf",
    "local all all trust\nhostnossl all atlas_mrd_local 0.0.0.0/0 reject\nhostssl all atlas_mrd_local 0.0.0.0/0 scram-sha-256\nhost all all 0.0.0.0/0 trust\n",
  );
  docker(
    "cp",
    join(root, "pg_hba.conf"),
    container + ":/var/lib/postgresql/data/pg_hba.conf",
  );
  docker(
    "exec",
    "-u",
    "root",
    container,
    "chown",
    "postgres:postgres",
    "/var/lib/postgresql/data/pg_hba.conf",
  );
  for (const sql of [
    "ALTER SYSTEM SET ssl='on'",
    "ALTER SYSTEM SET ssl_cert_file='/var/lib/postgresql/data/server.pem'",
    "ALTER SYSTEM SET ssl_key_file='/var/lib/postgresql/data/server.key'",
  ])
    admin(sql);
  docker("restart", container);
  for (let i = 0; i < 30; i++) {
    try {
      admin("SELECT 1");
      break;
    } catch {
      if (i === 29) throw Error("MRD_DB_UNAVAILABLE");
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  const hash = (value) => createHash("sha256").update(value).digest("hex");
  const manifest = {
    version: "MRD-v1",
    runId,
    host: "127.0.0.1",
    port: 55438,
    database: "atlas_mrd_g2",
    role: "atlas_mrd_local",
    container,
    project,
    caHash: hash(readFileSync(join(root, "ca.pem"), "utf8")),
    passwordHash: hash(password),
    commit: command("git", ["rev-parse", "HEAD"]),
  };
  file("manifest.json", JSON.stringify(manifest));
  // Test-controller-only private material. CLI receives credential exclusively by stdin.
  file(
    "test-context.json",
    JSON.stringify({
      runId,
      manifestPath: join(root, "manifest.json"),
      password,
      container,
    }),
  );
  const testEnv = { ...env, MRD_TEST_RUN_DIR: root };
  child = spawn(
    process.execPath,
    [
      join(repo, "node_modules/vitest/vitest.mjs"),
      "run",
      "--config",
      "test/mrd/vitest.config.ts",
    ],
    {
      cwd: api,
      env: testEnv,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  let output = "";
  for (const stream of [child.stdout, child.stderr])
    stream.on("data", (b) => {
      output += b.toString();
    });
  const timer = setTimeout(
    () => {
      child.kill("SIGTERM");
    },
    // Reserve 30s of the original 180s budget for ownership checks/cleanup.
    Math.max(1, 150000 - (performance.now() - harnessStarted)),
  );
  const code = await new Promise((r) => {
    child.once("exit", r);
    child.once("error", () => r(1));
  });
  clearTimeout(timer);
  // Fail closed on canary/secret leakage rather than printing untrusted test output.
  if (output.includes(password) || /postgres(?:ql)?:\/\//i.test(output))
    throw Error("MRD_TEST_OUTPUT_REJECTED");
  process.stdout.write(output);
  success = code === 0;
  if (!success) process.exitCode = 1;
} catch (error) {
  console.error(
    error instanceof Error && /^MRD_[A-Z_]+$/.test(error.message)
      ? error.message
      : "MRD_LOCAL_SETUP_FAILED",
  );
  process.exitCode = 1;
} finally {
  cleanup();
}
if (success && !process.exitCode)
  console.log("MRD_LOCAL_TESTS_COMPLETED_L1_PENDENTE_REMOTE_BLOCKED");
