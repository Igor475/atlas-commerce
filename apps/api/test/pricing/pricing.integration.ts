import "reflect-metadata";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Test } from "@nestjs/testing";
import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import pg from "pg";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { AppModule } from "../../src/app.module.js";
import { configureIdentityHttp } from "../../src/modules/identity/presentation/identity-http.js";
import { composePricing } from "../../src/modules/pricing/pricing.module.js";
import { PUBLIC_BASE_PRICING } from "../../src/modules/pricing/application/public-prices.js";
import { PricingDatabase } from "../../src/modules/pricing/infrastructure/pricing-database.js";
import {
  pricingEnabled,
  pricingUrl,
} from "../../src/modules/pricing/infrastructure/pricing-config.js";
import { contracts } from "../catalog/contracts.js";
const id = (n: number) =>
  "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const base = "/api/v1/catalog/products";
const options = {
  host: "127.0.0.1",
  port: 55439,
  database: "atlas_catalog_cat01",
  user: "atlas_catalog_migrator",
  password: "",
  ssl: false as const,
  max: 3,
  connectionTimeoutMillis: 1000,
};
const runtimeUrl =
  "postgresql://atlas_pricing_runtime@127.0.0.1:55439/atlas_catalog_cat01?schema=pricing";
describe("PRIC-01 real integrated Catalog/Pricing PostgreSQL17 and Nest HTTP", () => {
  let admin: pg.Pool, writer: pg.Pool, app: NestExpressApplication;
  async function sql(text: string, args?: unknown[]) {
    return admin.query(text, args);
  }
  async function replace(
    n: number,
    cents: unknown,
    unit = "BRL",
    source = "DEMO_PRIC01",
  ) {
    return writer.query(
      "SELECT pricing.replace_base_price($1::uuid,$2::bigint,$3::text,$4::text) id",
      [id(n), cents, unit, source],
    );
  }
  async function open(disabled = false) {
    let builder = Test.createTestingModule({ imports: [AppModule] });
    if (disabled)
      builder = builder
        .overrideProvider(PUBLIC_BASE_PRICING)
        .useValue(composePricing({}));
    const module = await builder.compile();
    app = module.createNestApplication<NestExpressApplication>({
      logger: false,
      bodyParser: false,
    });
    configureIdentityHttp(app);
    await app.listen(0, "127.0.0.1");
  }
  async function seed() {
    await sql(
      "TRUNCATE pricing.price_revision,pricing.price_product,catalog.kit_composition,catalog.product_category,catalog.work_author,catalog.product,catalog.edition,catalog.work,catalog.author,catalog.publisher,catalog.category CASCADE",
    );
    await sql(
      "INSERT INTO catalog.work VALUES($1,'DEMO Obra PRIC01','PUBLISHED')",
      [id(100)],
    );
    await sql("INSERT INTO catalog.publisher VALUES($1,'DEMO Selo PRIC01')", [
      id(200),
    ]);
    for (let n = 1; n <= 3; n++)
      await sql(
        "INSERT INTO catalog.edition(id,work_id,publisher_id,label,language,status) VALUES($1,$2,$3,$4,'pt-BR','PUBLISHED')",
        [id(300 + n), id(100), id(200), "DEMO edição " + n],
      );
    for (let n = 1; n <= 3; n++)
      await sql(
        "INSERT INTO catalog.product(id,sku,title,product_type,edition_id,status) VALUES($1,$2,$3,$4,$5,'PUBLISHED')",
        [
          id(n),
          "DEMO-PRIC-" + n,
          "DEMO Oferta " + n,
          ["PHYSICAL_BOOK", "EBOOK", "DIGITAL_MAGAZINE"][n - 1],
          id(300 + n),
        ],
      );
    for (let n = 4; n <= 6; n++) {
      await sql(
        "INSERT INTO catalog.product(id,sku,title,product_type) VALUES($1,$2,$3,'KIT')",
        [id(n), "DEMO-PRIC-" + n, "DEMO Kit " + n],
      );
      for (const c of n === 4 ? [1] : n === 5 ? [2, 3] : [1, 2])
        await sql("INSERT INTO catalog.kit_composition VALUES($1,$2,1)", [
          id(n),
          id(c),
        ]);
      await sql("UPDATE catalog.product SET status='PUBLISHED' WHERE id=$1", [
        id(n),
      ]);
    }
    for (let n = 7; n <= 8; n++)
      await sql(
        "INSERT INTO catalog.product(id,sku,title,product_type,edition_id,status) VALUES($1,$2,'PRIVATE_DEMO_CANARY','EBOOK',$3,$4)",
        [id(n), "DEMO-PRIC-" + n, id(302), n === 7 ? "DRAFT" : "UNPUBLISHED"],
      );
    for (let n = 1; n <= 8; n++) await replace(n, n * 1001);
  }
  async function waiting(pid?: number) {
    for (let n = 0; n < 100; n++) {
      const rows = (
        await sql(
          "SELECT pid FROM pg_stat_activity WHERE wait_event_type='Lock' AND (($1::int IS NOT NULL AND pid=$1) OR ($1::int IS NULL AND application_name='atlas-pricing-runtime'))",
          [pid ?? null],
        )
      ).rows;
      if (rows.length) return Number(rows[0].pid);
      await new Promise((r) => setTimeout(r, 10));
    }
    throw new Error("PRICING_TEST_LOCK_NOT_OBSERVED");
  }
  beforeAll(async () => {
    if (process.env.PRICING_CONSENT !== "PRIC-01")
      throw new Error("PRICING_TEST_CONSENT_REQUIRED");
    admin = new pg.Pool(options);
    writer = new pg.Pool({ ...options, user: "atlas_pricing_migrator" });
    const p = (
      await sql(
        "SELECT current_database() db,current_setting('atlas.pricing_fixture',true) marker",
      )
    ).rows[0];
    if (p.db !== options.database || p.marker !== "atlas-pric01-disposable")
      throw new Error("PRICING_TEST_FIXTURE_REQUIRED");
  });
  beforeEach(async () => {
    await seed();
    await open();
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await app?.close();
  });
  afterAll(async () => {
    await writer?.end();
    await admin?.end();
  });
  it("PRIC-001 default closed, explicit local opt-in required", async () => {
    expect(pricingEnabled({})).toBe(false);
    await expect(composePricing({}).read([id(1)])).rejects.toThrow(
      "DEPENDENCY_UNAVAILABLE",
    );
    expect(() =>
      pricingEnabled({ ...process.env, PRICING_MODE: "remote" }),
    ).toThrow();
    expect(() =>
      pricingEnabled({ ...process.env, NODE_ENV: "production" }),
    ).toThrow();
    await app.close();
    await open(true);
    const r = await request(app.getHttpServer()).get(base);
    expect(r.status).toBe(503);
  });
  it("PRIC-002 wrong host, database, role, options and wrong real database rejected", async () => {
    for (const bad of [
      runtimeUrl.replace("127.0.0.1", "db.example.com"),
      runtimeUrl.replace("atlas_catalog_cat01", "postgres"),
      runtimeUrl.replace("atlas_pricing_runtime", "atlas_pricing_migrator"),
      runtimeUrl + "&sslmode=disable",
      runtimeUrl.replace("55439", "5432"),
    ])
      expect(() => pricingUrl(bad, "PRIC-01")).toThrow();
    expect(() =>
      pricingEnabled({ ...process.env, PGHOST: "127.0.0.1" }),
    ).toThrow();
    const p = new pg.Pool({ ...options, database: "postgres", max: 1 });
    try {
      await expect(
        p.query(
          readFileSync(
            "prisma-pricing/migrations/202610150002_pricing/migration.sql",
            "utf8",
          ),
        ),
      ).rejects.toThrow("PRICING_LOCAL_FIXTURE_REQUIRED");
      await p.query("ROLLBACK");
      expect(
        (await p.query("SELECT to_regnamespace('pricing') n")).rows[0].n,
      ).toBeNull();
    } finally {
      await p.end();
    }
  });
  it("PRIC-003 separate migrations applied and repeatable", async () => {
    for (const schema of ["catalog", "pricing"])
      expect(
        (
          await sql(
            `SELECT count(*)::int n FROM ${schema}._prisma_migrations WHERE finished_at IS NOT NULL`,
          )
        ).rows[0].n,
      ).toBe(1);
    const r = spawnSync(
      process.execPath,
      ["scripts/pricing-db.mjs", "migrate"],
      { encoding: "utf8", timeout: 30000 },
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("No pending migrations");
    expect(
      (await sql("SELECT count(*)::int n FROM pricing.price_revision")).rows[0]
        .n,
    ).toBe(8);
  });
  it("PRIC-004 constraints reject unknown product and invalid revisions without losing current", async () => {
    await expect(replace(999, 100)).rejects.toThrow();
    for (const value of [-1, "9007199254740992", "1.5", "NaN", "Infinity"])
      await expect(replace(1, value)).rejects.toThrow();
    expect(
      (await request(app.getHttpServer()).get(base + "/" + id(1))).body.price
        .amountCents,
    ).toBe(1001);
  });
  it("PRIC-005 runtime read-only projection, Catalog privileges not expanded", async () => {
    const p = new pg.Pool({
        ...options,
        user: "atlas_pricing_runtime",
        max: 1,
      }),
      c = new pg.Pool({ ...options, user: "atlas_catalog_runtime", max: 1 });
    try {
      await sql(
        "GRANT UPDATE ON pricing.price_revision TO atlas_pricing_runtime",
      );
      expect((await request(app.getHttpServer()).get(base)).status).toBe(503);
    } finally {
      await sql(
        "REVOKE UPDATE ON pricing.price_revision FROM atlas_pricing_runtime",
      );
    }
    expect((await request(app.getHttpServer()).get(base)).status).toBe(200);
    try {
      await p.query("SET default_transaction_read_only=off");
      for (const q of [
        "SELECT * FROM pricing.price_revision",
        "SELECT * FROM catalog.product",
        "UPDATE pricing.price_revision SET amount_cents=1",
        "SELECT pricing.replace_base_price(gen_random_uuid(),1,'BRL','DEMO')",
        "CREATE TABLE pricing.bypass(id int)",
      ])
        await expect(p.query(q)).rejects.toThrow();
      await expect(
        c.query("SELECT * FROM pricing.current_prices"),
      ).rejects.toThrow();
      const row = (
        await p.query(
          "SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=current_user",
        )
      ).rows[0];
      expect(Object.values(row)).toEqual([false, false, false, false, false]);
      expect(
        (
          await p.query(
            "SELECT count(*)::int n FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname=current_user)",
          )
        ).rows[0].n,
      ).toBe(0);
    } finally {
      await p.end();
      await c.end();
    }
  });
  it("PRIC-006 separate owners and no Identity/spike schemas or price fields in Catalog", async () => {
    const rows = (
      await sql(
        "SELECT nspname,pg_get_userbyid(nspowner) owner FROM pg_namespace WHERE nspname IN ('catalog','pricing') ORDER BY nspname",
      )
    ).rows;
    expect(rows).toEqual([
      { nspname: "catalog", owner: "atlas_catalog_migrator" },
      { nspname: "pricing", owner: "atlas_pricing_migrator" },
    ]);
    expect(
      (
        await sql(
          "SELECT nspname FROM pg_namespace WHERE nspname IN ('identity','spike')",
        )
      ).rows,
    ).toEqual([]);
    expect(
      (
        await sql(
          "SELECT column_name FROM information_schema.columns WHERE table_schema='catalog' AND column_name LIKE '%price%'",
        )
      ).rows,
    ).toEqual([]);
  });
  it("PRIC-007 BRL only enforced in SQL", async () => {
    for (const unit of ["USD", "EUR", ""])
      await expect(replace(1, 100, unit)).rejects.toThrow();
    expect(
      (await request(app.getHttpServer()).get(base + "/" + id(1))).body.price
        .currency,
    ).toBe("BRL");
  });
  it("PRIC-008 bigint maximum converts exactly through HTTP", async () => {
    await replace(1, "9007199254740991");
    const r = await request(app.getHttpServer()).get(base + "/" + id(1));
    expect(r.status).toBe(200);
    expect(r.body.price.amountCents).toBe(Number.MAX_SAFE_INTEGER);
    expect(Number.isSafeInteger(r.body.price.amountCents)).toBe(true);
  });
  it("PRIC-009 zero is not a fallback or approved free-product policy", async () => {
    await replace(1, 0);
    const r = await request(app.getHttpServer()).get(base + "/" + id(1));
    expect(r.status).toBe(503);
    expect(r.body.code).toBe("DEPENDENCY_UNAVAILABLE");
    expect(r.text).not.toContain('"price"');
  });
  it("PRIC-010 no current price fails explicitly", async () => {
    await writer.query(
      "UPDATE pricing.price_revision SET state='RETIRED',ends_at=clock_timestamp() WHERE product_id=$1 AND state='CURRENT'",
      [id(1)],
    );
    expect(
      (await request(app.getHttpServer()).get(base + "/" + id(1))).status,
    ).toBe(503);
  });
  it("PRIC-011 PostgreSQL before and exact start boundary; no future scheduling", async () => {
    const moments = (
      await sql(
        "WITH anchor AS (SELECT starts_at FROM pricing.price_revision WHERE product_id=$1 AND version=1),moments(tag,observed_at) AS (SELECT 'before',starts_at-interval '1 microsecond' FROM anchor UNION ALL SELECT 'exact',starts_at FROM anchor) SELECT tag,ARRAY(SELECT p.version FROM pricing.price_revision p WHERE p.product_id=$1 AND p.starts_at<=m.observed_at AND (p.ends_at IS NULL OR m.observed_at<p.ends_at)) versions FROM moments m ORDER BY tag",
        [id(1)],
      )
    ).rows;
    expect(moments).toEqual([
      { tag: "before", versions: [] },
      { tag: "exact", versions: [1] },
    ]);
    await expect(
      writer.query(
        "INSERT INTO pricing.price_revision(product_id,version,amount_cents,currency,state,source,starts_at,created_at) VALUES($1,2,1,'BRL','CURRENT','DEMO',clock_timestamp()+interval '1 hour',clock_timestamp()+interval '1 hour')",
        [id(1)],
      ),
    ).rejects.toThrow("PRICING_REVISION_INVALID");
  });
  it("PRIC-012 conflicting current revisions rejected", async () => {
    await expect(
      writer.query(
        "INSERT INTO pricing.price_revision(product_id,version,amount_cents,currency,state,source,starts_at,created_at) SELECT $1,2,1,'BRL','CURRENT','DEMO',t,t FROM (SELECT clock_timestamp() t) s",
        [id(1)],
      ),
    ).rejects.toThrow("PRICING_INTERVAL_CONFLICT");
    expect(
      (
        await sql(
          "SELECT count(*)::int n FROM pricing.price_revision WHERE product_id=$1 AND state='CURRENT'",
          [id(1)],
        )
      ).rows[0].n,
    ).toBe(1);
  });
  it("PRIC-013 replacement preserves immutable history and exclusive exact end", async () => {
    await replace(1, 2200, "BRL", "DEMO_SECOND");
    const rows = (
      await sql(
        "SELECT version,amount_cents::text,source,state FROM pricing.price_revision WHERE product_id=$1 ORDER BY version",
        [id(1)],
      )
    ).rows;
    expect(rows).toEqual([
      {
        version: 1,
        amount_cents: "1001",
        source: "DEMO_PRIC01",
        state: "RETIRED",
      },
      {
        version: 2,
        amount_cents: "2200",
        source: "DEMO_SECOND",
        state: "CURRENT",
      },
    ]);
    const boundary = (
      await sql(
        "WITH anchor AS (SELECT ends_at FROM pricing.price_revision WHERE product_id=$1 AND version=1),moments(tag,observed_at) AS (SELECT 'before',ends_at-interval '1 microsecond' FROM anchor UNION ALL SELECT 'exact',ends_at FROM anchor) SELECT tag,ARRAY(SELECT p.version FROM pricing.price_revision p WHERE p.product_id=$1 AND p.starts_at<=m.observed_at AND (p.ends_at IS NULL OR m.observed_at<p.ends_at)) versions FROM moments m ORDER BY tag",
        [id(1)],
      )
    ).rows;
    expect(boundary).toEqual([
      { tag: "before", versions: [1] },
      { tag: "exact", versions: [2] },
    ]);
    expect(
      (
        await sql(
          "SELECT old.ends_at=new.starts_at same FROM pricing.price_revision old JOIN pricing.price_revision new ON old.product_id=new.product_id AND old.version=1 AND new.version=2 WHERE old.product_id=$1",
          [id(1)],
        )
      ).rows[0].same,
    ).toBe(true);
    for (const q of [
      "UPDATE pricing.price_revision SET amount_cents=2 WHERE version=1",
      "DELETE FROM pricing.price_revision WHERE version=1",
      "UPDATE pricing.price_revision SET source='CHANGED' WHERE version=2",
    ])
      await expect(writer.query(q)).rejects.toThrow(
        "PRICING_HISTORY_IMMUTABLE",
      );
    await expect(
      writer.query(
        "UPDATE pricing.price_product SET last_version=90 WHERE product_id=$1",
        [id(1)],
      ),
    ).rejects.toThrow("PRICING_VERSION_INVALID");
  });
  it("PRIC-014 concurrent writers serialize, uncommitted replacement never leaks", async () => {
    const a = await writer.connect(),
      b = await writer.connect();
    try {
      await a.query("BEGIN");
      await a.query(
        "SELECT pricing.replace_base_price($1,2200,'BRL','DEMO_A')",
        [id(1)],
      );
      expect(
        (await request(app.getHttpServer()).get(base + "/" + id(1))).body.price
          .amountCents,
      ).toBe(1001);
      const pid = Number(
        (await b.query("SELECT pg_backend_pid() pid")).rows[0].pid,
      );
      const change = b.query(
        "SELECT pricing.replace_base_price($1,3300,'BRL','DEMO_B')",
        [id(1)],
      );
      expect(await waiting(pid)).toBe(pid);
      await a.query("COMMIT");
      await change;
      expect(
        (await request(app.getHttpServer()).get(base + "/" + id(1))).body.price
          .amountCents,
      ).toBe(3300);
      expect(
        (
          await sql(
            "SELECT version,state FROM pricing.price_revision WHERE product_id=$1 ORDER BY version",
            [id(1)],
          )
        ).rows,
      ).toEqual([
        { version: 1, state: "RETIRED" },
        { version: 2, state: "RETIRED" },
        { version: 3, state: "CURRENT" },
      ]);
    } finally {
      await a.query("ROLLBACK");
      a.release();
      b.release();
    }
  });
  it("PRIC-015 physical product uses persisted authoritative price", async () => {
    const r = await request(app.getHttpServer()).get(base + "/" + id(1));
    expect(r.status).toBe(200);
    expect(r.body.price).toEqual({ currency: "BRL", amountCents: 1001 });
    expect(r.body.productType).toBe("PHYSICAL_BOOK");
  });
  it("PRIC-016 ebook and magazine use persisted prices", async () => {
    for (const n of [2, 3]) {
      const r = await request(app.getHttpServer()).get(base + "/" + id(n));
      expect(r.status).toBe(200);
      expect(r.body.price.amountCents).toBe(n * 1001);
      expect(r.body.previewAvailable).toBe(false);
    }
  });
  it("PRIC-017 kits have their own price, never automatic component sums", async () => {
    for (const n of [4, 5, 6]) {
      const r = await request(app.getHttpServer()).get(base + "/" + id(n));
      expect(r.status).toBe(200);
      expect(r.body.price.amountCents).toBe(n * 1001);
      expect(r.body.productType).toBe("KIT");
    }
    const total = (
      await sql(
        "SELECT sum(p.amount_cents)::text total FROM catalog.kit_composition k JOIN pricing.current_prices p ON p.product_id=k.component_id WHERE k.kit_id=$1",
        [id(6)],
      )
    ).rows[0].total;
    const kit = await request(app.getHttpServer()).get(base + "/" + id(6));
    expect(total).toBe("3003");
    expect(kit.body.price.amountCents).toBe(6006);
    expect(kit.body.price.amountCents).not.toBe(Number(total));
  });
  it("PRIC-018 one real batch repository call for all products", async () => {
    const spy = vi.spyOn(PricingDatabase.prototype, "current");
    const r = await request(app.getHttpServer()).get(base);
    expect(r.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0]).toEqual([1, 2, 3, 4, 5, 6].map(id));
    expect(r.body.items).toHaveLength(6);
  });
  it("PRIC-019 missing one price refuses entire page, no partial success", async () => {
    await writer.query(
      "UPDATE pricing.price_revision SET state='RETIRED',ends_at=clock_timestamp() WHERE product_id=$1 AND state='CURRENT'",
      [id(3)],
    );
    const r = await request(app.getHttpServer()).get(base);
    expect(r.status).toBe(503);
    expect(r.body.items).toBeUndefined();
    expect(
      (await request(app.getHttpServer()).get(base + "/" + id(2))).status,
    ).toBe(200);
    await replace(3, 3003);
    expect((await request(app.getHttpServer()).get(base)).status).toBe(200);
  });
  it("PRIC-020 prices cannot reveal unpublished editorial products", async () => {
    const spy = vi.spyOn(PricingDatabase.prototype, "current");
    for (const n of [7, 8]) {
      const r = await request(app.getHttpServer()).get(base + "/" + id(n));
      expect(r.status).toBe(404);
      expect(r.text).not.toContain("PRIVATE_DEMO_CANARY");
    }
    expect(spy).not.toHaveBeenCalled();
    await sql("UPDATE catalog.work SET status='UNPUBLISHED' WHERE id=$1", [
      id(100),
    ]);
    expect((await request(app.getHttpServer()).get(base)).body.items).toEqual(
      [],
    );
  });
  it("PRIC-021 keyset pages remain deterministic with real prices", async () => {
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const r = await request(app.getHttpServer()).get(
        base + "?limit=2" + (cursor ? "&cursor=" + cursor : ""),
      );
      expect(r.status).toBe(200);
      seen.push(...r.body.items.map((v: { id: string }) => v.id));
      cursor = r.body.nextCursor;
    } while (cursor);
    expect(seen).toEqual([1, 2, 3, 4, 5, 6].map(id));
    expect(new Set(seen).size).toBe(6);
  });
  it("PRIC-022 actual HTTP satisfies unchanged OpenAPI31 and internal refs", async () => {
    const c = await contracts();
    const p = await request(app.getHttpServer()).get(base + "/" + id(1)),
      list = await request(app.getHttpServer()).get(base);
    expect(c.product(p.body), JSON.stringify(c.product.errors)).toBe(true);
    expect(c.list(list.body), JSON.stringify(c.list.errors)).toBe(true);
    console.log(
      "PRIC_HTTP_PERSISTED_DEMO " +
        JSON.stringify({ product: p.body, list: list.body, refs: c.refs }),
    );
  });
  it("PRIC-023 injection and browser prices never become authority", async () => {
    for (const query of ["amountCents=1", "price=0", "limit=1%20OR%201=1"]) {
      const r = await request(app.getHttpServer()).get(base + "?" + query);
      expect(r.status).toBe(400);
      expect(r.headers["content-type"]).toContain("application/problem+json");
    }
    expect(
      (
        await request(app.getHttpServer()).get(
          base +
            "/" +
            encodeURIComponent("';DROP TABLE pricing.price_revision;--"),
        )
      ).status,
    ).toBe(404);
    await expect(
      replace(1, 1, "BRL');DROP TABLE pricing.price_revision;--"),
    ).rejects.toThrow();
    expect(
      (await sql("SELECT count(*)::int n FROM pricing.price_revision")).rows[0]
        .n,
    ).toBe(8);
  });
  it("PRIC-024 real lost query connection returns minimized503 then recovers", async () => {
    const blocker = await admin.connect();
    try {
      await blocker.query("BEGIN");
      await blocker.query(
        "LOCK pricing.price_revision IN ACCESS EXCLUSIVE MODE",
      );
      const pending = request(app.getHttpServer())
        .get(base)
        .then((r) => r);
      const pid = await waiting();
      await sql("SELECT pg_terminate_backend($1)", [pid]);
      const r = await pending;
      expect(r.status).toBe(503);
      expect(r.text).not.toMatch(/Prisma|postgres|SQL|stack|password/i);
    } finally {
      await blocker.query("ROLLBACK");
      blocker.release();
    }
    expect((await request(app.getHttpServer()).get(base)).status).toBe(200);
  });
  it("PRIC-025 real lock timeout is bounded and cleanup closes both runtime pools", async () => {
    const blocker = await admin.connect();
    try {
      await blocker.query("BEGIN");
      await blocker.query(
        "LOCK pricing.price_revision IN ACCESS EXCLUSIVE MODE",
      );
      const at = Date.now();
      const r = await request(app.getHttpServer()).get(base);
      expect(r.status).toBe(503);
      expect(Date.now() - at).toBeLessThan(5000);
    } finally {
      await blocker.query("ROLLBACK");
      blocker.release();
    }
    expect((await request(app.getHttpServer()).get(base)).status).toBe(200);
    await app.close();
    expect(
      (
        await sql(
          "SELECT count(*)::int n FROM pg_stat_activity WHERE application_name IN ('atlas-catalog-runtime','atlas-pricing-runtime')",
        )
      ).rows[0].n,
    ).toBe(0);
  });
  it("PRIC-026 Pricing disabled stays503 and opt-in restores real integration", async () => {
    await app.close();
    await open(true);
    expect(
      (await request(app.getHttpServer()).get(base + "/" + id(1))).status,
    ).toBe(503);
    await app.close();
    await open();
    expect(
      (await request(app.getHttpServer()).get(base + "/" + id(1))).status,
    ).toBe(200);
  });
  it("PRIC-027 public projection contains no administrative history or write endpoints", async () => {
    const r = await request(app.getHttpServer()).get(base);
    for (const key of [
      "source",
      "version",
      "starts_at",
      "ends_at",
      "cost",
      "margin",
      "revisionId",
    ])
      expect(r.text).not.toContain('"' + key + '"');
    for (const route of [
      "/api/v1/pricing",
      "/api/v1/admin/prices",
      base + "/" + id(1) + "/price",
    ]) {
      expect(
        (
          await request(app.getHttpServer())
            .post(route)
            .send({ amountCents: 1 })
        ).status,
      ).toBe(404);
    }
    expect(
      r.body.items.every(
        (v: { previewAvailable: boolean }) => v.previewAvailable === false,
      ),
    ).toBe(true);
  });
  it("PRIC-028 Identity/Resend and their SQL/test contracts unchanged", async () => {
    const r = spawnSync(
      "git",
      [
        "diff",
        "HEAD",
        "--",
        "apps/api/src/modules/identity",
        "apps/api/prisma-identity",
        "apps/api/test/identity",
        "docs/05-engineering/contracts",
      ],
      { cwd: "../..", encoding: "utf8" },
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
    expect(
      (await request(app.getHttpServer()).get("/api/v1/auth/csrf")).status,
    ).toBe(503);
  });
  it("PRIC-029 original Catalog/PGSP/L0/L1/MRD/norms untouched; regressions separately executed", async () => {
    const r = spawnSync(
      "git",
      [
        "diff",
        "HEAD",
        "--",
        "apps/api/prisma-catalog",
        "apps/api/prisma",
        "apps/api/src/infrastructure/persistence",
        "apps/api/test/catalog",
        "apps/api/test/spike",
        "apps/api/test/connection",
        "apps/api/test/supabase-l1",
        "apps/api/test/mrd",
        "apps/storefront",
        "apps/admin",
        "pnpm-lock.yaml",
        "docs/02-business-requirements",
        "docs/03-business-processes",
        "docs/04-architecture",
      ],
      { cwd: "../..", encoding: "utf8" },
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
  });
  it("PRIC-030 SQL plan/version proof, gates and remote CI honestly separated", async () => {
    const proof = (await sql("SELECT version() server,current_database() db"))
      .rows[0];
    expect(proof.server).toContain("PostgreSQL 17.");
    console.log("PRIC_ENV " + JSON.stringify(proof));
    console.log(
      "PRIC_EXPLAIN " +
        JSON.stringify(
          (
            await sql(
              "EXPLAIN (FORMAT JSON) SELECT product_id,amount_cents FROM pricing.current_prices WHERE product_id=$1",
              [id(1)],
            )
          ).rows,
        ),
    );
    console.log("PRIC_REMOTE_CI_NOT_EXECUTED_L1_PENDING_FREE_POLICY_BLOCKED");
  });
});
