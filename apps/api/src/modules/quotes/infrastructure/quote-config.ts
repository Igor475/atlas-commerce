const owners = {
  catalog: "atlas_catalog_migrator",
  pricing: "atlas_pricing_migrator",
  quotes: "atlas_quotes_migrator",
  orders: "atlas_orders_migrator",
} as const;
export type QuotePhase = keyof typeof owners;
export function quoteUrl(
  value: string,
  consent: string | undefined,
  role: "actor_a" | "actor_b" | "migrator" = "actor_a",
) {
  if (consent !== "QTE-01") throw new Error("QUOTE_CONSENT_REQUIRED");
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    throw new Error("QUOTE_CONFIG_INVALID");
  }
  if (
    u.protocol !== "postgresql:" ||
    u.hostname !== "127.0.0.1" ||
    u.port !== "55439" ||
    u.pathname !== "/atlas_catalog_cat01" ||
    u.username !== "atlas_quotes_" + role ||
    u.password ||
    u.hash ||
    u.search !== "?schema=quotes"
  )
    throw new Error("QUOTE_LOCAL_REQUIRED");
  return u.toString();
}
export function quoteMigrationUrl(
  value: string,
  consent: string | undefined,
  phase: QuotePhase,
) {
  if (consent !== "QTE-01" || !Object.hasOwn(owners, phase))
    throw new Error("QUOTE_CONFIG_INVALID");
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    throw new Error("QUOTE_CONFIG_INVALID");
  }
  const schema = phase === "quotes" ? "quotes" : `${phase}_qte01_history`;
  if (
    u.protocol !== "postgresql:" ||
    u.hostname !== "127.0.0.1" ||
    u.port !== "55439" ||
    u.pathname !== "/atlas_catalog_cat01" ||
    u.username !== owners[phase] ||
    u.password ||
    u.hash ||
    u.search !== `?schema=${schema}`
  )
    throw new Error("QUOTE_LOCAL_REQUIRED");
  return u.toString();
}
export function quotesEnabled(env: NodeJS.ProcessEnv) {
  if (env.QUOTES_MODE === undefined || env.QUOTES_MODE === "disabled")
    return false;
  if (
    env.QUOTES_MODE !== "local-disposable" ||
    env.QUOTES_CONSENT !== "QTE-01" ||
    env.NODE_ENV === "production" ||
    Object.keys(env).some(
      (k) =>
        k.startsWith("PG") ||
        k.endsWith("MIGRATION_URL") ||
        k === "DATABASE_URL",
    )
  )
    throw new Error("QUOTE_LOCAL_REQUIRED");
  const role = env.QUOTES_FIXTURE_ROLE;
  if (role !== "actor_a" && role !== "actor_b")
    throw new Error("QUOTE_IDENTITY_REQUIRED");
  quoteUrl(env.QUOTES_RUNTIME_URL ?? "", env.QUOTES_CONSENT, role);
  return true;
}
