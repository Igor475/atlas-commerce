const owners = {
  profile: "atlas_profile_migrator",
  quotes: "atlas_quotes_migrator",
  orders: "atlas_orders_migrator",
} as const;
export type IntegrationPhase = keyof typeof owners;
function exact(
  value: string,
  consent: string | undefined,
  user: string,
  schema: string,
) {
  if (consent !== "CP-02") throw new Error("CPINT_CONSENT_REQUIRED");
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    throw new Error("CPINT_CONFIG_INVALID");
  }
  if (
    u.protocol !== "postgresql:" ||
    u.hostname !== "127.0.0.1" ||
    u.port !== "55439" ||
    u.pathname !== "/atlas_catalog_cat01" ||
    u.username !== user ||
    u.password ||
    u.hash ||
    u.search !== `?schema=${schema}`
  )
    throw new Error("CPINT_LOCAL_REQUIRED");
  return u.toString();
}
export function integrationMigrationUrl(
  value: string,
  consent: string | undefined,
  phase: IntegrationPhase,
) {
  if (!Object.hasOwn(owners, phase)) throw new Error("CPINT_PHASE_INVALID");
  return exact(value, consent, owners[phase], `${phase}_cpint_history`);
}
export function integrationUrl(
  value: string,
  consent: string | undefined,
  module: "quotes" | "orders",
  role: "actor_a" | "actor_b",
) {
  if (
    !["quotes", "orders"].includes(module) ||
    !["actor_a", "actor_b"].includes(role)
  )
    throw new Error("CPINT_CONFIG_INVALID");
  return exact(value, consent, `atlas_${module}_${role}`, module);
}
export function integrationEnabled(env: NodeJS.ProcessEnv) {
  if (env.CPINT_MODE === undefined || env.CPINT_MODE === "disabled")
    return false;
  if (
    env.CPINT_MODE !== "local-disposable" ||
    env.CPINT_CONSENT !== "CP-02" ||
    env.NODE_ENV === "production" ||
    !["actor_a", "actor_b"].includes(env.CPINT_FIXTURE_ROLE ?? "") ||
    Object.keys(env).some(
      (k) =>
        k.startsWith("PG") ||
        k === "DATABASE_URL" ||
        k.endsWith("MIGRATION_URL"),
    )
  )
    throw new Error("CPINT_LOCAL_REQUIRED");
  for (const module of ["quotes", "orders"] as const)
    integrationUrl(
      env[`CPINT_${module.toUpperCase()}_URL`] ?? "",
      env.CPINT_CONSENT,
      module,
      env.CPINT_FIXTURE_ROLE as "actor_a" | "actor_b",
    );
  return true;
}
