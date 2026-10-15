import "reflect-metadata";
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
} from "vitest";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { setTimeout as pause } from "node:timers/promises";
import pg from "pg";
import { Test } from "@nestjs/testing";
import http from "supertest";
import { AppModule } from "../../src/app.module.js";
import { QuoteDatabase } from "../../src/modules/quotes/infrastructure/quote-database.js";
import { CheckoutQuotes } from "../../src/modules/quotes/application/checkout-quotes.js";
import {
  quoteRequest,
  type QuoteRequest,
} from "../../src/modules/quotes/domain/quote.js";
import {
  quotesEnabled,
  quoteUrl,
} from "../../src/modules/quotes/infrastructure/quote-config.js";
import { OrdersDatabase } from "../../src/modules/orders/infrastructure/orders-database.js";
import { contracts } from "../catalog/contracts.js";
const id = (n: number) =>
  "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const actor = id(800),
  other = id(801),
  address = id(901),
  policy = id(910);
const options = {
  host: "127.0.0.1",
  port: 55439,
  database: "atlas_catalog_cat01",
  password: "",
  ssl: false as const,
  connectionTimeoutMillis: 1000,
};
const url = (role = "actor_a") =>
  `postgresql://atlas_quotes_${role}@127.0.0.1:55439/atlas_catalog_cat01?schema=quotes`;
