import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client.js";
import { disposableUrl, poolSize, rejectAmbientPg } from "./spike-config.js";
import { FixtureError } from "./spike-port.js";

export const fixtureLimits = {
  connectionTimeoutMillis: 500,
  idleTimeoutMillis: 1000,
  maxLifetimeSeconds: 60,
  statement_timeout: 5000,
  lock_timeout: 3000,
  idle_in_transaction_session_timeout: 10000,
} as const;
export function createSpikeDatabase(
  env: NodeJS.ProcessEnv = process.env,
  applicationName = "atlas-f0404",
) {
  rejectAmbientPg();
  const connectionString = disposableUrl(
    env.SPIKE_DATABASE_URL,
    env.SPIKE_DISPOSABLE,
  );
  const faults = { pool: 0, connection: 0 };
  const adapter = new PrismaPg(
    {
      connectionString,
      ...fixtureLimits,
      max: poolSize(env.SPIKE_POOL_MAX),
      application_name: applicationName,
      // No ambient PG* credentials, TLS switches or search_path.
      host: "127.0.0.1",
      port: 55434,
      user: "atlas_spike",
      database: "atlas_spike_f0404",
      password: "",
      ssl: false,
    },
    {
      schema: "spike",
      onPoolError: () => {
        faults.pool++;
      },
      onConnectionError: () => {
        faults.connection++;
      },
    },
  );
  const client = new PrismaClient({
    adapter,
    log: [],
    errorFormat: "minimal",
    transactionOptions: {
      maxWait: 1000,
      timeout: 10000,
      isolationLevel: "ReadCommitted",
    },
  });
  return {
    client,
    faults,
    async onApplicationShutdown() {
      await client.$disconnect();
    },
  };
}
export type SpikeDatabase = ReturnType<typeof createSpikeDatabase>;
let processDatabase: SpikeDatabase | undefined;
// Lazy owner: importing the API without DB variables never opens a connection.
export function getProcessSpikeDatabase(): SpikeDatabase {
  return (processDatabase ??= createSpikeDatabase());
}
export async function closeProcessSpikeDatabase(): Promise<void> {
  const current = processDatabase;
  processDatabase = undefined;
  await current?.onApplicationShutdown();
}
export function sqlState(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const record = error as Record<string, unknown>;
  for (const field of ["code", "originalCode", "sqlState"]) {
    const value = record[field];
    if (
      typeof value === "string" &&
      /^[0-9A-Z]{5}$/.test(value) &&
      !value.startsWith("P")
    )
      return value;
  }
  for (const field of ["meta", "cause", "driverAdapterError"]) {
    const nested = sqlState(record[field]);
    if (nested) return nested;
  }
  return undefined;
}
// Deliberately no automatic retries: concurrency failures remain observable.
export async function safeFixture<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof FixtureError) throw error;
    const state = sqlState(error);
    throw new FixtureError(
      state === "40001" || state === "40P01"
        ? "TX_REPLAY_REQUIRED"
        : "DB_UNAVAILABLE",
      state,
    );
  }
}
