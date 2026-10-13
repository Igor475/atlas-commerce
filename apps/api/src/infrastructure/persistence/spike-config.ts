// Deliberately rejects cloud endpoints and ambient DATABASE_URL / PG* configuration.
export function disposableUrl(
  value: string | undefined,
  enabled: string | undefined,
): string {
  if (enabled !== "1" || !value)
    throw new Error("SPIKE_DISPOSABLE and isolated connection required");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid isolated connection configuration");
  }
  if (
    url.protocol !== "postgresql:" ||
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    url.port !== "55434" ||
    url.pathname !== "/atlas_spike_f0404" ||
    url.username !== "atlas_spike" ||
    url.password !== "" ||
    url.hash !== "" ||
    url.search !== "?schema=spike"
  ) {
    throw new Error("Only the dedicated loopback F04-04 database is allowed");
  }
  return url.toString();
}
export function poolSize(value: string | undefined): number {
  const size = value === undefined ? 2 : Number(value);
  if (!Number.isInteger(size) || size < 1 || size > 4)
    throw new Error("SPIKE_POOL_MAX must be 1..4");
  return size;
}

export function rejectAmbientPg(): void {
  if (
    Object.keys(process.env).some(
      (key) => key.startsWith("PG") || key === "DEBUG",
    )
  ) {
    throw new Error(
      "Remove ambient PG/DEBUG configuration before activating the isolated spike",
    );
  }
}
