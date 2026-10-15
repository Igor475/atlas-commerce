export function inventoryUrl(
  value: string,
  consent: string | undefined,
  purpose: "runtime" | "migrator" | "decider" = "runtime",
) {
  if (consent !== "INV-01") throw new Error("INVENTORY_CONSENT_REQUIRED");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("INVENTORY_CONFIG_INVALID");
  }
  if (
    url.protocol !== "postgresql:" ||
    url.hostname !== "127.0.0.1" ||
    url.port !== "55439" ||
    url.pathname !== "/atlas_catalog_cat01" ||
    url.username !== `atlas_inventory_${purpose}` ||
    url.password ||
    url.hash ||
    url.search !== "?schema=inventory"
  )
    throw new Error("INVENTORY_LOCAL_FIXTURE_REQUIRED");
  return url.toString();
}
export function inventoryEnabled(env: NodeJS.ProcessEnv) {
  if (env.INVENTORY_MODE === undefined || env.INVENTORY_MODE === "disabled")
    return false;
  if (
    env.INVENTORY_MODE !== "local-disposable" ||
    env.INVENTORY_CONSENT !== "INV-01" ||
    env.NODE_ENV === "production"
  )
    throw new Error("INVENTORY_LOCAL_ONLY");
  if (
    Object.keys(env).some(
      (k) =>
        k.startsWith("PG") ||
        k.endsWith("MIGRATION_URL") ||
        k === "DATABASE_URL",
    )
  )
    throw new Error("INVENTORY_AMBIENT_CONNECTION_REJECTED");
  inventoryUrl(env.INVENTORY_RUNTIME_URL ?? "", env.INVENTORY_CONSENT);
  return true;
}
