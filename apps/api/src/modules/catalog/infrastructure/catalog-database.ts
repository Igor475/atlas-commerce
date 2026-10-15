import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "atlas-catalog-client";
import { CatalogError, type EditorialProduct } from "../domain/catalog.js";
import type { CatalogRepository } from "../application/catalog-reader.js";
import { catalogUrl } from "./catalog-config.js";

export class CatalogDatabase implements CatalogRepository {
  private readonly client: PrismaClient;
  constructor(url: string, consent: string | undefined) {
    catalogUrl(url, consent);
    this.client = new PrismaClient({
      adapter: new PrismaPg({
        host: "127.0.0.1",
        port: 55439,
        database: "atlas_catalog_cat01",
        user: "atlas_catalog_runtime",
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
        application_name: "atlas-catalog-runtime",
      }),
      log: [],
    });
  }
  private async read(
    work: () => Promise<EditorialProduct[]>,
  ): Promise<EditorialProduct[]> {
    try {
      // Identity of the disposable database is checked before every commercial read.
      const proof = await this.client.$queryRaw<
        { db: string; role: string; marker: string | null; version: number }[]
      >`SELECT current_database() AS db,current_user AS role,current_setting('atlas.catalog_fixture',true) AS marker,current_setting('server_version_num')::int AS version`;
      const row = proof[0];
      if (
        row?.db !== "atlas_catalog_cat01" ||
        row.role !== "atlas_catalog_runtime" ||
        row.marker !== "atlas-cat01-disposable" ||
        row.version < 170000 ||
        row.version >= 180000
      )
        throw new Error();
      return await work();
    } catch {
      throw new CatalogError("DEPENDENCY_UNAVAILABLE");
    }
  }
  page(after: string | null, limit: number) {
    return this.read(
      () =>
        this.client.$queryRaw<
          EditorialProduct[]
        >`SELECT id,title,product_type AS "productType",description FROM catalog.public_products WHERE (${after}::uuid IS NULL OR id>${after}::uuid) ORDER BY id LIMIT ${limit}`,
    );
  }
  async get(id: string) {
    return (
      await this.read(
        () =>
          this.client.$queryRaw<
            EditorialProduct[]
          >`SELECT id,title,product_type AS "productType",description FROM catalog.public_products WHERE id=${id}::uuid`,
      )
    )[0];
  }
  async close() {
    await this.client.$disconnect();
  }
}
