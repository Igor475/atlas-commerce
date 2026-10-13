import { describe, expect, it } from "vitest";
import {
  disposableUrl,
  poolSize,
} from "../src/infrastructure/persistence/spike-config.js";
import { aggregateLines } from "../src/infrastructure/persistence/spike-repository.js";
import { safeFixture } from "../src/infrastructure/persistence/spike-database.js";
describe("isolated persistence configuration", () => {
  it("rejects absent opt-in and any remote/ambiguous target without echoing secrets", () => {
    const local =
      "postgresql://atlas_spike@127.0.0.1:55434/atlas_spike_f0404?schema=spike";
    expect(disposableUrl(local, "1")).toBe(local);
    expect(() => disposableUrl(local, undefined)).toThrow("required");
    for (const bad of [
      undefined,
      "invalid",
      local.replace("127.0.0.1", "db.invalid"),
      local.replace("atlas_spike@", "atlas_spike:secret@"),
      local + "&sslmode=disable",
      local.replace("55434", "5432"),
    ]) {
      expect(() => disposableUrl(bad, "1")).toThrow();
      try {
        disposableUrl(bad, "1");
      } catch (error) {
        expect(String(error)).not.toContain("secret");
      }
    }
  });
  it("bounds the driver pool and quantities", () => {
    expect(poolSize(undefined)).toBe(2);
    for (const bad of ["0", "5", "1.5", "NaN"])
      expect(() => poolSize(bad)).toThrow();
    expect(
      aggregateLines([
        { sku: "b", quantity: 1 },
        { sku: "a", quantity: 2 },
        { sku: "b", quantity: 3 },
      ]),
    ).toEqual([
      { sku: "a", quantity: 2 },
      { sku: "b", quantity: 4 },
    ]);
    expect(() =>
      aggregateLines([
        { sku: "a", quantity: 2147483647 },
        { sku: "a", quantity: 1 },
      ]),
    ).toThrow();
  });
  it("surfaces whole-transaction replay requirements without automatic retry or secret causes", async () => {
    let attempts = 0;
    for (const code of ["40001", "40P01"])
      await expect(
        safeFixture(async () => {
          attempts++;
          throw { code, message: "secret" };
        }),
      ).rejects.toMatchObject({
        code: "TX_REPLAY_REQUIRED",
        sqlState: code,
        message: "TX_REPLAY_REQUIRED",
      });
    expect(attempts).toBe(2);
  });
});
