import { it, expect } from "vitest";
import { shippingQuote } from "../../src/modules/shipping/domain/shipping.js";
import { composeShipping } from "../../src/modules/shipping/shipping.module.js";
const digital = {
  quoteId: "00000000-0000-4000-8000-000000000001",
  expiresAt: "2026-10-16T12:00:00.000000Z",
  total: { currency: "BRL" as const, amountCents: 1000 },
  subtotal: { currency: "BRL" as const, amountCents: 1000 },
  delivery: null,
};
it("Shipping internal digital projection requires explicit null and exact subtotal", () => {
  expect(shippingQuote(digital)).toEqual(digital);
  const { delivery: ignored, ...old } = digital;
  expect(ignored).toBeNull();
  expect(() => shippingQuote(old)).toThrow("INTEGRATION_UNAVAILABLE");
  expect(() =>
    shippingQuote({
      ...digital,
      total: { currency: "BRL", amountCents: 1001 },
    }),
  ).toThrow("INTEGRATION_UNAVAILABLE");
});
it("Shipping refuses an unsafe monetary projection", () => {
  expect(() =>
    shippingQuote({
      ...digital,
      total: { currency: "BRL", amountCents: Number.MAX_SAFE_INTEGER + 1 },
    }),
  ).toThrow();
});
it("Shipping disabled composition cannot instantiate a store or call Identity", () => {
  expect(() =>
    composeShipping(
      {},
      {
        current: async () => {
          throw new Error("IDENTITY_MUST_NOT_RUN");
        },
      },
      {
        authorize: async () => {
          throw new Error("POLICY_MUST_NOT_RUN");
        },
      },
    ),
  ).toThrow("INTEGRATION_UNAVAILABLE");
});
