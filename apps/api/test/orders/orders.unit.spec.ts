import { describe, it, expect } from "vitest";
import {
  preparationRequest,
  validateProjection,
  type PreparedOrderIntent,
  type PreparationRequest,
} from "../../src/modules/orders/domain/preparation.js";
import { OrderPreparations } from "../../src/modules/orders/application/order-preparations.js";
const id = "00000000-0000-4000-8000-000000000001";
const digital = (): PreparedOrderIntent => ({
  id,
  kind: "TEST_ONLY_PREPARATION",
  baseSubtotal: { currency: "BRL", amountCents: 1000 },
  reservationExpiresAt: null,
  lines: [
    {
      productId: id,
      sku: "TEST_ONLY",
      title: "TEST_ONLY",
      productType: "EBOOK",
      editionId: id,
      quantity: 1,
      baseUnitCents: 1000,
      components: [],
    },
  ],
});
describe("Orders domain and server boundaries", () => {
  it("canonicalizes copies, consolidates quantities and forbids browser authority", () => {
    const req = {
      key: id,
      items: [
        { id, quantity: 1 },
        { id, quantity: 2 },
      ],
    };
    expect(preparationRequest(req).items).toEqual([{ id, quantity: 3 }]);
    req.items[0]!.quantity = 9;
    expect(() =>
      preparationRequest({ ...req, owner: id } as PreparationRequest),
    ).toThrow("INVALID_PREPARATION");
    expect(() =>
      preparationRequest({
        key: id,
        items: [
          { id, quantity: 9999 },
          { id, quantity: 1 },
        ],
      }),
    ).toThrow("INVALID_PREPARATION");
  });
  it("validates safe money and missing/null expiry without inventing digital TTL", () => {
    expect(validateProjection(digital()).reservationExpiresAt).toBeNull();
    const r = digital();
    delete (r as Partial<PreparedOrderIntent>).reservationExpiresAt;
    expect(() => validateProjection(r)).toThrow("ORDERS_UNAVAILABLE");
    expect(() =>
      validateProjection({
        ...digital(),
        baseSubtotal: { currency: "BRL", amountCents: 2000 },
      }),
    ).toThrow("ORDERS_UNAVAILABLE");
  });
  it("rejects malformed components and physical null expiry", () => {
    const r = digital();
    r.lines[0]!.productType = "PHYSICAL_BOOK";
    expect(() => validateProjection(r)).toThrow("ORDERS_UNAVAILABLE");
    const k = digital();
    k.lines[0]!.productType = "KIT";
    k.lines[0]!.editionId = null;
    expect(() => validateProjection(k)).toThrow("ORDERS_UNAVAILABLE");
  });
  it("requires trusted server actor and trusted TEST_ONLY quote", async () => {
    const store = {
      prepare: async () => digital(),
      read: async () => digital(),
      close: async () => {},
    };
    const s = new OrderPreparations(
      store,
      { principal: async () => ({ actorId: "forged", purpose: "TEST_ONLY" }) },
      { authorize: async () => ({ id, purpose: "TEST_ONLY" }) },
    );
    await expect(
      s.prepare({ key: id, items: [{ id, quantity: 1 }] }),
    ).rejects.toThrow("UNAUTHENTICATED");
    const bad = new OrderPreparations(
      store,
      { principal: async () => ({ actorId: id, purpose: "TEST_ONLY" }) },
      { authorize: async () => ({ id: "bad", purpose: "TEST_ONLY" }) },
    );
    await expect(
      bad.prepare({ key: id, items: [{ id, quantity: 1 }] }),
    ).rejects.toThrow("PREPARATION_NOT_ELIGIBLE");
  });
});
