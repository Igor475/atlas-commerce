import { createHash, X509Certificate } from "node:crypto";
import { readFileSync, lstatSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname, join } from "node:path";
import { checkServerIdentity } from "node:tls";
import type { PoolConfig } from "pg";
import { exact, fail, MrdError } from "./mrd-contract.js";
export const digest = (value: string): string =>
  createHash("sha256").update(value).digest("hex");
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function privatePath(
  file: string,
  root: string,
  directory = false,
): void {
  const target = resolve(file);
  if (target !== resolve(root) && dirname(target) !== resolve(root)) fail();
  const stat = lstatSync(target);
  if (
    stat.isSymbolicLink() ||
    (directory ? !stat.isDirectory() : !stat.isFile()) ||
    realpathSync(target) !== target
  )
    fail();
  if (
    process.platform !== "win32" &&
    ((stat.mode & 0o077) !== 0 || stat.uid !== process.getuid?.())
  )
    fail();
  if (!directory && stat.size > 16384) fail();
}
function readLocalConfiguration(input: unknown) {
  exact(input, ["runId", "manifestPath", "password"]);
  const { runId, manifestPath, password } = input;
  if (
    typeof runId !== "string" ||
    !uuid.test(runId) ||
    typeof manifestPath !== "string" ||
    typeof password !== "string" ||
    Buffer.byteLength(password) < 1 ||
    Buffer.byteLength(password) > 256 ||
    /[\u0000-\u001f]/.test(password)
  )
    fail();
  const root = resolve(tmpdir(), "atlas-mrd-" + runId);
  if (resolve(manifestPath) !== join(root, "manifest.json")) fail();
  privatePath(root, root, true);
  privatePath(manifestPath, root);
  const m: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
  exact(m, [
    "version",
    "runId",
    "host",
    "port",
    "database",
    "role",
    "container",
    "project",
    "caHash",
    "passwordHash",
    "commit",
  ]);
  if (
    m.version !== "MRD-v1" ||
    m.runId !== runId ||
    m.host !== "127.0.0.1" ||
    m.port !== 55438 ||
    m.database !== "atlas_mrd_g2" ||
    m.role !== "atlas_mrd_local" ||
    typeof m.container !== "string" ||
    !/^[a-f0-9]{64}$/.test(m.container) ||
    m.project !== "atlas-mrd-" + runId ||
    typeof m.commit !== "string" ||
    !/^[a-f0-9]{40}$/.test(m.commit) ||
    m.passwordHash !== digest(password)
  )
    fail();
  const caPath = join(root, "ca.pem");
  privatePath(caPath, root);
  const ca = readFileSync(caPath, "utf8");
  if (
    m.caHash !== digest(ca) ||
    ca.includes("PRIVATE KEY") ||
    (ca.match(/BEGIN CERTIFICATE/g)?.length ?? 0) !== 1
  )
    fail();
  const cert = new X509Certificate(ca);
  if (
    !cert.ca ||
    cert.subject !== "CN=Atlas-MRD-local-CA" ||
    Date.now() < Date.parse(cert.validFrom) ||
    Date.now() >= Date.parse(cert.validTo)
  )
    fail("MRD_TLS_REJECTED");
  const options: PoolConfig = {
    host: "127.0.0.1",
    port: 55438,
    database: "atlas_mrd_g2",
    user: "atlas_mrd_local",
    password,
    max: 1,
    connectionTimeoutMillis: 3000,
    statement_timeout: 3000,
    query_timeout: 4000,
    idleTimeoutMillis: 1000,
    idle_in_transaction_session_timeout: 5000,
    maxLifetimeSeconds: 30,
    application_name: "atlas-mrd-local",
    options: "-c search_path=pg_catalog -c default_transaction_read_only=on",
    ssl: {
      ca,
      rejectUnauthorized: true,
      minVersion: "TLSv1.2",
      checkServerIdentity: (_name, peer) =>
        checkServerIdentity("127.0.0.1", peer),
    },
  };
  return { root, runId, commit: m.commit, options };
}
export function localConfiguration(input: unknown) {
  try {
    return readLocalConfiguration(input);
  } catch (error) {
    if (error instanceof MrdError && error.code === "MRD_TLS_REJECTED")
      throw error;
    fail();
  }
}
