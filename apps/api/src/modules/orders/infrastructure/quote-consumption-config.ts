const owners = { orders: "atlas_orders_migrator" } as const;
export type ConsumptionPhase = keyof typeof owners;
function exact(
  value: string,
  consent: string | undefined,
  user: string,
  schema: string,
) {
  if (consent !== "QUSE-01") throw new Error("QUSE_CONSENT_REQUIRED");
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    throw new Error("QUSE_CONFIG_INVALID");
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
    throw new Error("QUSE_LOCAL_REQUIRED");
  return u.toString();
}
export function consumptionMigrationUrl(
  value: string,
  consent: string | undefined,
  phase: ConsumptionPhase,
) {
  if (!Object.hasOwn(owners, phase)) throw new Error("QUSE_PHASE_INVALID");
  return exact(value, consent, owners[phase], `${phase}_quse_history`);
}
export function consumptionUrl(
  value: string,
  consent: string | undefined,
  module: "quotes" | "orders",
  role: "actor_a" | "actor_b",
) {
  if (
    !["quotes", "orders"].includes(module) ||
    !["actor_a", "actor_b"].includes(role)
  )
    throw new Error("QUSE_CONFIG_INVALID");
  return exact(value, consent, `atlas_${module}_${role}`, module);
}
export function consumptionEnabled(env: NodeJS.ProcessEnv) {
  if (env.QUSE_MODE === undefined || env.QUSE_MODE === "disabled") return false;
  if (
    env.QUSE_MODE !== "local-disposable" ||
    env.QUSE_CONSENT !== "QUSE-01" ||
    env.NODE_ENV === "production" ||
    !["actor_a", "actor_b"].includes(env.QUSE_FIXTURE_ROLE ?? "") ||
    Object.keys(env).some(
      (k) =>
        k.startsWith("PG") ||
        k === "DATABASE_URL" ||
        k.endsWith("MIGRATION_URL"),
    )
  )
    throw new Error("QUSE_LOCAL_REQUIRED");
  for (const module of ["quotes", "orders"] as const)
    consumptionUrl(
      env[`QUSE_${module.toUpperCase()}_URL`] ?? "",
      env.QUSE_CONSENT,
      module,
      env.QUSE_FIXTURE_ROLE as "actor_a" | "actor_b",
    );
  return true;
}
