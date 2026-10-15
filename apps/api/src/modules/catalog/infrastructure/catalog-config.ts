export const catalogDatabase = "atlas_catalog_cat01";
export function catalogUrl(
  value: string,
  consent: string | undefined,
  migration = false,
): string {
  if (consent !== "CAT-01") throw new Error("CATALOG_LOCAL_CONSENT_REQUIRED");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("CATALOG_CONFIG_INVALID");
  }
  if (
    url.protocol !== "postgresql:" ||
    url.hostname !== "127.0.0.1" ||
    url.port !== "55439" ||
    url.pathname !== "/" + catalogDatabase ||
    url.username !==
      (migration ? "atlas_catalog_migrator" : "atlas_catalog_runtime") ||
    url.password ||
    url.hash ||
    url.search !== "?schema=catalog"
  )
    throw new Error("CATALOG_LOCAL_FIXTURE_REQUIRED");
  return url.toString();
}
export function catalogEnabled(env: NodeJS.ProcessEnv): boolean {
  if (env.CATALOG_MODE === undefined || env.CATALOG_MODE === "disabled")
    return false;
  if (
    env.CATALOG_MODE !== "local-disposable" ||
    env.NODE_ENV === "production" ||
    env.CATALOG_CONSENT !== "CAT-01"
  )
    throw new Error("CATALOG_LOCAL_ONLY");
  if (
    Object.keys(env).some(
      (k) =>
        k.startsWith("PG") ||
        ["DATABASE_URL", "CATALOG_MIGRATION_URL"].includes(k),
    )
  )
    throw new Error("CATALOG_AMBIENT_CONNECTION_REJECTED");
  catalogUrl(env.CATALOG_RUNTIME_URL ?? "", env.CATALOG_CONSENT);
  return true;
}
