export function pricingUrl(
  value: string,
  consent: string | undefined,
  migration = false,
): string {
  if (consent !== "PRIC-01") throw new Error("PRICING_CONSENT_REQUIRED");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("PRICING_CONFIG_INVALID");
  }
  if (
    url.protocol !== "postgresql:" ||
    url.hostname !== "127.0.0.1" ||
    url.port !== "55439" ||
    url.pathname !== "/atlas_catalog_cat01" ||
    url.username !==
      (migration ? "atlas_pricing_migrator" : "atlas_pricing_runtime") ||
    url.password ||
    url.hash ||
    url.search !== "?schema=pricing"
  )
    throw new Error("PRICING_LOCAL_FIXTURE_REQUIRED");
  return url.toString();
}
export function pricingEnabled(env: NodeJS.ProcessEnv): boolean {
  if (env.PRICING_MODE === undefined || env.PRICING_MODE === "disabled")
    return false;
  if (
    env.PRICING_MODE !== "local-disposable" ||
    env.NODE_ENV === "production" ||
    env.PRICING_CONSENT !== "PRIC-01" ||
    env.CATALOG_MODE !== "local-disposable" ||
    env.CATALOG_CONSENT !== "CAT-01"
  )
    throw new Error("PRICING_LOCAL_ONLY");
  if (
    Object.keys(env).some(
      (k) =>
        k.startsWith("PG") ||
        [
          "DATABASE_URL",
          "PRICING_MIGRATION_URL",
          "CATALOG_MIGRATION_URL",
        ].includes(k),
    )
  )
    throw new Error("PRICING_AMBIENT_CONNECTION_REJECTED");
  pricingUrl(env.PRICING_RUNTIME_URL ?? "", env.PRICING_CONSENT);
  return true;
}
