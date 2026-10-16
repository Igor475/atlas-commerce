import "reflect-metadata";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { setTimeout as pause } from "node:timers/promises";
import pg from "pg";
import { Test } from "@nestjs/testing";
import http from "supertest";
import { AppModule } from "../../src/app.module.js";
import { ProfileDatabase } from "../../src/modules/customer-profile/infrastructure/profile-database.js";
import {
  profileUrl,
  profileEnabled,
} from "../../src/modules/customer-profile/infrastructure/profile-config.js";
import {
  CustomerAddresses,
  type ProfileTransactionContext,
} from "../../src/modules/customer-profile/application/customer-addresses.js";
import {
  postal,
  principal,
  ProfileError,
  type AuthorizedCustomerPrincipal,
  type CandidatePostalAddress,
} from "../../src/modules/customer-profile/domain/address.js";
const id = (n: number) =>
  "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
const actor = id(1),
  other = id(2),
  address = id(10);
const p: AuthorizedCustomerPrincipal = {
  accountId: actor,
  eligible: true,
  sessionClass: "CUSTOMER",
  evidence: "CP-01_TEST_ONLY",
};
const fake: CandidatePostalAddress = {
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
  port: 55441,
  database: "atlas_profile_cp01",
  password: "",
  ssl: false as const,
  connectionTimeoutMillis: 1000,
};
const url = (role = "actor_a") =>
  `postgresql://atlas_profile_${role}@127.0.0.1:55441/atlas_profile_cp01?schema=customer_profile`;
