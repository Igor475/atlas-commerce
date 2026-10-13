import { checkServerIdentity, type ConnectionOptions } from "node:tls";
import { PrismaPg } from "@prisma/adapter-pg";
import type { PoolConfig } from "pg";
import { certificateAuthority, type CloudProbePlan } from "./probe-config.js";
export const probeLimits = Object.freeze({
  connectionTimeoutMillis: 500,
  idleTimeoutMillis: 1000,
  maxLifetimeSeconds: 60,
  statement_timeout: 1500,
  query_timeout: 2000,
  idle_in_transaction_session_timeout: 3000,
});
export function verifiedTls(ca: string, host: string): ConnectionOptions {
  certificateAuthority(ca);
  return {
    ca,
    rejectUnauthorized: true,
    minVersion: "TLSv1.2",
    servername: host,
    checkServerIdentity: (_servername, certificate) =>
      checkServerIdentity(host, certificate),
  };
}
// Preparation is pure: no socket, DNS lookup, database query or migration.
export function cloudDriverOptions(plan: CloudProbePlan): PoolConfig {
  return {
    ...probeLimits,
    max: plan.poolMax,
    host: plan.host,
    port: 5432,
    user: plan.user,
    password: plan.password,
    database: plan.database,
    application_name: "atlas-readonly-probe",
    ssl: verifiedTls(plan.ca, plan.host),
    options: "-c default_transaction_read_only=on",
  };
}
export function prepareCloudPrismaAdapter(plan: CloudProbePlan): PrismaPg {
  return new PrismaPg(cloudDriverOptions(plan), {
    onPoolError: () => {},
    onConnectionError: () => {},
  });
}
