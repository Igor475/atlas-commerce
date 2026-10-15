import { describe, it, expect } from "vitest";
import {
  quoteRequest,
  quoteProjection,
  type QuoteRequest,
} from "../../src/modules/quotes/domain/quote.js";
const id = "00000000-0000-4000-8000-000000000001";
describe("Quote domain money and input boundary", () => {
  it("rejects coupon even empty and all browser money authority", () => {
    for (const bad of [
      { items: [{ productId: id, quantity: 1 }], total: 1 },
      { items: [{ productId: id, quantity: 1, price: 1 }] },
      { items: [{ productId: id, quantity: 1 }], couponCode: "" },
    ])
      expect(() => quoteRequest(bad as unknown as QuoteRequest)).toThrow();
  });
  it("rejects fractional, unsafe, excessive and duplicate overflow quantities", () => {
    for (const quantity of [0, -1, 1.5, 10000, Number.MAX_SAFE_INTEGER])
      expect(() =>
        quoteRequest({ items: [{ productId: id, quantity }] }),
      ).toThrow("INVALID_QUOTE");
    expect(() =>
      quoteRequest({
        items: [
          { productId: id, quantity: 9999 },
          { productId: id, quantity: 1 },
        ],
      }),
    ).toThrow("INVALID_QUOTE");
  });
  it("canonical quantities copy input rather than trust caller mutation", () => {
    const request = {
      items: [
        { productId: id, quantity: 2 },
        { productId: id, quantity: 3 },
      ],
    };
    const normalized = quoteRequest(request);
    request.items[0]!.quantity = 8;
    expect(normalized.items).toEqual([{ id, quantity: 5 }]);
  });
  it("rejects invalid/zero/unsafe Money and untrusted expiry", () => {
    const valid = {
      quoteId: id,
      expiresAt: "2026-10-15T12:00:00.000000Z",
      total: { currency: "BRL" as const, amountCents: 1 },
    };
    expect(quoteProjection(valid)).toEqual(valid);
    for (const amountCents of [0, -1, 1.2, Number.MAX_SAFE_INTEGER + 1])
      expect(() =>
        quoteProjection({ ...valid, total: { currency: "BRL", amountCents } }),
      ).toThrow("QUOTE_UNAVAILABLE");
    expect(() => quoteProjection({ ...valid, expiresAt: "bad" })).toThrow(
      "QUOTE_UNAVAILABLE",
    );
  });
});
