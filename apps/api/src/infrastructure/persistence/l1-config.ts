import { readFileSync } from "node:fs";
import type { PoolConfig } from "pg";
import { verifiedTls } from "./probe-driver.js";

export class L1Error extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}
export interface L1Review {
  projectName: string;
  projectRef: string;
  organization: string;
  host: string;
  username: string;
  role: string;
  transport: "session-ipv4";
  port: 5432;
  source: "dashboard-connect";
  caFile: string;
  // Dashboard evidence, not inferred from absent pgrst settings.
  dataApi: "disabled" | "enabled";
  exposedSchemas: string[];
}
const invalid = (): never => {
  throw new L1Error("L1_CONFIGURATION_INVALID");
};
export function l1Options(
  env: NodeJS.ProcessEnv,
  args: string[],
  review: L1Review,
): PoolConfig {
  if (
    args.length !== 1 ||
    args[0] !== "--consent-readonly=" + review.projectRef
  )
    throw new L1Error("REMOTE_AUTHORIZATION_REQUIRED");
  if (
    env.CI ||
    env.NODE_TLS_REJECT_UNAUTHORIZED === "0" ||
    Object.keys(env).some((key) => key.startsWith("PG") || key === "DEBUG") ||
    !review.projectName?.trim() ||
    !review.organization?.trim() ||
    !/^[a-z0-9]{20}$/.test(review.projectRef) ||
    env.ATLAS_SUPABASE_PROJECT_REF !== review.projectRef ||
    !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.pooler\.supabase\.com$/.test(review.host) ||
    review.port !== 5432 ||
    review.transport !== "session-ipv4" ||
    review.source !== "dashboard-connect" ||
    !/^atlas_[a-z0-9_]+_readonly$/.test(review.role) ||
    review.username !== review.role + "." + review.projectRef ||
    !["enabled", "disabled"].includes(review.dataApi) ||
    !Array.isArray(review.exposedSchemas) ||
    review.exposedSchemas.some((name) => !/^[a-z][a-z0-9_]*$/.test(name)) ||
    (review.dataApi === "disabled" && review.exposedSchemas.length !== 0) ||
    review.exposedSchemas.includes("identity") ||
    !env.ATLAS_SUPABASE_READONLY_PASSWORD ||
    /[\u0000-\u001f]/.test(env.ATLAS_SUPABASE_READONLY_PASSWORD)
  )
    invalid();
  return {
    host: review.host,
    port: 5432,
    database: "postgres",
    user: review.username,
    password: env.ATLAS_SUPABASE_READONLY_PASSWORD,
    ssl: verifiedTls(readFileSync(review.caFile, "utf8"), review.host),
    max: 1,
    connectionTimeoutMillis: 3000,
    query_timeout: 4000,
    statement_timeout: 3000,
    idle_in_transaction_session_timeout: 5000,
    idleTimeoutMillis: 1000,
    maxLifetimeSeconds: 30,
    application_name: "atlas-int02-readonly",
    // No options: default_transaction_read_only must be proven on the role.
  };
}
