import { randomBytes } from "node:crypto";
import pg from "pg";
import request, { type Response, type Test as HttpTest } from "supertest";
import { Test } from "@nestjs/testing";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "../../src/app.module.js";
import {
  IdentityRuntime,
  IDENTITY_RUNTIME,
} from "../../src/modules/identity/identity-runtime.js";
import { PrismaIdentityRepository } from "../../src/modules/identity/infrastructure/identity-database.js";
import { readIdentityConfig } from "../../src/modules/identity/infrastructure/identity-config.js";
import { configureIdentityHttp } from "../../src/modules/identity/presentation/identity-http.js";
import type {
  EmailMessage,
  IdentityMail,
} from "../../src/modules/identity/domain/identity.js";
export const origin = "http://127.0.0.1:3002";
export const password = "Uma frase exclusiva com muitos caracteres 829!";
export class Mailbox implements IdentityMail {
  readonly messages = new Map<string, EmailMessage>();
  fail = false;
  async send(id: string, message: EmailMessage): Promise<void> {
    if (this.fail) throw new Error("TEST_TRANSPORT_UNAVAILABLE");
    this.messages.set(id, message);
  }
  token(email: string, purpose: EmailMessage["purpose"]): string {
    const matches = [...this.messages.values()].filter(
      (m) => m.email === email && m.purpose === purpose,
    );
    const last = matches.at(-1);
    if (!last) throw new Error("TEST_MESSAGE_NOT_FOUND");
    return last.token;
  }
}
export class Browser {
  readonly cookies = new Map<string, string>();
  csrf = "";
  constructor(readonly app: NestExpressApplication) {}
  header(): string {
    return [...this.cookies].map(([k, v]) => k + "=" + v).join("; ");
  }
  call(method: "get" | "post", route: string, body?: unknown): HttpTest {
    const test =
      method === "get"
        ? request(this.app.getHttpServer()).get("/api/v1" + route)
        : request(this.app.getHttpServer()).post("/api/v1" + route);
    test.set("Origin", origin).set("Cookie", this.header());
    if (method === "post")
      test
        .set("Content-Type", "application/json")
        .set("X-CSRF-Token", this.csrf)
        .send(body ?? {});
    return test;
  }
  absorb(response: Response): void {
    const cookies = response.headers["set-cookie"] as unknown as
      string[] | undefined;
    for (const item of cookies ?? []) {
      const first = item.split(";")[0]!,
        split = first.indexOf("=");
      const key = first.slice(0, split),
        value = first.slice(split + 1);
      if (value) this.cookies.set(key, value);
      else this.cookies.delete(key);
    }
  }
  async bootstrap(): Promise<Response> {
    const response = await this.call("get", "/auth/csrf");
    this.absorb(response);
    this.csrf = String(response.body.csrfToken ?? "");
    return response;
  }
}
export async function fixture() {
  if (process.env.IDENTITY_DISPOSABLE !== "1")
    throw new Error("TEST_DISPOSABLE_REQUIRED");
  const control = new pg.Pool({
    host: "127.0.0.1",
    port: 55436,
    user: "atlas_identity_migrator",
    password: "",
    database: "atlas_identity_id01",
    ssl: false,
    max: 2,
    connectionTimeoutMillis: 1000,
  });
  const identity = await control.query(
    "SELECT current_database() AS db,current_setting('atlas.identity_fixture',true) AS marker",
  );
  if (
    identity.rows[0]?.db !== "atlas_identity_id01" ||
    identity.rows[0]?.marker !== "atlas-id01-disposable"
  )
    throw new Error("TEST_DATABASE_INVALID");
  const config = readIdentityConfig({
    IDENTITY_PROFILE: "local-disposable",
    IDENTITY_DISPOSABLE: "1",
    IDENTITY_SECRET: randomBytes(32).toString("hex"),
    NODE_ENV: "test",
  });
  const mail = new Mailbox();
  const a = new PrismaIdentityRepository("atlas-id01-a"),
    b = new PrismaIdentityRepository("atlas-id01-b");
  const runtimeA = new IdentityRuntime(config, mail, a),
    runtimeB = new IdentityRuntime(config, mail, b);
  async function application(runtime: IdentityRuntime) {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(IDENTITY_RUNTIME)
      .useValue(runtime)
      .compile();
    const app = module.createNestApplication<NestExpressApplication>({
      bodyParser: false,
      logger: false,
    });
    configureIdentityHttp(app);
    await app.listen(0, "127.0.0.1");
    return app;
  }
  const appA = await application(runtimeA),
    appB = await application(runtimeB);
  return {
    control,
    config,
    mail,
    a,
    b,
    runtimeA,
    runtimeB,
    appA,
    appB,
    async reset() {
      await control.query("ALTER ROLE atlas_identity_runtime LOGIN");
      await control.query(
        "TRUNCATE identity.auth_security_event,identity.email_outbox,identity.account_token,identity.auth_session,identity.password_credential,identity.customer_account,identity.auth_abuse_window CASCADE",
      );
      mail.messages.clear();
      mail.fail = false;
    },
    async close() {
      await appA.close();
      await appB.close();
      await control.end();
    },
    async active(email = "customer@example.invalid") {
      const browser = new Browser(appA);
      if ((await browser.bootstrap()).status !== 200)
        throw new Error("TEST_CSRF_FAILED");
      if (
        (await browser.call("post", "/auth/register", { email, password }))
          .status !== 202
      )
        throw new Error("TEST_REGISTER_FAILED");
      if (
        (
          await browser.call("post", "/auth/verify-email", {
            token: mail.token(email, "VERIFY_EMAIL"),
          })
        ).status !== 204
      )
        throw new Error("TEST_VERIFY_FAILED");
      return browser;
    },
    async login(browser: Browser, email = "customer@example.invalid") {
      const response = await browser.call("post", "/auth/login", {
        email,
        password,
        context: "CUSTOMER",
      });
      browser.absorb(response);
      await browser.bootstrap();
      return response;
    },
    async race(
      accountId: string,
      first: () => Promise<number>,
      second: () => Promise<number>,
    ) {
      const blocker = await control.connect();
      await blocker.query("BEGIN");
      await blocker.query(
        "SELECT id FROM identity.customer_account WHERE id=$1::uuid FOR UPDATE",
        [accountId],
      );
      let observations = 0;
      const left = first(),
        right = second();
      try {
        const deadline = performance.now() + 5000;
        while (performance.now() < deadline) {
          const found = await control.query(
            "SELECT count(DISTINCT application_name)::int AS n FROM pg_stat_activity WHERE application_name IN ('atlas-id01-a','atlas-id01-b') AND cardinality(pg_blocking_pids(pid))>0",
          );
          observations = Number(found.rows[0]?.n);
          if (observations === 2) break;
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        if (observations !== 2)
          throw new Error("TEST_INDEPENDENT_LOCK_WAITERS_NOT_OBSERVED");
      } finally {
        await blocker.query("COMMIT");
        blocker.release();
      }
      return Promise.all([left, right]);
    },
  };
}
