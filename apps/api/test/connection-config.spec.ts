import { describe, expect, it } from "vitest";
import {
  readProbeConfig,
  ProbeConfigurationError,
  certificateAuthority,
} from "../src/infrastructure/persistence/probe-config.js";
import { ReadOnlyProbe } from "../src/infrastructure/persistence/probe-readiness.js";
import { disposableUrl } from "../src/infrastructure/persistence/spike-config.js";
describe("F04-05 fail-closed configuration", () => {
  it("SUPCON-04 disabled by default ignores ambient DATABASE_URL and SPIKE fields", () => {
    expect(
      readProbeConfig({
        DATABASE_URL: "never-use-this",
        SPIKE_DATABASE_URL: "never-use-this",
      }),
    ).toEqual({ profile: "disabled" });
  });
  it.each([
    { PERSISTENCE_ENABLED: "yes" },
    { PERSISTENCE_ENABLED: "true" },
    { PERSISTENCE_PROFILE: "cloud-readonly" },
    { PERSISTENCE_ENABLED: "true", PERSISTENCE_PROFILE: "other" },
    { PERSISTENCE_ENABLED: "true", PERSISTENCE_PROFILE: "local-disposable" },
    {
      PERSISTENCE_ENABLED: "true",
      PERSISTENCE_PROFILE: "local-disposable",
      PERSISTENCE_LOCAL_DISPOSABLE: "1",
      PERSISTENCE_POOL_MAX: "5",
    },
    {
      PERSISTENCE_ENABLED: "true",
      PERSISTENCE_PROFILE: "local-disposable",
      PERSISTENCE_LOCAL_DISPOSABLE: "1",
      PERSISTENCE_PROBE_URL: "secret",
    },
    {
      PERSISTENCE_ENABLED: "true",
      PERSISTENCE_PROFILE: "local-disposable",
      PERSISTENCE_LOCAL_DISPOSABLE: "1",
      PGHOST: "secret",
    },
  ])(
    "SUPCON-04 rejects invalid configuration without echoing values (%#)",
    (env) => {
      expect(() => readProbeConfig(env)).toThrow(ProbeConfigurationError);
      try {
        readProbeConfig(env);
      } catch (error) {
        expect(String(error)).not.toContain("secret");
      }
    },
  );
  it("SUPCON-05 original spike never accepts a remote endpoint", () => {
    expect(() =>
      disposableUrl(
        "postgresql://atlas_spike@database.invalid:55434/atlas_spike_f0404?schema=spike",
        "1",
      ),
    ).toThrow();
  });
  it("SUPCON-06 invalid CA/private key rejected before networking", () => {
    for (const value of [
      "invalid",
      "-----BEGIN PRIVATE KEY-----",
      "-----BEGIN CERTIFICATE-----bad",
    ])
      expect(() => certificateAuthority(value)).toThrow(
        ProbeConfigurationError,
      );
  });
  it("SUPCON-08 singleton service is lazy and shutdown cannot create a socket", async () => {
    let created = 0;
    const probe = new ReadOnlyProbe({ profile: "disabled" }, () => {
      created++;
      throw new Error("no socket allowed");
    });
    await Promise.all([probe.check(), probe.check()]);
    await probe.onApplicationShutdown();
    expect(created).toBe(0);
  });
  it("SUPCON-18 cloud cannot be activated by API or environment authorization flag", () => {
    let created = 0;
    expect(
      () =>
        new ReadOnlyProbe(
          {
            profile: "cloud-readonly",
            host: "unused.invalid",
            user: "readonly",
            role: "readonly",
            password: "sentinel",
            database: "postgres",
            transport: "session-ipv4",
            poolMax: 1,
            ca: "unused",
          },
          () => {
            created++;
            throw new Error("no socket");
          },
        ),
    ).toThrow("REMOTE_AUTHORIZATION_REQUIRED");
    expect(created).toBe(0);
  });
});
