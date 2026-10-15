import "reflect-metadata";
import {
  afterAll,
  beforeAll,
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
} from "vitest";
import { Test } from "@nestjs/testing";
import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import pg from "pg";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { AppModule } from "../../src/app.module.js";
import {
  CATALOG_RUNTIME,
  CatalogRuntime,
  composeCatalog,
  unavailablePricing,
} from "../../src/modules/catalog/catalog.module.js";
import {
  CatalogReader,
  type PublicPricing,
} from "../../src/modules/catalog/application/catalog-reader.js";
import { CatalogDatabase } from "../../src/modules/catalog/infrastructure/catalog-database.js";
import {
  catalogUrl,
  catalogEnabled,
} from "../../src/modules/catalog/infrastructure/catalog-config.js";
import {
  validPrice,
  validateComposition,
  type PublicPrice,
} from "../../src/modules/catalog/domain/catalog.js";
import { configureIdentityHttp } from "../../src/modules/identity/presentation/identity-http.js";
import { contracts } from "./contracts.js";
const id = (n: number) =>
  "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const base = "/api/v1/catalog/products";
const url =
  "postgresql://atlas_catalog_runtime@127.0.0.1:55439/atlas_catalog_cat01?schema=catalog";
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
const demoPrice = {
  currency: "BRL" as const,
  amountCents: 12345,
  source: "DEMO_CAT01_CONTROLLED",
};
const pricing: PublicPricing = {
  read: async (ids) => new Map(ids.map((i) => [i, demoPrice])),
};
describe("CAT-01 real PostgreSQL17 and Nest HTTP, no remote provider", () => {
  let admin: pg.Pool, app: NestExpressApplication, repo: CatalogDatabase;
  async function open(runtime?: CatalogRuntime) {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CATALOG_RUNTIME)
      .useValue(
        runtime ?? new CatalogRuntime(new CatalogReader(repo, pricing), repo),
      )
      .compile();
    app = module.createNestApplication<NestExpressApplication>({
      bodyParser: false,
      logger: false,
    });
    configureIdentityHttp(app);
    await app.listen(0, "127.0.0.1");
  }
  async function sql(text: string, values?: unknown[]) {
    return admin.query(text, values);
  }
  async function seed() {
    await sql(
      "TRUNCATE catalog.kit_composition,catalog.product_category,catalog.work_author,catalog.product,catalog.edition,catalog.work,catalog.author,catalog.publisher,catalog.category CASCADE",
    );
    await sql(
      "INSERT INTO catalog.work VALUES ($1,'DEMO Obra Original','PUBLISHED');",
      [id(100)],
    );
    await sql(
      "INSERT INTO catalog.publisher VALUES ($1,'DEMO Selo Fictício')",
      [id(200)],
    );
    for (let n = 1; n <= 3; n++)
      await sql(
        "INSERT INTO catalog.edition(id,work_id,publisher_id,label,language,isbn,status) VALUES($1,$2,$3,$4,'pt-BR',NULL,'PUBLISHED')",
        [id(300 + n), id(100), id(200), "DEMO edição " + n],
      );
    for (let n = 1; n <= 3; n++)
      await sql(
        "INSERT INTO catalog.product(id,sku,title,description,product_type,edition_id,status) VALUES($1,$2,$3,$4,$5,$6,'PUBLISHED')",
        [
          id(n),
          "DEMO-" + n,
          "DEMO Produto " + n,
          "Texto fictício, sem conteúdo licenciado",
          ["PHYSICAL_BOOK", "EBOOK", "DIGITAL_MAGAZINE"][n - 1],
          id(300 + n),
        ],
      );
    for (let n = 4; n <= 6; n++) {
      await sql(
        "INSERT INTO catalog.product(id,sku,title,product_type) VALUES($1,$2,$3,'KIT')",
        [id(n), "DEMO-" + n, "DEMO Kit " + n],
      );
      const components = n === 4 ? [1] : n === 5 ? [2, 3] : [1, 2];
      for (const component of components)
        await sql("INSERT INTO catalog.kit_composition VALUES($1,$2,1)", [
          id(n),
          id(component),
        ]);
      await sql("UPDATE catalog.product SET status='PUBLISHED' WHERE id=$1", [
        id(n),
      ]);
    }
    for (let n = 7; n <= 8; n++)
      await sql(
        "INSERT INTO catalog.product(id,sku,title,product_type,edition_id,status) VALUES($1,$2,$3,'EBOOK',$4,$5)",
        [
          id(n),
          "DEMO-" + n,
          "PRIVATE_CANARY_" + n,
          id(302),
          n === 7 ? "DRAFT" : "UNPUBLISHED",
        ],
      );
  }
  beforeAll(async () => {
    if (process.env.CATALOG_CONSENT !== "CAT-01")
      throw new Error("CATALOG_TEST_CONSENT_REQUIRED");
    admin = new pg.Pool(options);
    const proof = (
      await sql(
        "SELECT current_database() db,current_setting('atlas.catalog_fixture',true) marker",
      )
    ).rows[0];
    if (
      proof.db !== options.database ||
      proof.marker !== "atlas-cat01-disposable"
    )
      throw new Error("CATALOG_TEST_FIXTURE_REQUIRED");
  });
  beforeEach(async () => {
    await seed();
    repo = new CatalogDatabase(url, "CAT-01");
    await open();
  });
  afterEach(async () => {
    await app?.close();
    await repo?.close();
  });
  afterAll(async () => {
    await admin?.end();
  });
  it("CAT-001 default composition closed, no commercial socket", async () => {
    await app.close();
    await open(composeCatalog({}));
    const r = await request(app.getHttpServer()).get(base);
    expect(r.status).toBe(503);
    expect(r.body.code).toBe("DEPENDENCY_UNAVAILABLE");
    expect(catalogEnabled({})).toBe(false);
    expect(() => catalogEnabled({ CATALOG_MODE: "remote" })).toThrow();
    expect(() =>
      catalogEnabled({
        CATALOG_MODE: "local-disposable",
        CATALOG_CONSENT: "CAT-01",
        CATALOG_RUNTIME_URL: url,
        NODE_ENV: "production",
      }),
    ).toThrow();
  });
  it("CAT-002 local migration and runtime view-only grants", async () => {
    expect(
      (
        await sql(
          "SELECT count(*)::int n FROM catalog._prisma_migrations WHERE finished_at IS NOT NULL",
        )
      ).rows[0].n,
    ).toBe(1);
    const p = new pg.Pool({
      ...options,
      user: "atlas_catalog_runtime",
      max: 1,
    });
    try {
      await expect(p.query("SELECT * FROM catalog.product")).rejects.toThrow();
      await expect(
        p.query(
          "INSERT INTO catalog.category VALUES(gen_random_uuid(),'bypass')",
        ),
      ).rejects.toThrow();
      const r = (
        await p.query(
          "SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=current_user",
        )
      ).rows[0];
      expect(Object.values(r)).toEqual([false, false, false, false, false]);
    } finally {
      await p.end();
    }
  });
  it("CAT-003 migration reapply preserves history and data", async () => {
    const result = spawnSync(
      process.execPath,
      ["scripts/catalog-db.mjs", "migrate"],
      { encoding: "utf8", env: { ...process.env }, timeout: 30000 },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("No pending migrations");
    expect(
      (await sql("SELECT count(*)::int n FROM catalog.product")).rows[0].n,
    ).toBe(8);
  });
  it("CAT-004 wrong database and URL rejected before catalog DDL", async () => {
    for (const target of [
      url.replace("127.0.0.1", "example.com"),
      url.replace("55439", "5432"),
      url.replace("atlas_catalog_runtime", "postgres"),
      url + "&sslmode=disable",
      url.replace("atlas_catalog_cat01", "postgres"),
    ])
      expect(() => catalogUrl(target, "CAT-01")).toThrow();
    const p = new pg.Pool({ ...options, database: "postgres", max: 1 });
    try {
      const migration = readFileSync(
        "prisma-catalog/migrations/202610150001_catalog/migration.sql",
        "utf8",
      );
      await expect(p.query(migration)).rejects.toThrow(
        "CATALOG_DISPOSABLE_FIXTURE_REQUIRED",
      );
      await p.query("ROLLBACK");
      expect(
        (await p.query("SELECT to_regnamespace('catalog') AS ns")).rows[0].ns,
      ).toBeNull();
    } finally {
      await p.end();
    }
  });
  it("CAT-005 SKU uniqueness and FK enforced by PostgreSQL", async () => {
    await expect(
      sql("UPDATE catalog.product SET status='PAID' WHERE id=$1", [id(1)]),
    ).rejects.toThrow();
    await expect(
      sql(
        "INSERT INTO catalog.product(id,sku,title,product_type,edition_id) VALUES($1,'DEMO-1','duplicate','EBOOK',$2)",
        [id(9), id(302)],
      ),
    ).rejects.toThrow();
    await expect(
      sql(
        "INSERT INTO catalog.edition(id,work_id,publisher_id,label,language) VALUES($1,$2,$3,'invalid','pt-BR')",
        [id(9), id(999), id(200)],
      ),
    ).rejects.toThrow();
    await expect(
      sql("UPDATE catalog.product SET sku='CHANGED' WHERE id=$1", [id(1)]),
    ).rejects.toThrow("CATALOG_STABLE_IDENTITY");
  });
  it("CAT-006 composition quantity and completeness constraints", async () => {
    await sql(
      "INSERT INTO catalog.product(id,sku,title,product_type) VALUES($1,'DEMO-X','DEMO Incomplete','KIT')",
      [id(9)],
    );
    for (const q of [0, -1, 1.5, 10000])
      await expect(
        sql("INSERT INTO catalog.kit_composition VALUES($1,$2,$3)", [
          id(9),
          id(1),
          q,
        ]),
      ).rejects.toThrow();
    await expect(
      sql("UPDATE catalog.product SET status='PUBLISHED' WHERE id=$1", [id(9)]),
    ).rejects.toThrow("CATALOG_KIT_NOT_PUBLISHABLE");
    expect(
      (await request(app.getHttpServer()).get(base + "/" + id(9))).status,
    ).toBe(404);
  });
  it("CAT-007 one work multiple editions and formats, nullable ISBN", async () => {
    const rows = (
      await sql(
        "SELECT e.isbn,p.product_type FROM catalog.edition e JOIN catalog.product p ON p.edition_id=e.id WHERE e.work_id=$1 AND p.status='PUBLISHED' ORDER BY p.id",
        [id(100)],
      )
    ).rows;
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.isbn === null)).toBe(true);
    expect(rows.map((r) => r.product_type)).toEqual([
      "PHYSICAL_BOOK",
      "EBOOK",
      "DIGITAL_MAGAZINE",
    ]);
  });
  it("CAT-008 multiple authors without duplicating work", async () => {
    for (const n of [401, 402]) {
      await sql("INSERT INTO catalog.author VALUES($1,$2)", [
        id(n),
        "DEMO Author " + n,
      ]);
      await sql("INSERT INTO catalog.work_author VALUES($1,$2)", [
        id(100),
        id(n),
      ]);
    }
    expect(
      (
        await sql(
          "SELECT count(*)::int n FROM catalog.work_author WHERE work_id=$1",
          [id(100)],
        )
      ).rows[0].n,
    ).toBe(2);
    expect(
      (await sql("SELECT count(*)::int n FROM catalog.work")).rows[0].n,
    ).toBe(1);
  });
  it("CAT-009 flat categories with unique associations", async () => {
    await sql("INSERT INTO catalog.category VALUES($1,'DEMO Conhecimento')", [
      id(500),
    ]);
    await sql("INSERT INTO catalog.product_category VALUES($1,$2)", [
      id(1),
      id(500),
    ]);
    await expect(
      sql("INSERT INTO catalog.product_category VALUES($1,$2)", [
        id(1),
        id(500),
      ]),
    ).rejects.toThrow();
  });
  it("CAT-010 no hierarchy accepted; invalid editorial association rejected", async () => {
    expect(
      (
        await sql(
          "SELECT column_name FROM information_schema.columns WHERE table_schema='catalog' AND table_name='category'",
        )
      ).rows
        .map((r) => r.column_name)
        .sort(),
    ).toEqual(["id", "name"]);
    await expect(
      sql("INSERT INTO catalog.product_category VALUES($1,$2)", [
        id(1),
        id(999),
      ]),
    ).rejects.toThrow();
    await expect(
      sql(
        "INSERT INTO catalog.product(id,sku,title,product_type) VALUES($1,'DEMO-MISSING','DEMO Invalid','EBOOK')",
        [id(9)],
      ),
    ).rejects.toThrow();
  });
  for (const [num, n, types] of [
    [11, 4, ["PHYSICAL_BOOK"]],
    [12, 5, ["EBOOK", "DIGITAL_MAGAZINE"]],
    [13, 6, ["PHYSICAL_BOOK", "EBOOK"]],
  ] as const) {
    it(`CAT-0${num} simple kit ${n} published and component types verified`, async () => {
      const rows = (
        await sql(
          "SELECT p.product_type FROM catalog.kit_composition k JOIN catalog.product p ON p.id=k.component_id WHERE kit_id=$1 ORDER BY p.id",
          [id(n)],
        )
      ).rows;
      expect(rows.map((r) => r.product_type)).toEqual(types);
      const r = await request(app.getHttpServer()).get(base + "/" + id(n));
      expect(r.status).toBe(200);
      expect(r.body.productType).toBe("KIT");
    });
  }
  it("CAT-014 invalid, duplicate, cyclic and sealed compositions rejected; two connections serialize publication", async () => {
    await sql(
      "INSERT INTO catalog.product(id,sku,title,product_type) VALUES($1,'DEMO-9','DEMO kit draft','KIT')",
      [id(9)],
    );
    for (const component of [9, 4, 999])
      await expect(
        sql("INSERT INTO catalog.kit_composition VALUES($1,$2,1)", [
          id(9),
          id(component),
        ]),
      ).rejects.toThrow();
    await sql("INSERT INTO catalog.kit_composition VALUES($1,$2,1)", [
      id(9),
      id(1),
    ]);
    await expect(
      sql("INSERT INTO catalog.kit_composition VALUES($1,$2,1)", [
        id(9),
        id(1),
      ]),
    ).rejects.toThrow();
    expect(() =>
      validateComposition(id(9), [{ id: id(4), type: "KIT", quantity: 1 }]),
    ).toThrow();
    const a = await admin.connect(),
      b = await admin.connect();
    try {
      await a.query("BEGIN");
      await a.query(
        "UPDATE catalog.product SET status='PUBLISHED' WHERE id=$1",
        [id(9)],
      );
      let settled = false;
      const edit = b
        .query(
          "UPDATE catalog.kit_composition SET quantity=2 WHERE kit_id=$1",
          [id(9)],
        )
        .then(
          () => "WRONG",
          (e) => {
            settled = true;
            return String(e.message);
          },
        );
      await new Promise((r) => setTimeout(r, 100));
      expect(settled).toBe(false);
      await a.query("COMMIT");
      expect(await edit).toContain("CATALOG_COMPOSITION_REJECTED");
      await sql("UPDATE catalog.product SET status='UNPUBLISHED' WHERE id=$1", [
        id(9),
      ]);
      await expect(
        sql("DELETE FROM catalog.kit_composition WHERE kit_id=$1", [id(9)]),
      ).rejects.toThrow();
    } finally {
      await a.query("ROLLBACK");
      a.release();
      b.release();
    }
  });
  it("CAT-015 published products listed with no cookie required", async () => {
    const r = await request(app.getHttpServer()).get(base);
    expect(r.status).toBe(200);
    expect(r.body.items.map((p: { id: string }) => p.id)).toEqual(
      [1, 2, 3, 4, 5, 6].map(id),
    );
  });
  it("CAT-016 draft, withdrawn and editorial invalidation hidden across list and kits", async () => {
    await sql("UPDATE catalog.work SET status='UNPUBLISHED' WHERE id=$1", [
      id(100),
    ]);
    const r = await request(app.getHttpServer()).get(base);
    expect(r.status).toBe(200);
    expect(r.body.items).toEqual([]);
    for (const n of [1, 4, 6, 7, 8])
      expect(
        (await request(app.getHttpServer()).get(base + "/" + id(n))).status,
      ).toBe(404);
    await sql("UPDATE catalog.work SET status='PUBLISHED' WHERE id=$1", [
      id(100),
    ]);
    await sql("UPDATE catalog.product SET status='UNPUBLISHED' WHERE id=$1", [
      id(1),
    ]);
    expect(
      (await request(app.getHttpServer()).get(base)).body.items.map(
        (p: { id: string }) => p.id,
      ),
    ).toEqual([2, 3, 5].map(id));
    await sql("UPDATE catalog.edition SET status='UNPUBLISHED' WHERE id=$1", [
      id(302),
    ]);
    expect(
      (await request(app.getHttpServer()).get(base)).body.items.map(
        (p: { id: string }) => p.id,
      ),
    ).toEqual([id(3)]);
    await expect(
      sql("UPDATE catalog.product SET status='PUBLISHED' WHERE id=$1", [id(7)]),
    ).rejects.toThrow("CATALOG_EDITORIAL_NOT_PUBLISHABLE");
  });
  it("CAT-017 unpublished, invalid and absent IDs share minimized 404", async () => {
    for (const n of [id(7), id(8), id(999), "invalid"]) {
      const r = await request(app.getHttpServer()).get(base + "/" + n);
      expect(r.status).toBe(404);
      expect(r.body.code).toBe("RESOURCE_NOT_FOUND");
      expect(r.text).not.toContain("PRIVATE_CANARY");
    }
  });
  it("CAT-018 keyset total ordering no duplicates under insertion and unpublish", async () => {
    const a = await request(app.getHttpServer()).get(base + "?limit=2");
    expect(a.status).toBe(200);
    await sql("UPDATE catalog.product SET status='UNPUBLISHED' WHERE id=$1", [
      id(2),
    ]);
    await sql(
      "INSERT INTO catalog.product(id,sku,title,product_type,edition_id,status) VALUES($1,'DEMO-9','DEMO concurrent insertion','EBOOK',$2,'PUBLISHED')",
      [id(9), id(303)],
    );
    let cursor = a.body.nextCursor;
    const ids: string[] = a.body.items.map((p: { id: string }) => p.id);
    while (cursor) {
      const r = await request(app.getHttpServer()).get(
        base + "?limit=2&cursor=" + cursor,
      );
      expect(r.status).toBe(200);
      ids.push(...r.body.items.map((p: { id: string }) => p.id));
      cursor = r.body.nextCursor;
    }
    expect(ids).toEqual([1, 2, 3, 4, 9].map(id));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("CAT-019 malformed, modified and different-instance cursors refused", async () => {
    const r = await request(app.getHttpServer()).get(base + "?limit=1");
    const cursor = String(r.body.nextCursor);
    for (const c of [
      "",
      "invalid",
      cursor.slice(0, -1) + (cursor.endsWith("A") ? "B" : "A"),
      "A".repeat(257),
    ])
      expect(
        (await request(app.getHttpServer()).get(base + "?cursor=" + c)).status,
      ).toBe(400);
    await app.close();
    await open();
    expect(
      (await request(app.getHttpServer()).get(base + "?cursor=" + cursor))
        .status,
    ).toBe(400);
  });
  it("CAT-020 strict limit, duplicates, unexpected and excessive query", async () => {
    for (const q of [
      "limit=0",
      "limit=101",
      "limit=-1",
      "limit=1.2",
      "limit=01",
      "limit=1&limit=2",
      "limit[]=1",
      "limit=%201",
      "sort=id",
      "price=0",
      "cursor=%ZZ",
      "x=" + "a".repeat(2048),
    ]) {
      const r = await request(app.getHttpServer()).get(base + "?" + q);
      expect(r.status, q).toBe(400);
      expect(r.headers["content-type"]).toContain("application/problem+json");
    }
    for (let n = 20; n <= 40; n++)
      await sql(
        "INSERT INTO catalog.product(id,sku,title,product_type,edition_id,status) VALUES($1,$2,'DEMO limit fixture','EBOOK',$3,'PUBLISHED')",
        [id(n), "DEMO-LIMIT-" + n, id(303)],
      );
    const standard = await request(app.getHttpServer()).get(base);
    expect(standard.status).toBe(200);
    expect(standard.body.items).toHaveLength(20);
    expect(standard.body.nextCursor).toBeTypeOf("string");
    const maximum = await request(app.getHttpServer()).get(base + "?limit=100");
    expect(maximum.status).toBe(200);
    expect(maximum.body.items).toHaveLength(27);
    expect(maximum.body.nextCursor).toBeNull();
  });
  it("CAT-021 public responses validated against actual OpenAPI in contract evidence gate", async () => {
    const product = await request(app.getHttpServer()).get(base + "/" + id(1));
    const list = await request(app.getHttpServer()).get(base);
    expect(product.status).toBe(200);
    expect(list.status).toBe(200);
    const validation = await contracts();
    expect(
      validation.product(product.body),
      JSON.stringify(validation.product.errors),
    ).toBe(true);
    expect(
      validation.list(list.body),
      JSON.stringify(validation.list.errors),
    ).toBe(true);
    expect(validation.refs).toBeGreaterThan(100);
    for (const bad of [
      { ...product.body, price: null },
      { ...product.body, price: { currency: "BRL", amountCents: 1.1 } },
      { ...product.body, storageKey: "PRIVATE_CANARY" },
    ])
      expect(validation.product(bad)).toBe(false);
    console.log("CAT_OPENAPI31_INTERNAL_REFS_RESOLVED " + validation.refs);
    console.log(
      "CAT_CONTRACT_SAMPLES " +
        JSON.stringify({ product: product.body, list: list.body }),
    );
    expect(Object.keys(product.body).sort()).toEqual([
      "description",
      "id",
      "previewAvailable",
      "price",
      "productType",
      "title",
    ]);
  });
  it("CAT-022 DTO allowlist and text remains JSON data, no internal fields", async () => {
    await sql("UPDATE catalog.product SET description=$2 WHERE id=$1", [
      id(1),
      "<script>DEMO_CANARY</script> & texto",
    ]);
    const r = await request(app.getHttpServer()).get(base + "/" + id(1));
    expect(r.body.description).toBe("<script>DEMO_CANARY</script> & texto");
    expect(r.headers["content-type"]).toContain("application/json");
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
    for (const key of [
      "sku",
      "edition_id",
      "status",
      "sealed",
      "storageKey",
      "source",
    ])
      expect(r.text).not.toContain('"' + key + '"');
  });
  it("CAT-023 Pricing controlled source provides exact integer cents", async () => {
    const r = await request(app.getHttpServer()).get(base + "/" + id(1));
    expect(r.status).toBe(200);
    expect(r.body.price).toEqual({ currency: "BRL", amountCents: 12345 });
  });
  it("CAT-024 normal composition with no Pricing fails closed, including missing price", async () => {
    await app.close();
    await open(
      new CatalogRuntime(new CatalogReader(repo, unavailablePricing), repo),
    );
    for (const route of [base, base + "/" + id(1)]) {
      const r = await request(app.getHttpServer()).get(route);
      expect(r.status).toBe(503);
      expect(r.body.code).toBe("DEPENDENCY_UNAVAILABLE");
      expect(r.text).not.toContain('"price"');
    }
    expect(
      (await request(app.getHttpServer()).get(base + "/" + id(7))).status,
    ).toBe(404);
    await app.close();
    await open(
      new CatalogRuntime(
        new CatalogReader(repo, { read: async () => new Map() }),
        repo,
      ),
    );
    expect((await request(app.getHttpServer()).get(base)).status).toBe(503);
  });
  it("CAT-025 invalid money rejected through real HTTP", async () => {
    for (const bad of [-1, 0.1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
      expect(() => validPrice({ ...demoPrice, amountCents: bad })).toThrow();
    for (const bad of [
      { ...demoPrice, amountCents: -1 },
      { ...demoPrice, amountCents: 1.1 },
      { ...demoPrice, currency: "USD" },
      { ...demoPrice, source: "" },
    ]) {
      await app.close();
      await open(
        new CatalogRuntime(
          new CatalogReader(repo, {
            read: async (ids) =>
              new Map(ids.map((i) => [i, bad as PublicPrice])),
          }),
          repo,
        ),
      );
      expect(
        (await request(app.getHttpServer()).get(base + "/" + id(1))).status,
      ).toBe(503);
    }
  });
  it("CAT-026 preview false and no download/media routes", async () => {
    const r = await request(app.getHttpServer()).get(base);
    expect(
      r.body.items.every(
        (p: { previewAvailable: boolean }) => p.previewAvailable === false,
      ),
    ).toBe(true);
    expect(
      (await request(app.getHttpServer()).get(base + "/" + id(2) + "/download"))
        .status,
    ).toBe(404);
    expect(
      (await request(app.getHttpServer()).post(base + "/" + id(1) + "/publish"))
        .status,
    ).toBe(404);
  });
  it("CAT-027 PostgreSQL lock timeout sanitized and recoverable; pool closed", async () => {
    const blocker = await admin.connect();
    try {
      await blocker.query("BEGIN");
      await blocker.query("LOCK catalog.product IN ACCESS EXCLUSIVE MODE");
      const start = Date.now();
      const r = await request(app.getHttpServer()).get(base);
      expect(r.status).toBe(503);
      expect(Date.now() - start).toBeLessThan(5000);
      expect(r.text).not.toMatch(/SQL|Prisma|postgres|stack|password|pg_/i);
    } finally {
      await blocker.query("ROLLBACK");
      blocker.release();
    }
    expect((await request(app.getHttpServer()).get(base)).status).toBe(200);
    await app.close();
    await repo.close();
    expect(
      (
        await sql(
          "SELECT count(*)::int n FROM pg_stat_activity WHERE application_name='atlas-catalog-runtime'",
        )
      ).rows[0].n,
    ).toBe(0);
  });
  it("CAT-028 SQL injection, mass assignment, malformed params and rate abuse rejected", async () => {
    expect(
      (
        await request(app.getHttpServer()).get(
          base + "/" + encodeURIComponent("';DROP TABLE catalog.product;--"),
        )
      ).status,
    ).toBe(404);
    expect(
      (await request(app.getHttpServer()).get(base + "?limit=1%20OR%201=1"))
        .status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .post(base)
          .send({ status: "PUBLISHED", price: 0 })
      ).status,
    ).toBe(404);
    let last;
    for (let i = 0; i < 121; i++)
      last = await request(app.getHttpServer()).get(base + "?bad=1");
    expect(last!.status).toBe(429);
    expect(last!.headers["retry-after"]).toBe("60");
    expect(
      (await sql("SELECT count(*)::int n FROM catalog.product")).rows[0].n,
    ).toBe(8);
  });
  it("CAT-029 protected modules, schemas, lockfile and normative contracts unchanged", async () => {
    const protectedPaths = [
      "apps/api/src/modules/identity",
      "apps/api/src/infrastructure/persistence",
      "apps/api/prisma",
      "apps/api/prisma-identity",
      "apps/api/test/identity",
      "apps/api/test/spike",
      "apps/api/test/mrd",
      "apps/api/test/supabase-l1",
      "apps/storefront",
      "apps/admin",
      "pnpm-lock.yaml",
      "docs/02-business-requirements",
      "docs/03-business-processes",
      "docs/04-architecture",
      "docs/05-engineering/contracts",
    ];
    const check = spawnSync("git", ["diff", "HEAD", "--", ...protectedPaths], {
      cwd: "../..",
      encoding: "utf8",
    });
    expect(check.status).toBe(0);
    expect(check.stdout).toBe("");
    expect(
      (
        await sql(
          "SELECT nspname FROM pg_namespace WHERE nspname IN ('identity','spike')",
        )
      ).rows,
    ).toEqual([]);
    expect(
      (await request(app.getHttpServer()).get("/api/v1/auth/csrf")).status,
    ).toBe(503);
  });
  it("CAT-030 local schema and query plan evidence; repository gates and remote CI separately reported", async () => {
    const r = await sql(
      "EXPLAIN (FORMAT JSON) SELECT id,title FROM catalog.public_products WHERE id>$1 ORDER BY id LIMIT 21",
      [id(0)],
    );
    expect(r.rows).toHaveLength(1);
    console.log("CAT_QUERY_PLAN_LOCAL " + JSON.stringify(r.rows));
    const migration = readFileSync(
      "prisma-catalog/migrations/202610150001_catalog/migration.sql",
      "utf8",
    );
    expect(migration).not.toContain("SECURITY DEFINER");
    console.log("CAT_REMOTE_CI_NOT_EXECUTED_PRICING_REAL_BLOCKED_L1_PENDING");
  });
});
