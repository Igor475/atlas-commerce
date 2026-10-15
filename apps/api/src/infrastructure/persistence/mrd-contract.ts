export const operations = Object.freeze([
  "PING",
  "SERVER_METADATA",
  "PRIVILEGES_SUMMARY",
  "SCHEMA_EXPOSURE_SUMMARY",
] as const);
export type Operation = (typeof operations)[number];
export const codes = Object.freeze([
  "MRD_OK",
  "MRD_ARGUMENT_INVALID",
  "MRD_CONSENT_REQUIRED",
  "MRD_CONFIGURATION_INVALID",
  "MRD_REMOTE_DISABLED",
  "MRD_IDENTITY_REJECTED",
  "MRD_TLS_REJECTED",
  "MRD_DB_UNAVAILABLE",
  "MRD_TIMEOUT",
  "MRD_BUSY",
  "MRD_RESULT_INVALID",
  "MRD_EXPOSURE_REVIEW_REQUIRED",
  "MRD_INTEGRITY_UNVERIFIED",
  "MRD_AUDIT_FAILED",
  "MRD_CLEANUP_FAILED",
  "MRD_INTERRUPTED",
  "MRD_INTERNAL_ERROR",
] as const);
export type Code = (typeof codes)[number];
export class MrdError extends Error {
  readonly code: Code;
  constructor(code: Code) {
    super(code);
    this.code = code;
  }
}
export function fail(code: Code = "MRD_CONFIGURATION_INVALID"): never {
  throw new MrdError(code);
}
export function parseArguments(args: string[]): Operation | "HELP" {
  if (args.length === 1 && args[0] === "--help") return "HELP";
  if (args.some((a) => /remote|supabase|postgres(?:ql)?:\/\//i.test(a)))
    fail("MRD_REMOTE_DISABLED");
  if (!args.includes("--consent-local=MRD-G2")) fail("MRD_CONSENT_REQUIRED");
  if (
    args.length !== 3 ||
    args[0] !== "--profile=local-disposable" ||
    args[1] !== "--consent-local=MRD-G2"
  )
    fail("MRD_ARGUMENT_INVALID");
  const op = operations.find((id) => args[2] === "--operation=" + id);
  if (!op) fail("MRD_ARGUMENT_INVALID");
  return op;
}
export function validateEnvironment(env: NodeJS.ProcessEnv): void {
  if (
    Object.keys(env).some(
      (k) =>
        /^(PG|PERSISTENCE_|SPIKE_|IDENTITY_|ATLAS_SUPABASE_|SUPABASE_)/.test(
          k,
        ) ||
        [
          "DATABASE_URL",
          "NODE_OPTIONS",
          "NODE_PATH",
          "DEBUG",
          "NODE_TLS_REJECT_UNAUTHORIZED",
          "SSL_CERT_FILE",
          "SSL_CERT_DIR",
          "NODE_EXTRA_CA_CERTS",
        ].includes(k),
    )
  )
    fail();
}
export function exact(
  value: unknown,
  keys: readonly string[],
): asserts value is Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.keys(value).length !== keys.length ||
    keys.some((k) => !Object.hasOwn(value, k))
  )
    fail("MRD_RESULT_INVALID");
}
export function envelope(
  operationId: Operation | null,
  code: Code,
  elapsedMs: number,
  data: unknown = null,
) {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs > 180000)
    fail("MRD_RESULT_INVALID");
  const blocked = [
    "MRD_ARGUMENT_INVALID",
    "MRD_CONSENT_REQUIRED",
    "MRD_CONFIGURATION_INVALID",
    "MRD_REMOTE_DISABLED",
    "MRD_IDENTITY_REJECTED",
    "MRD_BUSY",
    "MRD_EXPOSURE_REVIEW_REQUIRED",
  ].includes(code);
  const status =
    code === "MRD_OK"
      ? "MRD_LOCAL_OBSERVED"
      : blocked
        ? "MRD_BLOCKED"
        : "MRD_UNVERIFIED";
  const output = {
    contractVersion: "MRD-v1",
    status,
    code,
    operationId,
    elapsedMs: Math.floor(elapsedMs),
    l1SqlStrict: "PENDENTE",
    data: code === "MRD_OK" ? data : null,
  };
  if (Buffer.byteLength(JSON.stringify(output)) > 8192)
    fail("MRD_RESULT_INVALID");
  return output;
}
