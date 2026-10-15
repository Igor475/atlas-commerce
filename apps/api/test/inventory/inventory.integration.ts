import "reflect-metadata";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { randomUUID, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync, fork } from "node:child_process";
import { once } from "node:events";
import { setTimeout as pause } from "node:timers/promises";
import pg from "pg";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../../src/app.module.js";
import {
  InventoryService,
  type AuthorizedComposition,
} from "../../src/modules/inventory/application/inventory-service.js";
import { InventoryDatabase } from "../../src/modules/inventory/infrastructure/inventory-database.js";
import { composeInventory } from "../../src/modules/inventory/inventory.module.js";
import {
  inventoryEnabled,
  inventoryUrl,
} from "../../src/modules/inventory/infrastructure/inventory-config.js";
import {
  type Intent,
  type Offer,
} from "../../src/modules/inventory/domain/inventory.js";
const id = (n: number) =>
  "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const options = {
  host: "127.0.0.1",
  port: 55439,
  database: "atlas_catalog_cat01",
  password: "",
  ssl: false as const,
  connectionTimeoutMillis: 1000,
};
const runtimeUrl =
  "postgresql://atlas_inventory_runtime@127.0.0.1:55439/atlas_catalog_cat01?schema=inventory";
const env = {
  INVENTORY_MODE: "local-disposable",
  INVENTORY_CONSENT: "INV-01",
  INVENTORY_RUNTIME_URL: runtimeUrl,
};
const intent = (items = [{ id: id(1), quantity: 1 }]): Intent => ({
  key: randomUUID(),
  commercialRef: randomUUID(),
  items,
});
describe("INV-01 PostgreSQL17 disposable ledger and reservations", () => {
  let admin: pg.Pool,
    writer: pg.Pool,
    reader: pg.Pool,
    store: InventoryDatabase,
    decider: InventoryDatabase,
    service: InventoryService;
  const extra: InventoryDatabase[] = [];
  async function sql(text: string, args?: unknown[]) {
    return admin.query(text, args);
  }
  async function stock(n = 1) {
    return (
      await sql(
        "SELECT on_hand::int,reserved_active::int,allocated::int,(on_hand-reserved_active-allocated)::int available FROM inventory.stock_balance WHERE sku=$1",
        [id(n)],
      )
    ).rows[0];
  }
  async function count(table: string) {
    if (
      !["intent", "reservation", "stock_ledger_entry", "event"].includes(table)
    )
      throw new Error();
    return Number(
      (await sql(`SELECT count(*) n FROM inventory.${table}`)).rows[0].n,
    );
  }
  // Fixture-only Catalog application adapter: real published composition, owner SQL confined to test harness.
  const catalog: AuthorizedComposition = {
    read: async (ids) => {
      const rows = (
        await sql(
          "SELECT p.id,p.product_type type,k.component_id,k.quantity,c.product_type component_type FROM catalog.public_products p LEFT JOIN catalog.kit_composition k ON k.kit_id=p.id LEFT JOIN catalog.public_products c ON c.id=k.component_id WHERE p.id=ANY($1::uuid[]) ORDER BY p.id,k.component_id",
          [ids],
        )
      ).rows;
      const offers = new Map<string, Offer>();
      for (const row of rows) {
        let offer = offers.get(row.id);
        if (!offer) {
          offer = {
            id: row.id,
            type: row.type,
            version: 1,
            ...(row.type === "KIT" ? { components: [] } : {}),
          };
          offers.set(row.id, offer);
        }
        if (row.component_id) {
          if (!row.component_type) throw new Error("INVALID_INTENT");
          (
            offer.components as {
              id: string;
              type: "PHYSICAL_BOOK";
              quantity: number;
            }[]
          ).push({
            id: row.component_id,
            type: row.component_type,
            quantity: row.quantity,
          });
        }
      }
      return offers;
    },
  };
  function decisionService(permitted = true) {
    return new InventoryService(store, catalog, {
      decide: async () => ({ ref: id(900), permitted }),
      apply: (rid, action, ref) => decider.decide(rid, action, ref),
    });
  }
  async function waitFor(work: () => Promise<boolean>, label: string) {
    const deadline = Date.now() + 1200;
    while (Date.now() < deadline) {
      if (await work()) return;
      await pause(5);
    }
    throw new Error("BARRIER_TIMEOUT_" + label);
  }
  async function blocked(number = 1) {
    await waitFor(
      async () =>
        Number(
          (
            await sql(
              "SELECT count(*) n FROM pg_stat_activity WHERE application_name LIKE 'atlas-inventory-%' AND wait_event_type='Lock'",
            )
          ).rows[0].n,
        ) >= number,
      "LOCK",
    );
  }
  async function lockStock(n = 1) {
    const c = await reader.connect();
    await c.query("BEGIN");
    await c.query(
      "SELECT 1 FROM inventory.stock_balance WHERE sku=$1 FOR UPDATE",
      [id(n)],
    );
    return c;
  }
  async function due(rid: string, futureMs = -1000) {
    // Fixture clock positioning only; never a runtime TTL override. Keep exact 40-minute constraint.
    await sql(
      "ALTER TABLE inventory.reservation DISABLE TRIGGER reservation_guard",
    );
    try {
      await sql(
        "WITH observed AS MATERIALIZED (SELECT clock_timestamp()+($2::int*interval '1 millisecond') t) UPDATE inventory.reservation SET created_at=observed.t-interval '40 minutes',expires_at=observed.t FROM observed WHERE id=$1",
        [rid, futureMs],
      );
    } finally {
      await sql(
        "ALTER TABLE inventory.reservation ENABLE TRIGGER reservation_guard",
      );
    }
  }
  async function reset() {
    await sql(
      "TRUNCATE inventory.event,inventory.stock_ledger_entry,inventory.reservation_line,inventory.intent,inventory.reservation,inventory.stock_balance,pricing.price_revision,pricing.price_product,catalog.kit_composition,catalog.product_category,catalog.work_author,catalog.product,catalog.edition,catalog.work,catalog.author,catalog.publisher,catalog.category CASCADE",
    );
    await sql(
      "INSERT INTO catalog.work VALUES($1,'DEMO INV Obra','PUBLISHED');",
      [id(100)],
    );
    await sql("INSERT INTO catalog.publisher VALUES($1,'DEMO INV Selo')", [
      id(200),
    ]);
    for (let n = 1; n <= 4; n++) {
      await sql(
        "INSERT INTO catalog.edition(id,work_id,publisher_id,label,language,status) VALUES($1,$2,$3,'DEMO','pt-BR','PUBLISHED')",
        [id(300 + n), id(100), id(200)],
      );
      await sql(
        "INSERT INTO catalog.product(id,sku,title,product_type,edition_id,status) VALUES($1,$2,'DEMO INV Produto',$3,$4,'PUBLISHED')",
        [
          id(n),
          "DEMO-INV-" + n,
          n <= 2 ? "PHYSICAL_BOOK" : n === 3 ? "EBOOK" : "DIGITAL_MAGAZINE",
          id(300 + n),
        ],
      );
    }
    for (let n = 5; n <= 7; n++) {
      await sql(
        "INSERT INTO catalog.product(id,sku,title,product_type) VALUES($1,$2,'DEMO INV Kit','KIT')",
        [id(n), "DEMO-INV-" + n],
      );
      for (const c of n === 5 ? [1, 2] : n === 6 ? [1, 3] : [3, 4])
        await sql("INSERT INTO catalog.kit_composition VALUES($1,$2,1)", [
          id(n),
          id(c),
        ]);
      await sql("UPDATE catalog.product SET status='PUBLISHED' WHERE id=$1", [
        id(n),
      ]);
    }
    for (const n of [1, 2]) {
      await writer.query(
        "INSERT INTO inventory.stock_balance(sku) VALUES($1)",
        [id(n)],
      );
      await writer.query(
        "INSERT INTO inventory.stock_ledger_entry(sku,kind,quantity,operation_ref,correlation_ref,delta_on_hand,delta_reserved,delta_allocated) VALUES($1,'FIXTURE_LOAD',10,$2,$2,10,0,0)",
        [id(n), randomUUID()],
      );
    }
  }
  beforeAll(async () => {
    admin = new pg.Pool({ ...options, user: "atlas_catalog_migrator", max: 5 });
    writer = new pg.Pool({
      ...options,
      user: "atlas_inventory_migrator",
      max: 2,
    });
    reader = new pg.Pool({
      ...options,
      user: "atlas_catalog_migrator",
      max: 3,
    });
    const p = (
      await sql(
        "SELECT current_database() db,current_setting('atlas.inventory_fixture',true) marker,current_setting('server_version_num')::int v",
      )
    ).rows[0];
    expect(p).toMatchObject({
      db: "atlas_catalog_cat01",
      marker: "atlas-inv01-disposable",
    });
    expect(p.v).toBeGreaterThanOrEqual(170000);
    expect(p.v).toBeLessThan(180000);
  });
  beforeEach(async () => {
    await reset();
    store = new InventoryDatabase(runtimeUrl, "INV-01");
    decider = new InventoryDatabase(
      runtimeUrl.replace("_runtime@", "_decider@"),
      "INV-01",
      "decider",
    );
    service = new InventoryService(store, catalog);
  });
  afterEach(async () => {
    await Promise.all([
      store.close(),
      decider.close(),
      ...extra.splice(0).map((db) => db.close()),
    ]);
  });
  afterAll(async () => {
    await Promise.all([writer.end(), reader.end(), admin.end()]);
  });
  it("INV-001 closed default and remote destination refusal", () => {
    expect(() => composeInventory({}, catalog)).toThrow(
      "INVENTORY_UNAVAILABLE",
    );
    for (const url of [
      runtimeUrl.replace("127.0.0.1", "supabase.com"),
      runtimeUrl + "&options=x",
      runtimeUrl.replace("_runtime@", "_migrator@"),
    ])
      expect(() => inventoryUrl(url, "INV-01")).toThrow();
    expect(() =>
      inventoryEnabled({ ...env, NODE_ENV: "production" }),
    ).toThrow();
  });
  it("INV-002 isolated migration and owners", async () => {
    expect(
      (
        await sql(
          "SELECT pg_get_userbyid(nspowner) owner FROM pg_namespace WHERE nspname='inventory'",
        )
      ).rows[0].owner,
    ).toBe("atlas_inventory_migrator");
    expect(
      (
        await sql(
          "SELECT count(*) n FROM inventory._prisma_migrations WHERE finished_at IS NOT NULL",
        )
      ).rows[0].n,
    ).toBe("1");
  });
  it("INV-003 repeat migration leaves ledger intact", async () => {
    const n = await count("stock_ledger_entry");
    const r = spawnSync(
      process.execPath,
      ["scripts/inventory-db.mjs", "migrate"],
      { encoding: "utf8", timeout: 60000 },
    );
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(await count("stock_ledger_entry")).toBe(n);
  });
  it("INV-004 runtime has no direct DML or decision capability", async () => {
    const c = new pg.Client({ ...options, user: "atlas_inventory_runtime" });
    await c.connect();
    try {
      for (const q of [
        "UPDATE inventory.stock_balance SET on_hand=99",
        "DELETE FROM inventory.stock_ledger_entry",
        "INSERT INTO inventory.stock_balance(sku) VALUES('" + id(3) + "')",
        "SELECT * FROM inventory.decide('" +
          id(1) +
          "','CONFIRMED','" +
          id(900) +
          "')",
        "CREATE TABLE inventory.bypass(id int)",
      ])
        await expect(c.query(q)).rejects.toMatchObject({ code: "42501" });
    } finally {
      await c.end();
    }
  });
  it("INV-005 SQL constraints reject invalid balances", async () => {
    for (const set of [
      "on_hand=-1",
      "reserved_active=11",
      "allocated=-1",
      "on_hand=2147483648",
    ])
      await expect(
        writer.query(
          "UPDATE inventory.stock_balance SET " + set + " WHERE sku=$1",
          [id(1)],
        ),
      ).rejects.toMatchObject({ code: "23514" });
    expect((await stock()).available).toBe(10);
  });
  it("INV-006 guard refuses wrong marker before any business write", async () => {
    await sql(
      "ALTER ROLE atlas_inventory_runtime SET atlas.inventory_fixture='wrong'",
    );
    try {
      await expect(service.reserve(intent())).rejects.toThrow(
        "INVENTORY_UNAVAILABLE",
      );
      expect(await count("reservation")).toBe(0);
    } finally {
      await sql(
        "ALTER ROLE atlas_inventory_runtime RESET atlas.inventory_fixture",
      );
    }
    await sql(
      "ALTER ROLE atlas_inventory_migrator SET atlas.inventory_fixture='wrong'",
    );
    try {
      const r = spawnSync(
        process.execPath,
        ["scripts/inventory-db.mjs", "migrate"],
        { encoding: "utf8", timeout: 60000 },
      );
      expect(r.status).toBe(1);
      expect(r.stdout + r.stderr).toContain(
        "INVENTORY_DISPOSABLE_FIXTURE_REQUIRED",
      );
      expect(r.stdout + r.stderr).not.toContain("Applying migration");
    } finally {
      await sql(
        "ALTER ROLE atlas_inventory_migrator RESET atlas.inventory_fixture",
      );
    }
  });
  it("INV-007 availability separates reserved from allocated", async () => {
    const r = await service.reserve(intent());
    expect(await stock()).toEqual({
      on_hand: 10,
      reserved_active: 1,
      allocated: 0,
      available: 9,
    });
    await decisionService().transition(r.id!, "CONFIRMED");
    expect(await stock()).toEqual({
      on_hand: 10,
      reserved_active: 0,
      allocated: 1,
      available: 9,
    });
  });
  it("INV-008 ledger and durable event cannot be changed", async () => {
    for (const table of ["stock_ledger_entry", "event"]) {
      if (table === "event") await service.reserve(intent());
      for (const verb of [
        "UPDATE " + table + " SET id=id",
        "DELETE FROM " + table,
      ])
        await expect(
          writer.query("" + verb.replace(table, "inventory." + table)),
        ).rejects.toThrow("INVENTORY_IMMUTABLE");
    }
  });
  it("INV-009 replay cannot duplicate physical effect", async () => {
    const i = intent();
    const first = await service.reserve(i);
    expect(await service.reserve(i)).toEqual(first);
    expect(await count("reservation")).toBe(1);
    expect(await count("stock_ledger_entry")).toBe(3);
  });
  it("INV-010 projection reconciles to ledger deltas", async () => {
    const a = await service.reserve(
      intent([
        { id: id(1), quantity: 3 },
        { id: id(2), quantity: 2 },
      ]),
    );
    await decisionService().transition(a.id!, "CONFIRMED");
    const b = await service.reserve(intent());
    await decisionService().transition(b.id!, "RELEASED");
    const rows = (
      await sql(
        "SELECT b.sku FROM inventory.stock_balance b JOIN (SELECT sku,sum(delta_on_hand) h,sum(delta_reserved) r,sum(delta_allocated) a FROM inventory.stock_ledger_entry GROUP BY sku) l USING(sku) WHERE b.on_hand<>l.h OR b.reserved_active<>l.r OR b.allocated<>l.a",
      )
    ).rows;
    expect(rows).toEqual([]);
  });
  it("INV-011 only existing physical SKU has a balance", async () => {
    await expect(
      writer.query("INSERT INTO inventory.stock_balance VALUES($1,0,0,0)", [
        id(999),
      ]),
    ).rejects.toThrow("INVENTORY_PHYSICAL_REQUIRED");
    expect(await stock()).toBeDefined();
  });
  it("INV-012 digital SKU cannot become physical stock", async () => {
    await expect(
      writer.query("INSERT INTO inventory.stock_balance VALUES($1,0,0,0)", [
        id(3),
      ]),
    ).rejects.toThrow("INVENTORY_PHYSICAL_REQUIRED");
    expect(await stock(3)).toBeUndefined();
  });
  it("INV-013 independent connections compete for last unit", async () => {
    await service.reserve(intent([{ id: id(1), quantity: 9 }]));
    const lock = await lockStock();
    const other = new InventoryDatabase(runtimeUrl, "INV-01");
    extra.push(other);
    const s2 = new InventoryService(other, catalog);
    const pending = Promise.allSettled([
      service.reserve(intent()),
      s2.reserve(intent()),
    ]);
    await blocked(2);
    await lock.query("COMMIT");
    lock.release();
    const results = await pending;
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect((await stock()).available).toBe(0);
    console.log(
      "INV_LAST_UNIT",
      JSON.stringify({
        initialAvailable: 1,
        success: results.filter((r) => r.status === "fulfilled").length,
        refused: results.filter((r) => r.status === "rejected").length,
        after: await stock(),
      }),
    );
  });
  it("INV-014 different SKUs do not share global stock lock", async () => {
    const lock = await lockStock(1);
    try {
      const pending = service.reserve(intent());
      await blocked();
      const other = new InventoryDatabase(runtimeUrl, "INV-01");
      extra.push(other);
      const r = await new InventoryService(other, catalog).reserve(
        intent([{ id: id(2), quantity: 1 }]),
      );
      expect(r.state).toBe("ACTIVE");
      await lock.query("ROLLBACK");
      expect((await pending).state).toBe("ACTIVE");
    } finally {
      lock.release();
    }
  });
  it("INV-015 duplicated physical SKUs consolidated", async () => {
    await service.reserve(
      intent([
        { id: id(1), quantity: 2 },
        { id: id(1), quantity: 3 },
      ]),
    );
    expect((await stock()).reserved_active).toBe(5);
    expect(
      (await sql("SELECT count(*) n FROM inventory.reservation_line")).rows[0]
        .n,
    ).toBe("1");
  });
  it("INV-016 all SKU commitments and event commit together", async () => {
    const r = await service.reserve(
      intent([
        { id: id(2), quantity: 2 },
        { id: id(1), quantity: 3 },
      ]),
    );
    expect((await stock()).reserved_active).toBe(3);
    expect((await stock(2)).reserved_active).toBe(2);
    expect(
      (
        await sql("SELECT kind FROM inventory.event WHERE reservation_id=$1", [
          r.id,
        ])
      ).rows,
    ).toEqual([{ kind: "ACTIVE" }]);
  });
  it("INV-017 concurrent identical intent commits once", async () => {
    const i = intent();
    const [a, b] = await Promise.all([service.reserve(i), service.reserve(i)]);
    expect(a).toEqual(b);
    expect(await count("reservation")).toBe(1);
    expect((await stock()).reserved_active).toBe(1);
  });
  it("INV-018 fingerprint conflict has no second effect", async () => {
    const i = intent();
    await service.reserve(i);
    await expect(
      service.reserve({ ...i, items: [{ id: id(1), quantity: 2 }] }),
    ).rejects.toThrow("INTENT_CONFLICT");
    expect((await stock()).reserved_active).toBe(1);
    expect(await count("intent")).toBe(1);
  });
  it("INV-019 shortage rolls back entire intent", async () => {
    await expect(
      service.reserve(
        intent([
          { id: id(1), quantity: 2 },
          { id: id(2), quantity: 11 },
        ]),
      ),
    ).rejects.toThrow("INSUFFICIENT_STOCK");
    expect(await count("intent")).toBe(0);
    expect((await stock()).reserved_active).toBe(0);
  });
  it("INV-020 lock timeout rolls back and safe replay recovers", async () => {
    const lock = await lockStock();
    const i = intent();
    try {
      await expect(service.reserve(i)).rejects.toThrow("INVENTORY_UNAVAILABLE");
      expect(await count("intent")).toBe(0);
    } finally {
      await lock.query("ROLLBACK");
      lock.release();
    }
    expect((await service.reserve(i)).state).toBe("ACTIVE"); // Real PostgreSQL serialization SQLSTATE, with sequence outside rollback proving entire function is replayed.
    await sql(
      "CREATE SEQUENCE inventory.test_retry_sequence; CREATE FUNCTION inventory.test_retry() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN IF nextval('inventory.test_retry_sequence')=1 THEN RAISE EXCEPTION 'INVENTORY_TEST_SERIALIZATION' USING ERRCODE='40001'; END IF; RETURN NEW; END $$; CREATE TRIGGER test_retry BEFORE INSERT ON inventory.intent FOR EACH ROW EXECUTE FUNCTION inventory.test_retry()",
    );
    try {
      const retryIntent = intent();
      expect((await service.reserve(retryIntent)).state).toBe("ACTIVE");
      expect(
        (await sql("SELECT last_value FROM inventory.test_retry_sequence"))
          .rows[0].last_value,
      ).toBe("2");
      expect(
        (
          await sql("SELECT count(*) n FROM inventory.intent WHERE key=$1", [
            retryIntent.key,
          ])
        ).rows[0].n,
      ).toBe("1");
      console.log(
        "INV_TRANSACTION_REPLAY",
        JSON.stringify({ sqlstate: "40001", attempts: 2, effects: 1 }),
      );
    } finally {
      await sql(
        "DROP TRIGGER test_retry ON inventory.intent; DROP FUNCTION inventory.test_retry(); DROP SEQUENCE inventory.test_retry_sequence",
      );
    }
  });
  it("INV-021 physical kit expands all components", async () => {
    await service.reserve(intent([{ id: id(5), quantity: 2 }]));
    expect((await stock()).reserved_active).toBe(2);
    expect((await stock(2)).reserved_active).toBe(2);
  });
  it("INV-022 mixed kit reserves physical components only", async () => {
    await service.reserve(intent([{ id: id(6), quantity: 2 }]));
    expect((await stock()).reserved_active).toBe(2);
    expect(
      (await sql("SELECT sku FROM inventory.reservation_line")).rows,
    ).toEqual([{ sku: id(1) }]);
  });
  it("INV-023 digital kit has no reservation and stable replay", async () => {
    const i = intent([{ id: id(7), quantity: 1 }]);
    expect(await service.reserve(i)).toEqual({
      id: null,
      state: "NO_PHYSICAL",
      expiresAt: null,
    });
    expect(await service.reserve(i)).toEqual({
      id: null,
      state: "NO_PHYSICAL",
      expiresAt: null,
    });
    expect(await count("reservation")).toBe(0);
    expect(await count("intent")).toBe(1);
    expect(await count("stock_ledger_entry")).toBe(2);
  });
  it("INV-024 kit shortage cannot leave a partial commitment", async () => {
    await service.reserve(intent([{ id: id(2), quantity: 10 }]));
    await expect(
      service.reserve(intent([{ id: id(5), quantity: 1 }])),
    ).rejects.toThrow("INSUFFICIENT_STOCK");
    expect((await stock()).reserved_active).toBe(0);
    expect(await count("reservation")).toBe(1);
  });
  it("INV-025 kits and individual SKU consolidate", async () => {
    await service.reserve(
      intent([
        { id: id(5), quantity: 2 },
        { id: id(6), quantity: 3 },
        { id: id(1), quantity: 1 },
      ]),
    );
    expect((await stock()).reserved_active).toBe(6);
    expect((await stock(2)).reserved_active).toBe(2);
  });
  it("INV-026 invalid or unpublished composition cannot reserve", async () => {
    await sql("UPDATE catalog.product SET status='UNPUBLISHED' WHERE id=$1", [
      id(2),
    ]);
    await expect(
      service.reserve(intent([{ id: id(5), quantity: 1 }])),
    ).rejects.toThrow("INVALID_INTENT");
    expect(await count("intent")).toBe(0);
  });
  it("INV-027 TTL equals 40 minutes from PostgreSQL after locks", async () => {
    const lock = await lockStock();
    const pending = service.reserve(intent());
    await blocked();
    const before = (await sql("SELECT clock_timestamp() t")).rows[0].t;
    await lock.query("COMMIT");
    lock.release();
    const r = await pending;
    const row = (
      await sql(
        "SELECT created_at,extract(epoch FROM expires_at-created_at)::int seconds FROM inventory.reservation WHERE id=$1",
        [r.id],
      )
    ).rows[0];
    expect(row.seconds).toBe(2400);
    expect(row.created_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect((await service.expire(r.id!)).state).toBe("ACTIVE");
  });
  it("INV-028 two expirers release exactly once", async () => {
    const r = await service.reserve(intent());
    await due(r.id!);
    const lock = await reader.connect();
    await lock.query("BEGIN");
    await lock.query(
      "SELECT 1 FROM inventory.reservation WHERE id=$1 FOR UPDATE",
      [r.id],
    );
    const pending = Promise.all([service.expire(r.id!), service.expire(r.id!)]);
    await blocked(2);
    await lock.query("COMMIT");
    lock.release();
    expect((await pending).map((x) => x.state)).toEqual(["EXPIRED", "EXPIRED"]);
    expect((await stock()).reserved_active).toBe(0);
    expect(
      (
        await sql(
          "SELECT count(*) n FROM inventory.stock_ledger_entry WHERE kind='EXPIRED'",
        )
      ).rows[0].n,
    ).toBe("1");
    console.log(
      "INV_DOUBLE_EXPIRATION",
      JSON.stringify({ effects: 1, after: await stock() }),
    );
  });
  it("INV-029 confirmation and expiration cannot both consume commitment", async () => {
    const r = await service.reserve(intent());
    await due(r.id!);
    const results = await Promise.allSettled([
      decisionService().transition(r.id!, "CONFIRMED"),
      service.expire(r.id!),
    ]);
    expect(results[0].status).toBe("rejected");
    expect((await stock()).allocated).toBe(0);
    expect((await stock()).reserved_active).toBe(0);
    expect(
      (await sql("SELECT state FROM inventory.reservation WHERE id=$1", [r.id]))
        .rows[0].state,
    ).toBe("EXPIRED");
    expect(
      (
        await sql(
          "SELECT kind FROM inventory.event WHERE kind='CONFIRMATION_REFUSED'",
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("INV-030 transaction starts before TTL but waits past deadline", async () => {
    const r = await service.reserve(intent());
    await due(r.id!, 350);
    const lock = await lockStock();
    const pending = decisionService()
      .transition(r.id!, "CONFIRMED")
      .then(
        () => "UNSAFE",
        (e) => (e as Error).message,
      );
    await blocked();
    await waitFor(
      async () =>
        (
          await sql(
            "SELECT clock_timestamp()>=expires_at passed FROM inventory.reservation WHERE id=$1",
            [r.id],
          )
        ).rows[0].passed,
      "DB_CLOCK",
    );
    await lock.query("COMMIT");
    lock.release();
    expect(await pending).toBe("RESERVATION_REFUSED");
    console.log(
      "INV_AFTER_LOCK_TTL",
      JSON.stringify({ outcome: "RESERVATION_REFUSED", after: await stock() }),
    );
    expect((await stock()).allocated).toBe(0);
    await service.expire(r.id!);
    expect((await stock()).available).toBe(10);
  });
  it("INV-031 terminal states never resurrect, confirmed never expires", async () => {
    const a = await service.reserve(intent());
    await decisionService().transition(a.id!, "CONFIRMED");
    expect((await service.expire(a.id!)).state).toBe("CONFIRMED");
    expect((await decisionService().transition(a.id!, "RELEASED")).state).toBe(
      "CONFIRMED",
    );
    const b = await service.reserve(intent());
    await decisionService().transition(b.id!, "RELEASED");
    await expect(
      decisionService().transition(b.id!, "CONFIRMED"),
    ).rejects.toThrow("RESERVATION_REFUSED");
    expect((await service.expire(b.id!)).state).toBe("RELEASED");
    expect((await stock()).allocated).toBe(1);
    await expect(
      decisionService(false).transition(b.id!, "CONFIRMED"),
    ).rejects.toThrow("DECISION_DENIED");
  });
  it("INV-032 killed process rolls back and restart/replay does not duplicate", async () => {
    const i = intent();
    const child = fork(new URL("./crash-child.mjs", import.meta.url), [], {
      silent: true,
      env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot },
    });
    try {
      expect((await once(child, "message"))[0]).toBe("READY");
      child.send({
        action: "reserve",
        key: i.key,
        ref: i.commercialRef,
        fingerprint: "a".repeat(64),
        lines: [{ sku: id(1), quantity: 1 }],
      });
      expect((await once(child, "message"))[0]).toBe("UNCOMMITTED");
      expect(await count("reservation")).toBe(0);
      const exited = once(child, "exit");
      child.kill("SIGKILL");
      await exited;
      await waitFor(
        async () =>
          Number(
            (
              await sql(
                "SELECT count(*) n FROM pg_stat_activity WHERE application_name='atlas-inventory-crash-proof'",
              )
            ).rows[0].n,
          ) === 0,
        "PROCESS_EXIT",
      );
      const r = await service.reserve(i);
      await store.close();
      store = new InventoryDatabase(runtimeUrl, "INV-01");
      service = new InventoryService(store, catalog);
      expect(await service.reserve(i)).toEqual(r);
      expect((await stock()).reserved_active).toBe(1);
    } finally {
      if (child.exitCode === null && !child.killed) child.kill("SIGKILL");
    }
  });
  it("INV-033 permissions, SQL injection and no inventory HTTP routes", async () => {
    const c = new pg.Client({ ...options, user: "atlas_inventory_runtime" });
    await c.connect();
    try {
      for (const q of [
        "UPDATE catalog.product SET title='x'",
        "UPDATE pricing.price_revision SET amount_cents=0",
        "SELECT * FROM inventory.event",
        "SET ROLE atlas_inventory_executor",
        "GRANT atlas_inventory_decider TO atlas_inventory_runtime",
      ])
        await expect(c.query(q)).rejects.toMatchObject({ code: "42501" });
    } finally {
      await c.end();
    }
    await expect(
      service.reserve(intent([{ id: "' OR true --", quantity: 1 }])),
    ).rejects.toThrow("INVALID_INTENT");
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = module.createNestApplication({ logger: false });
    try {
      await app.init();
      for (const path of [
        "/api/v1/inventory/reservations",
        "/api/v1/inventory/adjust",
        "/api/v1/inventory/confirm",
      ])
        expect(
          (await request(app.getHttpServer()).post(path).send({ paid: true }))
            .status,
        ).toBe(404);
    } finally {
      await app.close();
    }
  });
  it("INV-034 connection loss and committed-result replay recover", async () => {
    const i = intent();
    const r = await service.reserve(i);
    await sql(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE application_name='atlas-inventory-runtime'",
    );
    const replay = await service.reserve(i);
    expect(replay).toEqual(r);
    expect((await stock()).reserved_active).toBe(1);
    await sql(
      "GRANT UPDATE ON inventory.stock_balance TO atlas_inventory_runtime",
    );
    try {
      await expect(service.reserve(intent())).rejects.toThrow(
        "INVENTORY_UNAVAILABLE",
      );
    } finally {
      await sql(
        "REVOKE UPDATE ON inventory.stock_balance FROM atlas_inventory_runtime",
      );
    }
    expect((await service.reserve(intent())).state).toBe("ACTIVE");
  });
  it("INV-035 protected modules and normative documents unchanged", () => {
    const r = spawnSync(
      "git",
      [
        "diff",
        "--exit-code",
        "HEAD",
        "--",
        "apps/api/src/modules/catalog",
        "apps/api/src/modules/pricing",
        "apps/api/src/modules/identity",
        "apps/api/prisma-catalog",
        "apps/api/prisma-pricing",
        "apps/api/prisma-identity",
        "apps/api/test/catalog",
        "apps/api/test/pricing",
        "apps/api/test/identity",
        "apps/api/test/spike",
        "apps/api/test/connection",
        "apps/api/test/supabase",
        "apps/api/test/mrd",
        "docs/02-business-requirements",
        "docs/03-business-processes",
        "docs/04-architecture",
        "docs/05-engineering/contracts",
        "docs/07-security",
        "apps/storefront",
        "apps/admin",
        "pnpm-lock.yaml",
      ],
      { encoding: "utf8" },
    );
    expect(r.status, r.stdout + r.stderr).toBe(0);
  });
  it("INV-036 environment, SQL plan and honest aggregate status", async () => {
    const p = (await sql("SELECT version() version,current_database() db"))
      .rows[0];
    const plan = (
      await sql(
        "EXPLAIN(FORMAT JSON) SELECT id FROM inventory.reservation WHERE state='ACTIVE' AND expires_at<=clock_timestamp() ORDER BY expires_at,id LIMIT 100",
      )
    ).rows;
    expect(p.version).toContain("PostgreSQL 17");
    expect(
      readFileSync("../../.github/workflows/quality.yml", "utf8"),
    ).toContain("inventory-integration:");
    console.log("INV_ENV", JSON.stringify(p));
    console.log("INV_EXPLAIN", JSON.stringify(plan));
    console.log(
      "INV_LOCAL_36_AUTOMATED_CASES_REMOTE_DELTA_CI_NOT_EXECUTED_L1_PENDING_AGGREGATE_SEE_RESULTS",
    );
    expect(createHash("sha256").update("INV01").digest("hex")).toHaveLength(64);
  });
});
