import "reflect-metadata";
import {
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  describe,
  it,
  expect,
} from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { fork, spawnSync } from "node:child_process";
import { once } from "node:events";
import { setTimeout as pause } from "node:timers/promises";
import pg from "pg";
import { Test } from "@nestjs/testing";
import http from "supertest";
import { AppModule } from "../../src/app.module.js";
import { OrdersDatabase } from "../../src/modules/orders/infrastructure/orders-database.js";
import { OrderPreparations } from "../../src/modules/orders/application/order-preparations.js";
import {
  ordersEnabled,
  ordersUrl,
  ordersPortUrl,
} from "../../src/modules/orders/infrastructure/orders-config.js";
import {
  preparationRequest,
  type PreparationRequest,
} from "../../src/modules/orders/domain/preparation.js";
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
const url = (role = "actor_a") =>
  `postgresql://atlas_orders_${role}@127.0.0.1:55439/atlas_catalog_cat01?schema=orders`;
const actor = id(800),
  other = id(801);
const attempt = (n = 1, quantity = 1): PreparationRequest => ({
  key: randomUUID(),
  items: [{ id: id(n), quantity }],
});
describe("ORD-01 local technical preparation, never commercial checkout", () => {
  let admin: pg.Pool,
    writer: pg.Pool,
    a: pg.Pool,
    b: pg.Pool,
    store: OrdersDatabase;
  const extras: OrdersDatabase[] = [];
  const sql = (text: string, args?: unknown[]) => admin.query(text, args);
  async function quote(req: PreparationRequest, who = actor, ttl = 600) {
    const q = randomUUID();
    await sql(
      "INSERT INTO orders.fixture_quote(id,actor_id,purpose,mode,items,expires_at) VALUES($1,$2,'TEST_ONLY','BASE_AT_PREPARE_TEST_ONLY',$3,clock_timestamp()+$4*interval '1 second')",
      [q, who, JSON.stringify(preparationRequest(req).items), ttl],
    );
    return q;
  }
  async function prepare(req = attempt(), q?: string, db = store, who = actor) {
    return db.prepare(
      who,
      preparationRequest(req),
      q ?? (await quote(req, who)),
    );
  }
  async function raw(
    client: pg.Pool | pg.PoolClient,
    req: PreparationRequest,
    q: string,
    who = actor,
  ) {
    return (
      await client.query("SELECT orders.prepare($1,$2,$3,$4::jsonb) result", [
        who,
        req.key,
        q,
        JSON.stringify(req.items),
      ])
    ).rows[0].result;
  }
  async function counts() {
    return (
      await sql(
        "SELECT (SELECT count(*)::int FROM orders.request) requests,(SELECT count(*)::int FROM orders.preparation) preparations,(SELECT count(*)::int FROM orders.event) events,(SELECT count(*)::int FROM inventory.reservation) reservations,(SELECT count(*)::int FROM inventory.stock_ledger_entry WHERE kind<>'FIXTURE_LOAD') ledger",
      )
    ).rows[0];
  }
  async function barrier(app = "atlas-orders-", n = 1) {
    const deadline = Date.now() + 1400;
    while (Date.now() < deadline) {
      const r = await sql(
        "SELECT count(*)::int n FROM pg_stat_activity WHERE application_name LIKE $1 AND wait_event_type='Lock'",
        [app + "%"],
      );
      if (r.rows[0].n >= n) return;
      await pause(5);
    }
    throw new Error("ORDERS_LOCK_BARRIER_TIMEOUT");
  }
  async function reset() {
    await sql(
      "TRUNCATE orders.fixture_principal,inventory.event,inventory.stock_ledger_entry,inventory.reservation_line,inventory.intent,inventory.reservation,inventory.stock_balance,pricing.price_revision,pricing.price_product,catalog.kit_composition,catalog.product_category,catalog.work_author,catalog.product,catalog.edition,catalog.work,catalog.author,catalog.publisher,catalog.category CASCADE",
    );
    await sql(
      "INSERT INTO orders.fixture_principal(role_name,actor_id,purpose) VALUES('atlas_orders_actor_a',$1,'TEST_ONLY'),('atlas_orders_actor_b',$2,'TEST_ONLY')",
      [actor, other],
    );
    await sql(
      "INSERT INTO catalog.work VALUES($1,'TEST_ONLY Obra','PUBLISHED')",
      [id(100)],
    );
    await sql("INSERT INTO catalog.publisher VALUES($1,'TEST_ONLY Selo')", [
      id(200),
    ]);
    for (let n = 1; n <= 4; n++) {
      await sql(
        "INSERT INTO catalog.edition(id,work_id,publisher_id,label,language,status) VALUES($1,$2,$3,'TEST_ONLY','pt-BR','PUBLISHED')",
        [id(300 + n), id(100), id(200)],
      );
      await sql(
        "INSERT INTO catalog.product(id,sku,title,product_type,edition_id,status) VALUES($1,$2,'TEST_ONLY Produto',$3,$4,'PUBLISHED')",
        [
          id(n),
          "TEST-ORD-" + n,
          n <= 2 ? "PHYSICAL_BOOK" : n === 3 ? "EBOOK" : "DIGITAL_MAGAZINE",
          id(300 + n),
        ],
      );
    }
    for (let n = 5; n <= 7; n++) {
      await sql(
        "INSERT INTO catalog.product(id,sku,title,product_type) VALUES($1,$2,'TEST_ONLY Kit','KIT')",
        [id(n), "TEST-ORD-" + n],
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
    for (let n = 1; n <= 7; n++)
      await sql(
        "SELECT pricing.replace_base_price($1,$2,'BRL','ORD_TEST_ONLY')",
        [id(n), n * 1000],
      );
    for (const n of [1, 2]) {
      await writer.query(
        "INSERT INTO inventory.stock_balance(sku) VALUES($1)",
        [id(n)],
      );
      const ref = randomUUID();
      await writer.query(
        "INSERT INTO inventory.stock_ledger_entry(sku,kind,quantity,operation_ref,correlation_ref,delta_on_hand,delta_reserved,delta_allocated) VALUES($1,'FIXTURE_LOAD',10,$2,$2,10,0,0)",
        [id(n), ref],
      );
    }
  }
  beforeAll(async () => {
    admin = new pg.Pool({ ...options, user: "atlas_catalog_migrator", max: 5 });
    writer = new pg.Pool({
      ...options,
      user: "atlas_inventory_migrator",
      max: 1,
    });
    a = new pg.Pool({
      ...options,
      user: "atlas_orders_actor_a",
      max: 2,
      application_name: "ord-raw-a",
    });
    b = new pg.Pool({
      ...options,
      user: "atlas_orders_actor_b",
      max: 1,
      application_name: "ord-raw-b",
    });
    expect(
      (await sql("SELECT current_setting('atlas.orders_fixture') marker"))
        .rows[0].marker,
    ).toBe("atlas-ord01-disposable");
  });
  beforeEach(async () => {
    await reset();
    store = new OrdersDatabase(url(), "ORD-01", "actor_a");
  });
  afterEach(async () => {
    await store.close();
    await Promise.all(extras.splice(0).map((x) => x.close()));
  });
  afterAll(async () => {
    await Promise.all([admin.end(), writer.end(), a.end(), b.end()]);
  });
  it("ORD-001 disabled composition and fixed local guards", () => {
    expect(ordersEnabled({})).toBe(false);
    for (const u of [
      url().replace("127.0.0.1", "supabase.com"),
      url() + "&sslmode=disable",
      url("migrator"),
      url().replace("55439", "5432"),
    ])
      expect(() => ordersUrl(u, "ORD-01", "actor_a")).toThrow();
    expect(() =>
      ordersEnabled({
        ORDERS_MODE: "local-disposable",
        ORDERS_CONSENT: "ORD-01",
        ORDERS_FIXTURE_ROLE: "actor_a",
        ORDERS_RUNTIME_URL: url(),
        NODE_ENV: "production",
      }),
    ).toThrow();
  });
  it("ORD-002 own schema, four isolated applied migration histories", async () => {
    expect(
      (
        await sql(
          "SELECT nspowner::regrole::text owner FROM pg_namespace WHERE nspname='orders'",
        )
      ).rows[0].owner,
    ).toBe("atlas_orders_migrator");
    for (const s of [
      "orders",
      "catalog_ord01_history",
      "pricing_ord01_history",
      "inventory_ord01_history",
    ]) {
      expect(
        Number(
          (
            await sql(
              `SELECT count(*) n FROM ${s}._prisma_migrations WHERE finished_at IS NOT NULL`,
            )
          ).rows[0].n,
        ),
      ).toBe(1);
    }
  });
  it("ORD-003 migration guards refuse wrong role and marker", async () => {
    const m = readFileSync(
      "prisma-orders/migrations/202610150007_preparation/migration.sql",
      "utf8",
    );
    await expect(a.query(m)).rejects.toMatchObject({ code: "P0001" });
    await a.query("ROLLBACK");
    const c = await admin.connect();
    try {
      await c.query("BEGIN;SET LOCAL atlas.orders_fixture='wrong'");
      await expect(c.query(m.replace(/^BEGIN;/, ""))).rejects.toThrow(
        "ORDERS_FIXTURE_REQUIRED",
      );
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
    expect(() =>
      ordersPortUrl(
        "postgresql://x@127.0.0.1:55439/atlas_catalog_cat01?schema=catalog_ord01_history",
        "ORD-01",
        "catalog",
      ),
    ).toThrow();
  });
  it("ORD-004 runtime ACLs deny raw writes, private reads, membership and maintenance", async () => {
    for (const q of [
      "SELECT * FROM orders.fixture_quote",
      "SELECT * FROM catalog.product",
      "SELECT * FROM pricing.price_revision",
      "SELECT * FROM inventory.reservation",
      "UPDATE orders.preparation SET currency='BRL'",
      "CREATE TABLE orders.bad(id int)",
      "SET ROLE atlas_orders_executor",
      "SELECT inventory.decide(gen_random_uuid(),'CONFIRMED',gen_random_uuid())",
      "SELECT pricing.replace_base_price(gen_random_uuid(),1,'BRL','bad')",
    ]) {
      await expect(a.query(q)).rejects.toMatchObject({ code: "42501" });
    }
    expect(
      (
        await a.query(
          "SELECT rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication FROM pg_roles WHERE rolname=current_user",
        )
      ).rows[0],
    ).toEqual({
      rolsuper: false,
      rolbypassrls: false,
      rolcreatedb: false,
      rolcreaterole: false,
      rolreplication: false,
    });
  });
  it("ORD-005 runners accept no destination arguments or credentials", () => {
    for (const file of ["scripts/orders-local.mjs", "scripts/orders-db.mjs"]) {
      const r = spawnSync(process.execPath, [file, "https://remote.invalid"], {
        encoding: "utf8",
      });
      expect(r.status).not.toBe(0);
      expect(r.stderr).toContain("ORDERS_COMMAND_INVALID");
    }
  });
  it("ORD-006 unbound runtime and missing trusted identity refuse", async () => {
    const pool = new pg.Pool({
      ...options,
      user: "atlas_orders_runtime",
      max: 1,
    });
    try {
      const req = attempt(),
        q = await quote(req);
      await expect(raw(pool, req, q)).rejects.toThrow("ORDERS_UNAUTHENTICATED");
    } finally {
      await pool.end();
    }
    expect(await counts()).toMatchObject({ preparations: 0, reservations: 0 });
  });
  it("ORD-007 physical snapshot and authoritative base cents", async () => {
    const r = await prepare();
    expect(r.lines[0]).toMatchObject({
      productId: id(1),
      sku: "TEST-ORD-1",
      editionId: id(301),
      quantity: 1,
      baseUnitCents: 1000,
    });
    expect(r.baseSubtotal).toEqual({ currency: "BRL", amountCents: 1000 });
  });
  it("ORD-008 ebook snapshot creates no inventory intent", async () => {
    const r = await prepare(attempt(3));
    expect(r.lines[0]!.productType).toBe("EBOOK");
    expect(r.reservationExpiresAt).toBeNull();
    expect(
      (await sql("SELECT count(*)::int n FROM inventory.intent")).rows[0].n,
    ).toBe(0);
  });
  it("ORD-009 digital magazine preserves editorial references", async () => {
    await prepare(attempt(4));
    const r = (await sql("SELECT editorial_snapshot FROM orders.line_snapshot"))
      .rows[0].editorial_snapshot;
    expect(r).toMatchObject({
      editionId: id(304),
      workId: id(100),
      workTitle: "TEST_ONLY Obra",
    });
  });
  it("ORD-010 physical kit own price and consolidated repeated SKU", async () => {
    const req = {
      key: randomUUID(),
      items: [
        { id: id(5), quantity: 2 },
        { id: id(1), quantity: 1 },
      ],
    };
    const r = await prepare(req);
    expect(r.baseSubtotal.amountCents).toBe(11000);
    expect(r.lines.find((l) => l.productId === id(5))?.components).toHaveLength(
      2,
    );
    expect(
      (
        await sql(
          "SELECT sku,quantity::int FROM inventory.reservation_line ORDER BY sku",
        )
      ).rows,
    ).toEqual([
      { sku: id(1), quantity: 3 },
      { sku: id(2), quantity: 2 },
    ]);
  });
  it("ORD-011 mixed kit physical reservation without digital entitlement", async () => {
    const r = await prepare(attempt(6));
    expect(r.lines[0]!.components.map((c) => c.productType).sort()).toEqual([
      "EBOOK",
      "PHYSICAL_BOOK",
    ]);
    expect(
      (await sql("SELECT count(*)::int n FROM inventory.reservation_line"))
        .rows[0].n,
    ).toBe(1);
    expect(r.reservationExpiresAt).toMatch(/Z$/);
  });
  it("ORD-012 immutable snapshot survives catalog/title/price withdrawal", async () => {
    const r = await prepare();
    await sql(
      "UPDATE catalog.product SET title='AFTER',status='DRAFT' WHERE id=$1",
      [id(1)],
    );
    await sql("SELECT pricing.replace_base_price($1,9000,'BRL','TEST_ONLY')", [
      id(1),
    ]);
    expect(await store.read(actor, r.id)).toEqual(r);
    for (const table of ["preparation", "line_snapshot", "event"])
      await expect(sql(`DELETE FROM orders.${table}`)).rejects.toThrow(
        "IMMUTABLE",
      );
  });
  it("ORD-013 all four participants share backend PID/XID and durable row xmin", async () => {
    const r = await prepare();
    const proof = (
      await sql(
        "SELECT participant_proof FROM orders.event WHERE preparation_id=$1",
        [r.id],
      )
    ).rows[0].participant_proof;
    expect(
      new Set(Object.values(proof).map((x) => (x as { pid: number }).pid)).size,
    ).toBe(1);
    expect(
      new Set(Object.values(proof).map((x) => (x as { xid: string }).xid)).size,
    ).toBe(1);
    const xids = (
      await sql(
        "SELECT xmin::text x FROM orders.preparation UNION ALL SELECT xmin::text FROM orders.event UNION ALL SELECT xmin::text FROM orders.line_snapshot UNION ALL SELECT xmin::text FROM inventory.reservation UNION ALL SELECT xmin::text FROM inventory.reservation_line UNION ALL SELECT xmin::text FROM inventory.stock_ledger_entry WHERE kind<>'FIXTURE_LOAD'",
      )
    ).rows;
    expect(xids.length).toBeGreaterThan(5);
    expect(new Set(xids.map((x) => x.x))).toEqual(new Set([proof.orders.xid]));
    console.log(
      "ORD_ATOMICITY_PROOF " +
        JSON.stringify({
          participants: proof,
          rowXids: [...new Set(xids.map((x) => x.x))],
          durableRows: xids.length,
        }),
    );
    const req = attempt(),
      q = await quote(req),
      c = await a.connect(),
      writer = await admin.connect();
    let pending: Promise<unknown> | undefined;
    try {
      await c.query("BEGIN");
      await raw(c, req, q);
      await writer.query("SET application_name='ord-blocked-writer'");
      pending = writer.query(
        "UPDATE catalog.product SET title='AFTER_LOCK' WHERE id=$1",
        [id(1)],
      );
      await barrier("ord-blocked-writer");
      await c.query("COMMIT");
      await pending;
      expect(
        (
          await sql(
            "SELECT title FROM orders.line_snapshot WHERE preparation_id IN (SELECT id FROM orders.request WHERE key=$1)",
            [req.key],
          )
        ).rows[0].title,
      ).toBe("TEST_ONLY Produto");
    } finally {
      await c.query("ROLLBACK");
      c.release();
      await pending?.catch(() => {});
      writer.release();
    }
  });
  it("ORD-014 injected failure after reservation rolls back every participant", async () => {
    await sql(
      "CREATE SEQUENCE orders.test_failure;GRANT USAGE ON SEQUENCE orders.test_failure TO atlas_orders_executor;CREATE FUNCTION orders.test_fail_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM nextval('orders.test_failure');RAISE EXCEPTION 'TEST_ONLY_AFTER_RESERVE'; END $$;REVOKE ALL ON FUNCTION orders.test_fail_event() FROM PUBLIC;GRANT EXECUTE ON FUNCTION orders.test_fail_event() TO atlas_orders_executor;CREATE TRIGGER test_fail BEFORE INSERT ON orders.event FOR EACH ROW EXECUTE FUNCTION orders.test_fail_event()",
    );
    try {
      await expect(prepare()).rejects.toThrow("ORDERS_UNAVAILABLE");
      expect(
        (await sql("SELECT last_value::int n FROM orders.test_failure")).rows[0]
          .n,
      ).toBe(1);
      expect(await counts()).toEqual({
        requests: 0,
        preparations: 0,
        events: 0,
        reservations: 0,
        ledger: 0,
      });
      expect(
        (
          await sql(
            "SELECT reserved_active::int n FROM inventory.stock_balance WHERE sku=$1",
            [id(1)],
          )
        ).rows[0].n,
      ).toBe(0);
    } finally {
      await sql(
        "DROP TRIGGER test_fail ON orders.event;DROP FUNCTION orders.test_fail_event();DROP SEQUENCE orders.test_failure",
      );
    }
    // Nontransactional sequence is an explicit fixture fault switch, never business data.
    await sql(
      "CREATE SEQUENCE orders.test_retry;GRANT USAGE ON SEQUENCE orders.test_retry TO atlas_orders_executor;CREATE FUNCTION orders.test_retry_once() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF nextval('orders.test_retry')=1 THEN RAISE EXCEPTION 'TEST_ONLY_SERIALIZATION' USING ERRCODE='40001'; END IF;RETURN NEW;END $$;REVOKE ALL ON FUNCTION orders.test_retry_once() FROM PUBLIC;GRANT EXECUTE ON FUNCTION orders.test_retry_once() TO atlas_orders_executor;CREATE TRIGGER test_retry BEFORE INSERT ON orders.event FOR EACH ROW EXECUTE FUNCTION orders.test_retry_once()",
    );
    try {
      await prepare();
      expect(
        (await sql("SELECT last_value::int n FROM orders.test_retry")).rows[0]
          .n,
      ).toBe(2);
      expect(await counts()).toMatchObject({
        requests: 1,
        preparations: 1,
        reservations: 1,
        events: 1,
        ledger: 1,
      });
    } finally {
      await sql(
        "DROP TRIGGER test_retry ON orders.event;DROP FUNCTION orders.test_retry_once();DROP SEQUENCE orders.test_retry",
      );
    }
  });
  it("ORD-015 stock shortage leaves no intent or partial kit reserve", async () => {
    await expect(prepare(attempt(5, 11))).rejects.toThrow(
      "PREPARATION_NOT_ELIGIBLE",
    );
    expect(await counts()).toEqual({
      requests: 0,
      preparations: 0,
      events: 0,
      reservations: 0,
      ledger: 0,
    });
  });
  it("ORD-016 price replacement after preliminary read is revalidated after slot lock", async () => {
    expect(
      (
        await sql(
          "SELECT amount_cents::int FROM pricing.current_prices WHERE product_id=$1",
          [id(1)],
        )
      ).rows[0].amount_cents,
    ).toBe(1000);
    const c = await admin.connect();
    let pending: ReturnType<typeof prepare> | undefined;
    try {
      await c.query("BEGIN");
      await c.query(
        "SELECT 1 FROM pricing.price_product WHERE product_id=$1 FOR UPDATE",
        [id(1)],
      );
      pending = prepare();
      await barrier();
      await c.query(
        "SELECT pricing.replace_base_price($1,2000,'BRL','TEST_ONLY')",
        [id(1)],
      );
      await c.query("COMMIT");
      expect((await pending).baseSubtotal.amountCents).toBe(2000);
    } finally {
      await c.query("ROLLBACK");
      c.release();
      await pending?.catch(() => {});
    }
  });
  it("ORD-017 publication withdrawn after preliminary read before product lock refuses", async () => {
    expect(
      (
        await sql(
          "SELECT count(*)::int n FROM catalog.public_products WHERE id=$1",
          [id(1)],
        )
      ).rows[0].n,
    ).toBe(1);
    const c = await admin.connect();
    let pending: ReturnType<typeof prepare> | undefined;
    try {
      await c.query("BEGIN");
      await c.query("SELECT 1 FROM catalog.product WHERE id=$1 FOR UPDATE", [
        id(1),
      ]);
      pending = prepare();
      await barrier();
      await c.query("UPDATE catalog.product SET status='DRAFT' WHERE id=$1", [
        id(1),
      ]);
      await c.query("COMMIT");
      await expect(pending).rejects.toThrow();
      expect(await counts()).toMatchObject({
        preparations: 0,
        reservations: 0,
      });
    } finally {
      await c.query("ROLLBACK");
      c.release();
      await pending?.catch(() => {});
    }
  });
  it("ORD-018 kit with unpublished component refuses without reserve", async () => {
    await sql("UPDATE catalog.product SET status='DRAFT' WHERE id=$1", [id(1)]);
    await expect(prepare(attempt(6))).rejects.toThrow();
    expect(await counts()).toMatchObject({ preparations: 0, reservations: 0 });
  });
  it("ORD-019 independent connections contend for last unit, only one commits", async () => {
    const req = attempt(1, 10),
      q = await quote(req);
    await prepare(req, q); // consume all; release neither reservation nor financial decision
    // Fresh SKU with one remaining unit via fixture load, never direct projection mutation.
    const ref = randomUUID();
    await writer.query(
      "INSERT INTO inventory.stock_ledger_entry(sku,kind,quantity,operation_ref,correlation_ref,delta_on_hand,delta_reserved,delta_allocated) VALUES($1,'FIXTURE_LOAD',1,$2,$2,1,0,0)",
      [id(1), ref],
    );
    const one = attempt(),
      two = attempt(),
      q1 = await quote(one),
      q2 = await quote(two);
    const c = await admin.connect();
    const second = new OrdersDatabase(url(), "ORD-01", "actor_a");
    extras.push(second);
    let tasks: Promise<unknown>[] = [];
    try {
      await c.query("BEGIN");
      await c.query(
        "SELECT 1 FROM inventory.stock_balance WHERE sku=$1 FOR UPDATE",
        [id(1)],
      );
      tasks = [prepare(one, q1), prepare(two, q2, second)];
      await barrier("atlas-orders-", 2);
      await c.query("COMMIT");
      const results = await Promise.allSettled(tasks);
      expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
      expect(results.filter((x) => x.status === "rejected")).toHaveLength(1);
      expect(await counts()).toMatchObject({
        preparations: 2,
        reservations: 2,
        events: 2,
      });
    } finally {
      await c.query("ROLLBACK");
      c.release();
      await Promise.allSettled(tasks);
    }
  });
  async function crash(
    mode: "before" | "after",
    req: PreparationRequest,
    q: string,
  ) {
    const child = fork(
      new URL("./crash-child.mjs", import.meta.url),
      [mode, actor, req.key, q, JSON.stringify(req.items)],
      {
        silent: true,
        env: {
          PATH: process.env.PATH,
          Path: process.env.Path,
          SystemRoot: process.env.SystemRoot,
        },
      },
    );
    let stderr = "";
    child.stderr?.on("data", (x) => {
      stderr += x;
    });
    const timeout = setTimeout(() => child.kill(), 8000);
    try {
      const message = once(child, "message"),
        exit = once(child, "exit");
      await Promise.race([
        message,
        exit.then(() => {
          throw new Error("ORDERS_CHILD_FAILED_" + stderr);
        }),
      ]);
      child.kill();
      await exit;
    } finally {
      clearTimeout(timeout);
      child.kill();
    }
  }
  it("ORD-020 process death before commit rolls back, new connection retries same stable intent", async () => {
    const timed = attempt(),
      tq = await quote(timed),
      c = await admin.connect();
    try {
      await c.query("BEGIN");
      await c.query(
        "SELECT 1 FROM inventory.stock_balance WHERE sku=$1 FOR UPDATE",
        [id(1)],
      );
      await expect(prepare(timed, tq)).rejects.toThrow("ORDERS_UNAVAILABLE");
      expect(await counts()).toMatchObject({
        preparations: 0,
        reservations: 0,
      });
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
    // The timeout says nothing about commit; recover by querying/replaying the same stable key.
    await prepare(timed, tq);
    await reset();
    const req = attempt(),
      q = await quote(req);
    await crash("before", req, q);
    expect(await counts()).toMatchObject({ preparations: 0, reservations: 0 });
    const r = await prepare(req, q);
    expect(await raw(a, req, q)).toEqual(r);
    expect(await counts()).toMatchObject({
      preparations: 1,
      reservations: 1,
      events: 1,
    });
  });
  it("ORD-021 canonical identical replay after price/publication change and quote expiry", async () => {
    const req = attempt(),
      q = await quote(req),
      r = await prepare(req, q);
    await sql("UPDATE catalog.product SET status='DRAFT' WHERE id=$1", [id(1)]);
    await sql(
      "UPDATE orders.fixture_quote SET created_at=clock_timestamp()-interval '2 seconds',expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",
      [q],
    );
    expect(await prepare(req, q)).toEqual(r);
    expect(await counts()).toMatchObject({
      preparations: 1,
      reservations: 1,
      events: 1,
    });
  });
  it("ORD-022 same actor operation key with changed payload or quote conflicts", async () => {
    const req = attempt(),
      q = await quote(req);
    await prepare(req, q);
    await expect(
      prepare({ ...req, items: [{ id: id(1), quantity: 2 }] }, q),
    ).rejects.toThrow("PREPARATION_CONFLICT");
    await expect(prepare(req, await quote(req))).rejects.toThrow(
      "PREPARATION_CONFLICT",
    );
    expect(await counts()).toMatchObject({
      preparations: 1,
      events: 1,
      reservations: 1,
    });
  });
  it("ORD-023 two independent connections same intention converge after observed lock wait", async () => {
    const req = attempt(),
      q = await quote(req),
      c = await a.connect();
    let pending: Promise<unknown> | undefined;
    try {
      await c.query("BEGIN");
      const r = await raw(c, req, q);
      pending = prepare(req, q);
      await barrier();
      await c.query("COMMIT");
      expect(await pending).toEqual(r);
      expect(await counts()).toMatchObject({
        preparations: 1,
        reservations: 1,
        events: 1,
      });
    } finally {
      await c.query("ROLLBACK");
      c.release();
      await pending?.catch(() => {});
    }
  });
  it("ORD-024 process death after commit before application response recovers durably", async () => {
    const req = attempt(),
      q = await quote(req);
    await crash("after", req, q);
    expect(await counts()).toMatchObject({
      preparations: 1,
      reservations: 1,
      events: 1,
    });
    const r = await raw(a, req, q);
    expect(await prepare(req, q)).toEqual(r);
    expect(await counts()).toMatchObject({
      preparations: 1,
      reservations: 1,
      events: 1,
    });
  });
  it("ORD-025 deterministic actor/operation/key maps to stable inventory key", async () => {
    const req = attempt(),
      q = await quote(req);
    const r = await prepare(req, q);
    const row = (
      await sql(
        "SELECT q.operation,q.inventory_key,i.key,i.commercial_ref FROM orders.request q JOIN inventory.intent i ON i.key=q.inventory_key WHERE q.id=$1",
        [r.id],
      )
    ).rows[0];
    expect(row).toMatchObject({
      operation: "PREPARE_TEST_ONLY_V1",
      commercial_ref: r.id,
    });
    expect(row.key).toBe(row.inventory_key);
  });
  it("ORD-026 same external key for distinct trusted actors stays isolated", async () => {
    const req = attempt(),
      q1 = await quote(req),
      q2 = await quote(req, other);
    const r1 = await prepare(req, q1),
      r2 = await raw(b, req, q2, other);
    expect(r1.id).not.toBe(r2.id);
    expect(await counts()).toMatchObject({ preparations: 2, reservations: 2 });
  });
  it("ORD-027 server identity and SQL session identity both enforce ownership", async () => {
    const r = await prepare();
    await expect(
      b.query("SELECT orders.read_preparation($1,$2)", [other, r.id]),
    ).rejects.toThrow("RESOURCE_NOT_FOUND");
    await expect(
      b.query("SELECT orders.read_preparation($1,$2)", [actor, r.id]),
    ).rejects.toThrow("UNAUTHENTICATED");
    const s = new OrderPreparations(
      store,
      { principal: async () => ({ actorId: other, purpose: "TEST_ONLY" }) },
      { authorize: async () => ({ id: randomUUID(), purpose: "TEST_ONLY" }) },
    );
    await expect(s.read(r.id)).rejects.toThrow("UNAUTHENTICATED");
  });
  it("ORD-028 no checkout/order HTTP endpoints or startup migrations", async () => {
    const m = await Test.createTestingModule({
        imports: [AppModule],
      }).compile(),
      app = m.createNestApplication();
    await app.init();
    try {
      for (const path of [
        "/api/v1/checkouts",
        "/api/v1/orders",
        "/api/v1/me/orders/" + id(1),
      ]) {
        expect(
          (await http(app.getHttpServer()).post(path).send({})).status,
        ).toBe(404);
        expect((await http(app.getHttpServer()).get(path)).status).toBe(404);
      }
    } finally {
      await app.close();
    }
  });
  it("ORD-029 UXD-16 physical/mixed expiry equals real PostgreSQL reservation", async () => {
    for (const n of [1, 6]) {
      const r = await prepare(attempt(n));
      const row = (
        await sql(
          "SELECT to_char(i.expires_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') actual,p.reservation_expires_at=i.expires_at same FROM orders.preparation p JOIN inventory.reservation i ON i.id=p.reservation_id WHERE p.id=$1",
          [r.id],
        )
      ).rows[0];
      expect(row.same).toBe(true);
      expect(r.reservationExpiresAt).toBe(row.actual);
    }
  });
  it("ORD-030 UXD-16 digital-only kit and ebook always present null", async () => {
    for (const n of [3, 7]) {
      const r = await prepare(attempt(n));
      expect(Object.hasOwn(r, "reservationExpiresAt")).toBe(true);
      expect(r.reservationExpiresAt).toBeNull();
    }
    expect(await counts()).toMatchObject({ preparations: 2, reservations: 0 });
  });
  it("ORD-031 privileged capabilities and browser-controlled prices rejected fail-closed", async () => {
    expect(() =>
      preparationRequest({
        ...attempt(),
        owner: other,
      } as unknown as PreparationRequest),
    ).toThrow("INVALID_PREPARATION");
    expect(() =>
      preparationRequest({
        key: randomUUID(),
        items: [{ id: id(1), quantity: 1, price: 1 }],
      } as unknown as PreparationRequest),
    ).toThrow("INVALID_PREPARATION");
    await sql("GRANT CREATE ON SCHEMA orders TO atlas_orders_actor_a");
    try {
      await expect(prepare()).rejects.toThrow("ORDERS_UNAVAILABLE");
    } finally {
      await sql("REVOKE CREATE ON SCHEMA orders FROM atlas_orders_actor_a");
    }
    for (const capability of [
      "UPDATE(title) ON catalog.product",
      "SELECT(source) ON pricing.price_revision",
      "EXECUTE ON FUNCTION inventory.reserve(uuid,uuid,text,jsonb)",
    ]) {
      await sql(`GRANT ${capability} TO atlas_orders_actor_a`);
      try {
        await expect(prepare()).rejects.toThrow("ORDERS_UNAVAILABLE");
      } finally {
        await sql(`REVOKE ${capability} FROM atlas_orders_actor_a`);
      }
    }
    expect(await counts()).toMatchObject({ preparations: 0, reservations: 0 });
  });
  // These five cases protect existing sources; full executable regressions are separate required gates.
  const unchanged = (paths: string[]) => {
    for (const path of paths)
      expect(existsSync(path), "Protected path missing: " + path).toBe(true);
    const r = spawnSync(
      "git",
      ["diff", "--exit-code", "HEAD", "--", ...paths],
      { encoding: "utf8" },
    );
    expect(r.status, r.stdout + r.stderr).toBe(0);
  };
  it("ORD-032 Catalog/Pricing existing implementation and migration chains unchanged", () =>
    unchanged([
      "src/modules/catalog",
      "src/modules/pricing",
      "prisma-catalog",
      "prisma-pricing",
      "test/catalog",
      "test/pricing",
    ]));
  it("ORD-033 Inventory original ledger/reserve/decision and migrations unchanged", () =>
    unchanged(["src/modules/inventory", "prisma-inventory", "test/inventory"]));
  it("ORD-034 Identity/Resend implementations and security tests unchanged", () =>
    unchanged(["src/modules/identity", "prisma-identity", "test/identity"]));
  it("ORD-035 PGSP/L0/L1/MRD policies and runners unchanged", () =>
    unchanged([
      "src/infrastructure/persistence",
      "prisma",
      "test/connection",
      "test/spike",
      "test/supabase-l1",
      "test/mrd",
      "scripts/connection-local.mjs",
      "scripts/supabase-local.mjs",
      "scripts/mrd-local.mjs",
    ]));
  it("ORD-036 normative contracts and existing quality gates preserved", () => {
    unchanged([
      "../../docs/02-business-requirements",
      "../../docs/03-business-processes",
      "../../docs/04-architecture",
      "../../docs/07-security",
      "../../docs/05-engineering/contracts",
    ]);
    const ci = readFileSync("../../.github/workflows/quality.yml", "utf8");
    for (const job of [
      "checks:",
      "postgres-integration:",
      "identity-integration:",
      "inventory-integration:",
      "orders-integration:",
    ])
      expect(ci).toContain(job);
    expect(ci).toContain("pnpm install --frozen-lockfile");
  });
});
