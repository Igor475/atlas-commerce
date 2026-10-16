import "reflect-metadata";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { randomUUID, createHash } from "node:crypto";
import { fork, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as pause } from "node:timers/promises";
import pg from "pg";
import { Test } from "@nestjs/testing";
import http from "supertest";
import { AppModule } from "../../src/app.module.js";
import {
  ProfileOrderIntegration,
  type IntegrationPrincipal,
} from "../../src/modules/customer-profile/application/profile-order-integration.js";
import { ProfileIntegrationDatabase } from "../../src/modules/customer-profile/infrastructure/profile-integration-database.js";
import {
  integrationUrl,
  integrationEnabled,
  integrationMigrationUrl,
} from "../../src/modules/customer-profile/infrastructure/profile-integration-config.js";
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
describe("CP-02 single PostgreSQL transaction TEST_ONLY", () => {
  let admin: pg.Pool,
    inventory: pg.Pool,
    profile: pg.Pool,
    profileB: pg.Pool,
    orders: pg.Pool,
    ordersB: pg.Pool,
    quotes: pg.Pool,
    store: ProfileIntegrationDatabase,
    storeB: ProfileIntegrationDatabase,
    service: ProfileOrderIntegration;
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
  async function locks(prefix = "atlas-cpint-", minimum = 1) {
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
    if (!["profile_address_snapshot", "profile_evidence"].includes(table))
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
      "test/profile-integration/crash-child.mjs",
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
      application_name: "atlas-cpint-raw-orders",
    });
    ordersB = new pg.Pool({ ...options, user: "atlas_orders_actor_b", max: 1 });
    quotes = new pg.Pool({ ...options, user: "atlas_quotes_actor_a", max: 1 });
    store = new ProfileIntegrationDatabase(
      url(),
      url("orders"),
      "CP-02",
      "actor_a",
    );
    storeB = new ProfileIntegrationDatabase(
      url("quotes", "actor_b"),
      url("orders", "actor_b"),
      "CP-02",
      "actor_b",
    );
    service = new ProfileOrderIntegration(
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
    );
    expect(
      (await sql("SELECT current_setting('atlas.profile_integration') marker"))
        .rows[0].marker,
    ).toBe("atlas-cpint01-disposable");
  });
  beforeEach(async () => {
    await sql(
      "TRUNCATE customer_profile.fixture_account,quotes.fixture_customer,quotes.fixture_policy,quotes.fixture_physical,orders.fixture_principal,inventory.event,inventory.stock_ledger_entry,inventory.reservation_line,inventory.intent,inventory.reservation,inventory.stock_balance,pricing.price_revision,pricing.price_product,catalog.kit_composition,catalog.product_category,catalog.work_author,catalog.product,catalog.edition,catalog.work,catalog.author,catalog.publisher,catalog.category CASCADE",
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
  it("CPINT-001 integrated marker, PostgreSQL17, same database and isolated defaults", async () => {
    const r = (
      await sql(
        "SELECT current_database() db,current_setting('server_version_num')::int v",
      )
    ).rows[0];
    expect(r.db).toBe("atlas_catalog_cat01");
    expect(r.v).toBeGreaterThanOrEqual(170000);
    expect(r.v).toBeLessThan(180000);
    expect(integrationEnabled({})).toBe(false);
    expect(() =>
      integrationEnabled({
        CPINT_MODE: "local-disposable",
        CPINT_CONSENT: "CP-02",
        NODE_ENV: "production",
      }),
    ).toThrow();
  });
  it("CPINT-002 distinct migration histories and owners for additive chains", async () => {
    for (const [schema, owner] of [
      ["customer_profile", "atlas_profile_migrator"],
      ["quotes", "atlas_quotes_migrator"],
      ["orders", "atlas_orders_migrator"],
      ["inventory", "atlas_inventory_migrator"],
    ])
      expect(
        (
          await sql(
            "SELECT nspowner::regrole::text owner FROM pg_namespace WHERE nspname=$1",
            [schema],
          )
        ).rows[0].owner,
      ).toBe(owner);
    for (const phase of ["profile", "quotes", "orders"])
      expect(
        (
          await sql(
            `SELECT count(*)::int n FROM ${phase}_cpint_history._prisma_migrations WHERE finished_at IS NOT NULL`,
          )
        ).rows[0].n,
      ).toBe(1);
  });
  it("CPINT-003 new migration rejects wrong role and marker", async () => {
    const c = await orders.connect();
    try {
      await expect(
        c.query(
          readFileSync(
            "prisma-profile-integration/orders/migrations/202610160102_profile_preparation/migration.sql",
            "utf8",
          ),
        ),
      ).rejects.toThrow("CPINT_FIXTURE_REQUIRED");
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
    const d = await admin.connect();
    try {
      await d.query("BEGIN; SET LOCAL atlas.profile_integration='wrong'");
      await expect(
        d.query("SELECT customer_profile.assert_actor($1)", [actor]),
      ).rejects.toThrow("CP_FIXTURE_REQUIRED");
    } finally {
      await d.query("ROLLBACK");
      d.release();
    }
  });
  it("CPINT-004 repeated deploy finds no pending changes", () => {
    const r = spawnSync(
      process.execPath,
      ["scripts/profile-orders-db.mjs", "migrate", "orders"],
      { encoding: "utf8", timeout: 30000 },
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("No pending migrations");
  });
  it("CPINT-005 consumers cannot write Profile or obtain arbitrary snapshot", async () => {
    for (const pool of [orders, quotes])
      for (const q of [
        "SELECT * FROM customer_profile.revision",
        "UPDATE customer_profile.address SET current_version=99",
        "DELETE FROM customer_profile.revision",
        "SELECT customer_profile.snapshot_with_proof($1,$2,1)",
        "SET ROLE atlas_profile_executor",
      ])
        await expect(
          pool.query(q, q.includes("$1") ? [actor, address] : undefined),
        ).rejects.toThrow();
  });
  it("CPINT-006 remote URL, cross-database and extra CLI args refused", () => {
    for (const u of [
      url().replace("127.0.0.1", "example.invalid"),
      url().replace("atlas_catalog_cat01", "atlas_profile_cp01"),
      url() + "&sslmode=disable",
    ])
      expect(() => integrationUrl(u, "CP-02", "quotes", "actor_a")).toThrow();
    expect(() =>
      integrationMigrationUrl(url(), "CP-02", "invalid" as "profile"),
    ).toThrow();
    expect(
      spawnSync(
        process.execPath,
        ["scripts/profile-orders-db.mjs", "test", "extra"],
        { encoding: "utf8", timeout: 5000 },
      ).status,
    ).not.toBe(0);
  });
  it("CPINT-007 server principal and SQL role binding both required", async () => {
    const s = new ProfileOrderIntegration(
      store,
      {
        current: async () => ({
          actorId: other,
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
    );
    await expect(
      s.issue({ items: [{ productId: id(3), quantity: 1 }] }),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });
  it("CPINT-008 own quote binds exact Profile version without stock effects", async () => {
    const q = await issue();
    const r = (
      await sql(
        "SELECT address_id,address_version,country,postal_code FROM quotes.profile_reference WHERE quote_id=$1",
        [q.quoteId],
      )
    ).rows[0];
    expect(r).toEqual({
      address_id: address,
      address_version: 1,
      country: "BR",
      postal_code: "00000000",
    });
    await noEffects();
  });
  it("CPINT-009 foreign address or quote refused", async () => {
    await expect(issue(1, foreign)).rejects.toThrow();
    const q = await issue();
    await expect(
      storeB.prepare(other, randomUUID(), q.quoteId),
    ).rejects.toMatchObject({ code: "RESOURCE_NOT_FOUND" });
    await noEffects();
  });
  it("CPINT-010 inactive or unverified artificial account refused", async () => {
    await sql(
      "UPDATE customer_profile.fixture_account SET verified=false WHERE id=$1",
      [actor],
    );
    await expect(issue(3)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    await sql(
      "UPDATE customer_profile.fixture_account SET verified=true,active=false WHERE id=$1",
      [actor],
    );
    await expect(issue()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });
  it("CPINT-011 context forgery and legacy bypass ports denied", async () => {
    const q = await issue();
    await expect(
      orders.query("SELECT orders.prepare_quote($1,$2,$3)", [
        actor,
        randomUUID(),
        q.quoteId,
      ]),
    ).rejects.toThrow();
    await expect(
      quotes.query("SELECT quotes.project($1,$2)", [actor, q.quoteId]),
    ).rejects.toThrow();
    const s = new ProfileOrderIntegration(
      store,
      {
        current: async () =>
          ({
            actorId: actor,
            eligible: true,
            sessionClass: "STAFF",
            evidence: "CPINT_TEST_ONLY",
          }) as unknown as IntegrationPrincipal,
      },
      {
        authorize: async () => ({
          policyId: policy,
          option: "TEST_GROUND",
          purpose: "TEST_ONLY",
        }),
      },
    );
    await expect(s.quote(q.quoteId)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    await noEffects();
  });
  it("CPINT-012 replay/read cannot bypass revoked account", async () => {
    const q = await issue();
    const key = randomUUID(),
      r = await prepare(q.quoteId, key);
    await sql(
      "UPDATE customer_profile.fixture_account SET active=false WHERE id=$1",
      [actor],
    );
    await expect(prepare(q.quoteId, key)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    await expect(service.read(r.preparation.id)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    expect((await effects()).postal).toBe(1);
  });
  it("CPINT-013 current revision freezes exact typed snapshot", async () => {
    const q = await issue(),
      r = await prepare(q.quoteId);
    expect(r.addressSnapshot).toEqual({
      addressId: address,
      addressVersion: 1,
      purpose: "TEST_ONLY",
      postalAddress: fake,
    });
    expect(r.preparation.reservationExpiresAt).toMatch(/Z$/);
  });
  it("CPINT-014 edit after quote requires re-quote without partial records", async () => {
    const q = await issue();
    await change();
    await expect(prepare(q.quoteId)).rejects.toMatchObject({
      code: "STALE_INPUT",
    });
    await noEffects();
  });
  it("CPINT-015 withdrawal of eligibility before validation refuses preparation", async () => {
    const q = await issue();
    await change(1, "INELIGIBLE");
    await expect(prepare(q.quoteId)).rejects.toMatchObject({
      code: "STALE_INPUT",
    });
    await noEffects();
  });
  it("CPINT-016 postal writer wins lock, waiting Orders refuses old revision", async () => {
    const q = await issue(),
      c = await profile.connect();
    await c.query("BEGIN");
    await c.query("SELECT customer_profile.change($1,$2,$3,1,$4::jsonb,$5)", [
      actor,
      randomUUID(),
      address,
      JSON.stringify({ ...fake, street: "TEST_V2" }),
      "ELIGIBLE",
    ]);
    const pending = prepare(q.quoteId).catch((e) => e);
    try {
      await locks();
    } finally {
      await c.query("COMMIT");
      c.release();
    }
    expect(await pending).toMatchObject({ code: "STALE_INPUT" });
    await noEffects();
  });
  it("CPINT-017 Orders wins postal lock, later writer waits until commit", async () => {
    const q = await issue(),
      c = await orders.connect();
    let result;
    let pending: Promise<pg.QueryResult> | undefined;
    try {
      await c.query("BEGIN");
      result = (
        await c.query("SELECT orders.prepare_profile_quote($1,$2,$3) r", [
          actor,
          randomUUID(),
          q.quoteId,
        ])
      ).rows[0].r;
      pending = change(1, "ELIGIBLE", { ...fake, street: "TEST_AFTER" });
      await locks("cpint-profile-write");
      await c.query("COMMIT");
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
    await pending;
    const saved = await service.read(result.preparation.id);
    expect(saved.addressSnapshot?.addressVersion).toBe(1);
    expect(saved.addressSnapshot?.postalAddress.street).toBe("TEST_STREET");
    expect(
      (
        await sql(
          "SELECT current_version FROM customer_profile.address WHERE id=$1",
          [address],
        )
      ).rows[0].current_version,
    ).toBe(2);
  });
  it("CPINT-018 edit while Orders waits Catalog is revalidated after the lock", async () => {
    const q = await issue(),
      c = await admin.connect();
    await c.query("BEGIN");
    await c.query("SELECT id FROM catalog.product WHERE id=$1 FOR UPDATE", [
      id(1),
    ]);
    const pending = prepare(q.quoteId).catch((e) => e);
    try {
      await locks();
      await change();
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
    expect(await pending).toMatchObject({ code: "STALE_INPUT" });
    await noEffects();
  });
  it("CPINT-019 references immutable and nonexistent revision refused", async () => {
    const q = await issue();
    await expect(
      sql(
        "UPDATE quotes.profile_reference SET address_version=99 WHERE quote_id=$1",
        [q.quoteId],
      ),
    ).rejects.toThrow("QUOTE_IMMUTABLE");
    await expect(
      profile.query("SELECT customer_profile.snapshot_for_order($1,$2,99)", [
        actor,
        address,
      ]),
    ).rejects.toThrow("CP_VERSION_CONFLICT");
    await expect(
      service.prepare({
        key: randomUUID(),
        quoteId: q.quoteId,
        addressVersion: 1,
      } as { key: string; quoteId: string }),
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });
  it("CPINT-020 two postal updates do not silently overwrite and invalidate old quote", async () => {
    const q = await issue(),
      c = await admin.connect();
    await c.query("BEGIN");
    await c.query(
      "SELECT id FROM customer_profile.address WHERE id=$1 FOR UPDATE",
      [address],
    );
    const attempts = Promise.allSettled([
      change(),
      change(1, "ELIGIBLE", { ...fake, number: "TEST_SECOND" }),
    ]);
    try {
      await locks("cpint-profile-write", 2);
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
    const r = await attempts;
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(r.filter((x) => x.status === "rejected")).toHaveLength(1);
    expect(
      (
        await sql(
          "SELECT array_agg(version ORDER BY version) v FROM customer_profile.revision WHERE address_id=$1",
          [address],
        )
      ).rows[0].v,
    ).toEqual([1, 2]);
    await expect(prepare(q.quoteId)).rejects.toMatchObject({
      code: "STALE_INPUT",
    });
  });
  it("CPINT-021 digital never reads postal address or snapshots and has null reserve", async () => {
    const definitions = [];
    for (const fn of [
      "customer_profile.read_for_quote(uuid,uuid)",
      "customer_profile.snapshot_with_proof(uuid,uuid,integer)",
    ])
      definitions.push(
        (await sql("SELECT pg_get_functiondef($1::regprocedure) d", [fn]))
          .rows[0].d,
      );
    try {
      await sql(
        "CREATE OR REPLACE FUNCTION customer_profile.read_for_quote(p_actor uuid,p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN RAISE EXCEPTION 'CPINT_POSTAL_CALLED'; END $$; CREATE OR REPLACE FUNCTION customer_profile.snapshot_with_proof(p_actor uuid,p_id uuid,p_expected int) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN RAISE EXCEPTION 'CPINT_POSTAL_CALLED'; END $$",
      );
      for (const n of [3, 4, 7]) {
        const q = await issue(n),
          r = await prepare(q.quoteId);
        expect(r.addressSnapshot).toBeNull();
        expect(r.preparation.reservationExpiresAt).toBeNull();
      }
      await expect(issue()).rejects.toThrow();
      expect((await effects()).reservations).toBe(0);
      expect((await effects()).postal).toBe(0);
    } finally {
      for (const def of definitions) await sql(def);
    }
  });
  it("CPINT-022 quote projection stays minimal and quote reference carries no recipient", async () => {
    const q = await issue();
    expect(Object.keys(q).sort()).toEqual(
      ["quoteId", "expiresAt", "total", "note"].sort(),
    );
    const reference = (
      await sql(
        "SELECT to_jsonb(r) r FROM quotes.profile_reference r WHERE quote_id=$1",
        [q.quoteId],
      )
    ).rows[0].r;
    expect(Object.keys(reference).sort()).toEqual(
      [
        "quote_id",
        "actor_id",
        "address_id",
        "address_version",
        "country",
        "postal_code",
      ].sort(),
    );
    expect(JSON.stringify(reference)).not.toContain("TEST_RECIPIENT");
    await noEffects();
  });
  it("CPINT-023 price and publication changes after observable wait refuse atomically", async () => {
    for (const mode of ["price", "publication"]) {
      const q = await issue(),
        c = await admin.connect();
      await c.query("BEGIN");
      await c.query("SELECT id FROM catalog.product WHERE id=$1 FOR UPDATE", [
        id(1),
      ]);
      const pending = prepare(q.quoteId).catch((e) => e);
      try {
        await locks();
        if (mode === "price")
          await c.query(
            "SELECT pricing.replace_base_price($1,2000,'BRL','CPINT_TEST_ONLY')",
            [id(1)],
          );
        else
          await c.query(
            "UPDATE catalog.product SET status='UNPUBLISHED' WHERE id=$1",
            [id(1)],
          );
        await c.query("COMMIT");
      } finally {
        await c.query("ROLLBACK");
        c.release();
      }
      expect(await pending).toMatchObject({ code: "STALE_INPUT" });
      await noEffects();
    }
  });
  it("CPINT-024 failure after postal snapshot insertion rolls back all", async () => {
    const q = await issue();
    await fault("profile_address_snapshot", () => prepare(q.quoteId));
    await noEffects();
  });
  it("CPINT-025 failure after real Inventory reservation rolls back all", async () => {
    const q = await issue();
    await fault("profile_evidence", () => prepare(q.quoteId));
    await noEffects();
  });
  it("CPINT-026 physical and mixed kits preserve component allocation and postal snapshot", async () => {
    for (const n of [5, 6]) {
      const q = await issue(n),
        r = await prepare(q.quoteId);
      expect(r.addressSnapshot?.addressVersion).toBe(1);
      expect(r.preparation.lines[0]?.components).toHaveLength(2);
      expect(r.preparation.reservationExpiresAt).not.toBeNull();
    }
    expect((await effects()).postal).toBe(2);
    expect((await effects()).reservations).toBe(2);
  });
  it("CPINT-027 kit shortage and expiry during stock lock leave no partial snapshot", async () => {
    const large = await service.issue({
      items: [{ productId: id(5), quantity: 11 }],
      shippingAddressId: address,
    });
    await expect(prepare(large.quoteId)).rejects.toThrow();
    await noEffects();
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
    const pending = prepare(q.quoteId).catch((e) => e);
    try {
      await locks();
      await sql("SELECT pg_sleep(1.05)");
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
    expect(await pending).toMatchObject({ code: "STALE_INPUT" });
    await noEffects();
  });
  it("CPINT-028 Profile, Orders, Quotes, Inventory rows and durable facts share PID/XID", async () => {
    const before = await effects(),
      q = await issue(6),
      r = await prepare(q.quoteId);
    const e = (
      await sql(
        "SELECT e.*,s.xmin::text postal_xmin,p.xmin::text prep_xmin,i.xmin::text reserve_xmin,i.id reserve_id,v.participant_proof FROM orders.profile_evidence e JOIN orders.profile_address_snapshot s ON s.preparation_id=e.preparation_id JOIN orders.preparation p ON p.id=e.preparation_id JOIN inventory.reservation i ON i.id=p.reservation_id JOIN orders.event v ON v.preparation_id=p.id WHERE p.id=$1",
        [r.preparation.id],
      )
    ).rows[0];
    expect(e.profile_xid).toBe(e.postal_xmin);
    expect(e.prep_xmin).toBe(e.profile_xid);
    expect(e.reserve_xmin).toBe(e.profile_xid);
    for (const proof of Object.values(e.participant_proof) as {
      pid: number;
      xid: string;
    }[]) {
      expect(proof.pid).toBe(e.profile_pid);
      expect(proof.xid).toBe(e.profile_xid);
    }
    const after = await effects();
    expect(after).toMatchObject({
      postal: 1,
      evidence: 1,
      preparations: 1,
      requests: 1,
      reservations: 1,
      order_events: 1,
      inventory_events: 1,
    });
    console.log(
      "CPINT_TRANSACTION_EVIDENCE",
      JSON.stringify({
        quoteId: q.quoteId,
        preparationId: r.preparation.id,
        addressId: address,
        reservationId: e.reserve_id,
        pid: e.profile_pid,
        xid: e.profile_xid,
        rowXids: [e.postal_xmin, e.prep_xmin, e.reserve_xmin],
        before,
        after,
      }),
    );
  });
  it("CPINT-029 replay after later postal edit and quote expiry preserves history", async () => {
    await sql("UPDATE quotes.fixture_policy SET ttl_seconds=1 WHERE id=$1", [
      policy,
    ]);
    const q = await issue(),
      key = randomUUID(),
      original = await prepare(q.quoteId, key);
    await change(1, "ELIGIBLE", { ...fake, street: "TEST_CHANGED_AFTER" });
    await sql("SELECT pg_sleep(1.05)");
    const replay = await prepare(q.quoteId, key);
    expect(replay).toEqual(original);
    expect((await effects()).reservations).toBe(1);
  });
  it("CPINT-030 same key with different quote conflicts without new effects", async () => {
    const q = await issue(),
      otherQuote = await issue(),
      key = randomUUID();
    await prepare(q.quoteId, key);
    await expect(prepare(otherQuote.quoteId, key)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect((await effects()).postal).toBe(1);
    expect((await effects()).reservations).toBe(1);
  });
  it("CPINT-031 process killed before commit rolls back; after commit no reply recovers", async () => {
    const q = await issue(),
      key = randomUUID();
    await crash("before", q.quoteId, key);
    await noEffects();
    await prepare(q.quoteId, key);
    const q2 = await issue(),
      key2 = randomUUID();
    await crash("after", q2.quoteId, key2);
    const before = await effects(),
      replay = await prepare(q2.quoteId, key2);
    expect(replay.addressSnapshot?.addressVersion).toBe(1);
    expect(await effects()).toEqual(before);
    expect(before).toMatchObject({
      postal: 2,
      preparations: 2,
      reservations: 2,
      order_events: 2,
      evidence: 2,
    });
  });
  it("CPINT-032 two real connections same intention serialize and create one snapshot", async () => {
    const q = await issue(),
      key = randomUUID(),
      c = await admin.connect();
    await c.query("BEGIN");
    await c.query(
      "SELECT sku FROM inventory.stock_balance WHERE sku=$1 FOR UPDATE",
      [id(1)],
    );
    const pending = Promise.all([
      prepare(q.quoteId, key),
      prepare(q.quoteId, key),
    ]);
    try {
      await locks("atlas-cpint-", 2);
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
    const [left, right] = await pending;
    expect(left).toEqual(right);
    expect((await effects()).postal).toBe(1);
    expect((await effects()).reservations).toBe(1);
  });
  it("CPINT-033 extra grants, legacy function grants and membership fail closed", async () => {
    for (const [grant, revoke] of [
      [
        "GRANT SELECT ON customer_profile.revision TO atlas_orders_actor_a",
        "REVOKE SELECT ON customer_profile.revision FROM atlas_orders_actor_a",
      ],
      [
        "GRANT EXECUTE ON FUNCTION orders.read_preparation(uuid,uuid) TO atlas_orders_actor_a",
        "REVOKE EXECUTE ON FUNCTION orders.read_preparation(uuid,uuid) FROM atlas_orders_actor_a",
      ],
      [
        "GRANT atlas_profile_executor TO atlas_orders_actor_a",
        "REVOKE atlas_profile_executor FROM atlas_orders_actor_a",
      ],
    ]) {
      const q = await issue();
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
  it("CPINT-034 failures and errors never return postal PII or SQL details", async () => {
    const q = await issue();
    await change(1, "ELIGIBLE", { ...fake, recipient: "TEST_PRIVATE_MARKER" });
    try {
      await prepare(q.quoteId);
      throw new Error("unexpected success");
    } catch (e) {
      expect(JSON.stringify(e)).not.toMatch(
        /TEST_PRIVATE_MARKER|SELECT|INSERT|postgresql/,
      );
      expect((e as Error).message).toBe("STALE_INPUT");
    }
  });
  it("CPINT-035 protected module sources and historical migrations unchanged", () => {
    const manifest = JSON.parse(
      readFileSync("test/profile-integration/protected-sources.json", "utf8"),
    ) as Record<string, string>;
    for (const [file, hash] of Object.entries(manifest))
      expect(
        createHash("sha256")
          .update(readFileSync(file, "utf8").replaceAll("\r\n", "\n"))
          .digest("hex"),
        file,
      ).toBe(hash);
  });
  it("CPINT-036 no public integration endpoint and CI local harness only", async () => {
    const app = await (
      await Test.createTestingModule({ imports: [AppModule] }).compile()
    ).createNestApplication();
    await app.init();
    try {
      for (const route of [
        "/api/v1/checkout/quotes",
        "/api/v1/checkouts",
        "/api/v1/me/addresses",
      ])
        await http(app.getHttpServer()).post(route).send({}).expect(404);
    } finally {
      await app.close();
    }
    const runner = readFileSync("scripts/profile-orders-local.mjs", "utf8");
    expect(runner).toContain("atlas-cat01-port-55439.lock");
    expect(runner).not.toMatch(/supabase|dotenv|mrd-cli/);
    expect(
      readFileSync("../../.github/workflows/quality.yml", "utf8"),
    ).toContain("profile-orders-integration:");
  });
});
