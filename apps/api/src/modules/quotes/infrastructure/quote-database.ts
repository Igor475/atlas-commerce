import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "atlas-quotes-client";
import { setTimeout as pause } from "node:timers/promises";
import {
  QuoteError,
  type QuoteResult,
  type quoteRequest,
} from "../domain/quote.js";
import { quoteUrl } from "./quote-config.js";
export class QuoteDatabase {
  private readonly client: PrismaClient;
  constructor(
    value: string,
    consent: string | undefined,
    private readonly role: "actor_a" | "actor_b",
  ) {
    quoteUrl(value, consent, role);
    this.client = new PrismaClient({
      adapter: new PrismaPg({
        host: "127.0.0.1",
        port: 55439,
        database: "atlas_catalog_cat01",
        user: `atlas_quotes_${role}`,
        password: "",
        ssl: false,
        max: 3,
        connectionTimeoutMillis: 1000,
        idleTimeoutMillis: 1000,
        maxLifetimeSeconds: 30,
        statement_timeout: 2500,
        query_timeout: 3000,
        options:
          "-c search_path=pg_catalog -c lock_timeout=1500 -c idle_in_transaction_session_timeout=3000",
        application_name: `atlas-quotes-${role}`,
      }),
      log: [],
    });
  }
  private async run(work: () => Promise<{ result: QuoteResult }[]>) {
    for (let attempt = 0; attempt < 3; attempt++)
      try {
        const proof = await this.client.$queryRaw<
          { safe: boolean }[]
        >`SELECT current_database()='atlas_catalog_cat01' AND current_user=${`atlas_quotes_${this.role}`} AND current_setting('atlas.quotes_fixture',true)='atlas-qte01-disposable' AND current_setting('server_version_num')::int BETWEEN 170000 AND 179999
    AND NOT(rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication)
    AND NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE member=r.oid)
    AND NOT has_database_privilege(current_user,current_database(),'CREATE')
    AND NOT EXISTS(SELECT 1 FROM pg_namespace n WHERE n.nspname IN ('quotes','orders','catalog','pricing','inventory','identity') AND (has_schema_privilege(n.oid,'CREATE') OR n.nspowner=r.oid))
    AND NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('quotes','orders','catalog','pricing','inventory','identity') AND c.relkind IN ('r','p','v','m') AND (c.relowner=r.oid OR has_table_privilege(c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(c.oid,'SELECT,INSERT,UPDATE,REFERENCES')))
    AND NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('quotes','orders','catalog','pricing','inventory') AND has_function_privilege(p.oid,'EXECUTE') AND NOT(n.nspname='quotes' AND p.proname IN ('issue','project'))) AS safe FROM pg_roles r WHERE rolname=current_user`;
        if (proof[0]?.safe !== true) throw new QuoteError("QUOTE_UNAVAILABLE");
        const rows = await work();
        if (rows.length !== 1 || !rows[0]?.result)
          throw new QuoteError("QUOTE_UNAVAILABLE");
        return rows[0].result;
      } catch (error) {
        if (error instanceof QuoteError) throw error;
        const e = error as {
          meta?: {
            code?: string;
            driverAdapterError?: { cause?: { originalCode?: string } };
          };
        };
        const state =
          e.meta?.code ?? e.meta?.driverAdapterError?.cause?.originalCode;
        if (["40001", "40P01"].includes(state ?? "") && attempt < 2) {
          await pause(10 * (attempt + 1));
          continue;
        }
        const detail = JSON.stringify(e.meta ?? {});
        if (detail.includes("UNAUTHENTICATED"))
          throw new QuoteError("UNAUTHENTICATED");
        if (detail.includes("RESOURCE_NOT_FOUND"))
          throw new QuoteError("RESOURCE_NOT_FOUND");
        if (
          /QUOTE_(INVALID|DELIVERY|PHYSICAL|MONEY|POLICY)|ORDERS_(CATALOG|PRICE|COMPOSITION)/.test(
            detail,
          )
        )
          throw new QuoteError("QUOTE_REJECTED");
        throw new QuoteError("QUOTE_UNAVAILABLE");
      }
    throw new QuoteError("QUOTE_UNAVAILABLE");
  }
  issue(
    actor: string,
    input: ReturnType<typeof quoteRequest>,
    policy: string,
    option: string | null,
  ) {
    return this.run(
      () =>
        this.client.$queryRaw<
          { result: QuoteResult }[]
        >`SELECT quotes.issue(${actor}::uuid,${JSON.stringify(input.items)}::jsonb,${input.addressId}::uuid,${policy}::uuid,${option}::text) result`,
    );
  }
  read(actor: string, id: string) {
    return this.run(
      () =>
        this.client.$queryRaw<
          { result: QuoteResult }[]
        >`SELECT quotes.project(${actor}::uuid,${id}::uuid) result`,
    );
  }
  async close() {
    await this.client.$disconnect();
  }
}
