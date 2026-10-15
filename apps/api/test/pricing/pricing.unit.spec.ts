import { describe, it, expect } from "vitest";
import {
  publicPrice,
  MAX_CENTS,
  type PriceRow,
} from "../../src/modules/pricing/domain/price.js";
import { PublicPrices } from "../../src/modules/pricing/application/public-prices.js";
const id = "00000000-0000-4000-8000-000000000001";
const row: PriceRow = {
  productId: id,
  amountCents: 1001n,
  currency: "BRL",
  source: "DEMO_PRIC01",
};
describe("PRIC money and batch boundary", () => {
  it("converts safe bigint exactly, including maximum", () => {
    expect(publicPrice(row).amountCents).toBe(1001);
    expect(publicPrice({ ...row, amountCents: MAX_CENTS }).amountCents).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });
  for (const value of [-1n, MAX_CENTS + 1n, NaN, Infinity, 1.5, "1001", 0n])
    it(`refuses invalid or unapproved zero ${String(value)}`, () =>
      expect(() =>
        publicPrice({ ...row, amountCents: value as bigint }),
      ).toThrow("DEPENDENCY_UNAVAILABLE"));
  it("rejects currency and provenance", () => {
    expect(() => publicPrice({ ...row, currency: "USD" })).toThrow();
    expect(() => publicPrice({ ...row, source: "" })).toThrow();
  });
  it("refuses incomplete, duplicated and alien batches", async () => {
    for (const rows of [
      [],
      [row, row],
      [{ ...row, productId: "00000000-0000-4000-8000-000000000002" }],
    ])
      await expect(
        new PublicPrices({
          current: async () => rows,
          close: async () => {},
        }).read([id]),
      ).rejects.toThrow();
  });
  it("validates IDs/cardinality before repository and empty result without IO", async () => {
    let calls = 0;
    const read = new PublicPrices({
      current: async () => {
        calls++;
        return [row];
      },
      close: async () => {},
    });
    for (const ids of [
      [id, id],
      ["';DROP TABLE pricing.price_revision"],
      Array(101).fill(id),
    ])
      await expect(read.read(ids)).rejects.toThrow();
    expect((await read.read([])).size).toBe(0);
    expect(calls).toBe(0);
    expect((await read.read([id])).get(id)?.amountCents).toBe(1001);
    expect(calls).toBe(1);
  });
});
