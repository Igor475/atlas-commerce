import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "atlas-inventory-client";
import { setTimeout as pause } from "node:timers/promises";
import {
  InventoryError,
  uuid,
  type Intent,
  type PhysicalLine,
  type ReservationResult,
} from "../domain/inventory.js";
import { inventoryUrl } from "./inventory-config.js";

function code(error: unknown): string | undefined {
  if (typeof error !== "object" || !error) return;
  const e = error as {
    code?: string;
    meta?: {
      code?: string;
      message?: string;
      driverAdapterError?: { cause?: { originalCode?: string } };
    };
  };
  return (
    e.meta?.code ?? e.meta?.driverAdapterError?.cause?.originalCode ?? e.code
  );
}
export class InventoryDatabase {
  private readonly client: PrismaClient;
  constructor(
    value: string,
    consent: string | undefined,
    private readonly purpose: "runtime" | "decider" = "runtime",
  ) {
    inventoryUrl(value, consent, purpose);
    this.client = new PrismaClient({
      adapter: new PrismaPg({
        host: "127.0.0.1",
        port: 55439,
        database: "atlas_catalog_cat01",
        user: `atlas_inventory_${purpose}`,
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
        application_name: `atlas-inventory-${purpose}`,
      }),
      log: [],
    });
  }
  private async run(work: () => Promise<ReservationResult[]>) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const proof = await this.client.$queryRaw<
          { safe: boolean }[]
        >`SELECT current_database()='atlas_catalog_cat01' AND current_user=${`atlas_inventory_${this.purpose}`} AND current_setting('atlas.inventory_fixture',true)='atlas-inv01-disposable' AND current_setting('atlas.catalog_fixture',true)='atlas-cat01-disposable' AND current_setting('atlas.pricing_fixture',true)='atlas-pric01-disposable' AND current_setting('server_version_num')::int BETWEEN 170000 AND 179999
          AND NOT (rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication)
          AND NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE member=r.oid)
          AND NOT has_function_privilege('inventory.transition(uuid,text,uuid)','EXECUTE')
          AND NOT has_function_privilege(${this.purpose === "runtime" ? "inventory.decide(uuid,text,uuid)" : "inventory.reserve(uuid,uuid,text,jsonb)"},'EXECUTE')
          AND NOT has_database_privilege(current_user,current_database(),'CREATE')
          AND NOT EXISTS(SELECT 1 FROM pg_namespace n WHERE n.nspname IN ('catalog','pricing','inventory','identity') AND (has_schema_privilege(n.oid,'CREATE') OR n.nspowner=r.oid))
          AND NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('catalog','pricing','inventory','identity') AND c.relkind IN ('r','p','v','m') AND (c.relowner=r.oid OR has_table_privilege(c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')))
          AS safe FROM pg_roles r WHERE rolname=current_user`;
        if (proof[0]?.safe !== true)
          throw new InventoryError("INVENTORY_UNAVAILABLE");
        const rows = await work();
        if (rows.length !== 1)
          throw new InventoryError("INVENTORY_UNAVAILABLE");
        return rows[0]!;
      } catch (error) {
        const state = code(error);
        if (["40001", "40P01"].includes(state ?? "") && attempt < 2) {
          await pause(10 * (attempt + 1));
          continue;
        }
        if (error instanceof InventoryError) throw error;
        // SQL details stay out of application errors, including connection strings and stack traces.
        const message =
          typeof error === "object" && error
            ? JSON.stringify((error as { meta?: unknown }).meta ?? {})
            : "";
        if (state === "23505" || message.includes("INVENTORY_INTENT_CONFLICT"))
          throw new InventoryError("INTENT_CONFLICT");
        if (message.includes("INVENTORY_INSUFFICIENT_STOCK"))
          throw new InventoryError("INSUFFICIENT_STOCK");
        throw new InventoryError("INVENTORY_UNAVAILABLE");
      }
    }
    throw new InventoryError("INVENTORY_UNAVAILABLE");
  }
  reserve(intent: Intent, fingerprint: string, lines: readonly PhysicalLine[]) {
    if (this.purpose !== "runtime") throw new InventoryError("DECISION_DENIED");
    return this.run(
      () =>
        this.client.$queryRaw<
          ReservationResult[]
        >`SELECT * FROM inventory.reserve(${intent.key}::uuid,${intent.commercialRef}::uuid,${fingerprint}::text,${JSON.stringify(lines)}::jsonb)`,
    );
  }
  expire(id: string) {
    if (!uuid.test(id) || this.purpose !== "runtime")
      throw new InventoryError("INVALID_INTENT");
    return this.run(
      () =>
        this.client.$queryRaw<
          ReservationResult[]
        >`SELECT * FROM inventory.expire(${id}::uuid)`,
    );
  }
  decide(id: string, action: "CONFIRMED" | "RELEASED", ref: string) {
    if (
      !uuid.test(id) ||
      !uuid.test(ref) ||
      !["CONFIRMED", "RELEASED"].includes(action) ||
      this.purpose !== "decider"
    )
      throw new InventoryError("DECISION_DENIED");
    return this.run(
      () =>
        this.client.$queryRaw<
          ReservationResult[]
        >`SELECT * FROM inventory.decide(${id}::uuid,${action}::text,${ref}::uuid)`,
    );
  }
  async close() {
    await this.client.$disconnect();
  }
}