describe("CP-01 PostgreSQL17 local TEST_ONLY", () => {
  let admin: pg.Pool,
    a: pg.Pool,
    b: pg.Pool,
    store: ProfileDatabase,
    service: CustomerAddresses;
  const sql = (s: string, args?: unknown[]) => admin.query(s, args);
  const change = (
    version = 1,
    state: "ELIGIBLE" | "INELIGIBLE" | "RETIRED" = "ELIGIBLE",
    key = randomUUID(),
    data = fake,
  ) => store.change(p, key, address, version, data, state);
  async function waitForLocks(minimum = 1) {
    const until = Date.now() + 2000;
    while (Date.now() < until) {
      const r = await sql(
        "SELECT count(*)::int n FROM pg_stat_activity WHERE application_name LIKE 'atlas-profile-%' AND wait_event_type='Lock'",
      );
      if (r.rows[0].n >= minimum) return;
      await pause(5);
    }
    throw new Error("CP_BARRIER_TIMEOUT");
  }
  beforeAll(async () => {
    admin = new pg.Pool({
      ...options,
      user: "atlas_profile_bootstrap",
      max: 3,
    });
    a = new pg.Pool({
      ...options,
      user: "atlas_profile_actor_a",
      max: 2,
      application_name: "atlas-profile-raw-a",
    });
    b = new pg.Pool({
      ...options,
      user: "atlas_profile_actor_b",
      max: 1,
      application_name: "atlas-profile-raw-b",
    });
    const proof = (
      await sql(
        "SELECT current_database() db,current_setting('atlas.profile_fixture',true) marker,current_setting('server_version_num')::int v",
      )
    ).rows[0];
    expect(proof.db).toBe("atlas_profile_cp01");
    expect(proof.marker).toBe("atlas-cp01-disposable");
    expect(proof.v).toBeGreaterThanOrEqual(170000);
    expect(proof.v).toBeLessThan(180000);
    store = new ProfileDatabase(url(), "CP-01", "actor_a");
    service = new CustomerAddresses(store, { current: async () => p });
  });
  beforeEach(async () => {
    await sql(
      "TRUNCATE customer_profile.request,customer_profile.revision,customer_profile.address,customer_profile.fixture_principal,customer_profile.fixture_account CASCADE",
    );
    await sql(
      "INSERT INTO customer_profile.fixture_account VALUES($1,true,true,'TEST_ONLY'),($2,true,true,'TEST_ONLY')",
      [actor, other],
    );
    await sql(
      "INSERT INTO customer_profile.fixture_principal VALUES('atlas_profile_actor_a',$1,'CUSTOMER'),('atlas_profile_actor_b',$2,'CUSTOMER')",
      [actor, other],
    );
    await store.change(p, randomUUID(), address, 0, fake, "ELIGIBLE");
  });
  afterAll(async () => {
    await store?.close();
    await Promise.all([admin?.end(), a?.end(), b?.end()]);
  });
  it("CP-001 default disabled and production refused", () => {
    expect(profileEnabled({})).toBe(false);
    expect(profileEnabled({ PROFILE_MODE: "disabled" })).toBe(false);
    expect(() =>
      profileEnabled({
        PROFILE_MODE: "local-disposable",
        PROFILE_CONSENT: "CP-01",
        NODE_ENV: "production",
      }),
    ).toThrow("PROFILE_LOCAL_REQUIRED");
  });
  it("CP-002 isolated schema, owner, FK and current revision constraints", async () => {
    expect(
      (
        await sql(
          "SELECT nspowner::regrole::text owner FROM pg_namespace WHERE nspname='customer_profile'",
        )
      ).rows[0].owner,
    ).toBe("atlas_profile_migrator");
    expect(
      (
        await sql(
          "SELECT condeferrable,condeferred FROM pg_constraint WHERE conname='current_revision'",
        )
      ).rows[0],
    ).toEqual({ condeferrable: true, condeferred: true });
    await expect(
      sql(
        "INSERT INTO customer_profile.revision SELECT address_id,$1,2,purpose,eligibility,recipient,country,postal_code,region,city,district,street,number,complement,created_at FROM customer_profile.revision LIMIT 1",
        [other],
      ),
    ).rejects.toThrow();
  });
  it("CP-003 migration rejects wrong role and fixture marker", async () => {
    const client = await a.connect();
    try {
      await expect(
        client.query(
          readFileSync(
            "prisma-profile/migrations/202610160001_profile/migration.sql",
            "utf8",
          ),
        ),
      ).rejects.toThrow("CP_FIXTURE_REQUIRED");
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
    const c = await admin.connect();
    try {
      await c.query("BEGIN; SET LOCAL atlas.profile_fixture='wrong'");
      await expect(
        c.query("SELECT customer_profile.read_for_quote($1,$2)", [
          actor,
          address,
        ]),
      ).rejects.toThrow("CP_FIXTURE_REQUIRED");
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
  });
  it("CP-004 migration applied twice by harness without duplicate history", async () => {
    const r = await sql(
      "SELECT count(*)::int n FROM customer_profile._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL",
    );
    expect(r.rows[0].n).toBe(1);
    const result = spawnSync(
      process.execPath,
      ["scripts/profile-db.mjs", "migrate"],
      { encoding: "utf8", timeout: 30000 },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("No pending migrations");
  });
  it("CP-005 runtime has no table or maintenance access", async () => {
    for (const q of [
      "SELECT * FROM customer_profile.revision",
      "UPDATE customer_profile.address SET current_version=99",
      "DELETE FROM customer_profile.revision",
      "SELECT customer_profile.project($1,1)",
      "CREATE TABLE public.forbidden(id int)",
    ])
      await expect(
        a.query(q, q.includes("$1") ? [address] : undefined),
      ).rejects.toThrow();
    expect(
      (
        await sql(
          "SELECT rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication FROM pg_roles WHERE rolname='atlas_profile_actor_a'",
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
  it("CP-006 remote destinations and arbitrary CLI arguments refused", () => {
    for (const value of [
      url().replace("127.0.0.1", "example.invalid"),
      url().replace("55441", "5432"),
      url() + "&sslmode=disable",
      url().replace("actor_a", "bootstrap"),
    ])
      expect(() => profileUrl(value, "CP-01")).toThrow();
    const r = spawnSync(
      process.execPath,
      ["scripts/profile-db.mjs", "test", "extra"],
      { encoding: "utf8", timeout: 5000 },
    );
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("PROFILE_COMMAND_INVALID");
  });
  it("CP-007 principal source and SQL role mapping both enforce identity", async () => {
    const bad = new CustomerAddresses(store, {
      current: async () => ({ ...p, accountId: other }),
    });
    await expect(bad.readForQuote(address)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    expect(() =>
      principal({
        ...p,
        sessionClass: "STAFF",
      } as unknown as AuthorizedCustomerPrincipal),
    ).toThrow("UNAUTHENTICATED");
    expect(() =>
      principal(undefined as unknown as AuthorizedCustomerPrincipal),
    ).toThrow("UNAUTHENTICATED");
  });
  it("CP-008 own multiple addresses retain stable IDs", async () => {
    await store.change(p, randomUUID(), id(11), 0, fake, "ELIGIBLE");
    expect((await service.readForQuote(address)).addressId).toBe(address);
    expect((await service.readForQuote(id(11))).addressVersion).toBe(1);
  });
  it("CP-009 foreign ownership refused in both ports and forged actor", async () => {
    await expect(
      b.query("SELECT customer_profile.read_for_quote($1,$2)", [
        other,
        address,
      ]),
    ).rejects.toThrow("CP_RESOURCE_NOT_FOUND");
    await expect(
      b.query("SELECT customer_profile.snapshot_for_order($1,$2,1)", [
        other,
        address,
      ]),
    ).rejects.toThrow("CP_RESOURCE_NOT_FOUND");
    await expect(
      b.query("SELECT customer_profile.read_for_quote($1,$2)", [
        actor,
        address,
      ]),
    ).rejects.toThrow("CP_UNAUTHENTICATED");
  });
  it("CP-010 inactive or unverified account refused despite trusted-looking principal", async () => {
    await sql(
      "UPDATE customer_profile.fixture_account SET active=false WHERE id=$1",
      [actor],
    );
    await expect(service.readForQuote(address)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    await sql(
      "UPDATE customer_profile.fixture_account SET active=true,verified=false WHERE id=$1",
      [actor],
    );
    await expect(service.readForQuote(address)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });
  it("CP-011 invalid IDs and malformed versions refused", async () => {
    await expect(service.readForQuote("invalid")).rejects.toMatchObject({
      code: "RESOURCE_NOT_FOUND",
    });
    await expect(
      service.snapshotForOrder(address, 0, async () => undefined),
    ).rejects.toMatchObject({ code: "RESOURCE_NOT_FOUND" });
  });
  it("CP-012 missing and foreign address use same redacted negative", async () => {
    const messages = [];
    for (const target of [address, id(999)]) {
      try {
        await b.query("SELECT customer_profile.read_for_quote($1,$2)", [
          other,
          target,
        ]);
      } catch (e) {
        messages.push((e as Error).message);
      }
    }
    expect(messages).toEqual([
      "CP_RESOURCE_NOT_FOUND",
      "CP_RESOURCE_NOT_FOUND",
    ]);
  });
  it("CP-013 initial immutable revision and explicit current pointer", async () => {
    expect(
      (
        await sql(
          "SELECT current_version FROM customer_profile.address WHERE id=$1",
          [address],
        )
      ).rows[0].current_version,
    ).toBe(1);
    expect((await change()).addressVersion).toBe(2);
    expect(
      (
        await sql(
          "SELECT array_agg(version ORDER BY version) v FROM customer_profile.revision WHERE address_id=$1",
          [address],
        )
      ).rows[0].v,
    ).toEqual([1, 2]);
  });
  it("CP-014 revision alteration/deletion and ownership rewrites rejected", async () => {
    await expect(
      sql("UPDATE customer_profile.revision SET recipient=$1", [
        "TEST_REWRITE",
      ]),
    ).rejects.toThrow("CP_IMMUTABLE");
    await expect(sql("DELETE FROM customer_profile.revision")).rejects.toThrow(
      "CP_IMMUTABLE",
    );
    await expect(
      sql("UPDATE customer_profile.address SET account_id=$1", [other]),
    ).rejects.toThrow("CP_IMMUTABLE");
  });
  it("CP-015 two concurrent updates: one version wins, no silent lost update", async () => {
    const lock = await admin.connect();
    await lock.query("BEGIN");
    await lock.query(
      "SELECT id FROM customer_profile.address WHERE id=$1 FOR UPDATE",
      [address],
    );
    const attempts = Promise.allSettled([
      change(1),
      change(1, "ELIGIBLE", randomUUID(), { ...fake, number: "TEST_CHANGED" }),
    ]);
    try {
      await waitForLocks(2);
    } finally {
      await lock.query("ROLLBACK");
      lock.release();
    }
    const r = await attempts;
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(r.filter((x) => x.status === "rejected")).toHaveLength(1);
    expect(
      (r.find((x) => x.status === "rejected") as PromiseRejectedResult).reason,
    ).toMatchObject({ code: "VERSION_CONFLICT" });
    expect((await change(2)).addressVersion).toBe(3);
    expect(
      (await sql("SELECT count(*)::int n FROM customer_profile.revision"))
        .rows[0].n,
    ).toBe(3);
  });
  it("CP-016 quote version previously read becomes stale and cannot snapshot", async () => {
    const quote = await service.readForQuote(address);
    await change(1);
    await expect(
      service.snapshotForOrder(address, quote.addressVersion, async (s) => s),
    ).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  });
  it("CP-017 read waits for actual writer and observes committed revision", async () => {
    const writer = await a.connect();
    await writer.query("BEGIN");
    await writer.query(
      "SELECT customer_profile.change($1,$2,$3,1,$4::jsonb,$5)",
      [
        actor,
        randomUUID(),
        address,
        JSON.stringify({ ...fake, number: "TEST_V2" }),
        "ELIGIBLE",
      ],
    );
    const pending = service.readForQuote(address);
    try {
      await waitForLocks();
    } finally {
      await writer.query("COMMIT");
      writer.release();
    }
    expect((await pending).addressVersion).toBe(2);
  });
  it("CP-018 logical retirement preserves revisions and cannot resurrect", async () => {
    await change(1, "RETIRED");
    await expect(service.readForQuote(address)).rejects.toMatchObject({
      code: "RESOURCE_NOT_FOUND",
    });
    await expect(change(2)).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
    expect(
      (await sql("SELECT count(*)::int n FROM customer_profile.revision"))
        .rows[0].n,
    ).toBe(2);
  });
  it("CP-019 accepted copy and old revision remain unchanged after edit", async () => {
    const accepted = await service.snapshotForOrder(address, 1, async (s) =>
      structuredClone(s),
    );
    await change(1, "ELIGIBLE", randomUUID(), {
      ...fake,
      street: "TEST_NEW_STREET",
    });
    expect(accepted.postalAddress.street).toBe("TEST_STREET");
    expect(
      (
        await sql(
          "SELECT street FROM customer_profile.revision WHERE address_id=$1 AND version=1",
          [address],
        )
      ).rows[0].street,
    ).toBe("TEST_STREET");
  });
  it("CP-020 replay after committed result discarded and key conflict", async () => {
    const key = randomUUID();
    await change(1, "ELIGIBLE", key);
    await change(2);
    const replay = await change(1, "ELIGIBLE", key);
    expect(replay.addressVersion).toBe(2);
    expect((await service.readForQuote(address)).addressVersion).toBe(3);
    await expect(change(2, "ELIGIBLE", key)).rejects.toMatchObject({
      code: "IDEMPOTENCY_CONFLICT",
    });
  });
  it("CP-021 Quotes minimal projection excludes shipping PII", async () => {
    expect(Object.keys(await service.readForQuote(address)).sort()).toEqual(
      [
        "addressId",
        "addressVersion",
        "country",
        "eligible",
        "postalCode",
      ].sort(),
    );
  });
  it("CP-022 snapshot port returns explicit typed immutable revision copy", async () => {
    const s = await service.snapshotForOrder(address, 1, async (s) => s);
    expect(s.postalAddress).toEqual(fake);
    expect(s.purpose).toBe("TEST_ONLY");
    expect(s.addressVersion).toBe(1);
  });
  it("CP-023 principal account cannot be changed while snapshot transaction is active", async () => {
    let pending: Promise<pg.QueryResult> | undefined;
    await store.transaction(p, async (tx) => {
      await store.snapshotForOrder(p, address, 1, tx);
      pending = sql(
        "UPDATE customer_profile.fixture_account SET active=false WHERE id=$1",
        [actor],
      );
      const until = Date.now() + 1000;
      while (Date.now() < until) {
        if (
          (
            await admin.query(
              "SELECT count(*)::int n FROM pg_stat_activity WHERE query LIKE 'UPDATE customer_profile.fixture_account%' AND wait_event_type='Lock'",
            )
          ).rows[0].n > 0
        )
          return;
        await pause(5);
      }
      throw new Error("CP_ACCOUNT_LOCK_NOT_OBSERVED");
    });
    await pending;
    await expect(service.readForQuote(address)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });
  it("CP-024 unavailable adapter cannot fabricate success", async () => {
    const c = await admin.connect();
    try {
      await c.query("BEGIN");
      await c.query(
        "SELECT id FROM customer_profile.address WHERE id=$1 FOR UPDATE",
        [address],
      );
      await expect(service.readForQuote(address)).rejects.toMatchObject({
        code: "PROFILE_UNAVAILABLE",
      });
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
  });
  it("CP-025 snapshot context holds locks until outer callback finishes and rejects reuse", async () => {
    let context: ProfileTransactionContext | undefined;
    const writer = await a.connect();
    let pending: Promise<pg.QueryResult> | undefined;
    try {
      await store.transaction(p, async (tx) => {
        context = tx;
        await store.snapshotForOrder(p, address, 1, tx);
        pending = writer.query(
          "SELECT customer_profile.change($1,$2,$3,1,$4::jsonb,$5)",
          [actor, randomUUID(), address, JSON.stringify(fake), "INELIGIBLE"],
        );
        await waitForLocks();
      });
      await pending;
    } finally {
      writer.release();
    }
    await expect(
      store.snapshotForOrder(p, address, 1, context!),
    ).rejects.toMatchObject({ code: "PROFILE_UNAVAILABLE" });
    await expect(
      store.snapshotForOrder(p, address, 1, { purpose: "CP-01_TEST_ONLY" }),
    ).rejects.toMatchObject({ code: "PROFILE_UNAVAILABLE" });
  });
  it("CP-026 address changes or loses eligibility while Orders-like snapshot waits", async () => {
    for (const state of ["ELIGIBLE", "INELIGIBLE"] as const) {
      const version = (
        await sql(
          "SELECT current_version v FROM customer_profile.address WHERE id=$1",
          [address],
        )
      ).rows[0].v;
      const writer = await a.connect();
      await writer.query("BEGIN");
      await writer.query(
        "SELECT customer_profile.change($1,$2,$3,$4,$5::jsonb,$6)",
        [actor, randomUUID(), address, version, JSON.stringify(fake), state],
      );
      const pending = service
        .snapshotForOrder(address, version, async (s) => s)
        .then(
          () => ({ code: "UNEXPECTED_SUCCESS" }),
          (e) => e,
        );
      try {
        await waitForLocks();
      } finally {
        await writer.query("COMMIT");
        writer.release();
      }
      expect(await pending).toMatchObject({ code: "VERSION_CONFLICT" });
    }
  });
  it("CP-027 SQL injection stored as text with no SQL effects", async () => {
    const input = {
      ...fake,
      street: "TEST_STREET'; DROP SCHEMA customer_profile CASCADE; --",
    };
    const result = await change(1, "ELIGIBLE", randomUUID(), input);
    expect(result.postalAddress.street).toBe(input.street);
    expect(
      (await sql("SELECT to_regclass('customer_profile.address') t")).rows[0].t,
    ).toBeTruthy();
  });
  it("CP-028 mass assignment and schema-free JSON refused at TS and SQL boundaries", async () => {
    expect(() =>
      postal({ ...fake, ownerId: other } as CandidatePostalAddress),
    ).toThrow("INVALID_REQUEST");
    await expect(
      a.query("SELECT customer_profile.change($1,$2,$3,1,$4::jsonb,$5)", [
        actor,
        randomUUID(),
        address,
        JSON.stringify({ ...fake, ownerId: other }),
        "ELIGIBLE",
      ]),
    ).rejects.toThrow("CP_INVALID_REQUEST");
    await expect(
      a.query("SELECT customer_profile.change($1,$2,$3,1,$4::jsonb,$5)", [
        actor,
        randomUUID(),
        address,
        JSON.stringify({ ...fake, street: { value: "TEST" } }),
        "ELIGIBLE",
      ]),
    ).rejects.toThrow("CP_INVALID_REQUEST");
  });
  it("CP-029 dangerous grants/membership fail closed and raw data denied", async () => {
    try {
      await sql(
        "GRANT SELECT ON customer_profile.revision TO atlas_profile_actor_a",
      );
      await expect(service.readForQuote(address)).rejects.toMatchObject({
        code: "PROFILE_UNAVAILABLE",
      });
    } finally {
      await sql(
        "REVOKE SELECT ON customer_profile.revision FROM atlas_profile_actor_a",
      );
    }
    try {
      await sql("GRANT atlas_profile_executor TO atlas_profile_actor_a");
      await expect(service.readForQuote(address)).rejects.toMatchObject({
        code: "PROFILE_UNAVAILABLE",
      });
    } finally {
      await sql("REVOKE atlas_profile_executor FROM atlas_profile_actor_a");
    }
    await expect(
      a.query("SELECT * FROM customer_profile.revision"),
    ).rejects.toThrow();
    expect((await service.readForQuote(address)).eligible).toBe(true);
  });
  it("CP-030 errors redact postal data, SQL and adapter metadata", async () => {
    try {
      await change(999, "ELIGIBLE", randomUUID(), {
        ...fake,
        recipient: "TEST_PRIVATE_MARKER",
      });
      throw new Error("unexpected success");
    } catch (e) {
      expect(e).toBeInstanceOf(ProfileError);
      expect(JSON.stringify(e)).not.toMatch(
        /TEST_PRIVATE_MARKER|SELECT|INSERT|postgresql/,
      );
      expect((e as Error).message).toBe("VERSION_CONFLICT");
    }
  });
  it("CP-031 no public profile/address API or enabled composition", async () => {
    const app = await (
      await Test.createTestingModule({ imports: [AppModule] }).compile()
    ).createNestApplication();
    await app.init();
    try {
      for (const route of [
        "/api/v1/me/addresses",
        "/api/v1/customer-profile",
        "/api/v1/checkout/quotes",
      ])
        await http(app.getHttpServer()).post(route).send(fake).expect(404);
    } finally {
      await app.close();
    }
  });
  // Actual complete regression suites are run separately and reported, not inferred from these guards.
  it("CP-032 no Identity tables, secrets or repository dependencies in Profile database", async () => {
    expect(
      (
        await sql(
          "SELECT count(*)::int n FROM pg_namespace WHERE nspname='identity'",
        )
      ).rows[0].n,
    ).toBe(0);
    const source = readFileSync(
      "src/modules/customer-profile/infrastructure/profile-database.ts",
      "utf8",
    );
    expect(source).not.toMatch(
      /identity\/infrastructure|password_credential|auth_session/,
    );
  });
  it("CP-033 Profile does not install Catalog or Pricing in its database", async () => {
    expect(
      (
        await sql(
          "SELECT count(*)::int n FROM pg_namespace WHERE nspname IN ('catalog','pricing')",
        )
      ).rows[0].n,
    ).toBe(0);
  });
  it("CP-034 address mutation does not install or reserve Inventory", async () => {
    await change(1);
    expect(
      (await sql("SELECT to_regnamespace('inventory') n")).rows[0].n,
    ).toBeNull();
  });
  it("CP-035 rollback of consumer callback leaves address revision unchanged and locks released", async () => {
    await expect(
      store.transaction(p, async (tx) => {
        await store.snapshotForOrder(p, address, 1, tx);
        throw new ProfileError("PROFILE_UNAVAILABLE");
      }),
    ).rejects.toMatchObject({ code: "PROFILE_UNAVAILABLE" });
    expect((await change(1)).addressVersion).toBe(2);
  });
  it("CP-036 runner fixed local resources and no remote CLI/provider configuration", () => {
    const runner = readFileSync("scripts/profile-local.mjs", "utf8");
    expect(runner).toContain("atlas-cp01-port-55441.lock");
    expect(runner).toContain("--pull");
    expect(runner).not.toMatch(/supabase|mrd-cli|dotenv/);
    expect(readFileSync("compose.profile.yml", "utf8")).toContain(
      "127.0.0.1:55441:5432",
    );
  });
});
