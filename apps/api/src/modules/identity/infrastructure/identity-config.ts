export interface IdentityConfig {
  enabled: boolean;
  origin: string;
  secureCookie: boolean;
  secret: Buffer;
  absoluteSeconds: number;
  idleSeconds: number;
  verificationSeconds: number;
  recoverySeconds: number;
  ipLimit: number;
  identityLimit: number;
  argonMemory: number;
  argonPasses: number;
}
const invalid = (): never => {
  throw new Error("IDENTITY_CONFIGURATION_INVALID");
};
function number(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) invalid();
  return parsed;
}
export function identityDatabaseUrl(
  value: string | undefined,
  disposable: string | undefined,
): string {
  if (disposable !== "1" || !value) return invalid();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return invalid();
  }
  if (
    url.protocol !== "postgresql:" ||
    url.hostname !== "127.0.0.1" ||
    url.port !== "55436" ||
    url.pathname !== "/atlas_identity_id01" ||
    url.username !== "atlas_identity_migrator" ||
    url.password ||
    url.hash ||
    url.search !== "?schema=identity"
  )
    invalid();
  return value;
}
export function readIdentityConfig(env: NodeJS.ProcessEnv): IdentityConfig {
  const profile = env.IDENTITY_PROFILE ?? "disabled";
  const enabled = profile === "local-disposable";
  if (
    !["disabled", "local-disposable"].includes(profile) ||
    (enabled &&
      (env.IDENTITY_DISPOSABLE !== "1" || env.NODE_ENV === "production"))
  )
    invalid();
  const origin = env.IDENTITY_ORIGIN ?? "http://127.0.0.1:3002";
  if (!/^http:\/\/(127\.0\.0\.1|localhost):[1-9][0-9]{1,4}$/.test(origin))
    invalid();
  const url = new URL(origin);
  if (!url.port || Number(url.port) > 65535 || url.origin !== origin) invalid();
  const secretHex = env.IDENTITY_SECRET;
  if (enabled && (!secretHex || !/^[a-f0-9]{64}$/i.test(secretHex))) invalid();
  const absoluteSeconds = number(
    env.IDENTITY_ABSOLUTE_SECONDS,
    43200,
    60,
    43200,
  );
  const idleSeconds = number(env.IDENTITY_IDLE_SECONDS, 1800, 10, 1800);
  if (idleSeconds > absoluteSeconds) invalid();
  return {
    enabled,
    origin,
    secureCookie: env.IDENTITY_TEST_SECURE_COOKIE === "1",
    secret: enabled ? Buffer.from(secretHex!, "hex") : Buffer.alloc(0),
    absoluteSeconds,
    idleSeconds,
    verificationSeconds: number(env.IDENTITY_VERIFY_SECONDS, 1800, 60, 1800),
    recoverySeconds: number(env.IDENTITY_RECOVERY_SECONDS, 900, 60, 900),
    ipLimit: number(env.IDENTITY_IP_LIMIT, 60, 5, 120),
    identityLimit: number(env.IDENTITY_ACCOUNT_LIMIT, 10, 2, 20),
    argonMemory: number(env.IDENTITY_ARGON_MEMORY, 19456, 19456, 65536),
    argonPasses: number(env.IDENTITY_ARGON_PASSES, 2, 2, 4),
  };
}
