import "reflect-metadata";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setTimeout as pause } from "node:timers/promises";
import pg from "pg";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import {
  readProbeConfig,
  type CloudProbePlan,
} from "../../src/infrastructure/persistence/probe-config.js";
import {
  ReadOnlyProbe,
  DB_READINESS,
} from "../../src/infrastructure/persistence/probe-readiness.js";
import {
  cloudDriverOptions,
  prepareCloudPrismaAdapter,
  verifiedTls,
} from "../../src/infrastructure/persistence/probe-driver.js";
if (process.env.CONNECTION_LOCAL_TEST !== "1")
  throw new Error("Explicit isolated connection runner required");
const local = {
  profile: "local-disposable",
  poolMax: 2,
  role: "atlas_probe_readonly",
} as const;
const connection = {
  host: "127.0.0.1",
  port: 55434,
  database: "atlas_spike_f0404",
  user: "atlas_probe_readonly",
  password: () => "",
  connectionTimeoutMillis: 500,
  query_timeout: 2000,
};
const admin = new pg.Pool({
  ...connection,
  user: "atlas_spike",
  application_name: "supcon-control",
});
admin.on("error", () => {}); // Expected idle-client errors during the explicit DB restart.
const ca = readFileSync(process.env.CONNECTION_TEST_CA_FILE!, "utf8");
const wrongCa = readFileSync(
  process.env.CONNECTION_TEST_WRONG_CA_FILE!,
  "utf8",
);
const cloudEnv: NodeJS.ProcessEnv = {
  PERSISTENCE_ENABLED: "true",
  PERSISTENCE_PROFILE: "cloud-readonly",
  PERSISTENCE_ENDPOINT_SOURCE: "dashboard-connect",
  PERSISTENCE_TLS: "verify-full",
  PERSISTENCE_TRANSPORT: "session-ipv4",
  PERSISTENCE_EXPECTED_HOST: "fixture.pooler.supabase.com",
  PERSISTENCE_EXPECTED_ROLE: "atlas_probe_readonly",
  PERSISTENCE_TEST_PROJECT: "fixtureproject",
  PERSISTENCE_PROBE_URL:
    "postgresql://atlas_probe_readonly.fixtureproject:fixture-password@fixture.pooler.supabase.com:5432/postgres",
  PERSISTENCE_CA_FILE: process.env.CONNECTION_TEST_CA_FILE!,
};
const repo = fileURLToPath(new URL("../../../../", import.meta.url));
function compose(...args: string[]) {
  execFileSync(
    "docker",
    [
      "compose",
      "-p",
      "atlas-f0404-spike-f0405",
      "-f",
      "apps/api/compose.spike.yml",
      ...args,
    ],
    { cwd: repo, stdio: "ignore", timeout: 30000 },
  );
}
async function until(check: () => Promise<boolean>) {
  const deadline = performance.now() + 3000;
  do {
    if (await check()) return;
    await pause(20);
  } while (performance.now() < deadline);
  throw new Error("Local recovery deadline exceeded");
}
const catalog = async () =>
  (
    await admin.query(
      "SELECT n.nspname,c.relname,c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('spike','probe_fixture') ORDER BY 1,2,3",
    )
  ).rows;
