import "reflect-metadata";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { randomUUID, createHash } from "node:crypto";
import { fork, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as pause } from "node:timers/promises";
import pg from "pg";
import { Test } from "@nestjs/testing";
import http from "supertest";
import { ShippingCheckout } from "../../src/modules/shipping/application/shipping-checkout.js";
import { AppModule } from "../../src/app.module.js";
import { ProfileOrderIntegration } from "../../src/modules/customer-profile/application/profile-order-integration.js";
import { QuoteConsumptionDatabase } from "../../src/modules/orders/infrastructure/quote-consumption-database.js";
import {
  consumptionUrl,
  consumptionEnabled,
  consumptionMigrationUrl,
} from "../../src/modules/orders/infrastructure/quote-consumption-config.js";
const id = (n: number) =>
  "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const actor = id(800),
  other = id(801),
  address = id(901),
  foreign = id(902),
  policy = id(910);
const fake = {
  recipient: "TEST_RECIPIENT",
  country: "BR",
  postalCode: "00000000",
  region: "ZZ",
  city: "TEST_CITY",
  district: "TEST_DISTRICT",
  street: "TEST_STREET",
  number: "TEST_NUMBER",
  complement: null,
};
const options = {
  host: "127.0.0.1",
  port: 55439,
  database: "atlas_catalog_cat01",
  password: "",
  ssl: false as const,
  connectionTimeoutMillis: 1000,
};
const url = (module = "quotes", role = "actor_a") =>
  `postgresql://atlas_${module}_${role}@127.0.0.1:55439/atlas_catalog_cat01?schema=${module}`;
