import { randomBytes } from "node:crypto";
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
import { fixture, Browser, password } from "./harness.js";
import { resendHttpMock } from "./resend-http.js";
import { ResendMail } from "../../src/modules/identity/infrastructure/resend-mail.js";
import { IdentityMailDispatcher } from "../../src/modules/identity/application/mail-dispatcher.js";

describe("INT-01 outbox + local HTTP mock + real PostgreSQL", () => {
  let f: Awaited<ReturnType<typeof fixture>>,
    mock: Awaited<ReturnType<typeof resendHttpMock>>;
  let a: IdentityMailDispatcher, b: IdentityMailDispatcher;
  const options = {
    key: "re_" + randomBytes(24).toString("hex"),
    to: "customer@example.invalid",
    from: "Atlas Commerce <onboarding@resend.dev>",
    origin: "http://127.0.0.1:3000",
    timeoutMs: 300,
  };
  beforeAll(async () => {
    f = await fixture({ queued: true });
    mock = await resendHttpMock();
  });
  beforeEach(async () => {
    await f.reset();
    mock.reset();
    a = new IdentityMailDispatcher(
      f.a,
      f.runtimeA.crypto,
      new ResendMail(options, mock.transport),
    );
    b = new IdentityMailDispatcher(
      f.b,
      f.runtimeB.crypto,
      new ResendMail(options, mock.transport),
    );
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await a.stop();
    await b.stop();
  });
  afterAll(async () => {
    await mock.close();
    await f.close();
  });
  async function queued(email = options.to) {
    const browser = new Browser(f.appA);
    await browser.bootstrap();
    expect(
      (await browser.call("post", "/auth/register", { email, password }))
        .status,
    ).toBe(202);
    return browser;
  }
  async function state() {
    return (
      await f.control.query(
        "SELECT status,lease_until,attempts,payload FROM identity.email_outbox ORDER BY created_at DESC LIMIT 1",
      )
    ).rows[0];
  }
  async function allowRetry() {
    await f.control.query(
      "UPDATE identity.email_outbox SET lease_until=clock_timestamp()-interval '1 second' WHERE status='PENDING'",
    );
  }
  function recipientToken(index: number) {
    const text = String(mock.requests[index]?.body.text);
    const match = /#token=([A-Za-z0-9_-]{43})/.exec(text);
    if (!match) throw new Error("TEST_MAIL_TOKEN_MISSING");
    return match[1]!;
  }
  it("RSD-005/008/021: queued 202, verify/recovery single-use, no request-driven provider I/O or staff session", async () => {
    const browser = await queued();
    expect(mock.requests.length).toBe(0);
    expect((await state()).status).toBe("PENDING");
    expect(
      (
        await browser.call("post", "/auth/register", {
          email: options.to,
          password,
        })
      ).status,
    ).toBe(202);
    expect(
      (
        await browser.call("post", "/auth/verify-email/resend", {
          email: "unknown@example.invalid",
        })
      ).status,
    ).toBe(202);
    expect(
      (
        await browser.call("post", "/auth/recovery/request", {
          email: "unknown@example.invalid",
        })
      ).status,
    ).toBe(202);
    expect(mock.requests.length).toBe(0);
    expect((await a.runOnce())[0]?.kind).toBe("ACCEPTED");
    const token = recipientToken(0);
    expect(
      (await browser.call("post", "/auth/verify-email", { token })).status,
    ).toBe(204);
    expect(
      (await browser.call("post", "/auth/verify-email", { token })).status,
    ).toBe(400);
    expect((await f.login(browser)).status).toBe(200);
    expect(
      (
        await browser.call("post", "/auth/login", {
          email: options.to,
          password,
          context: "STAFF",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await browser.call("post", "/auth/recovery/request", {
          email: options.to,
        })
      ).status,
    ).toBe(202);
    expect(mock.requests.length).toBe(1);
    expect((await a.runOnce())[0]?.kind).toBe("ACCEPTED");
    const reset = recipientToken(1),
      replacement = "Outra frase longa exclusiva de recuperação 921!";
    expect(
      (
        await browser.call("post", "/auth/recovery/complete", {
          token: reset,
          password: replacement,
        })
      ).status,
    ).toBe(204);
    expect(
      (
        await browser.call("post", "/auth/recovery/complete", {
          token: reset,
          password: replacement,
        })
      ).status,
    ).toBe(400);
    expect((await browser.call("get", "/me")).status).toBe(401);
  });
  it("RSD-009/010/011: independent clients claim once; acceptance is PROCESSING/null, not DELIVERED", async () => {
    await queued();
    const results = await Promise.all([a.runOnce(), b.runOnce()]);
    expect(results.flat().length).toBe(1);
    expect(mock.requests.length).toBe(1);
    const row = await state();
    expect(row.status).toBe("PROCESSING");
    expect(row.lease_until).toBeNull();
    expect(await f.a.claimMail()).toBeUndefined();
    expect((await a.runOnce()).length).toBe(0);
    const event = (
      await f.control.query(
        "SELECT action FROM identity.auth_security_event WHERE action LIKE 'RESEND_PROVIDER_ACCEPTED/%'",
      )
    ).rows;
    expect(event.length).toBe(1);
    expect(String(row.payload).includes(recipientToken(0))).toBe(false);
  });
  it("RSD-004/021: a queued different recipient is rejected, never a fake successful send", async () => {
    await queued("other@example.invalid");
    expect(await a.runOnce()).toEqual([
      { kind: "PERMANENT", code: "RECIPIENT" },
    ]);
    expect(mock.requests.length).toBe(0);
    expect((await state()).status).toBe("FAILED");
  });
  it("RSD-009/015: Retry-After is durable, no immediate retry, exact same key and payload", async () => {
    await queued();
    mock.reply(429, {}, "17");
    expect((await a.runOnce())[0]?.kind).toBe("RETRY");
    expect((await state()).status).toBe("PENDING");
    const remaining = (
      await f.control.query(
        "SELECT extract(epoch FROM lease_until-clock_timestamp()) AS n FROM identity.email_outbox",
      )
    ).rows[0]?.n;
    expect(Number(remaining) > 15).toBe(true);
    expect((await b.runOnce()).length).toBe(0);
    expect(mock.requests.length).toBe(1);
    await allowRetry();
    mock.reply(200, { id: "11111111-2222-4333-8444-555555555555" });
    expect((await b.runOnce())[0]?.kind).toBe("ACCEPTED");
    expect(
      JSON.stringify(mock.requests[0]) === JSON.stringify(mock.requests[1]),
    ).toBe(true);
  });
  it("RSD-014: concurrent 409 retries at most three attempts with the original key", async () => {
    await queued();
    mock.reply(409, { name: "concurrent_idempotent_requests" });
    for (let i = 0; i < 3; i++) {
      expect((await a.runOnce())[0]?.kind).toBe("RETRY");
      await allowRetry();
    }
    expect((await state()).status).toBe("FAILED");
    expect((await b.runOnce()).length).toBe(0);
    expect(mock.requests.length).toBe(3);
    expect(
      new Set(mock.requests.map((r) => r.headers["idempotency-key"])).size,
    ).toBe(1);
  });
  it("RSD-012/013: 400/401/403 and integrity 409 are terminal, never replace key", async () => {
    for (const status of [400, 401, 403, 409]) {
      await f.reset();
      mock.reset();
      await queued();
      mock.reply(status, {
        name: "invalid_idempotent_request",
        message: options.key,
      });
      expect((await a.runOnce())[0]?.kind).toBe("PERMANENT");
      expect((await state()).status).toBe("FAILED");
      expect((await b.runOnce()).length).toBe(0);
      expect(mock.requests.length).toBe(1);
    }
  });
  it("RSD-016: 5xx and timeout quarantine ambiguity without automatic retry", async () => {
    await queued();
    mock.reply(503, { message: options.key });
    expect((await a.runOnce())[0]?.kind).toBe("UNCERTAIN");
    expect((await state()).status).toBe("FAILED");
    expect((await b.runOnce()).length).toBe(0);
    expect(mock.requests.length).toBe(1);
    await f.reset();
    mock.reset();
    await queued();
    mock.stall();
    const result = await a.runOnce();
    expect(result[0]?.kind).toBe("UNCERTAIN");
    expect((await b.runOnce()).length).toBe(0);
    expect(
      (
        await f.control.query(
          "SELECT count(*)::int AS n FROM identity.auth_security_event WHERE action LIKE 'RESEND_UNCERTAIN/%'",
        )
      ).rows[0]?.n,
    ).toBe(1);
  });
  it("RSD-017/018: >24h creation window, expired and invalidated tokens cannot send", async () => {
    for (const update of [
      "UPDATE identity.email_outbox SET created_at=clock_timestamp()-interval '25 hours'",
      "UPDATE identity.account_token SET created_at=clock_timestamp()-interval '2 minutes',expires_at=clock_timestamp()-interval '1 second'",
      "UPDATE identity.account_token SET invalidated_at=clock_timestamp()",
    ]) {
      await f.reset();
      mock.reset();
      await queued();
      await f.control.query(update);
      expect((await a.runOnce()).length).toBe(0);
      expect(mock.requests.length).toBe(0);
      expect((await state()).status).toBe("FAILED");
    }
  });
  it("RSD-010/019: crashed real lease is fenced, excluded from legacy retry, quarantined after expiry", async () => {
    await queued();
    const intent = await f.a.claimDispatchMail();
    expect(intent).toBeDefined();
    await f.control.query(
      "UPDATE identity.email_outbox SET lease_until=clock_timestamp()-interval '1 second'",
    );
    expect(await f.b.claimMail()).toBeUndefined();
    expect((await b.runOnce()).length).toBe(0);
    expect(
      await f.a.finishDispatchMail(intent!, {
        kind: "ACCEPTED",
        providerId: "11111111-2222-4333-8444-555555555555",
      }),
    ).toBe(false);
    expect((await state()).status).toBe("FAILED");
    expect(mock.requests.length).toBe(0);
  });
  it("RSD-007/009/013: frozen context survives restart; configuration change is integrity failure", async () => {
    await queued();
    mock.reply(429, {}, "1");
    await a.runOnce();
    await allowRetry();
    const changed = new IdentityMailDispatcher(
      f.b,
      f.runtimeB.crypto,
      new ResendMail(
        { ...options, origin: "http://localhost:3000" },
        mock.transport,
      ),
    );
    try {
      expect(await changed.runOnce()).toEqual([
        { kind: "PERMANENT", code: "INTEGRITY" },
      ]);
    } finally {
      await changed.stop();
    }
    expect(mock.requests.length).toBe(1);
    expect((await state()).status).toBe("FAILED");
  });
  it("RSD-019/020: acceptance followed by commit failure is sanitized and never blindly replayed", async () => {
    await queued();
    const spy = vi
      .spyOn(f.a, "finishDispatchMail")
      .mockRejectedValueOnce(new Error(options.key + options.to));
    await expect(a.runOnce()).rejects.toThrow("MAIL_DISPATCH_STATE_UNCERTAIN");
    spy.mockRestore();
    expect(mock.requests.length).toBe(1);
    await f.control.query(
      "UPDATE identity.email_outbox SET lease_until=clock_timestamp()-interval '1 second'",
    );
    expect((await b.runOnce()).length).toBe(0);
    expect((await state()).status).toBe("FAILED");
    expect(mock.requests.length).toBe(1);
  });
  it("RSD-019: shutdown aborts an active send and persists uncertainty", async () => {
    await queued();
    mock.stall();
    const pending = a.runOnce();
    const until = performance.now() + 2000;
    while (!mock.requests.length && performance.now() < until)
      await new Promise((resolve) => setTimeout(resolve, 5));
    expect(mock.requests.length).toBe(1);
    await a.stop();
    expect((await pending)[0]?.kind).toBe("UNCERTAIN");
    expect((await state()).status).toBe("FAILED");
  });
});