const req = (n = 3, quantity = 1): QuoteRequest => ({
  items: [{ productId: id(n), quantity }],
  ...(n === 1 || n === 2 || n === 5 || n === 6
    ? { shippingAddressId: address }
    : {}),
});
describe("QTE-01 PostgreSQL17 local TEST_ONLY quotes", () => {
  let admin: pg.Pool,
    writer: pg.Pool,
    a: pg.Pool,
    b: pg.Pool,
    store: QuoteDatabase,
    orders: OrdersDatabase,
    service: CheckoutQuotes;
  const sql = (s: string, args?: unknown[]) => admin.query(s, args);
  const issue = (
    r = req(),
    p = policy,
    option: string | null = "TEST_GROUND",
    who = actor,
    db = store,
  ) => db.issue(who, quoteRequest(r), p, option);
  const prepare = (q: string, key = randomUUID()) =>
    orders.prepareQuote(actor, key, q);
  async function effects() {
    return (
      await sql(
        "SELECT (SELECT count(*)::int FROM quotes.quote) quotes,(SELECT count(*)::int FROM orders.preparation) preparations,(SELECT count(*)::int FROM inventory.reservation) reservations,(SELECT count(*)::int FROM inventory.stock_ledger_entry WHERE kind<>'FIXTURE_LOAD') ledger",
      )
    ).rows[0];
  }
  async function barrier(prefix: string, minimum = 1) {
    const deadline = Date.now() + 1400;
    while (Date.now() < deadline) {
      if (
        (
          await sql(
            "SELECT count(*)::int n FROM pg_stat_activity WHERE application_name LIKE $1 AND wait_event_type='Lock'",
            [prefix + "%"],
          )
        ).rows[0].n >= minimum
      )
        return;
      await pause(5);
    }
    throw new Error("QTE_BARRIER_TIMEOUT");
  }
  async function reset() {
    await sql(
      "TRUNCATE quotes.fixture_customer,quotes.fixture_policy,quotes.fixture_physical,orders.fixture_principal,inventory.event,inventory.stock_ledger_entry,inventory.reservation_line,inventory.intent,inventory.reservation,inventory.stock_balance,pricing.price_revision,pricing.price_product,catalog.kit_composition,catalog.product_category,catalog.work_author,catalog.product,catalog.edition,catalog.work,catalog.author,catalog.publisher,catalog.category CASCADE",
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
          "TEST-QTE-" + n,
          n <= 2 ? "PHYSICAL_BOOK" : n === 3 ? "EBOOK" : "DIGITAL_MAGAZINE",
          id(300 + n),
        ],
      );
    }
    for (let n = 5; n <= 7; n++) {
      await sql(
        "INSERT INTO catalog.product(id,sku,title,product_type) VALUES($1,$2,'TEST_ONLY Kit','KIT')",
        [id(n), "TEST-QTE-" + n],
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
        "SELECT pricing.replace_base_price($1,$2,'BRL','QTE_TEST_ONLY')",
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
    await sql(
      "INSERT INTO quotes.fixture_customer VALUES($1,'TEST_ONLY'),($2,'TEST_ONLY')",
      [actor, other],
    );
    for (const [role, who] of [
      ["atlas_quotes_actor_a", actor],
      ["atlas_quotes_actor_b", other],
      ["atlas_orders_actor_a", actor],
      ["atlas_orders_actor_b", other],
    ])
      await sql(
        "INSERT INTO quotes.fixture_principal(role_name,actor_id) VALUES($1,$2)",
        [role, who],
      );
    await sql(
      "INSERT INTO quotes.fixture_address VALUES($1,$2,'TEST_ONLY','TEST_ZONE',true,true),($3,$4,'TEST_ONLY','TEST_ZONE',true,true)",
      [address, actor, id(902), other],
    );
    for (const n of [1, 2])
      await sql(
        "INSERT INTO quotes.fixture_physical VALUES($1,'TEST_ONLY',500,100,100,100)",
        [id(n)],
      );
    await sql(
      "INSERT INTO quotes.fixture_policy VALUES($1,'TEST_ONLY',1,true,600,'TEST_GROUND','TEST_ZONE',100,1,1000,2,4)",
      [policy],
    );
  }
  beforeAll(async () => {
    admin = new pg.Pool({ ...options, user: "atlas_catalog_migrator", max: 5 });
    writer = new pg.Pool({
      ...options,
      user: "atlas_inventory_migrator",
      max: 1,
    });
    a = new pg.Pool({ ...options, user: "atlas_quotes_actor_a", max: 2 });
    b = new pg.Pool({ ...options, user: "atlas_quotes_actor_b", max: 1 });
    expect(
      (await sql("SELECT current_setting('atlas.quotes_fixture') marker"))
        .rows[0].marker,
    ).toBe("atlas-qte01-disposable");
  });
  beforeEach(async () => {
    await reset();
    store = new QuoteDatabase(url(), "QTE-01", "actor_a");
    orders = new OrdersDatabase(
      "postgresql://atlas_orders_actor_a@127.0.0.1:55439/atlas_catalog_cat01?schema=orders",
      "ORD-01",
      "actor_a",
    );
    service = new CheckoutQuotes(
      store,
      { principal: async () => ({ actorId: actor, purpose: "TEST_ONLY" }) },
      {
        authorize: async () => ({
          policyId: policy,
          option: "TEST_GROUND",
          purpose: "TEST_ONLY",
        }),
      },
    );
  });
  afterEach(async () => {
    await Promise.all([store?.close(), orders?.close()]);
  });
  afterAll(async () => {
    await Promise.all([admin.end(), writer.end(), a.end(), b.end()]);
  });
  it("QTE-001 composition disabled and production refused", () => {
    expect(quotesEnabled({})).toBe(false);
    expect(() =>
      quotesEnabled({
        QUOTES_MODE: "local-disposable",
        QUOTES_CONSENT: "QTE-01",
        QUOTES_FIXTURE_ROLE: "actor_a",
        QUOTES_RUNTIME_URL: url(),
        NODE_ENV: "production",
      }),
    ).toThrow();
  });
  it("QTE-002 migration schema ownership and four applied/reapplied chains", async () => {
    expect(
      (
        await sql(
          "SELECT nspowner::regrole::text owner FROM pg_namespace WHERE nspname='quotes'",
        )
      ).rows[0].owner,
    ).toBe("atlas_quotes_migrator");
    for (const s of [
      "quotes",
      "catalog_qte01_history",
      "pricing_qte01_history",
      "orders_qte01_history",
    ])
      expect(
        Number(
          (
            await sql(
              `SELECT count(*) n FROM ${s}._prisma_migrations WHERE finished_at IS NOT NULL`,
            )
          ).rows[0].n,
        ),
      ).toBe(1);
  });
  it("QTE-003 migration refuses wrong role and fixture marker", async () => {
    const migration = readFileSync(
      "prisma-quotes/migrations/202610150010_quote/migration.sql",
      "utf8",
    );
    await expect(a.query(migration)).rejects.toThrow("QUOTE_FIXTURE_REQUIRED");
    await a.query("ROLLBACK");
    const c = await admin.connect();
    try {
      await c.query("BEGIN;SET LOCAL atlas.quotes_fixture='wrong'");
      await expect(c.query(migration.replace(/^BEGIN;/, ""))).rejects.toThrow(
        "QUOTE_FIXTURE_REQUIRED",
      );
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
  });
  it("QTE-004 runtime denies private reads, writes, maintenance and membership", async () => {
    for (const command of [
      "SELECT * FROM quotes.fixture_address",
      "SELECT * FROM pricing.price_revision",
      "SELECT * FROM orders.preparation",
      "UPDATE quotes.quote SET currency='BRL'",
      "CREATE TABLE quotes.bad(id int)",
      "SET ROLE atlas_quotes_executor",
      "SELECT inventory.reserve(gen_random_uuid(),gen_random_uuid(),'bad','[]')",
      "SELECT quotes.validate_for_preparation(gen_random_uuid(),gen_random_uuid())",
    ])
      await expect(a.query(command)).rejects.toMatchObject({ code: "42501" });
  });
  it("QTE-005 remote destination, extra arguments and parameters refused", () => {
    for (const value of [
      url().replace("127.0.0.1", "supabase.com"),
      url() + "&options=bad",
      url("migrator"),
    ])
      expect(() => quoteUrl(value, "QTE-01", "actor_a")).toThrow();
    for (const file of ["scripts/quotes-local.mjs", "scripts/quotes-db.mjs"]) {
      const r = spawnSync(process.execPath, [file, "https://remote.invalid"], {
        encoding: "utf8",
      });
      expect(r.status).not.toBe(0);
      expect(r.stderr).toMatch(/QUOTE[S]?_COMMAND_INVALID/);
    }
  });
  it("QTE-006 Pricing is sole unit-money authority", async () => {
    const q = await service.issue(req());
    expect(q.total).toEqual({ currency: "BRL", amountCents: 3000 });
    expect(
      (
        await sql(
          "SELECT unit_cents::int,subtotal_cents::int FROM quotes.line_snapshot",
        )
      ).rows[0],
    ).toEqual({ unit_cents: 3000, subtotal_cents: 3000 });
  });
  it("QTE-007 duplicate quantities consolidate safely", async () => {
    const q = await issue({
      items: [
        { productId: id(3), quantity: 2 },
        { productId: id(3), quantity: 3 },
      ],
    });
    expect(q.total.amountCents).toBe(15000);
    expect(
      (await sql("SELECT quantity FROM quotes.line_snapshot")).rows[0].quantity,
    ).toBe(5);
  });
  it("QTE-008 sum of lines and kit own price uses integer BRL", async () => {
    const q = await issue({
      items: [
        { productId: id(3), quantity: 2 },
        { productId: id(7), quantity: 1 },
      ],
    });
    expect(q.total.amountCents).toBe(13000);
    expect(
      (await sql("SELECT sum(subtotal_cents)::int n FROM quotes.line_snapshot"))
        .rows[0].n,
    ).toBe(13000);
  });
  it("QTE-009 overflow, invalid tariff, zero price and coupon explicitly refused", async () => {
    await sql(
      "SELECT pricing.replace_base_price($1,9007199254740991,'BRL','TEST_ONLY')",
      [id(3)],
    );
    await expect(issue(req(3, 2))).rejects.toThrow("QUOTE_REJECTED");
    await sql("SELECT pricing.replace_base_price($1,0,'BRL','TEST_ONLY')", [
      id(3),
    ]);
    await expect(issue()).rejects.toThrow("QUOTE_REJECTED");
    await expect(
      sql("UPDATE quotes.fixture_policy SET base_cents=-1"),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(service.issue({ ...req(), couponCode: "" })).rejects.toThrow(
      "COUPON_UNSUPPORTED",
    );
    expect((await effects()).quotes).toBe(0);
  });
  it("QTE-010 missing Pricing fails closed without quote or reservation", async () => {
    await sql("TRUNCATE pricing.price_revision,pricing.price_product CASCADE");
    await expect(issue()).rejects.toThrow("QUOTE_REJECTED");
    expect(await effects()).toEqual({
      quotes: 0,
      preparations: 0,
      reservations: 0,
      ledger: 0,
    });
  });
  it("QTE-011 issued snapshots immutable across price changes; new quote recalculates", async () => {
    const first = await issue();
    await sql("SELECT pricing.replace_base_price($1,9000,'BRL','TEST_ONLY')", [
      id(3),
    ]);
    expect((await issue()).total.amountCents).toBe(9000);
    expect(await store.read(actor, first.quoteId)).toEqual(first);
    await expect(prepare(first.quoteId)).rejects.toThrow();
    await expect(sql("DELETE FROM quotes.line_snapshot")).rejects.toThrow(
      "QUOTE_IMMUTABLE",
    );
  });
  it("QTE-012 digital formats never call delivery adapter; physical does", async () => {
    const source = readFileSync(
      "prisma-quotes/migrations/202610150010_quote/migration.sql",
      "utf8",
    );
    const start = source.indexOf(
        "CREATE FUNCTION quotes.resolve_fixture_delivery",
      ),
      end = source.indexOf("CREATE FUNCTION quotes.resolve(", start);
    const original = source
      .slice(start, end)
      .replace("CREATE FUNCTION", "CREATE OR REPLACE FUNCTION");
    await sql(
      "CREATE OR REPLACE FUNCTION quotes.resolve_fixture_delivery(p_actor uuid,p_physical jsonb,p_address uuid,p_policy uuid,p_option text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$BEGIN RAISE EXCEPTION 'TEST_ONLY_DELIVERY_CALLED';END$$",
    );
    try {
      for (const n of [3, 4, 7]) {
        const q = await issue(req(n), policy, null);
        expect(q.total.amountCents).toBe(n * 1000);
      }
      await expect(issue(req(1))).rejects.toThrow("QUOTE_UNAVAILABLE");
      expect(
        (await sql("SELECT count(*)::int n FROM quotes.delivery_selection"))
          .rows[0].n,
      ).toBe(0);
      expect(
        (
          await sql(
            "SELECT bool_and(delivery_cents IS NULL) ok FROM quotes.quote",
          )
        ).rows[0].ok,
      ).toBe(true);
    } finally {
      await sql(original);
    }
  });
  it("QTE-013 physical quote freezes selected TEST_ONLY address/terms without stock reserve", async () => {
    const q = await issue(req(1));
    expect(q.total.amountCents).toBe(1600);
    expect(
      (await sql("SELECT terms FROM quotes.delivery_selection")).rows[0].terms,
    ).toMatchObject({
      purpose: "TEST_ONLY",
      option: "TEST_GROUND",
      amountCents: 600,
      minDays: 2,
      maxDays: 4,
    });
    expect(await effects()).toEqual({
      quotes: 1,
      preparations: 0,
      reservations: 0,
      ledger: 0,
    });
    // An existing technical reserve can exhaust stock; a quote still promises no stock.
    await sql("SELECT * FROM inventory.reserve($1,$2,$3,$4::jsonb)", [
      randomUUID(),
      randomUUID(),
      "a".repeat(64),
      JSON.stringify([{ sku: id(1), quantity: 10 }]),
    ]);
    const before = await effects();
    expect((await issue(req(1))).total.amountCents).toBe(1600);
    const after = await effects();
    expect(after.reservations).toBe(before.reservations);
    expect(after.ledger).toBe(before.ledger);
  });
  it("QTE-014 mixed/physical kits aggregate actual fixture physical components", async () => {
    expect((await issue(req(6))).total.amountCents).toBe(6600);
    expect((await issue(req(5))).total.amountCents).toBe(6100);
    expect(
      (
        await sql(
          "SELECT editorial->'components' components FROM quotes.line_snapshot WHERE product_id=$1",
          [id(6)],
        )
      ).rows[0].components,
    ).toHaveLength(2);
  });
  it("QTE-015 unserved, incomplete, missing and foreign-owner destinations refuse", async () => {
    await expect(
      issue({ ...req(1), shippingAddressId: id(902) }),
    ).rejects.toThrow("QUOTE_REJECTED");
    await expect(
      issue({ items: [{ productId: id(1), quantity: 1 }] }),
    ).rejects.toThrow("QUOTE_REJECTED");
    await sql("UPDATE quotes.fixture_address SET complete=false WHERE id=$1", [
      address,
    ]);
    await expect(issue(req(1))).rejects.toThrow("QUOTE_REJECTED");
    await sql(
      "UPDATE quotes.fixture_address SET complete=true,eligible=false WHERE id=$1",
      [address],
    );
    await expect(issue(req(1))).rejects.toThrow("QUOTE_REJECTED");
  });
  it("QTE-016 nonexistent delivery option and absent physical attributes refuse", async () => {
    await expect(issue(req(1), policy, "TEST_UNKNOWN")).rejects.toThrow(
      "QUOTE_REJECTED",
    );
    await sql("DELETE FROM quotes.fixture_physical WHERE product_id=$1", [
      id(1),
    ]);
    await expect(issue(req(6))).rejects.toThrow("QUOTE_REJECTED");
  });
  it("QTE-017 deterministic tariff/conditions and immutable address snapshots", async () => {
    const a = await issue(req(1, 2)),
      b = await issue(req(1, 2));
    expect(a.total).toEqual(b.total);
    expect(a.total.amountCents).toBe(3100);
    const original = (
      await sql(
        "SELECT terms FROM quotes.delivery_selection WHERE quote_id=$1",
        [a.quoteId],
      )
    ).rows[0].terms;
    await sql(
      "UPDATE quotes.fixture_address SET zone='TEST_OTHER' WHERE id=$1",
      [address],
    );
    expect(
      (
        await sql(
          "SELECT terms FROM quotes.delivery_selection WHERE quote_id=$1",
          [a.quoteId],
        )
      ).rows[0].terms,
    ).toEqual(original);
    await expect(sql("DELETE FROM quotes.delivery_selection")).rejects.toThrow(
      "QUOTE_IMMUTABLE",
    );
  });
  it("QTE-018 missing/inactive policy refuses physical and digital", async () => {
    await expect(issue(req(), randomUUID())).rejects.toThrow("QUOTE_REJECTED");
    await sql("UPDATE quotes.fixture_policy SET active=false");
    await expect(issue(req(1))).rejects.toThrow("QUOTE_REJECTED");
    await expect(issue()).rejects.toThrow("QUOTE_REJECTED");
  });
  it("QTE-019 quote ownership and SQL actor cannot be forged", async () => {
    const q = await issue();
    await expect(
      b.query("SELECT quotes.project($1,$2)", [other, q.quoteId]),
    ).rejects.toThrow("RESOURCE_NOT_FOUND");
    await expect(
      b.query("SELECT quotes.project($1,$2)", [actor, q.quoteId]),
    ).rejects.toThrow("UNAUTHENTICATED");
  });
  it("QTE-020 artificial actors isolated and inactive identity refused", async () => {
    const q = (
      await b.query("SELECT quotes.issue($1,$2::jsonb,NULL,$3,NULL) q", [
        other,
        JSON.stringify([{ id: id(3), quantity: 1 }]),
        policy,
      ])
    ).rows[0].q;
    await expect(store.read(actor, q.quoteId)).rejects.toThrow(
      "RESOURCE_NOT_FOUND",
    );
    await sql(
      "UPDATE quotes.fixture_principal SET active=false WHERE role_name='atlas_quotes_actor_a'",
    );
    await expect(issue()).rejects.toThrow("UNAUTHENTICATED");
  });
  it("QTE-021 PostgreSQL clock defines exact fixture TTL, no default commercial duration", async () => {
    await sql("UPDATE quotes.fixture_policy SET ttl_seconds=7");
    const q = await issue();
    expect(
      (
        await sql(
          "SELECT extract(epoch FROM expires_at-created_at)::int ttl,created_at<=clock_timestamp() server_time FROM quotes.quote WHERE id=$1",
          [q.quoteId],
        )
      ).rows[0],
    ).toEqual({ ttl: 7, server_time: true });
  });
  it("QTE-022 expired quote cannot create preparation", async () => {
    await sql("UPDATE quotes.fixture_policy SET ttl_seconds=1");
    const q = await issue();
    await sql("SELECT pg_sleep(1.05)");
    await expect(prepare(q.quoteId)).rejects.toThrow();
    expect(await effects()).toMatchObject({ preparations: 0, reservations: 0 });
  });
  it("QTE-023 existing intent replay survives expiry, with one physical reserve", async () => {
    await sql("UPDATE quotes.fixture_policy SET ttl_seconds=1");
    const q = await issue(req(1)),
      key = randomUUID(),
      r = await prepare(q.quoteId, key);
    await sql("SELECT pg_sleep(1.05)");
    expect(await prepare(q.quoteId, key)).toEqual(r);
    expect(await store.read(actor, q.quoteId)).toEqual(q);
    expect(await effects()).toMatchObject({
      preparations: 1,
      reservations: 1,
      ledger: 1,
    });
    const legacy = randomUUID();
    await sql(
      "INSERT INTO orders.fixture_quote(id,actor_id,purpose,mode,items,expires_at) VALUES($1,$2,'TEST_ONLY','BASE_AT_PREPARE_TEST_ONLY',$3::jsonb,clock_timestamp()+interval '10 minutes')",
      [legacy, actor, JSON.stringify([{ id: id(3), quantity: 1 }])],
    );
    expect(
      (
        await orders.prepare(
          actor,
          { key: randomUUID(), items: [{ id: id(3), quantity: 1 }] },
          legacy,
        )
      ).reservationExpiresAt,
    ).toBeNull();
  });
  it("QTE-024 persisted quote links to atomic ORD snapshots/reservation with same PID/XID", async () => {
    const q = await issue(req(6)),
      r = await prepare(q.quoteId);
    expect(r.baseSubtotal.amountCents).toBe(6000);
    const e = (
      await sql(
        "SELECT q.total_cents::int,q.participant_proof,o.participant_proof orders FROM orders.quote_evidence q JOIN orders.event o USING(preparation_id) WHERE q.preparation_id=$1",
        [r.id],
      )
    ).rows[0];
    expect(e.total_cents).toBe(q.total.amountCents);
    expect(e.participant_proof).toEqual(e.orders.orders);
    const x = (
      await sql(
        "SELECT xmin::text x FROM orders.quote_evidence UNION ALL SELECT xmin::text FROM inventory.reservation",
      )
    ).rows;
    expect(new Set(x.map((x) => x.x))).toEqual(
      new Set([e.participant_proof.xid]),
    );
    console.log("QTE_ORD_ATOMICITY " + JSON.stringify(e));
    // The legacy port cannot reuse the bridge with a new intention and skip delivery revalidation.
    await expect(
      orders.prepare(
        actor,
        { key: randomUUID(), items: [{ id: id(6), quantity: 1 }] },
        q.quoteId,
      ),
    ).rejects.toThrow("ORDERS_UNAVAILABLE");
    expect(await effects()).toMatchObject({
      preparations: 1,
      reservations: 1,
      ledger: 1,
    });
  });
  it("QTE-025 price/publication revalidated after observable lock waits", async () => {
    const q = await issue(req(1)),
      c = await admin.connect();
    let pending: Promise<unknown> | undefined;
    try {
      await c.query("BEGIN");
      await c.query(
        "SELECT 1 FROM pricing.price_product WHERE product_id=$1 FOR UPDATE",
        [id(1)],
      );
      pending = prepare(q.quoteId);
      await barrier("atlas-orders-");
      await c.query(
        "SELECT pricing.replace_base_price($1,2000,'BRL','TEST_ONLY')",
        [id(1)],
      );
      await c.query("COMMIT");
      await expect(pending).rejects.toThrow();
      expect(await effects()).toMatchObject({
        preparations: 0,
        reservations: 0,
      });
    } finally {
      await c.query("ROLLBACK");
      c.release();
      await pending?.catch(() => {});
    }
    const fresh = await issue(req(1));
    await sql("UPDATE catalog.product SET status='DRAFT' WHERE id=$1", [id(1)]);
    await expect(prepare(fresh.quoteId)).rejects.toThrow();
  });
  it("QTE-026 changed delivery or expiry after stock wait rolls back all Orders effects", async () => {
    const q = await issue(req(1));
    await sql("UPDATE quotes.fixture_policy SET base_cents=200,version=2");
    await expect(prepare(q.quoteId)).rejects.toThrow();
    await sql("UPDATE quotes.fixture_policy SET ttl_seconds=1");
    const fresh = await issue(req(1)),
      c = await admin.connect();
    let pending: Promise<unknown> | undefined;
    try {
      await c.query("BEGIN");
      await c.query(
        "SELECT 1 FROM inventory.stock_balance WHERE sku=$1 FOR UPDATE",
        [id(1)],
      );
      pending = prepare(fresh.quoteId);
      await barrier("atlas-orders-");
      await sql("SELECT pg_sleep(1.05)");
      await c.query("COMMIT");
      await expect(pending).rejects.toThrow();
      expect(await effects()).toMatchObject({
        preparations: 0,
        reservations: 0,
        ledger: 0,
      });
    } finally {
      await c.query("ROLLBACK");
      c.release();
      await pending?.catch(() => {});
    }
  });
  it("QTE-027 independent connections same intent converge and after-reserve failure rolls back", async () => {
    const q = await issue(req(1)),
      key = randomUUID(),
      c = await admin.connect(),
      second = new OrdersDatabase(
        "postgresql://atlas_orders_actor_a@127.0.0.1:55439/atlas_catalog_cat01?schema=orders",
        "ORD-01",
        "actor_a",
      );
    let tasks: Promise<unknown>[] = [];
    try {
      await c.query("BEGIN");
      await c.query(
        "SELECT 1 FROM inventory.stock_balance WHERE sku=$1 FOR UPDATE",
        [id(1)],
      );
      tasks = [
        prepare(q.quoteId, key),
        second.prepareQuote(actor, key, q.quoteId),
      ];
      await barrier("atlas-orders-", 2);
      await c.query("COMMIT");
      const [one, two] = await Promise.all(tasks);
      expect(one).toEqual(two);
      expect(await effects()).toMatchObject({
        preparations: 1,
        reservations: 1,
        ledger: 1,
      });
    } finally {
      await c.query("ROLLBACK");
      c.release();
      await Promise.allSettled(tasks);
      await second.close();
    }
    const newQ = await issue(req(2));
    await sql(
      "CREATE SEQUENCE orders.qte_failure;GRANT USAGE ON SEQUENCE orders.qte_failure TO atlas_orders_executor;CREATE FUNCTION orders.qte_fail() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN PERFORM nextval('orders.qte_failure');RAISE EXCEPTION 'TEST_ONLY_FAIL_AFTER_RESERVE';END$$;REVOKE ALL ON FUNCTION orders.qte_fail() FROM PUBLIC;CREATE TRIGGER qte_fail BEFORE INSERT ON orders.quote_evidence FOR EACH ROW EXECUTE FUNCTION orders.qte_fail()",
    );
    try {
      await expect(prepare(newQ.quoteId)).rejects.toThrow();
      expect(
        (await sql("SELECT last_value::int FROM orders.qte_failure")).rows[0]
          .last_value,
      ).toBe(1);
      expect(await effects()).toMatchObject({
        preparations: 1,
        reservations: 1,
        ledger: 1,
      });
    } finally {
      await sql(
        "DROP TRIGGER qte_fail ON orders.quote_evidence;DROP FUNCTION orders.qte_fail();DROP SEQUENCE orders.qte_failure",
      );
    }
  });
  it("QTE-028 strict money/ownership input, SQL injection and privilege escalation refused", async () => {
    for (const bad of [
      { ...req(), total: { amountCents: 1 } },
      { items: [{ productId: "';DROP TABLE quotes.quote;--", quantity: 1 }] },
      { items: [{ productId: id(3), quantity: 1, price: 1 }] },
    ])
      await expect(
        service.issue(bad as unknown as QuoteRequest),
      ).rejects.toThrow();
    await expect(
      a.query("SELECT quotes.issue($1,$2::jsonb,NULL,$3,NULL)", [
        actor,
        JSON.stringify([{ id: id(3), quantity: 1, total: 1 }]),
        policy,
      ]),
    ).rejects.toThrow("QUOTE_INVALID_REQUEST");
    await sql(
      "GRANT SELECT(zone) ON quotes.fixture_address TO atlas_quotes_actor_a",
    );
    try {
      await expect(issue()).rejects.toThrow("QUOTE_UNAVAILABLE");
    } finally {
      await sql(
        "REVOKE SELECT(zone) ON quotes.fixture_address FROM atlas_quotes_actor_a",
      );
    }
    const c = await admin.connect();
    let pending: Promise<unknown> | undefined;
    try {
      await c.query("BEGIN");
      await c.query(
        "SELECT 1 FROM quotes.fixture_policy WHERE id=$1 FOR UPDATE",
        [policy],
      );
      pending = issue();
      await barrier("atlas-quotes-");
      await expect(pending).rejects.toThrow("QUOTE_UNAVAILABLE");
    } finally {
      await c.query("ROLLBACK");
      c.release();
      await pending?.catch(() => {});
    }
    expect((await effects()).quotes).toBe(0);
  });
  it("QTE-029 internally compatible QuoteRequest/QuoteResult, no new HTTP controller", async () => {
    const spec = (await contracts()).spec;
    expect(spec.components.schemas.QuoteRequest).toBeDefined();
    const q = await issue();
    const cli = createRequire(import.meta.resolve("@nestjs/cli/package.json")),
      core = createRequire(cli.resolve("@angular-devkit/core"));
    const Ajv = core("ajv/dist/2020.js").default;
    const ajv = new Ajv({
      strict: false,
      validateFormats: false,
      allErrors: true,
    });
    const request = ajv.compile({
      $ref: "#/components/schemas/QuoteRequest",
      components: spec.components,
    });
    const result = ajv.compile({
      $ref: "#/components/schemas/QuoteResult",
      components: spec.components,
    });
    expect(request(req())).toBe(true);
    expect(result(q)).toBe(true);
    expect(request({ ...req(), total: 1 })).toBe(false);
    expect(result({ ...q, total: { currency: "BRL", amountCents: -1 } })).toBe(
      false,
    );
    expect(Object.keys(q).sort()).toEqual([
      "expiresAt",
      "note",
      "quoteId",
      "total",
    ]);
    const m = await Test.createTestingModule({
        imports: [AppModule],
      }).compile(),
      app = m.createNestApplication();
    await app.init();
    try {
      expect(
        (
          await http(app.getHttpServer())
            .post("/api/v1/checkout/quotes")
            .send(req())
        ).status,
      ).toBe(404);
    } finally {
      await app.close();
    }
  });
  it("QTE-030 existing modules, migrations, normative contracts and fixed CI gates preserved", () => {
    const paths = [
      "src/modules/catalog",
      "src/modules/pricing",
      "src/modules/inventory",
      "src/modules/identity",
      "src/infrastructure/persistence",
      "prisma-catalog",
      "prisma-pricing",
      "prisma-inventory",
      "prisma-orders",
      "prisma-identity",
      "../../docs/02-business-requirements",
      "../../docs/03-business-processes",
      "../../docs/04-architecture",
      "../../docs/05-engineering/contracts",
      "../../docs/07-security",
      "../../pnpm-lock.yaml",
      "../../apps/storefront",
      "../../apps/admin",
    ];
    for (const p of paths) expect(existsSync(p)).toBe(true);
    const r = spawnSync(
      "git",
      ["diff", "--exit-code", "HEAD", "--", ...paths],
      { encoding: "utf8" },
    );
    expect(r.status, r.stdout + r.stderr).toBe(0);
    const ci = readFileSync("../../.github/workflows/quality.yml", "utf8");
    for (const j of [
      "orders-integration:",
      "identity-integration:",
      "quote-integration:",
      "pnpm install --frozen-lockfile",
    ])
      expect(ci).toContain(j);
  });
});
