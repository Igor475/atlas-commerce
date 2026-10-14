import { randomBytes, randomUUID } from "node:crypto";
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
import { AppModule } from "../../src/app.module.js";
import {
  IDENTITY_RUNTIME,
  composeIdentity,
  IdentityRuntime,
} from "../../src/modules/identity/identity-runtime.js";
import { configureIdentityHttp } from "../../src/modules/identity/presentation/identity-http.js";
import {
  configuredResend,
  ResendMail,
} from "../../src/modules/identity/infrastructure/resend-mail.js";
import { resendHttpMock } from "./resend-http.js";
import { readIdentityConfig } from "../../src/modules/identity/infrastructure/identity-config.js";

describe("INT-01 Resend bounded local HTTP mock (no remote I/O)", () => {
  let mock: Awaited<ReturnType<typeof resendHttpMock>>;
  const key = "re_" + randomBytes(24).toString("hex");
  const token = randomBytes(32).toString("base64url");
  const options = {
    key,
    to: "customer@example.invalid",
    from: "Atlas Commerce <onboarding@resend.dev>",
    origin: "http://127.0.0.1:3000",
    timeoutMs: 300,
  };
  const message = {
    email: options.to,
    token,
    purpose: "VERIFY_EMAIL" as const,
  };
  beforeAll(async () => {
    mock = await resendHttpMock();
  });
  beforeEach(() => mock.reset());
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => {
    await mock.close();
  });
  it("RSD-001/002/021: disabled ignores keys; missing credential initializes closed; no mail or auth readiness", async () => {
    const network = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("TEST_REAL_NETWORK_FORBIDDEN"));
    const disabled = {
      get RESEND_API_KEY(): string {
        throw new Error("TEST_SECRET_MUST_NOT_BE_READ");
      },
    };
    const runtime = composeIdentity(disabled);
    expect(runtime.dispatcher).toBeUndefined();
    expect(() => runtime.service()).toThrow("DEPENDENCY_UNAVAILABLE");
    expect(await runtime.ready()).toBe(false);
    await runtime.onApplicationShutdown();
    const env = {
      IDENTITY_PROFILE: "local-resend",
      IDENTITY_DISPOSABLE: "1",
      IDENTITY_SECRET: randomBytes(32).toString("hex"),
      IDENTITY_MAIL_PROVIDER: "resend",
      IDENTITY_MAIL_DISPATCH_ENABLED: "1",
      IDENTITY_MAIL_LOCAL_OPT_IN: "1",
    };
    const closed = composeIdentity(env);
    expect(closed.dispatcher).toBeUndefined();
    expect(await closed.ready()).toBe(false);
    const configured = composeIdentity({
      ...env,
      RESEND_API_KEY: key,
      IDENTITY_MAIL_FROM: options.from,
      IDENTITY_MAIL_TEST_TO: options.to,
      IDENTITY_PUBLIC_SITE_ORIGIN: options.origin,
    });
    expect(configured.dispatcher).toBeDefined();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(IDENTITY_RUNTIME)
      .useValue(configured)
      .compile();
    const app = module.createNestApplication<NestExpressApplication>({
      logger: false,
      bodyParser: false,
    });
    configureIdentityHttp(app);
    await app.init();
    try {
      expect(
        (await request(app.getHttpServer()).get("/health/live")).status,
      ).toBe(200);
      expect(
        (await request(app.getHttpServer()).get("/health/ready")).status,
      ).toBe(503);
      expect(
        (
          await request(app.getHttpServer())
            .get("/api/v1/auth/csrf")
            .set("Origin", "http://127.0.0.1:3002")
        ).status,
      ).toBe(503);
      expect(mock.requests.length).toBe(0);
      expect(network).not.toHaveBeenCalled();
    } finally {
      await app.close();
      await closed.onApplicationShutdown();
    }
  });
  it("RSD-002/003/004/007: profiles, sender, destination, URL and unknown settings fail closed", async () => {
    for (const extra of [
      { key: "bad" },
      { from: "Atlas <fake@vercel.app>" },
      { to: "x\r\n@example.invalid" },
      { origin: "https://attacker.invalid" },
      { origin: "http://127.0.0.1:3000/redirect" },
      { endpoint: "http://127.0.0.1:1" },
    ])
      expect(() => new ResendMail({ ...options, ...extra })).toThrow(
        "IDENTITY_MAIL_CONFIGURATION_INVALID",
      );
    const mail = new ResendMail(options, mock.transport);
    expect(
      () =>
        new IdentityRuntime(
          readIdentityConfig({
            IDENTITY_PROFILE: "local-disposable",
            IDENTITY_DISPOSABLE: "1",
            IDENTITY_SECRET: randomBytes(32).toString("hex"),
          }),
          mail,
        ),
    ).toThrow("IDENTITY_TEST_TRANSPORT_FORBIDDEN");
    expect(() =>
      mail.snapshot({ ...message, email: "other@example.invalid" }),
    ).toThrow("MAIL_RECIPIENT");
    expect(() => mail.snapshot({ ...message, token: "<script>" })).toThrow(
      "MAIL_PAYLOAD",
    );
    expect(() =>
      mail.snapshot({
        ...message,
        delivery: {
          version: 1,
          from: options.from,
          origin: "http://localhost:3000",
        },
      }),
    ).toThrow("MAIL_INTEGRITY");
    expect(() =>
      composeIdentity({ IDENTITY_PROFILE: "demo", RESEND_API_KEY: key }),
    ).toThrow("IDENTITY_CONFIGURATION_INVALID");
    expect(() =>
      composeIdentity({
        IDENTITY_PROFILE: "local-resend",
        NODE_ENV: "production",
        RESEND_API_KEY: key,
      }),
    ).toThrow("IDENTITY_CONFIGURATION_INVALID");
    expect(
      configuredResend({
        IDENTITY_PROFILE: "local-disposable",
        RESEND_API_KEY: key,
      }),
    ).toBeUndefined();
    expect(mock.requests.length).toBe(0);
  });
  it("RSD-003/005/006/009/011: POST shape, PT-BR and stable key/body; 200/201 is acceptance only", async () => {
    const mail = new ResendMail(options, mock.transport),
      id = randomUUID(),
      frozen = mail.snapshot(message);
    const first = await mail.send(id, frozen);
    mock.reply(201, { id: "11111111-2222-4333-8444-555555555555" });
    const second = await mail.send(id, frozen);
    expect(first.kind).toBe("ACCEPTED");
    expect(second.kind).toBe("ACCEPTED");
    expect(
      JSON.stringify(mock.requests[0]) === JSON.stringify(mock.requests[1]),
    ).toBe(true);
    expect(mock.requests[0]?.headers.authorization === "Bearer " + key).toBe(
      true,
    );
    expect(
      mock.requests[0]?.headers["idempotency-key"] === "identity-v1/" + id,
    ).toBe(true);
    const body = mock.requests[0]!.body;
    expect(Object.keys(body).sort()).toEqual([
      "from",
      "html",
      "subject",
      "text",
      "to",
    ]);
    expect(body.subject).toBe("Confirme seu e-mail");
    expect(String(body.html).includes("#token=" + token)).toBe(true);
    expect(String(body.html).includes(options.to)).toBe(false);
    expect(String(body.text).includes("uso único")).toBe(true);
    await mail.send(
      randomUUID(),
      mail.snapshot({ ...message, purpose: "RESET_PASSWORD" }),
    );
    expect(mock.requests[2]?.body.subject).toBe("Recuperação de acesso");
    expect(
      String(mock.requests[2]?.body.html).includes("/auth/recovery#token="),
    ).toBe(true);
    expect(JSON.stringify(mail)).toBe("{}");
  });
  it("RSD-012/013/014/015/016/020: status classification, Retry-After, no provider echo", async () => {
    const mail = new ResendMail(options, mock.transport),
      frozen = mail.snapshot(message);
    for (const [status, name, kind, code] of [
      [400, "echo", "PERMANENT", "HTTP_400"],
      [401, "echo", "PERMANENT", "HTTP_401"],
      [403, "echo", "PERMANENT", "HTTP_403"],
      [409, "invalid_idempotent_request", "PERMANENT", "INTEGRITY"],
      [409, "concurrent_idempotent_requests", "RETRY", "CONCURRENT"],
      [429, "echo", "RETRY", "THROTTLED"],
      [500, "echo", "UNCERTAIN", "HTTP_5XX"],
      [503, "echo", "UNCERTAIN", "HTTP_5XX"],
      [302, "echo", "PERMANENT", "REDIRECT"],
    ] as const) {
      mock.reply(status, { name, message: key + token + options.to }, "17");
      const result = await mail.send(randomUUID(), frozen);
      expect(result.kind).toBe(kind);
      expect("code" in result && result.code).toBe(code);
      expect(
        [key, token, options.to].some((secret) =>
          JSON.stringify(result).includes(secret),
        ),
      ).toBe(false);
      if (status === 429 && result.kind === "RETRY")
        expect(result.afterSeconds).toBe(17);
    }
    mock.reply(429, {}, new Date(Date.now() + 30000).toUTCString());
    const date = await mail.send(randomUUID(), frozen);
    expect(date.kind === "RETRY" && date.afterSeconds >= 28).toBe(true);
    mock.reply(200, { message: key + token });
    expect((await mail.send(randomUUID(), frozen)).kind).toBe("UNCERTAIN");
    mock.reply(200, { message: "x".repeat(5000) });
    expect((await mail.send(randomUUID(), frozen)).kind).toBe("UNCERTAIN");
  });
  it("RSD-016/019/020: timeout and thrown transport errors are bounded/redacted; shutdown aborts", async () => {
    const mail = new ResendMail({ ...options, timeoutMs: 80 }, mock.transport),
      frozen = mail.snapshot(message);
    mock.stall();
    const started = performance.now();
    const result = await mail.send(randomUUID(), frozen);
    expect(result.kind === "UNCERTAIN" && result.code === "TIMEOUT").toBe(true);
    expect(performance.now() - started < 2000).toBe(true);
    const throwing = new ResendMail(options, async () => {
      throw new Error(key + token + options.to);
    });
    expect(await throwing.send(randomUUID(), frozen)).toEqual({
      kind: "UNCERTAIN",
      code: "NETWORK",
    });
    const pending = mail.send(randomUUID(), frozen);
    mail.close();
    const stopped = await pending;
    expect(stopped.kind === "UNCERTAIN" && stopped.code === "STOPPED").toBe(
      true,
    );
  });
});
