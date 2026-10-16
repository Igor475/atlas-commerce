import { it, expect } from "vitest";
import {
  integrationUrl,
  integrationMigrationUrl,
  integrationEnabled,
} from "../../src/modules/customer-profile/infrastructure/profile-integration-config.js";
import {
  ProfileOrderIntegration,
  type IntegratedProfileStore,
} from "../../src/modules/customer-profile/application/profile-order-integration.js";
it("CPINT configuration requires distinct consent and exact local destination", () => {
  const value =
    "postgresql://atlas_orders_actor_a@127.0.0.1:55439/atlas_catalog_cat01?schema=orders";
  expect(integrationUrl(value, "CP-02", "orders", "actor_a")).toBe(value);
  for (const variant of [
    value + "&options=unsafe",
    value.replace("127.0.0.1", "example.invalid"),
    value.replace("55439", "5432"),
  ])
    expect(() =>
      integrationUrl(variant, "CP-02", "orders", "actor_a"),
    ).toThrow();
  expect(() => integrationUrl(value, "CP-01", "orders", "actor_a")).toThrow(
    "CPINT_CONSENT_REQUIRED",
  );
  expect(() =>
    integrationMigrationUrl(value, "CP-02", "wrong" as "profile"),
  ).toThrow("CPINT_PHASE_INVALID");
  expect(integrationEnabled({})).toBe(false);
});
it("CPINT request rejects client owner, amount and arbitrary version before any port call", async () => {
  const service = new ProfileOrderIntegration(
    {} as IntegratedProfileStore,
    {
      current: async () => {
        throw new Error("PORT_SHOULD_NOT_BE_CALLED");
      },
    },
    {
      authorize: async () => {
        throw new Error("PORT_SHOULD_NOT_BE_CALLED");
      },
    },
  );
  const request = {
    key: "00000000-0000-4000-8000-000000000001",
    quoteId: "00000000-0000-4000-8000-000000000002",
  };
  for (const addition of [
    { ownerId: "forged" },
    { amountCents: 1 },
    { addressVersion: 1 },
  ])
    await expect(
      service.prepare({ ...request, ...addition }),
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
});
