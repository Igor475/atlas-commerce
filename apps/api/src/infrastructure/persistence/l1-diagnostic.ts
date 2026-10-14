import pg, { type PoolConfig } from "pg";
import { l1Queries } from "./l1-queries.js";

export interface L1Result {
  ready: boolean;
  status: 200 | 503;
  code:
    | "READONLY_PROVEN"
    | "ROLE_UNSAFE"
    | "DATA_API_UNVERIFIED"
    | "DB_UNAVAILABLE";
  elapsedMs: number;
  queries: (keyof typeof l1Queries)[];
}
// Diagnostic only: never registered as the application's DB_READINESS provider.
export class L1Diagnostic {
  private readonly pool: pg.Pool;
  private closed = false;
  private flight: Promise<L1Result> | undefined;
  constructor(
    options: PoolConfig,
    private readonly role: string,
    private readonly exposedSchemas: readonly string[],
  ) {
    this.pool = new pg.Pool(options);
    this.pool.on("error", () => {}); // Check reports only fixed codes, no driver text.
  }
  check(): Promise<L1Result> {
    return (this.flight ??= this.prove().finally(() => {
      this.flight = undefined;
    }));
  }
  private async prove(): Promise<L1Result> {
    const start = performance.now();
    const queries: L1Result["queries"] = [];
    let client: pg.PoolClient | undefined;
    let code: L1Result["code"] = "DB_UNAVAILABLE";
    const result = (): L1Result => ({
      ready: code === "READONLY_PROVEN",
      status: code === "READONLY_PROVEN" ? 200 : 503,
      code,
      elapsedMs: Math.round(performance.now() - start),
      queries,
    });
    try {
      if (this.closed) return result();
      client = await this.pool.connect();
      const query = async (id: keyof typeof l1Queries, values?: unknown[]) => {
        queries.push(id);
        return (await client!.query(l1Queries[id], values)).rows;
      };
      const server = (await query("server"))[0];
      const role = (await query("role"))[0];
      if (
        !server ||
        server.role !== this.role ||
        server.login !== this.role ||
        server.readonly !== "on" ||
        !server.ssl ||
        !role?.canlogin ||
        role.unsafe !== false
      ) {
        code = "ROLE_UNSAFE";
        return result();
      }
      await query("schemas");
      const exposure = await query("exposure", [[...this.exposedSchemas]]);
      const configured =
        typeof server.exposed === "string"
          ? server.exposed.split(",").map((s: string) => s.trim())
          : undefined;
      if (
        this.exposedSchemas.includes("identity") ||
        configured?.includes("identity") ||
        (configured &&
          configured.some((s: string) => !this.exposedSchemas.includes(s))) ||
        exposure.some((row) =>
          row.schema === "identity"
            ? row.public_grant || row.api_grant
            : this.exposedSchemas.includes(row.schema) &&
              (!row.rls || ["v", "m", "f"].includes(row.relkind)) &&
              (row.public_grant || row.api_grant),
        )
      ) {
        code = "DATA_API_UNVERIFIED";
        return result();
      }
      if ((await query("ping"))[0]?.ok === 1) code = "READONLY_PROVEN";
      return result();
    } catch {
      return result();
    } finally {
      // Destroy every checked-out socket, including timeouts. No session state/retry.
      client?.release(true);
    }
  }
  async close(): Promise<void> {
    this.closed = true;
    await this.flight;
    await this.pool.end();
  }
}
