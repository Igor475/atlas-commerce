import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "atlas-orders-client";
import {
  type quoteRequest,
  type QuoteResult,
} from "../../quotes/domain/quote.js";
import { shippingQuote, shippingPreparation } from "../domain/shipping.js";
import { validateProjection } from "../../orders/domain/preparation.js";
import {
  IntegrationError,
  type IntegratedPreparation,
} from "../../customer-profile/application/profile-order-integration.js";
import { shippingUrl } from "./shipping-config.js";
export class ShippingDatabase {
  private readonly quotes: PrismaClient;
  private readonly orders: PrismaClient;
  constructor(
    quoteUrl: string,
    ordersUrl: string,
    consent: string | undefined,
    private readonly role: "actor_a" | "actor_b",
  ) {
    const client = (module: "quotes" | "orders", value: string) => {
      shippingUrl(value, consent, module, role);
      return new PrismaClient({
        adapter: new PrismaPg({
          host: "127.0.0.1",
          port: 55439,
          database: "atlas_catalog_cat01",
          user: `atlas_${module}_${role}`,
          password: "",
          ssl: false,
          max: 3,
          connectionTimeoutMillis: 1000,
          idleTimeoutMillis: 1000,
          maxLifetimeSeconds: 30,
          statement_timeout: 3500,
          query_timeout: 4000,
          options:
            "-c search_path=pg_catalog -c lock_timeout=2000 -c idle_in_transaction_session_timeout=5000",
          application_name: `atlas-ship-${module}-${role}`,
        }),
        log: [],
      });
    };
    this.quotes = client("quotes", quoteUrl);
    this.orders = client("orders", ordersUrl);
  }
  private async safe(
    tx: Prisma.TransactionClient,
    module: "quotes" | "orders",
  ) {
    const allowed =
      module === "quotes"
        ? [
            "quotes.issue_shipping(uuid,jsonb,uuid,uuid,text)",
            "quotes.project_shipping(uuid,uuid)",
          ]
        : [
            "orders.prepare_shipping_quote(uuid,uuid,uuid)",
            "orders.read_shipping_preparation(uuid,uuid)",
          ];
    const rows = await tx.$queryRaw<
      { safe: boolean }[]
    >`SELECT current_database()='atlas_catalog_cat01' AND current_user=${`atlas_${module}_${this.role}`} AND current_setting('atlas.shipping_fixture',true)='atlas-ship01-disposable' AND current_setting('server_version_num')::int BETWEEN 170000 AND 179999
   AND NOT(rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication)
   AND NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE member=r.oid)
   AND NOT has_database_privilege(current_database(),'CREATE,TEMP')
   AND NOT EXISTS(SELECT 1 FROM pg_namespace n WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND (n.nspowner=r.oid OR has_schema_privilege(n.oid,'CREATE')))
   AND NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p','v','m','f') AND n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND (c.relowner=r.oid OR has_table_privilege(c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(c.oid,'SELECT,INSERT,UPDATE,REFERENCES')))
   AND NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='S' AND n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND (c.relowner=r.oid OR has_sequence_privilege(c.oid,'SELECT,UPDATE,USAGE')))
   AND NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND has_function_privilege(p.oid,'EXECUTE') AND NOT(p.oid=${allowed[0]}::regprocedure OR p.oid=${allowed[1]}::regprocedure)) AS safe FROM pg_roles r WHERE rolname=current_user`;
    if (rows[0]?.safe !== true)
      throw new IntegrationError("INTEGRATION_UNAVAILABLE");
  }
  private async run<T>(
    module: "quotes" | "orders",
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this[module].$transaction(
        async (tx) => {
          await this.safe(tx, module);
          return work(tx);
        },
        { maxWait: 1000, timeout: 6000 },
      );
    } catch (e) {
      if (e instanceof IntegrationError) throw e;
      const detail = JSON.stringify((e as { meta?: unknown })?.meta ?? {});
      if (detail.includes("UNAUTHENTICATED"))
        throw new IntegrationError("UNAUTHENTICATED");
      if (detail.includes("RESOURCE_NOT_FOUND"))
        throw new IntegrationError("RESOURCE_NOT_FOUND");
      if (/IDEMPOTENCY_CONFLICT|PREPARATION_CONFLICT/.test(detail))
        throw new IntegrationError("CONFLICT");
      if (
        /SHIP_(POLICY|ZONE|OPTION|ADDRESS|PHYSICAL)|VERSION_CONFLICT|QUOTE_(STALE|EXPIRED|REJECTED)|CATALOG_REJECTED|INSUFFICIENT_STOCK/.test(
          detail,
        )
      )
        throw new IntegrationError("STALE_INPUT");
      throw new IntegrationError("INTEGRATION_UNAVAILABLE");
    }
  }
  issue(
    actor: string,
    input: ReturnType<typeof quoteRequest>,
    policy: string,
    option: string | null,
  ) {
    return this.run("quotes", async (tx) => {
      const r = await tx.$queryRaw<
        { result: QuoteResult }[]
      >`SELECT quotes.issue_shipping(${actor}::uuid,${JSON.stringify(input.items)}::jsonb,${input.addressId}::uuid,${policy}::uuid,${option}::text) result`;
      return shippingQuote(r[0]!.result);
    });
  }
  quote(actor: string, id: string) {
    return this.run("quotes", async (tx) => {
      const r = await tx.$queryRaw<
        { result: QuoteResult }[]
      >`SELECT quotes.project_shipping(${actor}::uuid,${id}::uuid) result`;
      return shippingQuote(r[0]!.result);
    });
  }
  private project(value: IntegratedPreparation) {
    if (!value || !Object.hasOwn(value, "addressSnapshot"))
      throw new IntegrationError("INTEGRATION_UNAVAILABLE");
    validateProjection(value.preparation);
    return shippingPreparation(value);
  }
  prepare(actor: string, key: string, quote: string) {
    return this.run("orders", async (tx) => {
      const r = await tx.$queryRaw<
        { result: IntegratedPreparation }[]
      >`SELECT orders.prepare_shipping_quote(${actor}::uuid,${key}::uuid,${quote}::uuid) result`;
      return this.project(r[0]!.result);
    });
  }
  read(actor: string, id: string) {
    return this.run("orders", async (tx) => {
      const r = await tx.$queryRaw<
        { result: IntegratedPreparation }[]
      >`SELECT orders.read_shipping_preparation(${actor}::uuid,${id}::uuid) result`;
      return this.project(r[0]!.result);
    });
  }
  async close() {
    await Promise.all([this.quotes.$disconnect(), this.orders.$disconnect()]);
  }
}
