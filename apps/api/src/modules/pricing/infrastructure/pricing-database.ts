import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "atlas-pricing-client";
import { PricingUnavailable, type PriceRow } from "../domain/price.js";
import type { PriceRepository } from "../application/public-prices.js";
import { pricingUrl } from "./pricing-config.js";
export class PricingDatabase implements PriceRepository {
  private readonly client: PrismaClient;
  constructor(url: string, consent: string | undefined) {
    pricingUrl(url, consent);
    this.client = new PrismaClient({
      adapter: new PrismaPg({
        host: "127.0.0.1",
        port: 55439,
        database: "atlas_catalog_cat01",
        user: "atlas_pricing_runtime",
        password: "",
        ssl: false,
        max: 2,
        connectionTimeoutMillis: 1000,
        idleTimeoutMillis: 1000,
        maxLifetimeSeconds: 30,
        statement_timeout: 1500,
        query_timeout: 2000,
        options:
          "-c search_path=pg_catalog -c default_transaction_read_only=on -c idle_in_transaction_session_timeout=2000",
        application_name: "atlas-pricing-runtime",
      }),
      log: [],
    });
  }
  async current(ids: readonly string[]): Promise<PriceRow[]> {
    try {
      const proof = await this.client.$queryRaw<
        {
          db: string;
          role: string;
          marker: string | null;
          catalog: string | null;
          version: number;
          unsafe: boolean;
        }[]
      >`SELECT current_database() db,current_user role,current_setting('atlas.pricing_fixture',true) marker,current_setting('atlas.catalog_fixture',true) catalog,current_setting('server_version_num')::int version,
        (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls
         OR EXISTS(SELECT 1 FROM pg_auth_members WHERE member=r.oid)
         OR has_schema_privilege('pricing','CREATE')
         OR has_table_privilege('pricing.price_revision','INSERT,UPDATE,DELETE,TRUNCATE')
         OR has_table_privilege('pricing.price_product','INSERT,UPDATE,DELETE,TRUNCATE')
         OR has_function_privilege('pricing.replace_base_price(uuid,bigint,text,text)','EXECUTE')) unsafe
        FROM pg_roles r WHERE r.rolname=current_user`;
      const p = proof[0];
      if (
        p?.db !== "atlas_catalog_cat01" ||
        p.role !== "atlas_pricing_runtime" ||
        p.marker !== "atlas-pric01-disposable" ||
        p.catalog !== "atlas-cat01-disposable" ||
        p.version < 170000 ||
        p.version >= 180000 ||
        p.unsafe !== false
      )
        throw new PricingUnavailable();
      if (!ids.length) return [];
      // One bounded batch statement, one PostgreSQL statement timestamp/MVCC snapshot.
      return await this.client.$queryRaw<PriceRow[]>(
        Prisma.sql`SELECT product_id AS "productId",amount_cents AS "amountCents",currency,source FROM pricing.current_prices WHERE product_id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})`,
      );
    } catch {
      throw new PricingUnavailable();
    }
  }
  async close() {
    await this.client.$disconnect();
  }
}
