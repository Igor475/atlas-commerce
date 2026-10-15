import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  openSync,
  writeFileSync,
  closeSync,
  readFileSync,
  unlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
if (process.argv.length !== 2 || !process.version.startsWith("v24."))
  throw new Error("CATALOG_COMMAND_INVALID");
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
  "ComSpec",
  "ProgramFiles",
  "PROGRAMFILES",
  "SystemDrive",
  "PATHEXT",
  "APPDATA",
  "LOCALAPPDATA",
  "CI",
  "DOCKER_HOST",
  "DOCKER_CONTEXT",
  "DOCKER_CONFIG",
];
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => keys.includes(key)),
);
const cwd = fileURLToPath(new URL("../../..", import.meta.url));
const run = randomUUID(),
  project = "atlas-cat01-" + run;
const compose = [
  "compose",
  "-p",
  project,
  "-f",
  "apps/api/compose.catalog.yml",
];
const lock = join(tmpdir(), "atlas-cat01-port-55439.lock");
let fd,
  owned = false,
  failed = false;
function call(command, args, timeout = 60000) {
  const r = spawnSync(command, args, {
    cwd,
    env,
    encoding: "utf8",
    timeout,
    maxBuffer: 5 * 1024 * 1024,
  });
  if (r.status !== 0 || r.error) {
    if (command === process.execPath)
      process.stdout.write(
        ((r.stdout ?? "") + (r.stderr ?? "")).replace(
          /postgres(?:ql)?:\/\/[^\s"']+/gi,
          "[REDACTED_DB_URL]",
        ),
      );
    console.error(
      "CATALOG_COMMAND_STAGE",
      command === process.execPath ? "NODE_LOCAL" : args[0],
      r.error?.code ?? r.status,
    );
    throw new Error("CATALOG_LOCAL_COMMAND_FAILED");
  }
  return r.stdout;
}
function resources(type) {
  return call("docker", [
    type,
    "ls",
    ...(type === "container" ? ["-a"] : []),
    "--filter",
    `label=com.docker.compose.project=${project}`,
    "--format",
    type === "volume" ? "{{.Name}}" : "{{.ID}}",
  ]);
}
function cleanup() {
  if (owned) {
    for (const id of resources("container")
      .trim()
      .split(/\s+/)
      .filter(Boolean)) {
      const meta = JSON.parse(call("docker", ["inspect", id]))[0];
      if (meta.Config.Labels["com.docker.compose.project"] !== project)
        throw new Error("CATALOG_OWNERSHIP_REJECTED");
    }
    call("docker", [...compose, "down", "--volumes"]);
    if (["container", "volume", "network"].some((t) => resources(t).trim()))
      throw new Error("CATALOG_CLEANUP_FAILED");
    console.log("CATALOG_OWN_RESOURCES_CLEANED");
  }
  if (fd !== undefined) {
    closeSync(fd);
    if (readFileSync(lock, "utf8") !== run)
      throw new Error("CATALOG_LOCK_OWNERSHIP_REJECTED");
    unlinkSync(lock);
  }
}
try {
  const endpoint =
    env.DOCKER_HOST ||
    call("docker", [
      "context",
      "inspect",
      "--format",
      "{{.Endpoints.docker.Host}}",
    ]).trim();
  if (!/^(unix:\/\/|npipe:\/\/)/.test(endpoint))
    throw new Error("CATALOG_LOCAL_DOCKER_REQUIRED");
  fd = openSync(lock, "wx", 0o600);
  writeFileSync(fd, run);
  if (["container", "volume", "network"].some((t) => resources(t).trim()))
    throw new Error("CATALOG_FOREIGN_RESOURCES");
  owned = true;
  call("docker", [...compose, "up", "-d", "--wait", "--pull", "never"]);
  const id = call("docker", [...compose, "ps", "-q", "postgres"]).trim();
  const meta = JSON.parse(call("docker", ["inspect", id]))[0];
  const bindings = meta.NetworkSettings.Ports["5432/tcp"];
  if (
    meta.Config.Labels["com.docker.compose.project"] !== project ||
    bindings.length !== 1 ||
    bindings[0].HostIp !== "127.0.0.1" ||
    bindings[0].HostPort !== "55439"
  )
    throw new Error("CATALOG_OWNERSHIP_REJECTED");
  console.log("CATALOG_LOCAL_POSTGRES17_READY");
  for (const mode of ["migrate", "migrate", "test"])
    process.stdout.write(
      call(process.execPath, ["apps/api/scripts/catalog-db.mjs", mode], 180000),
    );
} catch (error) {
  failed = true;
  if (owned) {
    try {
      const logs = call("docker", [
        ...compose,
        "logs",
        "--no-color",
        "--tail",
        "50",
        "postgres",
      ]);
      for (const line of logs.split("\n"))
        if (line.includes("ERROR:")) console.error(line.slice(0, 500));
    } catch {
      console.error("CATALOG_FIXTURE_LOG_UNAVAILABLE");
    }
  }
  console.error(
    error instanceof Error && /^CATALOG_[A-Z_]+$/.test(error.message)
      ? error.message
      : "CATALOG_LOCAL_FAILED",
  );
} finally {
  try {
    cleanup();
  } catch {
    failed = true;
    console.error("CATALOG_CLEANUP_FAILED");
  }
}
process.exitCode = failed ? 1 : 0;
