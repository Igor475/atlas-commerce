import { readFileSync } from "node:fs";
import { X509Certificate } from "node:crypto";

export class ProbeConfigurationError extends Error {
  constructor(public readonly code = "INVALID_PERSISTENCE_CONFIGURATION") {
    super(code);
    this.name = "ProbeConfigurationError";
  }
}
export type ProbeConfig =
  | { profile: "disabled" }
  | {
      profile: "local-disposable";
      poolMax: number;
      role: "atlas_probe_readonly";
    }
  | CloudProbePlan;
export interface CloudProbePlan {
  profile: "cloud-readonly";
  host: string;
  user: string;
  role: string;
  password: string;
  database: "postgres";
  transport: "session-ipv4" | "direct-ipv6";
  poolMax: number;
  ca: string;
}
function fail(): never {
  throw new ProbeConfigurationError();
}
function required(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (!value || value.trim() !== value) fail();
  return value;
}
function maxPool(value: string | undefined): number {
  if (value !== undefined && !/^[1-4]$/.test(value)) fail();
  return value === undefined ? 2 : Number(value);
}
export function certificateAuthority(pem: string): string {
  try {
    if (
      pem.includes("PRIVATE KEY") ||
      (pem.match(/BEGIN CERTIFICATE/g)?.length ?? 0) !== 1
    )
      fail();
    const cert = new X509Certificate(pem);
    if (
      !cert.ca ||
      Date.now() < Date.parse(cert.validFrom) ||
      Date.now() >= Date.parse(cert.validTo)
    )
      fail();
    return pem;
  } catch {
    return fail();
  }
}
export function readProbeConfig(env: NodeJS.ProcessEnv): ProbeConfig {
  const known = new Set([
    "PERSISTENCE_ENABLED",
    "PERSISTENCE_PROFILE",
    "PERSISTENCE_POOL_MAX",
    "PERSISTENCE_LOCAL_DISPOSABLE",
    "PERSISTENCE_PROBE_URL",
    "PERSISTENCE_ENDPOINT_SOURCE",
    "PERSISTENCE_TRANSPORT",
    "PERSISTENCE_IPV6_VERIFIED",
    "PERSISTENCE_EXPECTED_HOST",
    "PERSISTENCE_EXPECTED_ROLE",
    "PERSISTENCE_TEST_PROJECT",
    "PERSISTENCE_TLS",
    "PERSISTENCE_CA_FILE",
  ]);
  if (
    Object.keys(env).some(
      (key) => key.startsWith("PERSISTENCE_") && !known.has(key),
    )
  )
    fail();
  const enabled = env.PERSISTENCE_ENABLED ?? "false";
  if (!["true", "false"].includes(enabled)) fail();
  const profile = env.PERSISTENCE_PROFILE ?? "disabled";
  if (!["disabled", "local-disposable", "cloud-readonly"].includes(profile))
    fail();
  const poolMax = maxPool(env.PERSISTENCE_POOL_MAX);
  if (enabled === "false") {
    if (profile !== "disabled") fail();
    for (const key of Object.keys(env)) {
      if (
        key.startsWith("PERSISTENCE_") &&
        ![
          "PERSISTENCE_ENABLED",
          "PERSISTENCE_PROFILE",
          "PERSISTENCE_POOL_MAX",
        ].includes(key) &&
        env[key]
      )
        fail();
    }
    return Object.freeze({ profile: "disabled" });
  }
  if (profile === "disabled") fail();
  if (
    Object.keys(env).some((key) => key.startsWith("PG") || key === "DEBUG") ||
    env.NODE_TLS_REJECT_UNAUTHORIZED === "0"
  )
    fail();
  if (profile === "local-disposable") {
    if (env.PERSISTENCE_LOCAL_DISPOSABLE !== "1") fail();
    for (const key of [
      "PERSISTENCE_ENDPOINT_SOURCE",
      "PERSISTENCE_IPV6_VERIFIED",
      "PERSISTENCE_PROBE_URL",
      "PERSISTENCE_TLS",
      "PERSISTENCE_CA_FILE",
      "PERSISTENCE_TRANSPORT",
      "PERSISTENCE_EXPECTED_HOST",
      "PERSISTENCE_EXPECTED_ROLE",
      "PERSISTENCE_TEST_PROJECT",
    ])
      if (env[key]) fail();
    return Object.freeze({ profile, poolMax, role: "atlas_probe_readonly" });
  }
  // Cloud preparation only. No inherited SPIKE/ambient DATABASE_URL and no CI activation.
  if (
    env.CI ||
    Object.keys(env).some((key) => key.startsWith("SPIKE_") && env[key]) ||
    env.PERSISTENCE_LOCAL_DISPOSABLE
  )
    fail();
  if (
    env.PERSISTENCE_ENDPOINT_SOURCE !== "dashboard-connect" ||
    env.PERSISTENCE_TLS !== "verify-full"
  )
    fail();
  const host = required(env, "PERSISTENCE_EXPECTED_HOST");
  const role = required(env, "PERSISTENCE_EXPECTED_ROLE");
  const project = required(env, "PERSISTENCE_TEST_PROJECT");
  if (
    !/^[a-z][a-z0-9_]{2,62}$/.test(role) ||
    [
      "postgres",
      "supabase_admin",
      "authenticator",
      "service_role",
      "anon",
      "authenticated",
    ].includes(role) ||
    !/^[a-z0-9]{8,64}$/.test(project)
  )
    fail();
  const transport = env.PERSISTENCE_TRANSPORT;
  if (transport !== "session-ipv4" && transport !== "direct-ipv6") fail();
  if (!/^[a-z0-9.-]+$/.test(host) || host.includes("..")) fail();
  if (
    transport === "session-ipv4" &&
    (!host.endsWith(".pooler.supabase.com") || env.PERSISTENCE_IPV6_VERIFIED)
  )
    fail();
  if (
    transport === "direct-ipv6" &&
    (!host.endsWith(".supabase.co") || env.PERSISTENCE_IPV6_VERIFIED !== "true")
  )
    fail();
  let url: URL;
  try {
    url = new URL(required(env, "PERSISTENCE_PROBE_URL"));
  } catch {
    return fail();
  }
  // Parse ourselves into fields: pg must never override explicit TLS from a URL query.
  if (
    url.protocol !== "postgresql:" ||
    url.hostname !== host ||
    url.port !== "5432" ||
    url.pathname !== "/postgres" ||
    url.search ||
    url.hash
  )
    fail();
  const user = transport === "session-ipv4" ? role + "." + project : role;
  let password: string;
  try {
    if (decodeURIComponent(url.username) !== user) fail();
    password = decodeURIComponent(url.password);
  } catch {
    return fail();
  }
  if (!password || /[\u0000-\u001f]/.test(password)) fail();
  let ca: string;
  try {
    ca = certificateAuthority(
      readFileSync(required(env, "PERSISTENCE_CA_FILE"), "utf8"),
    );
  } catch {
    return fail();
  }
  return Object.freeze({
    profile: "cloud-readonly",
    host,
    user,
    role,
    password,
    database: "postgres",
    transport,
    poolMax,
    ca,
  });
}
