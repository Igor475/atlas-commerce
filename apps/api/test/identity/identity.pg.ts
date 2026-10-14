import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { fixture, Browser, origin, password } from "./harness.js";
import { PrismaIdentityRepository } from "../../src/modules/identity/infrastructure/identity-database.js";
import { IdentityRuntime } from "../../src/modules/identity/identity-runtime.js";
import { NodeIdentityCrypto } from "../../src/modules/identity/infrastructure/identity-crypto.js";
import type { IdentityRequest } from "../../src/modules/identity/presentation/identity-http.js";
import {
  cookie,
  names,
  metadata,
} from "../../src/modules/identity/presentation/identity-http.js";

describe("ID-01 real HTTP + independent PostgreSQL connections", () => {
  let f: Awaited<ReturnType<typeof fixture>>;
  beforeAll(async () => {
    f = await fixture();
  });
  beforeEach(async () => {
    await f.reset();
  });
  afterAll(async () => {
    await f?.close();
  });
  async function logged() {
    const browser = await f.active();
    expect((await f.login(browser)).status).toBe(200);
    return browser;
  }
  async function accountId() {
    return String(
      (
        await f.control.query(
          "SELECT id FROM identity.customer_account LIMIT 1",
        )
      ).rows[0]?.id,
    );
  }

  it("ID-002/003: isolated migration, runtime least privilege, no spike schema", async () => {
    expect(
      Number(
        (
          await f.control.query(
            "SELECT count(*) AS n FROM identity._prisma_migrations WHERE finished_at IS NOT NULL",
          )
        ).rows[0]?.n,
      ),
    ).toBe(1);
    expect(
      (
        await f.control.query(
          "SELECT 1 FROM pg_namespace WHERE nspname='spike'",
        )
      ).rowCount,
    ).toBe(0);
    expect(await f.a.ready()).toBe(true);
    const pidA = await f.a.database.$queryRawUnsafe<{ pid: number }[]>(
      "SELECT pg_backend_pid() AS pid",
    );
    const pidB = await f.b.database.$queryRawUnsafe<{ pid: number }[]>(
      "SELECT pg_backend_pid() AS pid",
    );
    expect(pidA[0]?.pid).not.toBe(pidB[0]?.pid);
    await expect(
      f.a.database.$executeRawUnsafe("CREATE TABLE identity.forbidden(id int)"),
    ).rejects.toThrow();
    await expect(
      f.a.database.$queryRawUnsafe("SELECT * FROM identity._prisma_migrations"),
    ).rejects.toThrow();
    console.info(
      "ID-002 PostgreSQL " +
        String(
          (await f.control.query("SHOW server_version")).rows[0]
            ?.server_version,
        ) +
        "; Node " +
        process.version,
    );
  });
  it("ID-004/006: registration pending, Argon2id only, encrypted outbox and no token HTTP", async () => {
    const browser = new Browser(f.appA);
    await browser.bootstrap();
    const result = await browser.call("post", "/auth/register", {
      email: "pending@example.invalid",
      password,
    });
    expect(result.status).toBe(202);
    expect(result.body).toEqual({ state: "ACCEPTED" });
    expect(result.headers["set-cookie"]).toBeUndefined();
    const row = (
      await f.control.query(
        "SELECT a.status,c.hash,o.payload FROM identity.customer_account a JOIN identity.password_credential c ON c.account_id=a.id CROSS JOIN identity.email_outbox o LIMIT 1",
      )
    ).rows[0];
    expect(row?.status).toBe("PENDING_VERIFICATION");
    expect(String(row?.hash).startsWith("$argon2id$")).toBe(true);
    const token = f.mail.token("pending@example.invalid", "VERIFY_EMAIL");
    expect(
      String(row?.payload).includes(token) ||
        String(row?.hash).includes(password),
    ).toBe(false);
    expect(JSON.stringify(result.body).includes(token)).toBe(false);
  });
  it("ID-005: duplicate registration concurrent, neutral and unique without password replacement", async () => {
    const a = new Browser(f.appA),
      b = new Browser(f.appB);
    await a.bootstrap();
    await b.bootstrap();
    const results = await Promise.all([
      a.call("post", "/auth/register", {
        email: "same@example.invalid",
        password,
      }),
      b.call("post", "/auth/register", {
        email: " SAME@EXAMPLE.INVALID ",
        password,
      }),
    ]);
    expect(results.map((x) => x.status)).toEqual([202, 202]);
    expect(results[0]?.body).toEqual(results[1]?.body);
    expect(
      Number(
        (
          await f.control.query(
            "SELECT count(*) AS n FROM identity.customer_account",
          )
        ).rows[0]?.n,
      ),
    ).toBe(1);
    expect(
      Number(
        (
          await f.control.query(
            "SELECT count(*) AS n FROM identity.account_token",
          )
        ).rows[0]?.n,
      ),
    ).toBe(1);
  });
  it("ID-008/009: one-time verification with two observed independent DB lock waiters", async () => {
    const a = new Browser(f.appA),
      b = new Browser(f.appB);
    await a.bootstrap();
    await b.bootstrap();
    expect(
      (
        await a.call("post", "/auth/register", {
          email: "verify@example.invalid",
          password,
        })
      ).status,
    ).toBe(202);
    const token = f.mail.token("verify@example.invalid", "VERIFY_EMAIL");
    const results = await f.race(
      await accountId(),
      () =>
        a.call("post", "/auth/verify-email", { token }).then((x) => x.status),
      () =>
        b.call("post", "/auth/verify-email", { token }).then((x) => x.status),
    );
    expect(results.sort()).toEqual([204, 400]);
    expect((await a.call("post", "/auth/verify-email", { token })).status).toBe(
      400,
    );
    expect(
      (await f.control.query("SELECT status FROM identity.customer_account"))
        .rows[0]?.status,
    ).toBe("ACTIVE");
    expect(
      Number(
        (
          await f.control.query(
            "SELECT count(*) AS n FROM identity.auth_security_event WHERE action='EMAIL_VERIFIED'",
          )
        ).rows[0]?.n,
      ),
    ).toBe(1);
  });
  it("ID-010: purpose, malformed, expired and invalidated tokens fail closed", async () => {
    const browser = new Browser(f.appA);
    await browser.bootstrap();
    await browser.call("post", "/auth/register", {
      email: "token@example.invalid",
      password,
    });
    const token = f.mail.token("token@example.invalid", "VERIFY_EMAIL");
    expect(
      (
        await browser.call("post", "/auth/recovery/complete", {
          token,
          password,
        })
      ).status,
    ).toBe(400);
    await f.control.query(
      "UPDATE identity.account_token SET created_at=clock_timestamp()-interval '1 hour',expires_at=clock_timestamp()-interval '1 second'",
    );
    expect(
      (await browser.call("post", "/auth/verify-email", { token })).status,
    ).toBe(400);
    expect(
      (await browser.call("post", "/auth/verify-email", { token: "invalid" }))
        .status,
    ).toBe(400);
    expect(
      (
        await browser.call("post", "/auth/verify-email", {
          token: randomBytes(32).toString("base64url"),
        })
      ).status,
    ).toBe(400);
  });
  it("ID-011: pending, suspended, disabled, missing and wrong-password are generic 401", async () => {
    const browser = await f.active();
    const expected = [];
    for (const state of [
      "PENDING_VERIFICATION",
      "SUSPENDED",
      "DISABLED",
      "ACTIVE",
    ]) {
      await f.control.query("UPDATE identity.customer_account SET status=$1", [
        state,
      ]);
      const response = await browser.call("post", "/auth/login", {
        email: "customer@example.invalid",
        password: state === "ACTIVE" ? "Senha incorreta" : password,
        context: "CUSTOMER",
      });
      expected.push(response);
    }
    expected.push(
      await browser.call("post", "/auth/login", {
        email: "missing@example.invalid",
        password,
        context: "CUSTOMER",
      }),
    );
    expect(
      expected.every(
        (r) =>
          r.status === 401 &&
          r.body.code === "UNAUTHENTICATED" &&
          !r.headers["set-cookie"],
      ),
    ).toBe(true);
  });
  it("ID-012/013/036: opaque cookie, fresh login identity and hash-only persistence", async () => {
    const browser = await logged(),
      old = browser.cookies.get("atlas_identity_local")!;
    const first = (
      await f.control.query("SELECT token_hash FROM identity.auth_session")
    ).rows[0]?.token_hash;
    expect(old.length).toBe(43);
    expect(first).not.toBe(old);
    expect(first).toBe(f.runtimeA.crypto.digest("session", old));
    const result = await f.login(browser);
    const header = String(
      (result.headers["set-cookie"] as unknown as string[])[0],
    );
    expect(
      header.includes("HttpOnly") &&
        header.includes("Path=/") &&
        header.includes("SameSite=Strict"),
    ).toBe(true);
    expect(
      header.includes("Domain=") ||
        JSON.stringify(result.body).includes(
          browser.cookies.get("atlas_identity_local")!,
        ),
    ).toBe(false);
    expect(browser.cookies.get("atlas_identity_local")).not.toBe(old);
    const stolen = new Browser(f.appB);
    stolen.cookies.set("atlas_identity_local", old);
    expect((await stolen.call("get", "/me")).status).toBe(401);
  });
  it("ID-014/016: persisted logout is idempotent and copied cookie never authenticates again", async () => {
    const browser = await logged(),
      copied = browser.header();
    const logout = await browser.call("post", "/auth/logout", {});
    expect(logout.status).toBe(204);
    expect((await browser.call("post", "/auth/logout", {})).status).toBe(204);
    expect(
      (
        await request(f.appB.getHttpServer())
          .get("/api/v1/me")
          .set("Origin", origin)
          .set("Cookie", copied)
      ).status,
    ).toBe(401);
    expect(
      (
        await f.control.query(
          "SELECT revoked_at IS NOT NULL AS revoked FROM identity.auth_session",
        )
      ).rows[0]?.revoked,
    ).toBe(true);
  });
  it("ID-015: absolute and idle expiry use DB time, never client-clock renewal", async () => {
    const browser = await logged();
    await f.control.query(
      "UPDATE identity.auth_session SET created_at=clock_timestamp()-interval '13 hours', expires_at=clock_timestamp()-interval '1 second'",
    );
    expect((await browser.call("get", "/me")).status).toBe(401);
    await f.login(browser);
    await f.control.query(
      "UPDATE identity.auth_session SET created_at=clock_timestamp()-interval '1 hour',last_seen_at=clock_timestamp()-interval '31 minutes' WHERE revoked_at IS NULL",
    );
    expect((await browser.call("get", "/me")).status).toBe(401);
  });
  it("ID-017: logout-all revokes two independent devices", async () => {
    const a = await logged(),
      b = new Browser(f.appB);
    await b.bootstrap();
    await f.login(b);
    expect((await a.call("post", "/auth/logout-all", {})).status).toBe(204);
    expect((await a.call("get", "/me")).status).toBe(401);
    expect((await b.call("get", "/me")).status).toBe(401);
    expect(
      Number(
        (
          await f.control.query(
            "SELECT count(*) AS n FROM identity.auth_session WHERE revoked_at IS NULL",
          )
        ).rows[0]?.n,
      ),
    ).toBe(0);
  });
  it("ID-018/019/025: staff context and privileged endpoints always denied", async () => {
    const browser = await logged();
    const denied = await browser.call("post", "/auth/login", {
      email: "customer@example.invalid",
      password,
      context: "STAFF",
    });
    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe("FORBIDDEN");
    expect(denied.headers["set-cookie"]).toBeUndefined();
    const admin = await request(f.appA.getHttpServer())
      .post("/api/v1/admin/refund-requests")
      .set("Cookie", browser.header())
      .send({});
    expect(admin.status).not.toBeLessThan(400);
    expect(
      Number(
        (
          await f.control.query(
            "SELECT count(*) AS n FROM identity.auth_session WHERE session_class<>'CUSTOMER'",
          )
        ).rows[0]?.n,
      ),
    ).toBe(0);
  });
  it("ID-020/021: CSRF pre-auth, session binding, Origin/Referer/content type and CORS", async () => {
    const browser = await f.active(),
      beforeLogin = browser.csrf;
    const login = await browser.call("post", "/auth/login", {
      email: "customer@example.invalid",
      password,
      context: "CUSTOMER",
    });
    browser.absorb(login);
    expect((await browser.call("post", "/auth/logout", {})).status).toBe(403);
    await browser.bootstrap();
    expect(browser.csrf).not.toBe(beforeLogin);
    expect(
      (await browser.call("post", "/auth/logout", {}).set("X-CSRF-Token", ""))
        .status,
    ).toBe(403);
    expect(
      (
        await browser
          .call("post", "/auth/logout", {})
          .set("Origin", "https://malicious.invalid")
      ).status,
    ).toBe(403);
    expect(
      (
        await browser
          .call("post", "/auth/logout", {})
          .set("Referer", "https://malicious.invalid/")
      ).status,
    ).toBe(403);
    expect(
      (
        await request(f.appA.getHttpServer())
          .post("/api/v1/auth/logout")
          .set("Origin", origin)
          .set("Cookie", browser.header())
          .set("X-CSRF-Token", browser.csrf)
          .set("Content-Type", "text/plain")
          .send("not-json")
      ).status,
    ).toBe(400);
    const me = await browser.call("get", "/me");
    expect(me.status).toBe(200);
    expect(me.headers["access-control-allow-origin"]).toBeUndefined();
  });
  it("ID-022: recovery/resend do not enumerate existing or missing accounts", async () => {
    const browser = await f.active();
    const responses = [];
    for (const route of ["/auth/recovery/request", "/auth/verify-email/resend"])
      for (const email of [
        "customer@example.invalid",
        "unknown@example.invalid",
      ]) {
        const started = performance.now();
        responses.push(await browser.call("post", route, { email }));
        expect(performance.now() - started).toBeGreaterThanOrEqual(110);
      }
    expect(
      responses.every(
        (x) =>
          x.status === 202 &&
          JSON.stringify(x.body) === JSON.stringify({ state: "ACCEPTED" }),
      ),
    ).toBe(true);
  });
  it("ID-023/024: concurrent recovery consumes once, changes hash, revokes both sessions", async () => {
    const a = await logged(),
      b = new Browser(f.appB);
    await b.bootstrap();
    await f.login(b);
    await a.call("post", "/auth/recovery/request", {
      email: "customer@example.invalid",
    });
    const token = f.mail.token("customer@example.invalid", "RESET_PASSWORD");
    const replacement = "Outra frase exclusiva para recuperar 739!";
    const results = await f.race(
      await accountId(),
      () =>
        a
          .call("post", "/auth/recovery/complete", {
            token,
            password: replacement,
          })
          .then((x) => x.status),
      () =>
        b
          .call("post", "/auth/recovery/complete", {
            token,
            password: replacement,
          })
          .then((x) => x.status),
    );
    expect(results.sort()).toEqual([204, 400]);
    expect((await a.call("get", "/me")).status).toBe(401);
    expect((await b.call("get", "/me")).status).toBe(401);
    const clean = new Browser(f.appA);
    await clean.bootstrap();
    expect(
      (
        await clean.call("post", "/auth/login", {
          email: "customer@example.invalid",
          password,
          context: "CUSTOMER",
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await clean.call("post", "/auth/login", {
          email: "customer@example.invalid",
          password: replacement,
          context: "CUSTOMER",
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await f.control.query(
          "SELECT version FROM identity.password_credential",
        )
      ).rows[0]?.version,
    ).toBe(2);
  });
  it("ID-026: concurrent persistent abuse counters survive fresh client lifecycle", async () => {
    const key = f.runtimeA.crypto.digest("abuse-test", "shared-identity");
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        (i % 2 ? f.a : f.b).limit(key, 900, 5),
      ),
    );
    expect(results.filter((x) => x === undefined).length).toBe(5);
    expect(results.filter((x) => x !== undefined).length).toBe(7);
    await f.a.close();
    const fresh = new PrismaIdentityRepository("atlas-id01-cold");
    try {
      expect(await fresh.limit(key, 900, 5)).toBeGreaterThan(0);
    } finally {
      await fresh.close();
    }
    const cold = await new Promise<{ status: number | null; stdout: string }>(
      (resolve, reject) => {
        const child = spawn(
          process.execPath,
          [
            fileURLToPath(
              new URL("../../scripts/identity-process.mjs", import.meta.url),
            ),
          ],
          {
            env: { ...process.env, IDENTITY_DISPOSABLE: "1", NODE_ENV: "test" },
            stdio: ["pipe", "pipe", "pipe"],
          },
        );
        let stdout = "";
        const timeout = setTimeout(() => {
          child.kill();
          reject(new Error("TEST_COLD_PROCESS_TIMEOUT"));
        }, 15000);
        child.stdout.setEncoding("utf8");
        child.stdout.on("data", (chunk) => {
          stdout += chunk;
        });
        child.stderr.resume(); // Never print process diagnostics that could expose DB details.
        child.once("error", () => {
          clearTimeout(timeout);
          reject(new Error("TEST_COLD_PROCESS_UNAVAILABLE"));
        });
        child.once("close", (status) => {
          clearTimeout(timeout);
          resolve({ status, stdout });
        });
        child.stdin.end(JSON.stringify({ key }));
      },
    );
    expect(cold.status).toBe(0);
    expect(JSON.parse(cold.stdout).limited).toBe(true);
    expect(
      Number(
        (
          await f.control.query(
            "SELECT hits FROM identity.auth_abuse_window WHERE key=$1",
            [key],
          )
        ).rows[0]?.hits,
      ),
    ).toBe(6);
  });
  it("ID-027: untrusted forwarding/admin origin and forged request ID do not confer authority", async () => {
    const browser = await logged();
    expect(
      (await browser.call("get", "/me").set("X-Forwarded-For", "127.0.0.1"))
        .status,
    ).toBe(403);
    expect(
      (await browser.call("get", "/me").set("Origin", "http://127.0.0.1:3001"))
        .status,
    ).toBe(403);
    const fail = await browser
      .call("post", "/auth/logout", {})
      .set("X-CSRF-Token", "bad")
      .set("X-Request-Id", "forged-pii-value");
    expect(fail.body.requestId).not.toBe("forged-pii-value");
  });
  it("ID-028/030: /me only own minimal identity, no cache or secret in RFC9457", async () => {
    const browser = await logged(),
      me = await browser.call("get", "/me");
    expect(me.status).toBe(200);
    expect(Object.keys(me.body).sort()).toEqual([
      "email",
      "id",
      "sessionClass",
    ]);
    expect(me.body.sessionClass).toBe("CUSTOMER");
    expect(me.headers["cache-control"]).toBe("no-store");
    const other = new Browser(f.appB);
    expect((await other.call("get", "/me")).status).toBe(401);
    const error = await browser.call("post", "/auth/login", {
      email: "customer@example.invalid",
      password: "wrong",
      context: "CUSTOMER",
    });
    expect(
      String(error.headers["content-type"]).includes(
        "application/problem+json",
      ),
    ).toBe(true);
    const serialized = JSON.stringify(error.body);
    expect(
      serialized.includes("customer@example.invalid") ||
        serialized.includes("wrong") ||
        serialized.includes(browser.cookies.get("atlas_identity_local")!),
    ).toBe(false);
  });
  it("ID-029: role/status mass assignment, oversized and malformed JSON rejected", async () => {
    const browser = new Browser(f.appA);
    await browser.bootstrap();
    for (const extra of [
      { role: "ADMIN" },
      { isAdmin: true },
      { status: "ACTIVE" },
    ])
      expect(
        (
          await browser.call("post", "/auth/register", {
            email: "extra@example.invalid",
            password,
            ...extra,
          })
        ).status,
      ).toBe(400);
    const oversized = await browser.call("post", "/auth/register", {
      email: "extra@example.invalid",
      password: "a".repeat(6000),
    });
    expect(oversized.status).toBe(400);
    const malformed = await request(f.appA.getHttpServer())
      .post("/api/v1/auth/register")
      .set("Content-Type", "application/json")
      .send("{bad");
    expect(malformed.status).toBe(400);
    expect(malformed.body.code).toBe("INVALID_REQUEST");
    expect(
      Number(
        (
          await f.control.query(
            "SELECT count(*) AS n FROM identity.customer_account",
          )
        ).rows[0]?.n,
      ),
    ).toBe(0);
  });
  it("ID-031: real DB access loss cannot authenticate; liveness independent, recovery honest", async () => {
    const browser = await logged();
    await f.a.close();
    await f.b.close();
    await f.control.query("ALTER ROLE atlas_identity_runtime NOLOGIN");
    const response = await browser.call("get", "/me");
    expect(response.status).toBe(503);
    expect(response.body.code).toBe("DEPENDENCY_UNAVAILABLE");
    expect(
      (await request(f.appA.getHttpServer()).get("/health/live")).status,
    ).toBe(200);
    expect(
      (await request(f.appA.getHttpServer()).get("/health/ready")).status,
    ).toBe(503);
    await f.control.query("ALTER ROLE atlas_identity_runtime LOGIN");
    await f.a.close();
    expect((await browser.call("get", "/me")).status).toBe(200);
    expect(
      (await request(f.appA.getHttpServer()).get("/health/ready")).status,
    ).toBe(200);
  });
  it("ID-032/033: failed email persists pending, retry reuses intent/token, no false delivery", async () => {
    const browser = new Browser(f.appA);
    await browser.bootstrap();
    f.mail.fail = true;
    const response = await browser.call("post", "/auth/register", {
      email: "mail@example.invalid",
      password,
    });
    expect(response.status).toBe(202);
    expect(response.body).toEqual({ state: "ACCEPTED" });
    expect(f.mail.messages.size).toBe(0);
    expect(
      (await f.control.query("SELECT status FROM identity.email_outbox"))
        .rows[0]?.status,
    ).toBe("PENDING");
    f.mail.fail = false;
    await f.control.query(
      "UPDATE identity.email_outbox SET lease_until=clock_timestamp()-interval '1 second'",
    );
    await f.runtimeA.service().deliverPending();
    const token = f.mail.token("mail@example.invalid", "VERIFY_EMAIL");
    await browser.call("post", "/auth/verify-email/resend", {
      email: "mail@example.invalid",
    });
    expect(f.mail.token("mail@example.invalid", "VERIFY_EMAIL")).toBe(token);
    expect(
      Number(
        (
          await f.control.query(
            "SELECT count(*) AS n FROM identity.account_token",
          )
        ).rows[0]?.n,
      ),
    ).toBe(1);
    expect(
      (await f.control.query("SELECT status FROM identity.customer_account"))
        .rows[0]?.status,
    ).toBe("PENDING_VERIFICATION");
    await f.control.query(
      "UPDATE identity.account_token SET created_at=clock_timestamp()-interval '61 seconds'",
    );
    await browser.call("post", "/auth/verify-email/resend", {
      email: "mail@example.invalid",
    });
    const replacementToken = f.mail.token(
      "mail@example.invalid",
      "VERIFY_EMAIL",
    );
    expect(replacementToken === token).toBe(false);
    expect(
      (await browser.call("post", "/auth/verify-email", { token })).status,
    ).toBe(400);
    expect(
      (
        await browser.call("post", "/auth/verify-email", {
          token: replacementToken,
        })
      ).status,
    ).toBe(204);
    const absent = new IdentityRuntime(f.config, undefined, f.b);
    expect(() => absent.service()).toThrow("DEPENDENCY_UNAVAILABLE");
    expect(await absent.ready()).toBe(false);
  });
  it("ID-033: expired outbox lease cannot acknowledge a newer worker attempt", async () => {
    const browser = new Browser(f.appA);
    await browser.bootstrap();
    f.mail.fail = true;
    await browser.call("post", "/auth/register", {
      email: "lease@example.invalid",
      password,
    });
    await f.control.query(
      "UPDATE identity.email_outbox SET lease_until=clock_timestamp()-interval '1 second'",
    );
    const first = await f.a.claimMail();
    expect(first).toBeDefined();
    await f.control.query(
      "UPDATE identity.email_outbox SET lease_until=clock_timestamp()-interval '1 second'",
    );
    const second = await f.b.claimMail();
    expect(second?.id).toBe(first?.id);
    expect(second?.attempts).toBe(first!.attempts + 1);
    await f.a.finishMail(first!.id, true, first!.attempts);
    expect(
      (await f.control.query("SELECT status FROM identity.email_outbox"))
        .rows[0]?.status,
    ).toBe("PROCESSING");
    await f.b.finishMail(second!.id, false, second!.attempts);
    expect(
      (await f.control.query("SELECT status FROM identity.email_outbox"))
        .rows[0]?.status,
    ).toBe("PENDING");
  });
  it("ID-012/036: secure candidate cookie contract, never Domain or dual session names", () => {
    const secure = new IdentityRuntime({ ...f.config, secureCookie: true });
    const pair = names(secure),
      value = cookie(
        secure,
        pair.session,
        new NodeIdentityCrypto(randomBytes(32)).random(),
        43200,
      );
    expect(pair.session).toBe("__Host-atlas_session");
    expect(
      value.includes("; Secure") &&
        value.includes("; HttpOnly") &&
        value.includes("; Path=/"),
    ).toBe(true);
    expect(
      value.includes("Domain=") || value.includes("atlas_identity_local"),
    ).toBe(false);
    expect(() =>
      metadata(f.runtimeA, {
        headers: { origin },
        rawHeaders: ["Origin", origin, "Origin", origin],
        socket: { remoteAddress: "127.0.0.1" },
      } as unknown as IdentityRequest),
    ).toThrow("INVALID_REQUEST");
  });
});
