const owners = {
  shipping: "atlas_shipping_migrator",
  profile: "atlas_profile_migrator",
  quotes: "atlas_quotes_migrator",
  orders: "atlas_orders_migrator",
} as const;
export type ShippingPhase = keyof typeof owners;
function exact(
  value: string,
  consent: string | undefined,
  user: string,
  schema: string,
) {
  if (consent !== "SHIP-01") throw new Error("SHIP_CONSENT_REQUIRED");
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    throw new Error("SHIP_CONFIG_INVALID");
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
    throw new Error("SHIP_LOCAL_REQUIRED");
  return u.toString();
}
export function shippingMigrationUrl(
  value: string,
  consent: string | undefined,
  phase: ShippingPhase,
) {
  if (!Object.hasOwn(owners, phase)) throw new Error("SHIP_PHASE_INVALID");
  return exact(value, consent, owners[phase], `${phase}_ship_history`);
}
export function shippingUrl(
  value: string,
  consent: string | undefined,
  module: "quotes" | "orders",
  role: "actor_a" | "actor_b",
) {
  if (
    !["quotes", "orders"].includes(module) ||
    !["actor_a", "actor_b"].includes(role)
  )
    throw new Error("SHIP_CONFIG_INVALID");
  return exact(value, consent, `atlas_${module}_${role}`, module);
}
export function shippingEnabled(env: NodeJS.ProcessEnv) {
  if (env.SHIP_MODE === undefined || env.SHIP_MODE === "disabled") return false;
  if (
    env.SHIP_MODE !== "local-disposable" ||
    env.SHIP_CONSENT !== "SHIP-01" ||
    env.NODE_ENV === "production" ||
    !["actor_a", "actor_b"].includes(env.SHIP_FIXTURE_ROLE ?? "") ||
    Object.keys(env).some(
      (k) =>
        k.startsWith("PG") ||
        k === "DATABASE_URL" ||
        k.endsWith("MIGRATION_URL"),
    )
  )
    throw new Error("SHIP_LOCAL_REQUIRED");
  for (const module of ["quotes", "orders"] as const)
    shippingUrl(
      env[`SHIP_${module.toUpperCase()}_URL`] ?? "",
      env.SHIP_CONSENT,
      module,
      env.SHIP_FIXTURE_ROLE as "actor_a" | "actor_b",
    );
  return true;
}
