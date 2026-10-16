export function profileUrl(
  value: string,
  consent?: string,
  role: "actor_a" | "actor_b" | "migrator" = "actor_a",
) {
  if (consent !== "CP-01") throw new Error("PROFILE_CONSENT_REQUIRED");
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    throw new Error("PROFILE_CONFIG_INVALID");
  }
  if (
    u.protocol !== "postgresql:" ||
    u.hostname !== "127.0.0.1" ||
    u.port !== "55441" ||
    u.pathname !== "/atlas_profile_cp01" ||
    u.username !== "atlas_profile_" + role ||
    u.password ||
    u.hash ||
    u.search !== "?schema=customer_profile"
  )
    throw new Error("PROFILE_LOCAL_REQUIRED");
  return u.toString();
}
export function profileEnabled(env: NodeJS.ProcessEnv) {
  if (env.PROFILE_MODE === undefined || env.PROFILE_MODE === "disabled")
    return false;
  if (
    env.PROFILE_MODE !== "local-disposable" ||
    env.NODE_ENV === "production" ||
    env.PROFILE_CONSENT !== "CP-01" ||
    !["actor_a", "actor_b"].includes(env.PROFILE_FIXTURE_ROLE ?? "") ||
    Object.keys(env).some(
      (k) =>
        k.startsWith("PG") ||
        k === "DATABASE_URL" ||
        k.endsWith("MIGRATION_URL"),
    )
  )
    throw new Error("PROFILE_LOCAL_REQUIRED");
  profileUrl(
    env.PROFILE_RUNTIME_URL ?? "",
    env.PROFILE_CONSENT,
    env.PROFILE_FIXTURE_ROLE as "actor_a" | "actor_b",
  );
  return true;
}
