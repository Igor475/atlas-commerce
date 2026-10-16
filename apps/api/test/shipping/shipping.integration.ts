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
import { ShippingDatabase } from "../../src/modules/shipping/infrastructure/shipping-database.js";
import {
  shippingUrl,
  shippingEnabled,
  shippingMigrationUrl,
} from "../../src/modules/shipping/infrastructure/shipping-config.js";
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
describe("SHIP-01 fixed-zone PostgreSQL TEST_ONLY", () => {
  let admin: pg.Pool,
    inventory: pg.Pool,
    profile: pg.Pool,
    profileB: pg.Pool,
    orders: pg.Pool,
    ordersB: pg.Pool,
    quotes: pg.Pool,
    store: ShippingDatabase,
    storeB: ShippingDatabase,
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
  async function locks(prefix = "atlas-ship-", minimum = 1) {
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
        "SELECT (SELECT count(*)::int FROM orders.profile_address_snapshot) postal,(SELECT count(*)::int FROM orders.profile_evidence) evidence,(SELECT count(*)::int FROM orders.preparation) preparations,(SELECT count(*)::int FROM orders.request) requests,(SELECT count(*)::int FROM orders.event) order_events,(SELECT count(*)::int FROM inventory.reservation) reservations,(SELECT count(*)::int FROM inventory.event) inventory_events,(SELECT count(*)::int FROM inventory.stock_ledger_entry WHERE kind<>'FIXTURE_LOAD') ledger",
      )
    ).rows[0];
  }
  async function noEffects() {
    expect(await effects()).toEqual({
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
      "test/shipping/crash-child.mjs",
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
            "SELECT count(*)::int n FROM pg_stat_activity WHERE application_name='cpint-crash'",
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
  async function noShippingEffects() {
    await noEffects();
    expect(
      (await sql("SELECT count(*)::int n FROM orders.shipping_evidence"))
        .rows[0].n,
    ).toBe(0);
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
      max: 2,
      application_name: "atlas-ship-raw-orders",
    });
    ordersB = new pg.Pool({ ...options, user: "atlas_orders_actor_b", max: 1 });
    quotes = new pg.Pool({ ...options, user: "atlas_quotes_actor_a", max: 1 });
    store = new ShippingDatabase(url(), url("orders"), "SHIP-01", "actor_a");
    storeB = new ShippingDatabase(
      url("quotes", "actor_b"),
      url("orders", "actor_b"),
      "SHIP-01",
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
  it("SHIP-001 exact local PostgreSQL17 marker and TEST_ONLY composition", async () => {
    const r = (
      await sql(
        "SELECT current_database() db,current_setting('atlas.shipping_fixture') marker,current_setting('server_version_num')::int version",
      )
    ).rows[0];
    expect(r).toMatchObject({
      db: "atlas_catalog_cat01",
      marker: "atlas-ship01-disposable",
    });
    expect(r.version).toBeGreaterThanOrEqual(170000);
    expect(r.version).toBeLessThan(180000);
    expect(shippingEnabled({})).toBe(false);
  });
  it("SHIP-002 migration owner and four additive histories are distinct", async () => {
    for (const phase of ["shipping", "profile", "quotes", "orders"]) {
      const r = (
        await sql(
          "SELECT nspowner::regrole::text owner FROM pg_namespace WHERE nspname=$1",
          [phase + "_ship_history"],
        )
      ).rows[0];
      expect(r.owner).toBe(`atlas_${phase}_migrator`);
    }
    const r = (
      await sql(
        "SELECT rolsuper,rolcanlogin FROM pg_roles WHERE rolname='atlas_shipping_executor'",
      )
    ).rows[0];
    expect(r).toEqual({ rolsuper: false, rolcanlogin: false });
  });
  it("SHIP-003 wrong role and marker reject migration before DDL", async () => {
    const migration = readFileSync(
      "prisma-shipping/shipping/migrations/202610160200_shipping/migration.sql",
      "utf8",
    );
    for (const setting of [
      "SET LOCAL ROLE atlas_quotes_actor_a",
      "SET LOCAL ROLE atlas_shipping_migrator; SET LOCAL atlas.shipping_fixture='WRONG'",
    ]) {
      const c = await admin.connect();
      try {
        await c.query("BEGIN");
        await c.query(setting);
        await expect(c.query(migration)).rejects.toThrow(
          "SHIP_FIXTURE_REQUIRED",
        );
      } finally {
        await c.query("ROLLBACK");
        c.release();
      }
    }
  });
  it("SHIP-004 all four chains reapplied without pending or duplicate migrations", async () => {
    for (const phase of ["shipping", "profile", "quotes", "orders"]) {
      const r = await sql(
        `SELECT count(*)::int n FROM ${phase}_ship_history._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
      );
      expect(r.rows[0].n).toBe(1);
    }
    expect(readFileSync("scripts/shipping-local.mjs", "utf8")).toContain(
      "for (let i = 0; i < 2; i++)",
    );
  });
  it("SHIP-005 sealed policy, zones and tariff are immutable with complete FK", async () => {
    await expect(
      sql("UPDATE shipping.zone SET amount_cents=999 WHERE policy_id=$1", [
        policy,
      ]),
    ).rejects.toThrow("SHIP_IMMUTABLE");
    await expect(
      sql("DELETE FROM shipping.revision WHERE policy_id=$1", [policy]),
    ).rejects.toThrow();
    await expect(
      sql(
        "INSERT INTO shipping.zone VALUES($1,1,$2,'00000020','00000029',true,'TEST_GROUND',1,NULL)",
        [policy, id(922)],
      ),
    ).rejects.toThrow("SHIP_VERSION_SEALED");
  });
  it("SHIP-006 remote URL, wrong database, consent, production and CLI args rejected", () => {
    const value = url("orders");
    for (const v of [
      value.replace("127.0.0.1", "example.invalid"),
      value.replace("55439", "5432"),
      value.replace("atlas_catalog_cat01", "postgres"),
      value + "&options=unsafe",
    ])
      expect(() => shippingUrl(v, "SHIP-01", "orders", "actor_a")).toThrow();
    expect(() => shippingUrl(value, "CP-02", "orders", "actor_a")).toThrow();
    expect(() =>
      shippingMigrationUrl(value, "SHIP-01", "invalid" as "shipping"),
    ).toThrow();
    expect(() =>
      shippingEnabled({
        SHIP_MODE: "local-disposable",
        SHIP_CONSENT: "SHIP-01",
        NODE_ENV: "production",
      }),
    ).toThrow();
    const child = spawnSync(
      process.execPath,
      ["scripts/shipping-db.mjs", "test", "https://example.invalid"],
      { encoding: "utf8" },
    );
    expect(child.status).not.toBe(0);
    expect(child.stderr).toContain("SHIP_COMMAND_INVALID");
  });
  it("SHIP-007 CEP remains eight textual digits including leading zeroes", async () => {
    const q = await issue();
    expect(q.delivery?.postalCode).toBe("00000000");
    expect(q.delivery?.addressId).toBe(address);
    expect(q.delivery?.addressVersion).toBe(1);
  });
  it("SHIP-008 covered address resolves exactly one policy zone and option", async () => {
    const q = await issue();
    expect(q.delivery).toMatchObject({
      zoneId: id(920),
      policyId: policy,
      policyVersion: 1,
      option: "TEST_GROUND",
      purpose: "TEST_ONLY",
      amountCents: 777,
    });
  });
  it("SHIP-009 overlapping inclusive ranges including concurrent inserts refused", async () => {
    await sql(
      "INSERT INTO shipping.revision VALUES($1,2,'DRAFT','BR','BRL',1000)",
      [policy],
    );
    const c = await admin.connect();
    await c.query("BEGIN");
    await c.query(
      "INSERT INTO shipping.zone VALUES($1,2,$2,'00000000','00000009',true,'TEST_GROUND',1,NULL)",
      [policy, id(922)],
    );
    const otherClient = await admin.connect();
    await otherClient.query("SET application_name='ship-zone-writer'");
    const pending = otherClient.query(
      "INSERT INTO shipping.zone VALUES($1,2,$2,'00000009','00000020',true,'TEST_GROUND',1,NULL)",
      [policy, id(923)],
    );
    const refusal = expect(pending).rejects.toThrow("SHIP_ZONE_OVERLAP");
    try {
      await locks("ship-zone-writer");
    } finally {
      await c.query("COMMIT");
      c.release();
    }
    await refusal;
    otherClient.release();
    expect(
      (await sql("SELECT count(*)::int n FROM shipping.zone WHERE version=2"))
        .rows[0].n,
    ).toBe(1);
  });
  it("SHIP-010 configured gap refuses physical quote without zero fallback", async () => {
    await change(1, "ELIGIBLE", { ...fake, postalCode: "00000020" });
    await expect(issue()).rejects.toThrow();
    expect(
      (await sql("SELECT count(*)::int n FROM quotes.quote")).rows[0].n,
    ).toBe(0);
  });
  it("SHIP-011 inclusive endpoints and adjacent ranges resolve without ambiguity", async () => {
    await change(1, "ELIGIBLE", { ...fake, postalCode: "00000009" });
    expect((await issue()).delivery?.zoneId).toBe(id(920));
    await change(2, "ELIGIBLE", { ...fake, postalCode: "00000010" });
    expect((await issue()).delivery?.zoneId).toBe(id(921));
    await change(3, "ELIGIBLE", { ...fake, postalCode: "00000019" });
    expect((await issue()).delivery?.amountCents).toBe(999);
  });
  it("SHIP-012 malformed CEP, unsupported country and unconfigured destination refuse", async () => {
    for (const data of [
      { ...fake, postalCode: "000-000" },
      { ...fake, country: "US" },
    ])
      await expect(change(1, "ELIGIBLE", data)).rejects.toThrow();
    await change(1, "ELIGIBLE", { ...fake, postalCode: "99999999" });
    await expect(issue()).rejects.toThrow();
  });
  it("SHIP-013 inactive or missing Shipping policy cannot quote physical", async () => {
    await sql("UPDATE shipping.policy SET active=false WHERE id=$1", [policy]);
    await expect(issue()).rejects.toThrow();
    await sql("UPDATE shipping.policy SET active=true WHERE id=$1", [policy]);
    const missing = id(911);
    await sql(
      "INSERT INTO quotes.fixture_policy SELECT $1,purpose,version,active,ttl_seconds,option,zone,base_cents,per_gram_cents,max_dimension_mm,min_days,max_days FROM quotes.fixture_policy WHERE id=$2",
      [missing, policy],
    );
    const selected = new ProfileOrderIntegration(
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
          policyId: missing,
          option: "TEST_GROUND",
          purpose: "TEST_ONLY",
        }),
      },
    );
    await expect(
      selected.issue({
        items: [{ productId: id(1), quantity: 1 }],
        shippingAddressId: address,
      }),
    ).rejects.toThrow();
  });
  it("SHIP-014 invalid option or incomplete physical eligibility refuses", async () => {
    await quotes
      .query("SELECT quotes.issue_shipping($1,$2,$3,$4,$5)", [
        actor,
        JSON.stringify([{ id: id(1), quantity: 1 }]),
        address,
        policy,
        "TEST_UNKNOWN",
      ])
      .then(
        () => {
          throw Error("unexpected");
        },
        (e) => expect(e.message).toBe("SHIP_OPTION_UNAVAILABLE"),
      );
    await sql("DELETE FROM quotes.fixture_physical WHERE product_id=$1", [
      id(1),
    ]);
    await expect(issue()).rejects.toThrow();
    await noShippingEffects();
  });
  it("SHIP-015 fixed cents charged once per order independent of units and weight", async () => {
    const a = await issue();
    await sql(
      "UPDATE quotes.fixture_physical SET weight_grams=99999 WHERE product_id=$1",
      [id(1)],
    );
    const b = await service.issue({
      items: [
        { productId: id(1), quantity: 3 },
        { productId: id(2), quantity: 2 },
      ],
      shippingAddressId: address,
    });
    expect(a.delivery?.amountCents).toBe(777);
    expect(b.delivery?.amountCents).toBe(777);
    expect(b.total.amountCents).toBe(777 + b.subtotal.amountCents);
  });
  it("SHIP-016 single cent rate and BRL exact subtotal plus fixed fee", async () => {
    await seedShipping(2, 1);
    const q = await issue();
    expect(q.total).toEqual({ currency: "BRL", amountCents: 1001 });
    expect(q.subtotal.amountCents).toBe(1000);
  });
  it("SHIP-017 fee or combined total overflow rejects without partial quote", async () => {
    await seedShipping(2, Number.MAX_SAFE_INTEGER);
    await expect(issue()).rejects.toThrow();
    expect(
      (await sql("SELECT count(*)::int n FROM quotes.quote")).rows[0].n,
    ).toBe(0);
    await sql(
      "INSERT INTO shipping.revision VALUES($1,3,'DRAFT','BR','BRL',1000)",
      [policy],
    );
    await expect(
      sql(
        "INSERT INTO shipping.zone VALUES($1,3,$2,'00000000','00000009',true,'TEST_GROUND',$3,NULL)",
        [policy, id(922), "9007199254740992"],
      ),
    ).rejects.toThrow();
  });
  it("SHIP-018 missing tariff and empty policy cannot be activated", async () => {
    await sql(
      "INSERT INTO shipping.revision VALUES($1,2,'DRAFT','BR','BRL',1000)",
      [policy],
    );
    await expect(
      sql(
        "INSERT INTO shipping.zone VALUES($1,2,$2,'00000000','00000009',true,'TEST_GROUND',NULL,NULL)",
        [policy, id(922)],
      ),
    ).rejects.toThrow();
    await expect(
      sql(
        "UPDATE shipping.revision SET state='SEALED' WHERE policy_id=$1 AND version=2",
        [policy],
      ),
    ).rejects.toThrow();
    await expect(
      sql("UPDATE shipping.policy SET current_version=2 WHERE id=$1", [policy]),
    ).rejects.toThrow();
  });
  it("SHIP-019 zero negative fractional or non-BRL tariff rejected", async () => {
    await sql(
      "INSERT INTO shipping.revision VALUES($1,2,'DRAFT','BR','BRL',1000)",
      [policy],
    );
    for (const fee of ["0", "-1", "1.5", "not-money"])
      await expect(
        sql(
          "INSERT INTO shipping.zone VALUES($1,2,$2,'00000000','00000009',true,'TEST_GROUND',$3,NULL)",
          [policy, id(922), fee],
        ),
      ).rejects.toThrow();
    await expect(
      sql(
        "INSERT INTO shipping.revision VALUES($1,3,'DRAFT','BR','USD',1000)",
        [policy],
      ),
    ).rejects.toThrow();
  });
  it("SHIP-020 deterministic evidence and explicit unapproved estimate fixture", async () => {
    const a = await issue(),
      b = await issue();
    expect(a.delivery).toEqual(b.delivery);
    expect(a.delivery?.estimateFixture).toBeNull();
    await sql(
      "INSERT INTO shipping.revision VALUES($1,2,'DRAFT','BR','BRL',1000)",
      [policy],
    );
    await sql(
      "INSERT INTO shipping.zone VALUES($1,2,$2,'00000000','00000009',true,'TEST_GROUND',777,$3::jsonb)",
      [
        policy,
        id(920),
        JSON.stringify({
          purpose: "TEST_ONLY",
          min: 2,
          max: 4,
          unit: "TEST_ONLY_UNAPPROVED_UNIT",
        }),
      ],
    );
    await sql(
      "UPDATE shipping.revision SET state='SEALED' WHERE policy_id=$1 AND version=2",
      [policy],
    );
    await sql("UPDATE quotes.fixture_policy SET version=2 WHERE id=$1", [
      policy,
    ]);
    await sql("UPDATE shipping.policy SET current_version=2 WHERE id=$1", [
      policy,
    ]);
    expect((await issue()).delivery?.estimateFixture).toMatchObject({
      purpose: "TEST_ONLY",
      min: 2,
      max: 4,
      unit: "TEST_ONLY_UNAPPROVED_UNIT",
    });
  });
  it("SHIP-021 physical book requires own address and immutable Shipping snapshot", async () => {
    const q = await issue(),
      p = await prepare(q.quoteId);
    expect(p.delivery).toEqual(q.delivery);
    expect(p.total).toEqual(q.total);
    expect(p.preparation.reservationExpiresAt).not.toBeNull();
    expect(p.addressSnapshot?.addressVersion).toBe(1);
  });
  it("SHIP-022 ebook never calls Shipping and has delivery null", async () => {
    await noShipping(async () => {
      const q = await issue(3);
      const p = await prepare(q.quoteId);
      expect(q.delivery).toBeNull();
      expect(q.subtotal).toEqual(q.total);
      expect(p.delivery).toBeNull();
      expect(p.addressSnapshot).toBeNull();
      expect(p.preparation.reservationExpiresAt).toBeNull();
    });
  });
  it("SHIP-023 digital magazine never calls Shipping or requires postal data", async () => {
    await noShipping(async () => {
      const q = await issue(4);
      expect(q.delivery).toBeNull();
      expect((await prepare(q.quoteId)).addressSnapshot).toBeNull();
    });
  });
  it("SHIP-024 physical kit plus loose repeated SKU pays once with all physical allocation", async () => {
    const q = await service.issue({
      items: [
        { productId: id(5), quantity: 1 },
        { productId: id(1), quantity: 1 },
      ],
      shippingAddressId: address,
    });
    expect(q.delivery?.amountCents).toBe(777);
    const p = await prepare(q.quoteId);
    expect(p.delivery?.eligibility.kitGrouping).toBe(
      "PC04_PHYSICAL_COMPONENTS_TOGETHER",
    );
    const lines = (
      await sql(
        "SELECT sku,quantity::int q FROM inventory.reservation_line ORDER BY sku",
      )
    ).rows;
    expect(lines).toEqual([
      { sku: id(1), q: 2 },
      { sku: id(2), q: 1 },
    ]);
  });
  it("SHIP-025 mixed kit digital component adds no shipping charge", async () => {
    const q = await issue(6),
      p = await prepare(q.quoteId);
    expect(q.delivery?.amountCents).toBe(777);
    expect(p.preparation.lines[0]?.components).toHaveLength(2);
    expect(
      (await sql("SELECT count(*)::int n FROM inventory.reservation_line"))
        .rows[0].n,
    ).toBe(1);
  });
  it("SHIP-026 digital kit bypasses Shipping Profile postal and physical reserve", async () => {
    await noShipping(async () => {
      const q = await issue(7),
        p = await prepare(q.quoteId);
      expect(q.delivery).toBeNull();
      expect(p.delivery).toBeNull();
      expect(p.addressSnapshot).toBeNull();
      expect(p.preparation.reservationExpiresAt).toBeNull();
      expect((await effects()).reservations).toBe(0);
    });
  });
  it("SHIP-027 changed address revision demands re-quote without partial facts", async () => {
    const q = await issue();
    await change();
    await expect(prepare(q.quoteId)).rejects.toThrow();
    await noShippingEffects();
    expect((await service.quote(q.quoteId)).delivery?.addressVersion).toBe(1);
  });
  it("SHIP-028 new version rate or withdrawn zone invalidates old quote preserving history", async () => {
    const q = await issue();
    await seedShipping(2, 888, false);
    await expect(prepare(q.quoteId)).rejects.toThrow();
    await noShippingEffects();
    expect((await service.quote(q.quoteId)).delivery?.amountCents).toBe(777);
  });
  it("SHIP-029 policy or address changed during observable Catalog wait refuses safely", async () => {
    for (const mode of ["policy", "address", "zone"]) {
      const q = await issue(),
        c = await admin.connect();
      await c.query("BEGIN");
      await c.query("SELECT id FROM catalog.product WHERE id=$1 FOR UPDATE", [
        id(1),
      ]);
      const pending = prepare(q.quoteId);
      const refusal = expect(pending).rejects.toMatchObject({
        code: "STALE_INPUT",
      });
      try {
        await locks();
        if (mode === "policy")
          await sql("UPDATE shipping.policy SET active=false WHERE id=$1", [
            policy,
          ]);
        else if (mode === "address") await change();
        else await seedShipping(2, 777, false);
      } finally {
        await c.query("COMMIT");
        c.release();
      }
      await refusal;
      await noShippingEffects();
      if (mode === "policy")
        await sql("UPDATE shipping.policy SET active=true WHERE id=$1", [
          policy,
        ]);
    }
  });
  it("SHIP-030 ten minute TTL and expiry at or after stock-lock boundary", async () => {
    const normal = await issue();
    expect(
      (
        await sql(
          "SELECT extract(epoch FROM expires_at-created_at)::int ttl FROM quotes.quote WHERE id=$1",
          [normal.quoteId],
        )
      ).rows[0].ttl,
    ).toBe(600);
    await sql("UPDATE quotes.fixture_policy SET ttl_seconds=1 WHERE id=$1", [
      policy,
    ]);
    const q = await issue(),
      c = await admin.connect();
    await c.query("BEGIN");
    await c.query(
      "SELECT sku FROM inventory.stock_balance WHERE sku=$1 FOR UPDATE",
      [id(1)],
    );
    const pending = prepare(q.quoteId);
    const refusal = expect(pending).rejects.toMatchObject({
      code: "STALE_INPUT",
    });
    try {
      await locks();
      const until = Date.now() + 1800;
      while (Date.now() < until) {
        if (
          (
            await sql(
              "SELECT clock_timestamp()>=expires_at expired FROM quotes.quote WHERE id=$1",
              [q.quoteId],
            )
          ).rows[0].expired
        )
          break;
        await pause(5);
      }
      expect(
        (
          await sql(
            "SELECT clock_timestamp()>=expires_at expired FROM quotes.quote WHERE id=$1",
            [q.quoteId],
          )
        ).rows[0].expired,
      ).toBe(true);
    } finally {
      await c.query("COMMIT");
      c.release();
    }
    await refusal;
    await noShippingEffects();
  });
  it("SHIP-031 rollback after postal snapshot reserve and process death with recovery", async () => {
    const q = await issue();
    for (const table of ["profile_address_snapshot", "shipping_evidence"]) {
      await fault(table, () => prepare(q.quoteId));
      await noShippingEffects();
    }
    const key = randomUUID();
    await crash("before", q.quoteId, key);
    await noShippingEffects();
    await crash("after", q.quoteId, key);
    const before = await effects(),
      replay = await prepare(q.quoteId, key);
    expect(replay.delivery?.amountCents).toBe(777);
    expect(await effects()).toEqual(before);
    expect(before.reservations).toBe(1);
    expect(
      (await sql("SELECT count(*)::int n FROM orders.shipping_evidence"))
        .rows[0].n,
    ).toBe(1);
  });
  it("SHIP-032 snapshots and replay remain immutable after policy changes and expiry", async () => {
    await sql("UPDATE quotes.fixture_policy SET ttl_seconds=1 WHERE id=$1", [
      policy,
    ]);
    const q = await issue(),
      key = randomUUID(),
      p = await prepare(q.quoteId, key);
    await seedShipping(2, 888);
    // New intention must re-quote even when the new zone is still eligible.
    await expect(prepare(q.quoteId)).rejects.toThrow();
    await change();
    const until = Date.now() + 1800;
    while (
      Date.now() < until &&
      !(
        await sql(
          "SELECT clock_timestamp()>=expires_at expired FROM quotes.quote WHERE id=$1",
          [q.quoteId],
        )
      ).rows[0].expired
    )
      await pause(5);
    expect(
      (
        await sql(
          "SELECT clock_timestamp()>=expires_at expired FROM quotes.quote WHERE id=$1",
          [q.quoteId],
        )
      ).rows[0].expired,
    ).toBe(true);
    expect(await prepare(q.quoteId, key)).toEqual(p);
    await expect(
      sql("UPDATE orders.shipping_evidence SET delivery=NULL"),
    ).rejects.toThrow();
    await expect(
      sql("DELETE FROM quotes.delivery_selection"),
    ).rejects.toThrow();
    expect((await service.read(p.preparation.id)).delivery?.amountCents).toBe(
      777,
    );
  });
  it("SHIP-033 Shipping Profile Orders Inventory and durable records share PID/XID", async () => {
    const before = await effects(),
      q = await issue(),
      p = await prepare(q.quoteId);
    const r = (
      await sql(
        "SELECT s.pid,s.xact_id::text xid,s.xmin::text shipping_xid,pf.profile_pid,pf.profile_xid::text profile_xid,pf.xmin::text profile_row_xid,o.xmin::text orders_xid,i.xmin::text inventory_xid,e.participant_proof proof FROM orders.shipping_evidence s JOIN orders.profile_evidence pf USING(preparation_id) JOIN orders.preparation o ON o.id=s.preparation_id JOIN inventory.reservation i ON i.id=o.reservation_id JOIN orders.event e ON e.preparation_id=o.id WHERE o.id=$1",
        [p.preparation.id],
      )
    ).rows[0];
    expect(r.pid).toBe(r.profile_pid);
    for (const xid of [
      r.shipping_xid,
      r.profile_xid,
      r.profile_row_xid,
      r.orders_xid,
      r.inventory_xid,
    ])
      expect(xid).toBe(r.xid);
    for (const proof of Object.values(r.proof) as {
      pid: number;
      xid: string;
    }[])
      expect(proof).toEqual({ pid: r.pid, xid: r.xid });
    const after = await effects();
    expect(before.preparations).toBe(0);
    expect(after).toMatchObject({
      postal: 1,
      preparations: 1,
      reservations: 1,
      order_events: 1,
      inventory_events: 1,
      ledger: 1,
    });
    console.log(
      "SHIP_TRANSACTION_EVIDENCE",
      JSON.stringify({
        quoteId: q.quoteId,
        preparationId: p.preparation.id,
        pid: r.pid,
        xid: r.xid,
        rowXids: [
          r.shipping_xid,
          r.profile_row_xid,
          r.orders_xid,
          r.inventory_xid,
        ],
        before,
        after,
        shippingSnapshots: 1,
      }),
    );
  });
  it("SHIP-034 foreign address quote and revoked account cannot recover private data", async () => {
    await expect(issue(1, foreign)).rejects.toThrow();
    const q = await issue(),
      p = await prepare(q.quoteId);
    await expect(
      storeB.prepare(other, randomUUID(), q.quoteId),
    ).rejects.toThrow();
    await expect(storeB.read(other, p.preparation.id)).rejects.toThrow();
    await sql(
      "UPDATE customer_profile.fixture_account SET active=false WHERE id=$1",
      [actor],
    );
    await expect(service.read(p.preparation.id)).rejects.toThrow();
    await expect(prepare(q.quoteId)).rejects.toThrow();
  });
  it("SHIP-035 runtime no DML membership legacy bypass or grants inflation", async () => {
    await expect(orders.query("SELECT * FROM shipping.zone")).rejects.toThrow();
    await expect(
      orders.query("SET ROLE atlas_shipping_executor"),
    ).rejects.toThrow();
    await expect(
      quotes.query("SELECT quotes.issue_profile($1,$2,$3,$4,$5)", [
        actor,
        JSON.stringify([{ id: id(1), quantity: 1 }]),
        address,
        policy,
        "TEST_GROUND",
      ]),
    ).rejects.toThrow();
    const q = await issue();
    for (const [grant, revoke] of [
      [
        "GRANT SELECT ON shipping.zone TO atlas_orders_actor_a",
        "REVOKE SELECT ON shipping.zone FROM atlas_orders_actor_a",
      ],
      [
        "GRANT atlas_shipping_executor TO atlas_orders_actor_a",
        "REVOKE atlas_shipping_executor FROM atlas_orders_actor_a",
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
    await noShippingEffects();
    expect(
      (
        await sql(
          "SELECT has_table_privilege('atlas_shipping_executor','customer_profile.revision','SELECT,INSERT,UPDATE,DELETE') raw_profile,has_table_privilege('atlas_shipping_executor','quotes.quote','INSERT,UPDATE,DELETE') write_quotes",
        )
      ).rows[0],
    ).toEqual({ raw_profile: false, write_quotes: false });
  });
  it("SHIP-036 client zone tariff owner and SQL injection cannot set authority", async () => {
    for (const extra of [
      { zoneId: id(920) },
      { amountCents: 1 },
      { ownerId: other },
      { policyId: policy },
    ])
      await expect(
        service.issue({
          items: [{ productId: id(1), quantity: 1 }],
          shippingAddressId: address,
          ...extra,
        }),
      ).rejects.toThrow();
    await expect(
      service.issue({
        items: [
          { productId: "'; DROP SCHEMA shipping CASCADE;--", quantity: 1 },
        ],
        shippingAddressId: address,
      }),
    ).rejects.toThrow();
    expect(
      (await sql("SELECT to_regclass('shipping.zone') present")).rows[0]
        .present,
    ).toBe("shipping.zone");
    await noShippingEffects();
  });
  it("SHIP-037 errors redacted no public Shipping quote checkout or address route", async () => {
    const q = await issue();
    await change(1, "ELIGIBLE", { ...fake, recipient: "TEST_PRIVATE_MARKER" });
    try {
      await prepare(q.quoteId);
      throw Error("unexpected");
    } catch (e) {
      expect(JSON.stringify(e)).not.toMatch(
        /TEST_PRIVATE_MARKER|SELECT|INSERT|postgresql|stack/i,
      );
      expect((e as Error).message).toBe("STALE_INPUT");
    }
    const app = await (
      await Test.createTestingModule({ imports: [AppModule] }).compile()
    ).createNestApplication();
    await app.init();
    try {
      for (const route of [
        "/api/v1/shipping",
        "/api/v1/checkout/quotes",
        "/api/v1/checkouts",
        "/api/v1/me/addresses",
      ])
        await http(app.getHttpServer()).post(route).send({}).expect(404);
    } finally {
      await app.close();
    }
  });
  it("SHIP-038 all preexisting module migrations and normative contracts preserved", () => {
    const manifest = JSON.parse(
      readFileSync("test/shipping/protected-sources.json", "utf8"),
    ) as Record<string, string>;
    for (const [file, hash] of Object.entries(manifest))
      expect(
        createHash("sha256")
          .update(readFileSync(file, "utf8").replaceAll("\r\n", "\n"))
          .digest("hex"),
        file,
      ).toBe(hash);
  });
  it("SHIP-039 changed price publication or concurrently exhausted kit fails atomically", async () => {
    const q = await issue();
    await sql(
      "SELECT pricing.replace_base_price($1,2000,'BRL','SHIP_TEST_ONLY')",
      [id(1)],
    );
    await expect(prepare(q.quoteId)).rejects.toThrow();
    await noShippingEffects();
    const q2 = await issue();
    await sql("UPDATE catalog.product SET status='UNPUBLISHED' WHERE id=$1", [
      id(1),
    ]);
    await expect(prepare(q2.quoteId)).rejects.toThrow();
    await noShippingEffects();
    await sql("UPDATE catalog.product SET status='PUBLISHED' WHERE id=$1", [
      id(1),
    ]);
    const kit = await issue(5),
      c = await inventory.connect();
    await c.query("BEGIN");
    await c.query("SELECT * FROM inventory.reserve($1,$2,$3,$4::jsonb)", [
      randomUUID(),
      randomUUID(),
      "a".repeat(64),
      JSON.stringify([{ sku: id(2), quantity: 10 }]),
    ]);
    const pending = prepare(kit.quoteId);
    const refusal = expect(pending).rejects.toThrow();
    try {
      await locks();
    } finally {
      await c.query("COMMIT");
      c.release();
    }
    await refusal;
    expect((await effects()).preparations).toBe(0);
    expect(
      (await sql("SELECT count(*)::int n FROM orders.shipping_evidence"))
        .rows[0].n,
    ).toBe(0);
    expect(
      (
        await sql(
          "SELECT reserved_active::int n FROM inventory.stock_balance WHERE sku=$1",
          [id(1)],
        )
      ).rows[0].n,
    ).toBe(0);
  });
  it("SHIP-040 CI isolated no secrets with preserved jobs and local owned cleanup", () => {
    const runner = readFileSync("scripts/shipping-local.mjs", "utf8"),
      workflow = readFileSync("../../.github/workflows/quality.yml", "utf8");
    expect(runner).toContain("atlas-cat01-port-55439.lock");
    expect(runner).not.toMatch(/supabase|dotenv|mrd-cli/);
    expect(runner).toContain("SHIP_OWN_RESOURCES_CLEANED");
    const job = workflow.split("  shipping-integration:")[1];
    expect(job).toContain("pnpm --filter @atlas/api shipping:test");
    expect(job).not.toMatch(/\$\{\{\s*secrets\./);
    expect(job).toContain("package-manager-cache: false");
    expect(job).toContain("pnpm install --frozen-lockfile");
  });
});
