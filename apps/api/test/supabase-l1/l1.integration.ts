import { readFileSync } from "node:fs";
import pg from "pg";
import { afterAll, describe, expect, it } from "vitest";
import {
  l1Options,
  type L1Review,
} from "../../src/infrastructure/persistence/l1-config.js";
import { L1Diagnostic } from "../../src/infrastructure/persistence/l1-diagnostic.js";
import { l1Queries } from "../../src/infrastructure/persistence/l1-queries.js";
import { verifiedTls } from "../../src/infrastructure/persistence/probe-driver.js";
import { ReadOnlyProbe } from "../../src/infrastructure/persistence/probe-readiness.js";
import {
  readProbeConfig,
  type CloudProbePlan,
} from "../../src/infrastructure/persistence/probe-config.js";
if (process.env.SUPABASE_L1_LOCAL_TEST !== "1")
  throw new Error("LOCAL_RUNNER_REQUIRED");
const caFile = process.env.CONNECTION_TEST_CA_FILE!;
const ca = readFileSync(caFile, "utf8");
const options = {
  host: "localhost",
  port: 55434,
  database: "atlas_spike_f0404",
  user: "atlas_l1_readonly",
  password: "",
  ssl: verifiedTls(ca, "localhost"),
  max: 1,
  connectionTimeoutMillis: 500,
  statement_timeout: 1000,
  query_timeout: 1500,
  idleTimeoutMillis: 500,
};
const admin = new pg.Pool({
  ...options,
  host: "127.0.0.1",
  user: "atlas_spike",
  ssl: false,
});
const review: L1Review = {
  projectName: "TEST FIXTURE",
  organization: "LOCAL ONLY",
  projectRef: "aaaaaaaaaaaaaaaaaaaa",
  host: "fixture.pooler.supabase.com",
  username: "atlas_l1_readonly.aaaaaaaaaaaaaaaaaaaa",
  role: "atlas_l1_readonly",
  transport: "session-ipv4",
  port: 5432,
  source: "dashboard-connect",
  caFile,
  dataApi: "disabled",
  exposedSchemas: [],
};
const env = {
  ATLAS_SUPABASE_PROJECT_REF: review.projectRef,
  ATLAS_SUPABASE_READONLY_PASSWORD: "LOCAL_TEST_VALUE",
};
const consent = ["--consent-readonly=" + review.projectRef];
const diagnostic = () => new L1Diagnostic(options, "atlas_l1_readonly", []);
afterAll(async () => {
  await admin.end();
});
describe("INT-02 local PostgreSQL; no remote sockets", () => {
  it("local role catalog query executes with restricted privileges", async () => {
    const pool = new pg.Pool(options);
    try {
      expect((await pool.query(l1Queries.role)).rows).toEqual([
        { canlogin: true, unsafe: false },
      ]);
    } finally {
      await pool.end();
    }
  });
  it("SUPL1-001/002/003/004/014 consent, project, CI and endpoint fail before pool construction", () => {
    expect(() => l1Options(env, [], review)).toThrow(
      "REMOTE_AUTHORIZATION_REQUIRED",
    );
    for (const patch of [
      { ATLAS_SUPABASE_PROJECT_REF: "bbbbbbbbbbbbbbbbbbbb" },
      { CI: "true" },
      { NODE_TLS_REJECT_UNAUTHORIZED: "0" },
      { PGHOST: "ignored.invalid" },
      { ATLAS_SUPABASE_READONLY_PASSWORD: "" },
    ])
      expect(() => l1Options({ ...env, ...patch }, consent, review)).toThrow();
    for (const patch of [
      { port: 6543 },
      { username: "postgres." + review.projectRef },
      { organization: "" },
      { transport: "direct-ipv6" },
      { exposedSchemas: ["identity"] },
    ])
      expect(() =>
        l1Options(env, consent, { ...review, ...patch } as L1Review),
      ).toThrow();
    const planned = l1Options(
      { ...env, DATABASE_URL: "postgresql://never-used.invalid" },
      consent,
      review,
    );
    expect(planned).not.toHaveProperty("connectionString");
    expect(planned).toMatchObject({
      port: 5432,
      max: 1,
      ssl: { rejectUnauthorized: true, servername: review.host },
    });
  });
  it("SUPL1-001 normal web still refuses cloud even with a valid prepared plan", () => {
    const plan = readProbeConfig({
      PERSISTENCE_ENABLED: "true",
      PERSISTENCE_PROFILE: "cloud-readonly",
      PERSISTENCE_ENDPOINT_SOURCE: "dashboard-connect",
      PERSISTENCE_TLS: "verify-full",
      PERSISTENCE_TRANSPORT: "session-ipv4",
      PERSISTENCE_EXPECTED_HOST: review.host,
      PERSISTENCE_EXPECTED_ROLE: review.role,
      PERSISTENCE_TEST_PROJECT: review.projectRef,
      PERSISTENCE_PROBE_URL:
        "postgresql://" +
        review.username +
        ":LOCAL_TEST_VALUE@" +
        review.host +
        ":5432/postgres",
      PERSISTENCE_CA_FILE: caFile,
    }) as CloudProbePlan;
    expect(() => new ReadOnlyProbe(plan)).toThrow(
      "REMOTE_AUTHORIZATION_REQUIRED",
    );
  });
  it("SUPL1-005 valid local CA/hostname works; wrong CA and hostname deny safely", async () => {
    for (const ssl of [
      verifiedTls(
        readFileSync(process.env.CONNECTION_TEST_WRONG_CA_FILE!, "utf8"),
        "localhost",
      ),
      verifiedTls(ca, "wrong.invalid"),
    ]) {
      const probe = new L1Diagnostic(
        { ...options, ssl },
        "atlas_l1_readonly",
        [],
      );
      try {
        expect(await probe.check()).toMatchObject({
          ready: false,
          status: 503,
          code: "DB_UNAVAILABLE",
        });
      } finally {
        await probe.close();
      }
    }
  });
  it("SUPL1-007/013 strict SELECT catalog allowlist, TLS and role proof, no credential output", async () => {
    const probe = diagnostic();
    try {
      const result = await probe.check();
      console.log("LOCAL_ONLY", JSON.stringify(result));
      expect(result).toMatchObject({
        ready: true,
        status: 200,
        code: "READONLY_PROVEN",
        queries: ["server", "role", "schemas", "exposure", "ping"],
      });
      for (const sql of Object.values(l1Queries))
        expect(sql.trim()).toMatch(/^SELECT /);
      expect(JSON.stringify(result)).not.toMatch(
        /LOCAL_TEST_VALUE|postgresql|atlas_l1_readonly/,
      );
    } finally {
      await probe.close();
    }
  });
  it("SUPL1-008/009 admin and wrong actual role denied before application reads", async () => {
    for (const user of ["atlas_spike", "missing_role"]) {
      const probe = new L1Diagnostic({ ...options, user }, user, []);
      try {
        expect((await probe.check()).ready).toBe(false);
      } finally {
        await probe.close();
      }
    }
  });
  it.each([
    [
      "DML",
      "GRANT UPDATE ON identity.empty_fixture TO atlas_l1_readonly",
      "REVOKE UPDATE ON identity.empty_fixture FROM atlas_l1_readonly",
    ],
    [
      "column",
      "GRANT UPDATE(value) ON identity.empty_fixture TO atlas_l1_readonly",
      "REVOKE UPDATE(value) ON identity.empty_fixture FROM atlas_l1_readonly",
    ],
    [
      "PUBLIC DML",
      "GRANT INSERT ON identity.empty_fixture TO PUBLIC",
      "REVOKE INSERT ON identity.empty_fixture FROM PUBLIC",
    ],
    [
      "sequence",
      "GRANT USAGE ON identity.empty_sequence TO atlas_l1_readonly",
      "REVOKE USAGE ON identity.empty_sequence FROM atlas_l1_readonly",
    ],
    [
      "CREATE schema",
      "GRANT CREATE ON SCHEMA identity TO atlas_l1_readonly",
      "REVOKE CREATE ON SCHEMA identity FROM atlas_l1_readonly",
    ],
    [
      "CREATE db",
      "GRANT CREATE ON DATABASE atlas_spike_f0404 TO atlas_l1_readonly",
      "REVOKE CREATE ON DATABASE atlas_spike_f0404 FROM atlas_l1_readonly",
    ],
    [
      "membership",
      "GRANT atlas_spike TO atlas_l1_readonly",
      "REVOKE atlas_spike FROM atlas_l1_readonly",
    ],
    [
      "superuser",
      "ALTER ROLE atlas_l1_readonly SUPERUSER",
      "ALTER ROLE atlas_l1_readonly NOSUPERUSER",
    ],
    [
      "bypassrls",
      "ALTER ROLE atlas_l1_readonly BYPASSRLS",
      "ALTER ROLE atlas_l1_readonly NOBYPASSRLS",
    ],
    [
      "createdb",
      "ALTER ROLE atlas_l1_readonly CREATEDB",
      "ALTER ROLE atlas_l1_readonly NOCREATEDB",
    ],
    [
      "createrole",
      "ALTER ROLE atlas_l1_readonly CREATEROLE",
      "ALTER ROLE atlas_l1_readonly NOCREATEROLE",
    ],
    [
      "parameter",
      "GRANT SET ON PARAMETER session_replication_role TO atlas_l1_readonly",
      "REVOKE SET ON PARAMETER session_replication_role FROM atlas_l1_readonly",
    ],
    [
      "owner",
      "ALTER TABLE identity.empty_fixture OWNER TO atlas_l1_readonly",
      "ALTER TABLE identity.empty_fixture OWNER TO atlas_spike; GRANT SELECT ON identity.empty_fixture TO atlas_l1_readonly",
    ],
    [
      "default grants",
      "ALTER DEFAULT PRIVILEGES GRANT INSERT ON TABLES TO atlas_l1_readonly",
      "ALTER DEFAULT PRIVILEGES REVOKE INSERT ON TABLES FROM atlas_l1_readonly",
    ],
    [
      "function",
      "GRANT EXECUTE ON FUNCTION pg_catalog.pg_notify(text,text) TO atlas_l1_readonly",
      "REVOKE EXECUTE ON FUNCTION pg_catalog.pg_notify(text,text) FROM atlas_l1_readonly",
    ],
    [
      "role defaults",
      "ALTER ROLE atlas_l1_readonly SET default_transaction_read_only=off",
      "ALTER ROLE atlas_l1_readonly SET default_transaction_read_only=on",
    ],
  ])(
    "SUPL1-008/009 unsafe %s stops then safe role recovers",
    async (_name, grant, revoke) => {
      const probe = diagnostic();
      await admin.query(grant);
      try {
        expect(await probe.check()).toMatchObject({
          ready: false,
          status: 503,
          code: "ROLE_UNSAFE",
          queries: ["server", "role"],
        });
      } finally {
        await admin.query(revoke);
      }
      try {
        expect((await probe.check()).ready).toBe(true);
      } finally {
        await probe.close();
      }
    },
  );
  it("SUPL1-010 identity PUBLIC grant blocks; no settings inferred from absence", async () => {
    await admin.query("GRANT SELECT ON identity.empty_fixture TO PUBLIC");
    const probe = diagnostic();
    try {
      expect(await probe.check()).toMatchObject({
        ready: false,
        code: "DATA_API_UNVERIFIED",
      });
    } finally {
      await admin.query("REVOKE SELECT ON identity.empty_fixture FROM PUBLIC");
      await probe.close();
    }
  });
  it("SUPL1-008 local grants deny real DML/DDL even after readonly session setting is disabled", async () => {
    const pool = new pg.Pool(options);
    const client = await pool.connect();
    try {
      await client.query("SET default_transaction_read_only=off");
      expect(
        (await client.query("SELECT count(*) FROM identity.empty_fixture"))
          .rows,
      ).toEqual([{ count: "0" }]);
      for (const sql of [
        "INSERT INTO identity.empty_fixture VALUES (1,1)",
        "UPDATE identity.empty_fixture SET value=1",
        "DELETE FROM identity.empty_fixture",
        "CREATE TABLE identity.denied(id integer)",
        "SELECT nextval('identity.empty_sequence')",
        "SET ROLE atlas_spike",
      ]) {
        await expect(client.query(sql)).rejects.toMatchObject({
          code: "42501",
        });
      }
    } finally {
      client.release(true);
      await pool.end();
    }
  });
  it("SUPL1-006/011/012 catalog query timeout, destroyed connection, recovery and close", async () => {
    // Lock catalog table locally, blocking the allowlisted metadata query.
    const control = await admin.connect();
    const probe = diagnostic();
    await control.query("BEGIN");
    await control.query(
      "LOCK TABLE pg_catalog.pg_namespace IN ACCESS EXCLUSIVE MODE",
    );
    try {
      const timeout = await probe.check();
      console.log("LOCAL_TIMEOUT", JSON.stringify(timeout));
      expect(timeout).toMatchObject({
        ready: false,
        status: 503,
        code: "DB_UNAVAILABLE",
      });
    } finally {
      await control.query("ROLLBACK");
      control.release();
    }
    expect((await probe.check()).ready).toBe(true);
    await probe.close();
    expect((await probe.check()).ready).toBe(false);
  });
});