describe("F04-05 L0 real local PostgreSQL/TLS/read-only", () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    await admin.end();
  });
  it("SUPCON-04/05/06 valid cloud plan is pure, isolated and fail-closed", () => {
    const plan = readProbeConfig(cloudEnv) as CloudProbePlan;
    const options = cloudDriverOptions(plan);
    expect(options.port).toBe(5432);
    expect(options).not.toHaveProperty("connectionString");
    expect(options.ssl).toMatchObject({
      rejectUnauthorized: true,
      servername: plan.host,
      minVersion: "TLSv1.2",
    });
    expect(prepareCloudPrismaAdapter(plan).provider).toBe("postgres");
    expect(() => new ReadOnlyProbe(plan)).toThrow(
      "REMOTE_AUTHORIZATION_REQUIRED",
    );
    for (const patch of [
      { PERSISTENCE_TLS: "disable" },
      { PERSISTENCE_TLS: "require" },
      { PERSISTENCE_EXPECTED_ROLE: "postgres" },
      { PERSISTENCE_EXPECTED_HOST: "other.pooler.supabase.com" },
      {
        PERSISTENCE_PROBE_URL: cloudEnv.PERSISTENCE_PROBE_URL!.replace(
          ":5432",
          ":6543",
        ),
      },
      {
        PERSISTENCE_PROBE_URL:
          cloudEnv.PERSISTENCE_PROBE_URL + "?sslmode=require",
      },
      { PERSISTENCE_TRANSPORT: "direct-ipv6" },
      { SPIKE_DATABASE_URL: "never-inherit" },
      { CI: "true" },
    ])
      expect(() => readProbeConfig({ ...cloudEnv, ...patch })).toThrow();
    console.log(
      "SUPCON-04/05/06 cloud preparation: no sockets, no URL parameter override, no automatic remote activation",
    );
  });
  it("SUPCON-06 actual TLS validates CA chain and hostname against local PostgreSQL", async () => {
    const good = new pg.Pool({
      ...connection,
      host: "localhost",
      ssl: verifiedTls(ca, "localhost"),
    });
    try {
      const result = await good.query(
        "SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()",
      );
      expect(result.rows).toEqual([{ ssl: true }]);
    } finally {
      await good.end();
    }
    const states: string[] = [];
    for (const ssl of [
      verifiedTls(wrongCa, "localhost"),
      verifiedTls(ca, "wrong-host.invalid"),
    ]) {
      const bad = new pg.Pool({ ...connection, host: "localhost", ssl });
      try {
        await expect(
          bad.query("SELECT 1").catch((error) => {
            states.push(String(error.code));
            throw error;
          }),
        ).rejects.toThrow();
      } finally {
        await bad.end();
      }
    }
    expect(states[1]).toBe("ERR_TLS_CERT_ALTNAME_INVALID");
    console.log("SUPCON-06 TLS negative codes", JSON.stringify(states));
  });
  it("SUPCON-07 pool max=1 saturates with a real checked-out client, finite acquisition and recovery", async () => {
    const pool = new pg.Pool({ ...connection, max: 1 });
    let created = 0;
    const logs: string[] = [];
    const probe = new ReadOnlyProbe(
      { ...local, poolMax: 1 },
      (options) => {
        created++;
        expect(options.max).toBe(1);
        return pool;
      },
      (code) => logs.push(code),
    );
    // Initialize the owned pool, then occupy its single connection.
    expect(await probe.check()).toBe(true);
    const holder = await pool.connect();
    const start = performance.now();
    try {
      expect(await probe.check()).toBe(false);
    } finally {
      holder.release();
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeGreaterThan(100);
    expect(elapsed).toBeLessThan(2500);
    expect(logs).toEqual(["DB_UNAVAILABLE"]);
    expect(await probe.check()).toBe(true);
    expect(created).toBe(1);
    await probe.onApplicationShutdown();
    console.log("SUPCON-07 acquisition failure ms", elapsed);
  });
  it("SUPCON-08 lazy process singleton and shutdown release actual backends", async () => {
    expect(app.get(DB_READINESS)).toBe(app.get(DB_READINESS));
    let created = 0;
    const probe = new ReadOnlyProbe(local, (options) => {
      created++;
      return new pg.Pool({ ...options, application_name: "supcon-shutdown" });
    });
    expect(created).toBe(0);
    const first = probe.check();
    expect(probe.check()).toBe(first);
    expect(await first).toBe(true);
    expect(created).toBe(1);
    await probe.onApplicationShutdown();
    expect(await probe.check()).toBe(false);
    await until(
      async () =>
        Number(
          (
            await admin.query(
              "SELECT count(*) FROM pg_stat_activity WHERE application_name='supcon-shutdown'",
            )
          ).rows[0].count,
        ) === 0,
    );
  });
  it("SUPCON-10 real readiness checks role and connectivity, no sensitive HTTP details", async () => {
    const response = await request(app.getHttpServer()).get("/health/ready");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
    await admin.query(
      "GRANT INSERT ON probe_fixture.marker TO atlas_probe_readonly",
    );
    try {
      const unsafe = await request(app.getHttpServer()).get("/health/ready");
      expect(unsafe.status).toBe(503);
      expect(unsafe.body).toEqual({
        status: "unavailable",
        code: "DEPENDENCY_UNAVAILABLE",
      });
    } finally {
      await admin.query(
        "REVOKE INSERT ON probe_fixture.marker FROM atlas_probe_readonly",
      );
    }
    expect(
      (await request(app.getHttpServer()).get("/health/ready")).status,
    ).toBe(200);
  });
  it("SUPCON-11 DNS/TCP/login failures produce only safe error codes", async () => {
    for (const patch of [
      { host: "nonexistent-atlas-f0405.invalid" },
      { port: 1 },
    ]) {
      const logs: string[] = [];
      const probe = new ReadOnlyProbe(
        local,
        (options) => new pg.Pool({ ...options, ...patch }),
        (code) => logs.push(code),
      );
      expect(await probe.check()).toBe(false);
      expect(logs).toEqual(["DB_UNAVAILABLE"]);
      await probe.onApplicationShutdown();
    }
    const logs: string[] = [];
    const probe = new ReadOnlyProbe(local, undefined, (code) =>
      logs.push(code),
    );
    await admin.query("ALTER ROLE atlas_probe_readonly NOLOGIN");
    try {
      expect(await probe.check()).toBe(false);
      expect(logs).toEqual(["DB_UNAVAILABLE"]);
    } finally {
      await admin.query("ALTER ROLE atlas_probe_readonly LOGIN");
      await probe.onApplicationShutdown();
    }
  });
  it("SUPCON-09/12 DB interruption preserves liveness and recovers readiness without duplicate facts", async () => {
    expect(
      (await request(app.getHttpServer()).get("/health/ready")).status,
    ).toBe(200);
    compose("stop", "postgres");
    try {
      expect(
        (await request(app.getHttpServer()).get("/health/live")).body,
      ).toEqual({ status: "ok" });
      const down = await request(app.getHttpServer()).get("/health/ready");
      expect(down.status).toBe(503);
      expect(down.body).toEqual({
        status: "unavailable",
        code: "DEPENDENCY_UNAVAILABLE",
      });
    } finally {
      compose("up", "-d", "--wait");
    }
    await until(
      async () =>
        (await request(app.getHttpServer()).get("/health/ready")).status ===
        200,
    );
    expect(
      (await admin.query("SELECT count(*) FROM probe_fixture.marker")).rows[0]
        .count,
    ).toBe("1");
    for (let i = 0; i < 2; i++) {
      const output = execFileSync(
        process.execPath,
        ["scripts/connection-child.mjs"],
        {
          cwd: fileURLToPath(new URL("../../", import.meta.url)),
          env: process.env,
          encoding: "utf8",
          timeout: 10000,
        },
      );
      expect(JSON.parse(output.trim())).toEqual({ ready: true });
    }
    console.log(
      "SUPCON-09/12 live=200 during DB outage; ready=503 then 200; two cold processes ready; one fixture fact",
    );
  });
  it("SUPCON-13 application startup changes no catalog and executes no migrations", async () => {
    const before = await catalog();
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const fresh = module.createNestApplication();
    await fresh.init();
    await fresh.close();
    expect(await catalog()).toEqual(before);
  });
  it("SUPCON-14 SELECT works but effective grants reject DML/DDL even after disabling session readonly", async () => {
    const pool = new pg.Pool(connection);
    const client = await pool.connect();
    const codes: string[] = [];
    try {
      expect(
        (
          await client.query(
            "SELECT value FROM probe_fixture.marker WHERE id=1",
          )
        ).rows,
      ).toEqual([{ value: 7 }]);
      await client.query("SET default_transaction_read_only=off");
      for (const sql of [
        "INSERT INTO probe_fixture.marker VALUES (2,8)",
        "UPDATE probe_fixture.marker SET value=8 WHERE id=1",
        "DELETE FROM probe_fixture.marker WHERE id=1",
        "CREATE SCHEMA unauthorized_fixture",
        "CREATE TABLE public.unauthorized_fixture(id integer)",
        "CREATE TEMP TABLE unauthorized_fixture(id integer)",
        "SET ROLE atlas_spike",
      ]) {
        await expect(
          client.query(sql).catch((error) => {
            codes.push(String(error.code));
            throw error;
          }),
        ).rejects.toThrow();
      }
      expect(codes).toEqual(Array(7).fill("42501"));
      expect(
        (
          await client.query(
            "SELECT value FROM probe_fixture.marker WHERE id=1",
          )
        ).rows,
      ).toEqual([{ value: 7 }]);
    } finally {
      client.release();
      await pool.end();
    }
    console.log("SUPCON-14 grants denial SQLSTATE", JSON.stringify(codes));
  });
});
