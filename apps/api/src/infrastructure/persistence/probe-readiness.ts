import pg, { type PoolConfig } from "pg";
import {
  ProbeConfigurationError,
  readProbeConfig,
  type ProbeConfig,
} from "./probe-config.js";
import { probeLimits } from "./probe-driver.js";
export const DB_READINESS = Symbol("DB_READINESS");
export interface DatabaseReadiness {
  readonly configured: boolean;
  check(): Promise<boolean>;
  onApplicationShutdown(): Promise<void>;
}
export class ProbeUnavailableError extends Error {
  constructor(
    public readonly code:
      "DB_UNAVAILABLE" | "DB_ROLE_UNSAFE" = "DB_UNAVAILABLE",
  ) {
    super(code);
    this.name = "ProbeUnavailableError";
  }
}
const ROLE_PROOF = `SELECT current_user AS role, current_setting('transaction_read_only') AS readonly,
 (r.rolsuper OR r.rolbypassrls OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication
  OR EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members m WHERE m.member=r.oid)
  OR has_database_privilege(current_database(),'CREATE,TEMP')
  OR EXISTS (SELECT 1 FROM pg_catalog.pg_namespace n WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema' AND has_schema_privilege(n.oid,'CREATE'))
  OR EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema' AND c.relkind IN ('r','p','v','m','f')
    AND has_table_privilege(c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'))) AS unsafe
 FROM pg_catalog.pg_roles r WHERE r.rolname=current_user`;
export class ReadOnlyProbe implements DatabaseReadiness {
  readonly configured: boolean;
  private pool: pg.Pool | undefined;
  private closed = false;
  private inFlight: Promise<boolean> | undefined;
  constructor(
    private readonly config: ProbeConfig,
    private readonly poolFactory: (options: PoolConfig) => pg.Pool = (
      options,
    ) => new pg.Pool(options),
    private readonly report: (code: string) => void = () => {},
  ) {
    // Even a fully prepared cloud profile cannot be activated by env/startup in L0.
    if (config.profile === "cloud-readonly")
      throw new ProbeConfigurationError("REMOTE_AUTHORIZATION_REQUIRED");
    this.configured = config.profile === "local-disposable";
  }
  private getPool(): pg.Pool {
    if (this.config.profile !== "local-disposable" || this.closed)
      throw new ProbeUnavailableError();
    if (!this.pool) {
      this.pool = this.poolFactory({
        ...probeLimits,
        max: this.config.poolMax,
        host: "127.0.0.1",
        port: 55434,
        database: "atlas_spike_f0404",
        user: this.config.role,
        password: () => "",
        ssl: false,
        application_name: "atlas-f0405-probe",
        options: "-c default_transaction_read_only=on",
      });
      this.pool.on("error", () => this.report("DB_UNAVAILABLE"));
    }
    return this.pool;
  }
  check(): Promise<boolean> {
    if (!this.configured || this.closed) return Promise.resolve(false);
    return (this.inFlight ??= this.prove().finally(() => {
      this.inFlight = undefined;
    }));
  }
  private async prove(): Promise<boolean> {
    let client: pg.PoolClient | undefined;
    let broken = false;
    try {
      client = await this.getPool().connect();
      await client.query("BEGIN READ ONLY");
      await client.query("SELECT 1");
      const result = await client.query<{
        role: string;
        readonly: string;
        unsafe: boolean;
      }>(ROLE_PROOF);
      const proof = result.rows[0];
      if (
        this.config.profile !== "local-disposable" ||
        !proof ||
        proof.role !== this.config.role ||
        proof.readonly !== "on" ||
        proof.unsafe
      )
        throw new ProbeUnavailableError("DB_ROLE_UNSAFE");
      await client.query("COMMIT");
      return true;
    } catch (error) {
      broken = true;
      this.report(
        error instanceof ProbeUnavailableError ? error.code : "DB_UNAVAILABLE",
      );
      return false;
    } finally {
      client?.release(broken);
    }
  }
  async onApplicationShutdown(): Promise<void> {
    this.closed = true;
    await this.inFlight;
    await this.pool?.end();
  }
}
export function createReadiness(env: NodeJS.ProcessEnv): DatabaseReadiness {
  return new ReadOnlyProbe(readProbeConfig(env));
}
