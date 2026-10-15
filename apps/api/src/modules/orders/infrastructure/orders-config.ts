const phases = {
  catalog: "atlas_catalog_migrator",
  pricing: "atlas_pricing_migrator",
  inventory: "atlas_inventory_migrator",
  orders: "atlas_orders_migrator",
} as const;
export type OrdersPhase = keyof typeof phases;
export function ordersUrl(
  value: string,
  consent: string | undefined,
  role: "runtime" | "actor_a" | "actor_b" | "migrator" = "runtime",
) {
  if (consent !== "ORD-01") throw new Error("ORDERS_CONSENT_REQUIRED");
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    throw new Error("ORDERS_CONFIG_INVALID");
  }
  if (
    u.protocol !== "postgresql:" ||
    u.hostname !== "127.0.0.1" ||
    u.port !== "55439" ||
    u.pathname !== "/atlas_catalog_cat01" ||
    u.username !== "atlas_orders_" + role ||
    u.password ||
    u.hash ||
    u.search !== "?schema=orders"
  )
    throw new Error("ORDERS_LOCAL_REQUIRED");
  return u.toString();
}
export function ordersPortUrl(
  value: string,
  consent: string | undefined,
  phase: OrdersPhase,
) {
  if (
    consent !== "ORD-01" ||
    !Object.hasOwn(phases, phase) ||
    phase === "orders"
  )
    throw new Error("ORDERS_PORT_CONFIG_INVALID");
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    throw new Error("ORDERS_PORT_CONFIG_INVALID");
  }
  if (
    u.protocol !== "postgresql:" ||
    u.hostname !== "127.0.0.1" ||
    u.port !== "55439" ||
    u.pathname !== "/atlas_catalog_cat01" ||
    u.username !== phases[phase] ||
    u.password ||
    u.hash ||
    u.search !== `?schema=${phase}_ord01_history`
  )
    throw new Error("ORDERS_LOCAL_REQUIRED");
  return u.toString();
}
export function ordersEnabled(env: NodeJS.ProcessEnv) {
  if (env.ORDERS_MODE === undefined || env.ORDERS_MODE === "disabled")
    return false;
  if (
    env.ORDERS_MODE !== "local-disposable" ||
    env.ORDERS_CONSENT !== "ORD-01" ||
    env.NODE_ENV === "production" ||
    Object.keys(env).some(
      (k) =>
        k.startsWith("PG") ||
        k.endsWith("MIGRATION_URL") ||
        k === "DATABASE_URL",
    )
  )
    throw new Error("ORDERS_LOCAL_ONLY");
  const role = env.ORDERS_FIXTURE_ROLE;
  if (role !== "actor_a" && role !== "actor_b")
    throw new Error("ORDERS_TEST_ONLY_IDENTITY_REQUIRED");
  ordersUrl(env.ORDERS_RUNTIME_URL ?? "", env.ORDERS_CONSENT, role);
  return true;
}