describe("QUSE-01 fixed-zone PostgreSQL TEST_ONLY", () => {
  let admin: pg.Pool,
    inventory: pg.Pool,
    profile: pg.Pool,
    profileB: pg.Pool,
    orders: pg.Pool,
    ordersB: pg.Pool,
    quotes: pg.Pool,
    store: QuoteConsumptionDatabase,
    storeB: QuoteConsumptionDatabase,
    service: ShippingCheckout;
  const sql = (s: string, args?: unknown[]) => admin.query(s, args);
  const issue = (n = 1, destination = address) =>
    service.issue({
      items: [{ productId: id(n), quantity: 1 }],
      ...([1, 2, 5, 6].includes(n) ? { shippingAddressId: destination } : {}),
    });
  const prepare = (quoteId: string, key = randomUUID()) =>
    service.prepare({ key, quoteId });
  const change = (version = 1, state = "ELIGIBLE", data = fake) =>
    profile.query(
      "SELECT customer_profile.change($1,$2,$3,$4,$5::jsonb,$6) result",
      [actor, randomUUID(), address, version, JSON.stringify(data), state],
    );
  async function locks(prefix = "atlas-quse-", minimum = 1) {
    const until = Date.now() + 1800;
    while (Date.now() < until) {
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
    throw new Error("CPINT_BARRIER_TIMEOUT");
  }
  async function effects() {
    return (
      await sql(
        "SELECT (SELECT count(*)::int FROM orders.quote_consumption) consumed,(SELECT count(*)::int FROM orders.shipping_evidence) shipping,(SELECT count(*)::int FROM orders.profile_address_snapshot) postal,(SELECT count(*)::int FROM orders.profile_evidence) evidence,(SELECT count(*)::int FROM orders.preparation) preparations,(SELECT count(*)::int FROM orders.request) requests,(SELECT count(*)::int FROM orders.event) order_events,(SELECT count(*)::int FROM inventory.reservation) reservations,(SELECT count(*)::int FROM inventory.event) inventory_events,(SELECT count(*)::int FROM inventory.stock_ledger_entry WHERE kind<>'FIXTURE_LOAD') ledger",
      )
    ).rows[0];
  }
  async function noEffects() {
    expect(await effects()).toEqual({
      consumed: 0,
      shipping: 0,
      postal: 0,
      evidence: 0,
      preparations: 0,
      requests: 0,
      order_events: 0,
      reservations: 0,
      inventory_events: 0,
      ledger: 0,
    });
  }
  async function fault(table: string, work: () => Promise<unknown>) {
    if (
      ![
        "profile_address_snapshot",
        "profile_evidence",
        "shipping_evidence",
        "quote_consumption",
      ].includes(table)
    )
      throw new Error("CPINT_TEST_INVALID");
    await sql(
      "CREATE FUNCTION orders.cpint_fault() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN RAISE EXCEPTION 'CPINT_INJECTED_FAILURE'; END $$; REVOKE ALL ON FUNCTION orders.cpint_fault() FROM PUBLIC",
    );
    await sql(
      `CREATE TRIGGER cpint_fault AFTER INSERT ON orders.${table} FOR EACH ROW EXECUTE FUNCTION orders.cpint_fault()`,
    );
    try {
      await expect(work()).rejects.toThrow();
    } finally {
      await sql(
        `DROP TRIGGER cpint_fault ON orders.${table}; DROP FUNCTION orders.cpint_fault()`,
      );
    }
  }
  async function crash(mode: "before" | "after", quote: string, key: string) {
    const child = fork(
      "test/quote-consumption/crash-child.mjs",
      [mode, actor, key, quote],
      { stdio: ["ignore", "ignore", "ignore", "ipc"] },
    );
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("CPINT_CHILD_TIMEOUT")),
          6000,
        );
        child.once("message", () => {
          clearTimeout(timer);
          resolve();
        });
        child.once("exit", () => {
          clearTimeout(timer);
          reject(new Error("CPINT_CHILD_EXIT_EARLY"));
        });
      });
    } finally {
      if (child.exitCode === null && child.signalCode === null) {
        const closed = new Promise<void>((resolve) =>
          child.once("exit", () => resolve()),
        );
        child.kill("SIGKILL");
        await closed;
      }
    }
    const until = Date.now() + 1500;
    while (Date.now() < until) {
      if (
        (
          await sql(
            "SELECT count(*)::int n FROM pg_stat_activity WHERE application_name='quse-crash'",
          )
        ).rows[0].n === 0
      )
        return;
      await pause(5);
    }
    throw new Error("CPINT_CHILD_BACKEND_NOT_CLOSED");
  }

  async function seedShipping(version = 1, fee = 777, eligible = true) {
    const c = await admin.connect();
    try {
      await c.query("BEGIN");
      if (version === 1)
        await c.query(
          "INSERT INTO shipping.policy VALUES($1,'TEST_ONLY',false,1)",
          [policy],
        );
      await c.query(
        "INSERT INTO shipping.revision VALUES($1,$2,'DRAFT','BR','BRL',1000)",
        [policy, version],
      );
      await c.query(
        "INSERT INTO shipping.zone VALUES($1,$2,$3,'00000000','00000009',$4,'TEST_GROUND',$5,NULL),($1,$2,$6,'00000010','00000019',true,'TEST_GROUND',999,NULL)",
        [policy, version, id(920), eligible, fee, id(921)],
      );
      await c.query(
        "UPDATE shipping.revision SET state='SEALED' WHERE policy_id=$1 AND version=$2",
        [policy, version],
      );
      // Writers follow the same legacy quote-policy -> Shipping-policy order as readers.
      await c.query("UPDATE quotes.fixture_policy SET version=$2 WHERE id=$1", [
        policy,
        version,
      ]);
      await c.query(
        "UPDATE shipping.policy SET current_version=$2,active=true WHERE id=$1",
        [policy, version],
      );
      await c.query("COMMIT");
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  async function noShipping(work: () => Promise<void>) {
    const definitions: string[] = [];
    try {
      for (const signature of [
        "shipping.resolve(uuid,jsonb,uuid,uuid,text)",
        "customer_profile.read_for_quote(uuid,uuid)",
        "customer_profile.snapshot_with_proof(uuid,uuid,int)",
      ]) {
        const old = (
          await sql("SELECT pg_get_functiondef($1::regprocedure) body", [
            signature,
          ])
        ).rows[0].body as string;
        definitions.push(old);
        const blocked = old.replace(
          /AS \$function\$[\s\S]*?\$function\$/,
          () => "AS $$ BEGIN RAISE EXCEPTION 'SHIP_DIGITAL_CALLED'; END $$",
        );
        if (blocked === old)
          throw new Error("SHIP_TEST_FUNCTION_BODY_UNAVAILABLE");
        await sql(blocked);
      }
      await work();
    } finally {
      for (const old of definitions.reverse()) await sql(old);
    }
  }
  beforeAll(async () => {
    admin = new pg.Pool({ ...options, user: "atlas_catalog_migrator", max: 5 });
    inventory = new pg.Pool({
      ...options,
      user: "atlas_inventory_migrator",
      max: 1,
    });
    profile = new pg.Pool({
      ...options,
      user: "atlas_profile_actor_a",
      max: 2,
      application_name: "cpint-profile-write",
    });
    profileB = new pg.Pool({
      ...options,
      user: "atlas_profile_actor_b",
      max: 1,
    });
    orders = new pg.Pool({
      ...options,
      user: "atlas_orders_actor_a",
      max: 3,
      application_name: "atlas-quse-raw-orders",
    });
    ordersB = new pg.Pool({ ...options, user: "atlas_orders_actor_b", max: 1 });
    quotes = new pg.Pool({ ...options, user: "atlas_quotes_actor_a", max: 1 });
    store = new QuoteConsumptionDatabase(
      url(),
      url("orders"),
      "QUSE-01",
      "actor_a",
    );
    storeB = new QuoteConsumptionDatabase(
      url("quotes", "actor_b"),
      url("orders", "actor_b"),
      "QUSE-01",
      "actor_b",
    );
    service = new ShippingCheckout(
      new ProfileOrderIntegration(
        store,
        {
          current: async () => ({
            actorId: actor,
            eligible: true,
            sessionClass: "CUSTOMER",
            evidence: "CPINT_TEST_ONLY",
          }),
        },
        {
          authorize: async () => ({
            policyId: policy,
            option: "TEST_GROUND",
            purpose: "TEST_ONLY",
          }),
        },
      ),
    );
    expect(
      (await sql("SELECT current_setting('atlas.profile_integration') marker"))
        .rows[0].marker,
    ).toBe("atlas-cpint01-disposable");
  });
  beforeEach(async () => {
    await sql(
      "TRUNCATE shipping.policy,customer_profile.fixture_account,quotes.fixture_customer,quotes.fixture_policy,quotes.fixture_physical,orders.fixture_principal,inventory.event,inventory.stock_ledger_entry,inventory.reservation_line,inventory.intent,inventory.reservation,inventory.stock_balance,pricing.price_revision,pricing.price_product,catalog.kit_composition,catalog.product_category,catalog.work_author,catalog.product,catalog.edition,catalog.work,catalog.author,catalog.publisher,catalog.category CASCADE",
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
          "TEST-CPINT-" + n,
          n <= 2 ? "PHYSICAL_BOOK" : n === 3 ? "EBOOK" : "DIGITAL_MAGAZINE",
          id(300 + n),
        ],
      );
    }
    for (let n = 5; n <= 7; n++) {
      await sql(
        "INSERT INTO catalog.product(id,sku,title,product_type) VALUES($1,$2,'TEST_ONLY Kit','KIT')",
        [id(n), "TEST-CPINT-" + n],
      );
      for (const component of n === 5 ? [1, 2] : n === 6 ? [1, 3] : [3, 4])
        await sql("INSERT INTO catalog.kit_composition VALUES($1,$2,1)", [
          id(n),
          id(component),
        ]);
      await sql("UPDATE catalog.product SET status='PUBLISHED' WHERE id=$1", [
        id(n),
      ]);
    }
    for (let n = 1; n <= 7; n++)
      await sql(
        "SELECT pricing.replace_base_price($1,$2,'BRL','CPINT_TEST_ONLY')",
        [id(n), n * 1000],
      );
    for (const n of [1, 2]) {
      await inventory.query(
        "INSERT INTO inventory.stock_balance(sku) VALUES($1)",
        [id(n)],
      );
      const ref = randomUUID();
      await inventory.query(
        "INSERT INTO inventory.stock_ledger_entry(sku,kind,quantity,operation_ref,correlation_ref,delta_on_hand,delta_reserved,delta_allocated) VALUES($1,'FIXTURE_LOAD',10,$2,$2,10,0,0)",
        [id(n), ref],
      );
    }
    await sql(
      "INSERT INTO quotes.fixture_customer VALUES($1,'TEST_ONLY'),($2,'TEST_ONLY')",
      [actor, other],
    );
    await sql(
      "INSERT INTO customer_profile.fixture_account VALUES($1,true,true,'TEST_ONLY'),($2,true,true,'TEST_ONLY')",
      [actor, other],
    );
    for (const group of ["quotes", "orders", "profile"])
      for (const suffix of ["a", "b"]) {
        const who = suffix === "a" ? actor : other;
        const role = `atlas_${group}_actor_${suffix}`;
        await sql(
          "INSERT INTO customer_profile.fixture_principal VALUES($1,$2,'CUSTOMER')",
          [role, who],
        );
        if (group !== "profile")
          await sql(
            "INSERT INTO quotes.fixture_principal(role_name,actor_id) VALUES($1,$2)",
            [role, who],
          );
      }
    await profile.query(
      "SELECT customer_profile.change($1,$2,$3,0,$4::jsonb,'ELIGIBLE')",
      [actor, randomUUID(), address, JSON.stringify(fake)],
    );
    await profileB.query(
      "SELECT customer_profile.change($1,$2,$3,0,$4::jsonb,'ELIGIBLE')",
      [other, randomUUID(), foreign, JSON.stringify(fake)],
    );
    await sql(
      "INSERT INTO quotes.fixture_address VALUES($1,$2,'TEST_ONLY','TEST_ZONE',true,true),($3,$4,'TEST_ONLY','TEST_ZONE',true,true)",
      [address, actor, foreign, other],
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
    await seedShipping();
  });
  afterAll(async () => {
    await Promise.all([
      store?.close(),
      storeB?.close(),
      admin?.end(),
      inventory?.end(),
      profile?.end(),
      profileB?.end(),
      orders?.end(),
      ordersB?.end(),
      quotes?.end(),
    ]);
  });
  async function expired(quote: string) {
    const until = Date.now() + 1800;
    while (Date.now() < until) {
      if (
        (
          await sql(
            "SELECT clock_timestamp()>=expires_at expired FROM quotes.quote WHERE id=$1",
            [quote],
          )
        ).rows[0].expired
      )
        return;
      await pause(5);
    }
    throw Error("QUSE_EXPIRY_BARRIER_TIMEOUT");
  }
  const rawPrepare = (c: pg.PoolClient, quote: string, key = randomUUID()) =>
    c.query("SELECT orders.prepare_consumed_quote($1,$2,$3) result", [
      actor,
      key,
      quote,
    ]);
  async function onePhysical() {
    expect(await effects()).toEqual({
      consumed: 1,
      shipping: 1,
      postal: 1,
      evidence: 1,
      preparations: 1,
      requests: 1,
      order_events: 1,
      reservations: 1,
      inventory_events: 1,
      ledger: 1,
    });
  }
  it("QUSE-001 exact local PostgreSQL17 and consumption marker", async () => {
    const r = (
      await sql(
        "SELECT current_database() db,current_setting('atlas.quote_consumption',true) marker,current_setting('server_version_num')::int version,inet_server_port() port",
      )
    ).rows[0];
    expect(r).toMatchObject({
      db: "atlas_catalog_cat01",
      marker: "atlas-quse01-disposable",
      port: 5432,
    });
    expect(r.version).toBeGreaterThanOrEqual(170000);
    expect(r.version).toBeLessThan(180000);
    expect(consumptionEnabled({})).toBe(false);
  });
  it("QUSE-002 migrator separate from runtime and NOLOGIN function owner", async () => {
    const r = (
      await sql(
        "SELECT n.nspowner::regrole::text owner FROM pg_namespace n WHERE n.nspname='orders_quse_history'",
      )
    ).rows[0];
    expect(r.owner).toBe("atlas_orders_migrator");
    expect(
      (
        await sql(
          "SELECT rolsuper,rolcanlogin FROM pg_roles WHERE rolname='atlas_orders_executor'",
        )
      ).rows[0],
    ).toEqual({ rolsuper: false, rolcanlogin: false });
    await expect(
      orders.query("SET ROLE atlas_orders_migrator"),
    ).rejects.toThrow();
  });
  it("QUSE-003 migration refuses wrong role or marker before DDL", async () => {
    const migration = readFileSync(
      "prisma-quote-consumption/migrations/202610160300_quote_consumption/migration.sql",
      "utf8",
    );
    for (const setting of [
      "SET LOCAL ROLE atlas_orders_actor_a",
      "SET LOCAL ROLE atlas_orders_migrator; SET LOCAL atlas.quote_consumption='WRONG'",
    ]) {
      const c = await admin.connect();
      try {
        await c.query("BEGIN");
        await c.query(setting);
        await expect(c.query(migration)).rejects.toThrow(
          "QUSE_FIXTURE_REQUIRED",
        );
      } finally {
        await c.query("ROLLBACK");
        c.release();
      }
    }
  });
  it("QUSE-004 repeated migration history and incompatible legacy data refuse without deletion", async () => {
    expect(
      (
        await sql(
          "SELECT count(*)::int n FROM orders_quse_history._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL",
        )
      ).rows[0].n,
    ).toBe(1);
    const q = await issue();
    await prepare(q.quoteId);
    const migration = readFileSync(
      "prisma-quote-consumption/migrations/202610160300_quote_consumption/migration.sql",
      "utf8",
    );
    const c = await admin.connect();
    try {
      await c.query("BEGIN");
      await c.query(
        "ALTER TABLE orders.request DROP CONSTRAINT request_one_quote",
      );
      await c.query(
        "INSERT INTO orders.quote_validation SELECT quote_id,actor_id,pg_current_xact_id() FROM orders.request",
      );
      await c.query(
        "INSERT INTO orders.request(id,actor_id,operation,key,fingerprint,quote_id,inventory_key) SELECT $1,actor_id,operation,$2,fingerprint,quote_id,$3 FROM orders.request LIMIT 1",
        [randomUUID(), randomUUID(), randomUUID()],
      );
      expect(
        (await c.query("SELECT count(*)::int n FROM orders.request")).rows[0].n,
      ).toBe(2);
      await c.query("SET LOCAL ROLE atlas_orders_migrator");
      await expect(c.query(migration)).rejects.toThrow(
        "QUSE_MIGRATION_DUPLICATES",
      );
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
    // Reconstruct the immediately preceding schema inside a transaction, never
    // commit administrative setup. Only strip transaction boundaries in this test.
    const body = migration.replace(/^BEGIN;\s*/, "").replace(/COMMIT;\s*$/, "");
    for (const complete of [true, false]) {
      const legacy = await admin.connect();
      try {
        await legacy.query("BEGIN");
        await legacy.query(
          "DROP TRIGGER complete_consumption ON orders.preparation; DROP TABLE orders.quote_consumption; ALTER TABLE orders.request DROP CONSTRAINT request_one_quote, DROP CONSTRAINT request_intention_quote; DROP FUNCTION orders.require_complete_consumption(),orders.prepare_consumed_quote(uuid,uuid,uuid),orders.read_consumed_preparation(uuid,uuid)",
        );
        if (!complete)
          await legacy.query(
            "ALTER TABLE orders.shipping_evidence DISABLE TRIGGER USER; DELETE FROM orders.shipping_evidence; ALTER TABLE orders.shipping_evidence ENABLE TRIGGER USER",
          );
        await legacy.query("SET LOCAL ROLE atlas_orders_migrator");
        if (complete) {
          await legacy.query(body);
          const migrated = (
            await legacy.query(
              "SELECT c.origin,c.recorded_xid=pg_current_xact_id() current_xid,r.result_id=c.preparation_id same_result FROM orders.quote_consumption c JOIN orders.request r ON r.id=c.preparation_id",
            )
          ).rows;
          expect(migrated).toEqual([
            {
              origin: "BACKFILL_TEST_ONLY",
              current_xid: true,
              same_result: true,
            },
          ]);
        } else
          await expect(legacy.query(body)).rejects.toThrow(
            "QUSE_LEGACY_REVIEW_REQUIRED",
          );
      } finally {
        await legacy.query("ROLLBACK");
        legacy.release();
      }
    }
    await onePhysical();
  });
  it("QUSE-005 persistent ownership FK and immutable consumption", async () => {
    const q = await issue();
    const p = await prepare(q.quoteId);
    const otherQuote = await issue();
    await expect(
      sql("UPDATE orders.quote_consumption SET quote_id=$1", [
        otherQuote.quoteId,
      ]),
    ).rejects.toThrow("ORDERS_SNAPSHOT_IMMUTABLE");
    await expect(sql("DELETE FROM orders.quote_consumption")).rejects.toThrow(
      "ORDERS_SNAPSHOT_IMMUTABLE",
    );
    await expect(
      sql(
        "INSERT INTO orders.quote_consumption VALUES($1,$2,'TEST_ONLY','NEW_TEST_ONLY',pg_backend_pid(),pg_current_xact_id(),clock_timestamp())",
        [otherQuote.quoteId, p.preparation.id],
      ),
    ).rejects.toMatchObject({ code: "23505" });
    const c = await admin.connect();
    try {
      await c.query("BEGIN");
      await c.query(
        "INSERT INTO orders.quote_consumption VALUES($1,$2,'TEST_ONLY','NEW_TEST_ONLY',pg_backend_pid(),pg_current_xact_id(),clock_timestamp())",
        [otherQuote.quoteId, randomUUID()],
      );
      throw Error("unexpected");
    } catch (e) {
      expect(e).toMatchObject({ code: "23503" });
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
    await onePhysical();
  });
  it("QUSE-006 rejects remote credentials parameters consent production and CLI arguments", () => {
    for (const v of [
      url("orders").replace("127.0.0.1", "example.invalid"),
      url("orders").replace("55439", "5432"),
      url("orders").replace("atlas_catalog_cat01", "postgres"),
      url("orders") + "&options=unsafe",
      url("orders").replace("@", ":secret@"),
    ])
      expect(() => consumptionUrl(v, "QUSE-01", "orders", "actor_a")).toThrow();
    expect(() =>
      consumptionUrl(url("orders"), "SHIP-01", "orders", "actor_a"),
    ).toThrow();
    expect(() =>
      consumptionMigrationUrl(url("orders"), "QUSE-01", "wrong" as "orders"),
    ).toThrow();
    expect(() =>
      consumptionEnabled({
        QUSE_MODE: "local-disposable",
        QUSE_CONSENT: "QUSE-01",
        NODE_ENV: "production",
      }),
    ).toThrow();
    const child = spawnSync(
      process.execPath,
      [
        "scripts/quote-consumption-db.mjs",
        "test",
        "postgresql://example.invalid",
      ],
      { encoding: "utf8" },
    );
    expect(child.status).not.toBe(0);
    expect(child.stderr).toContain("QUSE_COMMAND_INVALID");
  });
  it("QUSE-007 first preparation commits one complete physical effect set", async () => {
    const q = await issue();
    const p = await prepare(q.quoteId);
    expect(p.delivery).toEqual(q.delivery);
    await onePhysical();
  });
  it("QUSE-008 same key replays identical durable result without effects", async () => {
    const q = await issue(),
      key = randomUUID(),
      p = await prepare(q.quoteId, key);
    const before = await effects();
    expect(await prepare(q.quoteId, key)).toEqual(p);
    expect(await effects()).toEqual(before);
  });
  it("QUSE-009 different key conflicts including retries without a second intention", async () => {
    const q = await issue();
    await prepare(q.quoteId);
    const key = randomUUID();
    for (let i = 0; i < 3; i++)
      await expect(prepare(q.quoteId, key)).rejects.toMatchObject({
        code: "CONFLICT",
      });
    await onePhysical();
  });
  async function contenders(count: number) {
    const q = await issue(),
      clients: pg.PoolClient[] = [];
    try {
      for (let i = 0; i < count; i++) clients.push(await orders.connect());
      const winner = clients[0]!;
      await winner.query("BEGIN");
      const key = randomUUID();
      const provisional = (await rawPrepare(winner, q.quoteId, key)).rows[0]
        .result;
      expect((await effects()).consumed).toBe(0);
      const pending = clients.slice(1).map((c) =>
        rawPrepare(c, q.quoteId).then(
          () => ({ ok: true, code: "", message: "" }),
          (e) => ({
            ok: false,
            code: e.code as string,
            message: e.message as string,
          }),
        ),
      );
      await locks("atlas-quse-raw-orders", count - 1);
      const waiting = (
        await sql(
          "SELECT count(*)::int n FROM pg_locks l JOIN pg_stat_activity a USING(pid) WHERE a.application_name='atlas-quse-raw-orders' AND l.locktype='advisory' AND NOT l.granted",
        )
      ).rows[0].n;
      expect(waiting).toBe(count - 1);
      await winner.query("COMMIT");
      const results = await Promise.all(pending);
      for (const r of results)
        expect(r).toEqual({
          ok: false,
          code: "P0001",
          message: "QUSE_CONSUMPTION_CONFLICT",
        });
      expect(await prepare(q.quoteId, key)).toEqual(provisional);
      await onePhysical();
      console.log(
        "QUSE_CONCURRENT_EVIDENCE",
        JSON.stringify({
          contenders: count,
          observedAdvisoryWaiters: waiting,
          winners: 1,
          conflicts: results.length,
          effects: await effects(),
        }),
      );
    } finally {
      for (const c of clients) {
        await c.query("ROLLBACK");
        c.release();
      }
    }
  }
  it("QUSE-010 two connections different keys observe real advisory contention", () =>
    contenders(2));
  it("QUSE-011 three connections yield one winner and two controlled conflicts", () =>
    contenders(3));
  it("QUSE-012 independent quotes can commit while another preparation is uncommitted", async () => {
    const q1 = await issue(1),
      q2 = await issue(2),
      a = await orders.connect(),
      b = await orders.connect();
    try {
      await a.query("BEGIN");
      await rawPrepare(a, q1.quoteId);
      await b.query("BEGIN");
      await rawPrepare(b, q2.quoteId);
      await b.query("COMMIT");
      expect((await effects()).consumed).toBe(1);
      await a.query("COMMIT");
      expect((await effects()).consumed).toBe(2);
      expect((await effects()).reservations).toBe(2);
    } finally {
      await a.query("ROLLBACK");
      await b.query("ROLLBACK");
      a.release();
      b.release();
    }
  });
  it("QUSE-013 database unique constraint blocks second request even outside wrapper", async () => {
    const q = await issue();
    await prepare(q.quoteId);
    const c = await admin.connect();
    try {
      await c.query("BEGIN");
      await c.query(
        "INSERT INTO orders.quote_validation SELECT quote_id,actor_id,pg_current_xact_id() FROM orders.request",
      );
      await expect(
        c.query(
          "INSERT INTO orders.request(id,actor_id,operation,key,fingerprint,quote_id,inventory_key) SELECT $1,actor_id,operation,$2,fingerprint,quote_id,$3 FROM orders.request",
          [randomUUID(), randomUUID(), randomUUID()],
        ),
      ).rejects.toMatchObject({
        code: "23505",
        constraint: "request_one_quote",
      });
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
    await onePhysical();
  });
  it("QUSE-014 revoked legacy ports and restored grant still cannot commit bypass", async () => {
    const unused = await issue();
    await expect(
      orders.query("SELECT orders.prepare_shipping_quote($1,$2,$3)", [
        actor,
        randomUUID(),
        unused.quoteId,
      ]),
    ).rejects.toMatchObject({ code: "42501" });
    await sql(
      "GRANT EXECUTE ON FUNCTION orders.prepare_shipping_quote(uuid,uuid,uuid) TO atlas_orders_actor_a",
    );
    try {
      await expect(prepare(unused.quoteId)).rejects.toMatchObject({
        code: "INTEGRATION_UNAVAILABLE",
      });
      await expect(
        orders.query("SELECT orders.prepare_shipping_quote($1,$2,$3)", [
          actor,
          randomUUID(),
          unused.quoteId,
        ]),
      ).rejects.toThrow("QUSE_COMPLETE_FLOW_REQUIRED");
      await noEffects();
    } finally {
      await sql(
        "REVOKE EXECUTE ON FUNCTION orders.prepare_shipping_quote(uuid,uuid,uuid) FROM atlas_orders_actor_a",
      );
    }
    await prepare(unused.quoteId);
    await sql(
      "GRANT EXECUTE ON FUNCTION orders.prepare_shipping_quote(uuid,uuid,uuid) TO atlas_orders_actor_a",
    );
    try {
      await expect(
        orders.query("SELECT orders.prepare_shipping_quote($1,$2,$3)", [
          actor,
          randomUUID(),
          unused.quoteId,
        ]),
      ).rejects.toMatchObject({
        code: "23505",
        constraint: "request_one_quote",
      });
    } finally {
      await sql(
        "REVOKE EXECUTE ON FUNCTION orders.prepare_shipping_quote(uuid,uuid,uuid) FROM atlas_orders_actor_a",
      );
    }
    await onePhysical();
  });
  it("QUSE-015 new connection recovers same completed intention", async () => {
    const q = await issue(),
      key = randomUUID(),
      p = await prepare(q.quoteId, key),
      fresh = new QuoteConsumptionDatabase(
        url(),
        url("orders"),
        "QUSE-01",
        "actor_a",
      );
    try {
      expect(await fresh.prepare(actor, key, q.quoteId)).toEqual(p);
      expect(await fresh.read(actor, p.preparation.id)).toEqual(p);
    } finally {
      await fresh.close();
    }
    await onePhysical();
  });
  it("QUSE-016 replay after real quote expiration preserves reservation TTL and historical snapshot", async () => {
    await sql("UPDATE quotes.fixture_policy SET ttl_seconds=1 WHERE id=$1", [
      policy,
    ]);
    const q = await issue(),
      key = randomUUID(),
      p = await prepare(q.quoteId, key);
    await change();
    await seedShipping(2, 888);
    await expired(q.quoteId);
    expect(await prepare(q.quoteId, key)).toEqual(p);
    await expect(prepare(q.quoteId)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    const r = (
      await sql(
        "SELECT extract(epoch FROM i.expires_at-i.created_at)::int ttl FROM inventory.reservation i",
      )
    ).rows[0];
    expect(r.ttl).toBe(2400);
    await onePhysical();
  });
  it("QUSE-017 expired quote without completed intention refuses without consumed state", async () => {
    await sql("UPDATE quotes.fixture_policy SET ttl_seconds=1 WHERE id=$1", [
      policy,
    ]);
    const q = await issue();
    await expired(q.quoteId);
    await expect(prepare(q.quoteId)).rejects.toMatchObject({
      code: "STALE_INPUT",
    });
    await noEffects();
  });
  it("QUSE-018 same key different quote fingerprint conflicts without affecting either quote", async () => {
    const q = await issue(),
      q2 = await issue(2),
      key = randomUUID();
    await prepare(q.quoteId, key);
    await expect(prepare(q2.quoteId, key)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    await onePhysical();
    await prepare(q2.quoteId);
    expect((await effects()).consumed).toBe(2);
  });
  it("QUSE-019 process death before commit rolls back and after commit recovers without application reply", async () => {
    const q = await issue(),
      key = randomUUID();
    await crash("before", q.quoteId, key);
    await noEffects();
    await crash("after", q.quoteId, key);
    const before = await effects();
    const result = await prepare(q.quoteId, key);
    expect(result.delivery?.amountCents).toBe(777);
    expect(await effects()).toEqual(before);
    await onePhysical();
  });
  it("QUSE-020 other actor or forged principal cannot prepare or recover private result", async () => {
    const q = await issue(),
      key = randomUUID(),
      p = await prepare(q.quoteId, key);
    await expect(storeB.prepare(other, key, q.quoteId)).rejects.toMatchObject({
      code: "RESOURCE_NOT_FOUND",
    });
    await expect(storeB.read(other, p.preparation.id)).rejects.toMatchObject({
      code: "RESOURCE_NOT_FOUND",
    });
    await expect(store.prepare(other, key, q.quoteId)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    await onePhysical();
  });
  it("QUSE-021 revoked account cannot replay; revocation waits for authorized in-flight transaction", async () => {
    const q = await issue(),
      key = randomUUID(),
      c = await orders.connect(),
      writer = await admin.connect();
    try {
      await c.query("BEGIN");
      const p = (await rawPrepare(c, q.quoteId, key)).rows[0].result;
      await writer.query("SET application_name='quse-revoke'");
      const pending = writer.query(
        "UPDATE customer_profile.fixture_account SET active=false WHERE id=$1",
        [actor],
      );
      await locks("quse-revoke");
      await c.query("COMMIT");
      await pending;
      await expect(prepare(q.quoteId, key)).rejects.toMatchObject({
        code: "UNAUTHENTICATED",
      });
      await expect(service.read(p.preparation.id)).rejects.toMatchObject({
        code: "UNAUTHENTICATED",
      });
    } finally {
      await c.query("ROLLBACK");
      c.release();
      writer.release();
    }
    await onePhysical();
  });
  it("QUSE-022 physical book has one consumption shipping snapshot and reserve", async () => {
    const q = await issue(),
      p = await prepare(q.quoteId);
    expect(p.addressSnapshot?.addressVersion).toBe(1);
    expect(p.preparation.reservationExpiresAt).not.toBeNull();
    await onePhysical();
    await change();
    const stale = await issue();
    await change(2);
    await expect(prepare(stale.quoteId)).rejects.toMatchObject({
      code: "STALE_INPUT",
    });
    await onePhysical();
  });
  async function digital(n: number) {
    await noShipping(async () => {
      const q = await issue(n),
        p = await prepare(q.quoteId);
      expect(p.delivery).toBeNull();
      expect(p.total).toEqual(q.subtotal);
      expect(p.addressSnapshot).toBeNull();
      expect(p.preparation.reservationExpiresAt).toBeNull();
      expect((await effects()).consumed).toBe(1);
      expect((await effects()).reservations).toBe(0);
      expect((await effects()).postal).toBe(0);
      await expect(prepare(q.quoteId)).rejects.toMatchObject({
        code: "CONFLICT",
      });
    });
  }
  it("QUSE-023 ebook still consumes quote without calling Shipping or postal ports", () =>
    digital(3));
  it("QUSE-024 digital magazine still consumes quote without reserve or freight", () =>
    digital(4));
  it("QUSE-025 physical kit and repeated loose SKU reserve consolidated vector once", async () => {
    const q = await service.issue({
      items: [
        { productId: id(5), quantity: 1 },
        { productId: id(1), quantity: 1 },
      ],
      shippingAddressId: address,
    });
    await prepare(q.quoteId);
    await expect(prepare(q.quoteId)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(
      (
        await sql(
          "SELECT sku,quantity::int q FROM inventory.reservation_line ORDER BY sku",
        )
      ).rows,
    ).toEqual([
      { sku: id(1), q: 2 },
      { sku: id(2), q: 1 },
    ]);
    expect((await effects()).ledger).toBe(2);
    expect((await effects()).reservations).toBe(1);
    expect((await effects()).consumed).toBe(1);
  });
  it("QUSE-026 mixed kit has single consumption and only physical allocation", async () => {
    const q = await issue(6),
      p = await prepare(q.quoteId);
    expect(p.preparation.lines[0]?.components).toHaveLength(2);
    expect(
      (await sql("SELECT count(*)::int n FROM inventory.reservation_line"))
        .rows[0].n,
    ).toBe(1);
    await onePhysical();
  });
  it("QUSE-027 digital kit has unique consumption while all physical ports are blocked", () =>
    digital(7));
  it("QUSE-028 insufficient stock rolls back entire kit including consumption", async () => {
    const q = await issue(5);
    const c = await inventory.connect();
    try {
      await c.query("BEGIN");
      await c.query("SELECT inventory.reserve($1,$2,$3,$4::jsonb)", [
        randomUUID(),
        randomUUID(),
        "a".repeat(64),
        JSON.stringify([{ sku: id(2), quantity: 10 }]),
      ]);
      const pending = prepare(q.quoteId);
      const refusal = expect(pending).rejects.toMatchObject({
        code: "STALE_INPUT",
      });
      await locks();
      await c.query("COMMIT");
      await refusal;
      expect((await effects()).consumed).toBe(0);
      expect((await effects()).preparations).toBe(0);
      expect((await effects()).postal).toBe(0);
      expect((await effects()).shipping).toBe(0);
      expect(
        (
          await sql(
            "SELECT reserved_active::int n FROM inventory.stock_balance WHERE sku=$1",
            [id(1)],
          )
        ).rows[0].n,
      ).toBe(0);
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
  });
  it("QUSE-029 consumption Shipping Profile Orders and Inventory share PID XID and commit", async () => {
    const before = await effects(),
      q = await issue(),
      p = await prepare(q.quoteId);
    const r = (
      await sql(
        "SELECT c.recorded_pid pid,c.recorded_xid::text xid,c.xmin::text consumption_xid,s.pid shipping_pid,s.xact_id::text shipping_xid,s.xmin::text shipping_row_xid,pf.profile_pid,pf.profile_xid::text profile_xid,pf.xmin::text profile_row_xid,o.xmin::text orders_xid,i.xmin::text inventory_xid,e.participant_proof proof FROM orders.quote_consumption c JOIN orders.shipping_evidence s USING(preparation_id) JOIN orders.profile_evidence pf USING(preparation_id) JOIN orders.preparation o ON o.id=c.preparation_id JOIN inventory.reservation i ON i.id=o.reservation_id JOIN orders.event e ON e.preparation_id=o.id WHERE o.id=$1",
        [p.preparation.id],
      )
    ).rows[0];
    expect(r.pid).toBe(r.shipping_pid);
    expect(r.pid).toBe(r.profile_pid);
    for (const name of [
      "consumption_xid",
      "shipping_xid",
      "shipping_row_xid",
      "profile_xid",
      "profile_row_xid",
      "orders_xid",
      "inventory_xid",
    ])
      expect(r[name]).toBe(r.xid);
    for (const proof of Object.values(r.proof))
      expect(proof).toEqual({ pid: r.pid, xid: r.xid });
    await onePhysical();
    console.log(
      "QUSE_TRANSACTION_EVIDENCE",
      JSON.stringify({
        quoteId: q.quoteId,
        preparationId: p.preparation.id,
        pid: r.pid,
        xid: r.xid,
        before,
        after: await effects(),
        rowXids: [
          r.consumption_xid,
          r.shipping_row_xid,
          r.profile_row_xid,
          r.orders_xid,
          r.inventory_xid,
        ],
      }),
    );
  });
  it("QUSE-030 failure after postal snapshot leaves no partial facts and same key can retry", async () => {
    const q = await issue(),
      key = randomUUID();
    await fault("profile_address_snapshot", () => prepare(q.quoteId, key));
    await noEffects();
    await prepare(q.quoteId, key);
    await onePhysical();
  });
  it("QUSE-031 failure after reserve and consumption insert rolls everything back", async () => {
    const q = await issue(),
      key = randomUUID();
    for (const table of ["shipping_evidence", "quote_consumption"]) {
      await fault(table, () => prepare(q.quoteId, key));
      await noEffects();
    }
    await prepare(q.quoteId, key);
    await onePhysical();
  });
  it("QUSE-032 expiry during stock lock and quote-lock timeout both fail closed", async () => {
    await sql("UPDATE quotes.fixture_policy SET ttl_seconds=1 WHERE id=$1", [
      policy,
    ]);
    const q = await issue(),
      c = await admin.connect();
    try {
      await c.query("BEGIN");
      await c.query(
        "SELECT sku FROM inventory.stock_balance WHERE sku=$1 FOR UPDATE",
        [id(1)],
      );
      const pending = prepare(q.quoteId);
      const refusal = expect(pending).rejects.toMatchObject({
        code: "STALE_INPUT",
      });
      await locks();
      await expired(q.quoteId);
      await c.query("COMMIT");
      await refusal;
      await noEffects();
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
    await sql("UPDATE quotes.fixture_policy SET ttl_seconds=600 WHERE id=$1", [
      policy,
    ]);
    const q2 = await issue(),
      holder = await admin.connect();
    try {
      await holder.query("BEGIN");
      await holder.query(
        "SELECT pg_advisory_xact_lock(('x'||substr(encode(sha256(convert_to('QUSE01:QUOTE:'||$1::text,'UTF8')),'hex'),1,16))::bit(64)::bigint)",
        [q2.quoteId],
      );
      const pending = prepare(q2.quoteId);
      const refusal = expect(pending).rejects.toMatchObject({
        code: "INTEGRATION_UNAVAILABLE",
      });
      await locks();
      await refusal;
      await noEffects();
      await holder.query("COMMIT");
    } finally {
      await holder.query("ROLLBACK");
      holder.release();
    }
    await prepare(q2.quoteId);
    await onePhysical();
  });
  it("QUSE-033 runtime has no DML private functions membership or extra grants", async () => {
    for (const query of [
      "SELECT * FROM orders.quote_consumption",
      "DELETE FROM orders.quote_consumption",
      "SELECT orders.require_complete_consumption()",
      "SELECT orders.read_shipping_preparation(NULL,NULL)",
      "SELECT orders.prepare_profile_quote(NULL,NULL,NULL)",
      "SELECT orders.prepare_quote(NULL,NULL,NULL)",
      "SELECT orders.prepare(NULL,NULL,NULL,'[]')",
      "CREATE TABLE orders.bypass(id int)",
      "SET ROLE atlas_orders_executor",
    ])
      await expect(orders.query(query)).rejects.toThrow();
    const q = await issue();
    for (const [grant, revoke] of [
      [
        "GRANT SELECT ON orders.quote_consumption TO atlas_orders_actor_a",
        "REVOKE SELECT ON orders.quote_consumption FROM atlas_orders_actor_a",
      ],
      [
        "GRANT atlas_orders_executor TO atlas_orders_actor_a",
        "REVOKE atlas_orders_executor FROM atlas_orders_actor_a",
      ],
    ]) {
      try {
        await sql(grant!);
        await expect(prepare(q.quoteId)).rejects.toMatchObject({
          code: "INTEGRATION_UNAVAILABLE",
        });
      } finally {
        await sql(revoke!);
      }
    }
    await noEffects();
  });
  it("QUSE-034 invalid IDs injection mass assignment and errors disclose no private details", async () => {
    const q = await issue();
    for (const extra of [
      { actorId: other },
      { quoteConsumed: false },
      { shippingAmount: 1 },
      { fingerprint: "forged" },
    ])
      await expect(
        service.prepare({ key: randomUUID(), quoteId: q.quoteId, ...extra }),
      ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    await expect(
      service.prepare({
        key: "';DROP TABLE orders.request;--",
        quoteId: q.quoteId,
      }),
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    await expect(
      orders.query("SELECT orders.prepare_consumed_quote($1,$2,$3)", [
        actor,
        randomUUID(),
        "';SELECT 1;--",
      ]),
    ).rejects.toMatchObject({ code: "22P02" });
    await prepare(q.quoteId);
    try {
      await prepare(q.quoteId);
      throw Error("unexpected");
    } catch (e) {
      expect(e).toMatchObject({ code: "CONFLICT", message: "CONFLICT" });
      expect(JSON.stringify(e)).not.toMatch(
        /TEST_STREET|TEST_RECIPIENT|postgresql|SQL|00000000|stack/,
      );
    }
    const app = await (
      await Test.createTestingModule({ imports: [AppModule] }).compile()
    ).createNestApplication();
    await app.init();
    try {
      for (const route of [
        "/api/v1/checkout",
        "/api/v1/quotes",
        "/api/v1/orders",
        "/api/v1/shipping",
      ])
        expect(
          (await http(app.getHttpServer()).post(route).send({})).status,
        ).toBe(404);
    } finally {
      await app.close();
    }
    await onePhysical();
  });
  it("QUSE-035 preexisting modules migrations contracts and frontend preserved", () => {
    const manifest = JSON.parse(
      readFileSync("test/quote-consumption/protected-sources.json", "utf8"),
    ) as Record<string, string>;
    for (const [file, hash] of Object.entries(manifest))
      expect(
        createHash("sha256")
          .update(readFileSync(file, "utf8").replaceAll("\r\n", "\n"))
          .digest("hex"),
        file,
      ).toBe(hash);
  });
  it("QUSE-036 dedicated job pinned isolated and preserves all twelve existing jobs", () => {
    const runner = readFileSync("scripts/quote-consumption-local.mjs", "utf8"),
      workflow = readFileSync("../../.github/workflows/quality.yml", "utf8"),
      job = workflow.split("  quote-consumption-integration:")[1];
    expect(runner).toContain("atlas-cat01-port-55439.lock");
    expect(runner).toContain("QUSE_OWN_RESOURCES_CLEANED");
    expect(runner).not.toMatch(/supabase|dotenv|mrd-cli/);
    expect(job).toContain("pnpm --filter @atlas/api quote-consumption:test");
    expect(job).toContain("package-manager-cache: false");
    expect(job).toContain("pnpm install --frozen-lockfile");
    expect(job).not.toMatch(/\$\{\{\s*secrets\./);
    expect(
      workflow.split("jobs:")[1]!.match(/^  [a-z][a-z0-9-]+:$/gm),
    ).toHaveLength(13);
  });
});
