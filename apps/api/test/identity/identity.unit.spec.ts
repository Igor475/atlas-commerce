import { randomBytes } from "node:crypto";
import { Test } from "@nestjs/testing";
import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { NodeIdentityCrypto } from "../../src/modules/identity/infrastructure/identity-crypto.js";
import {
  identityDatabaseUrl,
  readIdentityConfig,
} from "../../src/modules/identity/infrastructure/identity-config.js";
import {
  normalizeEmail,
  normalizePassword,
} from "../../src/modules/identity/application/customer-identity.js";
import {
  configureIdentityHttp,
  bootstrapCsrf,
  csrfToken,
} from "../../src/modules/identity/presentation/identity-http.js";
import { IdentityRuntime } from "../../src/modules/identity/identity-runtime.js";
const password = "Uma frase exclusiva com muitos caracteres 829!";
describe("Identity Customer unit/closed-by-default", () => {
  it("ID-001: default HTTP blocks auth without DB or mail, liveness unchanged", async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = module.createNestApplication<NestExpressApplication>({
      bodyParser: false,
      logger: false,
    });
    configureIdentityHttp(app);
    await app.init();
    try {
      const live = await request(app.getHttpServer()).get("/health/live");
      expect(live.status).toBe(200);
      const auth = await request(app.getHttpServer())
        .get("/api/v1/auth/csrf")
        .set("Origin", "http://127.0.0.1:3002");
      expect(auth.status).toBe(503);
      expect(auth.body.code).toBe("DEPENDENCY_UNAVAILABLE");
      expect(auth.headers["cache-control"]).toBe("no-store");
      expect(auth.headers["set-cookie"]).toBeUndefined();
    } finally {
      await app.close();
    }
  });
  it("ID-007: measured native Argon2id, random salt, verification and cost upgrade", async () => {
    const secret = randomBytes(32),
      normal = new NodeIdentityCrypto(secret);
    const started = performance.now(),
      hash = await normal.password(password),
      elapsed = performance.now() - started;
    expect(hash.startsWith("$argon2id$v=19$m=19456,t=2,p=1$")).toBe(true);
    expect(hash.includes(password)).toBe(false);
    expect(await normal.password(password)).not.toBe(hash);
    expect((await normal.verify(password, hash)).matches).toBe(true);
    expect((await normal.verify("credencial errada", hash)).matches).toBe(
      false,
    );
    expect((await normal.verify(password)).matches).toBe(false);
    const stronger = new NodeIdentityCrypto(secret, 32768, 3);
    expect((await stronger.verify(password, hash)).upgrade).toBe(true);
    expect(
      (await normal.verify(password, await stronger.password(password)))
        .upgrade,
    ).toBe(false);
    console.info(
      "ID-007 Argon2id 19MiB/2/1 measured-ms=" + Math.round(elapsed),
    );
  });
  it("ID-006: email intent encrypted/authenticated and purpose-specific digests", () => {
    const crypto = new NodeIdentityCrypto(randomBytes(32)),
      token = crypto.random();
    const message = {
      email: "cliente@example.invalid",
      token,
      purpose: "VERIFY_EMAIL" as const,
    };
    const payload = crypto.seal(message);
    expect(payload.includes(token) || payload.includes(message.email)).toBe(
      false,
    );
    expect(crypto.open(payload)).toEqual(message);
    expect(crypto.digest("VERIFY_EMAIL", token)).not.toBe(
      crypto.digest("RESET_PASSWORD", token),
    );
    expect(() => crypto.open(payload.slice(0, -2) + "AA")).toThrow();
  });
  it("ID-020/021: CSRF derives separately for anonymous/session/origin contexts", () => {
    const runtime = new IdentityRuntime(readIdentityConfig({}));
    const bootstrap = bootstrapCsrf(runtime, "");
    expect(bootstrap.token).not.toBe(
      csrfToken(runtime, bootstrap.context, "another-session"),
    );
  });
  it("ID-027: config refuses production, remote migration, missing keys and unbounded TTL/cost", () => {
    const enabled = {
      IDENTITY_PROFILE: "local-disposable",
      IDENTITY_DISPOSABLE: "1",
      IDENTITY_SECRET: randomBytes(32).toString("hex"),
    };
    expect(readIdentityConfig(enabled).absoluteSeconds).toBe(43200);
    expect(readIdentityConfig(enabled).idleSeconds).toBe(1800);
    for (const env of [
      { ...enabled, NODE_ENV: "production" },
      { ...enabled, IDENTITY_ORIGIN: "https://attacker.invalid" },
      { ...enabled, IDENTITY_SECRET: "" },
      { ...enabled, IDENTITY_ABSOLUTE_SECONDS: "999999" },
      { ...enabled, IDENTITY_ARGON_MEMORY: "100" },
      { ...enabled, IDENTITY_ARGON_PASSES: "1" },
    ])
      expect(() => readIdentityConfig(env)).toThrow(
        "IDENTITY_CONFIGURATION_INVALID",
      );
    expect(() =>
      identityDatabaseUrl("postgresql://example.invalid/shared", "1"),
    ).toThrow();
    expect(() =>
      identityDatabaseUrl(
        "postgresql://atlas_identity_migrator@127.0.0.1:55436/atlas_identity_id01?schema=identity",
        "0",
      ),
    ).toThrow();
  });
  it("ID-029: explicit email and password policy, no truncation/composition rules", () => {
    expect(normalizeEmail("  CUSTOMER@EXAMPLE.INVALID ")).toBe(
      "customer@example.invalid",
    );
    expect(normalizePassword(password, true)).toBe(password);
    expect(normalizePassword("a".repeat(128), true).length).toBe(128);
    expect(() => normalizePassword("a".repeat(129), true)).toThrow();
    expect(() => normalizePassword("123456789012345", true)).toThrow();
    expect(() => normalizePassword("short", true)).toThrow();
    expect(() => normalizeEmail("bad\r\nemail@example.invalid")).toThrow();
  });
});
