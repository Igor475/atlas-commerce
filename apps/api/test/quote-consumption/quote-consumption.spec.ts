import { describe, it, expect } from "vitest";
import {
  consumptionEnabled,
  consumptionUrl,
} from "../../src/modules/orders/infrastructure/quote-consumption-config.js";
describe("consumption composition isolation", () => {
  it("disabled by default and refuses production or ambient database config", () => {
    expect(consumptionEnabled({})).toBe(false);
    const env = {
      QUSE_MODE: "local-disposable",
      QUSE_CONSENT: "QUSE-01",
      QUSE_FIXTURE_ROLE: "actor_a",
      QUSE_QUOTES_URL:
        "postgresql://atlas_quotes_actor_a@127.0.0.1:55439/atlas_catalog_cat01?schema=quotes",
      QUSE_ORDERS_URL:
        "postgresql://atlas_orders_actor_a@127.0.0.1:55439/atlas_catalog_cat01?schema=orders",
    };
    expect(consumptionEnabled(env)).toBe(true);
    for (const extra of [
      { NODE_ENV: "production" },
      { DATABASE_URL: "untrusted" },
      { PGHOST: "untrusted" },
      { QUSE_MODE: "commercial" },
    ])
      expect(() => consumptionEnabled({ ...env, ...extra })).toThrow(
        "QUSE_LOCAL_REQUIRED",
      );
  });
  it("runtime cannot supply migrator connection or modified search parameters", () => {
    const value =
      "postgresql://atlas_orders_actor_a@127.0.0.1:55439/atlas_catalog_cat01?schema=orders";
    expect(consumptionUrl(value, "QUSE-01", "orders", "actor_a")).toBe(value);
    for (const v of [
      value.replace("actor_a", "migrator"),
      value + "&sslmode=disable",
      value.replace("127.0.0.1", "localhost"),
    ])
      expect(() => consumptionUrl(v, "QUSE-01", "orders", "actor_a")).toThrow(
        "QUSE_LOCAL_REQUIRED",
      );
  });
});
