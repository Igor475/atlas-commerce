import { describe, it, expect } from "vitest";
import {
  expand,
  type Intent,
  type Offer,
} from "../../src/modules/inventory/domain/inventory.js";
import { InventoryService } from "../../src/modules/inventory/application/inventory-service.js";
import {
  inventoryEnabled,
  inventoryUrl,
} from "../../src/modules/inventory/infrastructure/inventory-config.js";
const a = "00000000-0000-4000-8000-000000000001",
  b = "00000000-0000-4000-8000-000000000002";
const intent: Intent = {
  key: a,
  commercialRef: b,
  items: [{ id: a, quantity: 2 }],
};
const physical: Offer = { id: a, type: "PHYSICAL_BOOK", version: 1 };
describe("Inventory domain and closed configuration", () => {
  it("rejects malformed structures with controlled domain error", () => {
    for (const bad of [null, { ...intent, items: [null] }])
      expect(() => expand(bad as unknown as Intent, new Map())).toThrow(
        "INVALID_INTENT",
      );
    for (const components of ["invalid", [null]])
      expect(() =>
        expand(
          intent,
          new Map([
            [
              a,
              {
                id: a,
                type: "KIT",
                version: 1,
                components,
              } as unknown as Offer,
            ],
          ]),
        ),
      ).toThrow("INVALID_INTENT");
    expect(() =>
      expand(intent, new Map([[a, { ...physical, components: [] }]])),
    ).toThrow("INVALID_INTENT");
  });
  it("snapshots intention before asynchronous composition lookup", async () => {
    const original: Intent = {
      ...intent,
      items: intent.items.map((i) => ({ ...i })),
    };
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const service = new InventoryService(
      {
        reserve: async (value) => {
          expect(value).toEqual(intent);
          return { id: a, state: "ACTIVE", expiresAt: "2026-10-15T00:40:00Z" };
        },
        expire: async () => {
          throw new Error();
        },
        close: async () => {},
      },
      {
        read: async () => {
          await gate;
          return new Map([[a, physical]]);
        },
      },
    );
    const pending = service.reserve(original);
    original.commercialRef = a;
    original.items[0]!.quantity = 9;
    release();
    expect((await pending).state).toBe("ACTIVE");
  });
  it("consolidates and sorts physical units", () =>
    expect(
      expand(
        { ...intent, items: [...intent.items, { id: a, quantity: 3 }] },
        new Map([[a, physical]]),
      ),
    ).toEqual([{ sku: a, quantity: 5 }]));
  it("rejects unsafe quantities before storage", () => {
    for (const quantity of [0, -1, NaN, Infinity, 1.5, 2147483648])
      expect(() =>
        expand(
          { ...intent, items: [{ id: a, quantity }] },
          new Map([[a, physical]]),
        ),
      ).toThrow("INVALID_INTENT");
  });
  it("rejects missing and alien Catalog offers", () => {
    expect(() => expand(intent, new Map())).toThrow();
    expect(() =>
      expand(intent, new Map([[a, { ...physical, id: b }]])),
    ).toThrow();
  });
  it("rejects nested and repeated kit components", () => {
    for (const components of [
      [{ id: a, type: "KIT", quantity: 1 }],
      [
        { id: b, type: "PHYSICAL_BOOK", quantity: 1 },
        { id: b, type: "PHYSICAL_BOOK", quantity: 1 },
      ],
    ])
      expect(() =>
        expand(
          intent,
          new Map([
            [a, { id: a, type: "KIT", version: 1, components } as Offer],
          ]),
        ),
      ).toThrow();
  });
  it("guards multiplication overflow", () =>
    expect(() =>
      expand(
        { ...intent, items: [{ id: a, quantity: 2147483647 }] },
        new Map([
          [
            a,
            {
              id: a,
              type: "KIT",
              version: 1,
              components: [{ id: b, type: "PHYSICAL_BOOK", quantity: 2 }],
            },
          ],
        ]),
      ),
    ).toThrow());
  it("does not invent stock for digital offers", () =>
    expect(
      expand(intent, new Map([[a, { ...physical, type: "EBOOK" }]])),
    ).toEqual([]));
  it("rejects malformed identity and future composition version", () => {
    expect(() =>
      expand({ ...intent, key: "x" }, new Map([[a, physical]])),
    ).toThrow();
    expect(() =>
      expand(intent, new Map([[a, { ...physical, version: 2 }]])),
    ).toThrow();
  });
  it("defaults disabled and refuses production", () => {
    expect(inventoryEnabled({})).toBe(false);
    expect(() =>
      inventoryEnabled({
        INVENTORY_MODE: "local-disposable",
        INVENTORY_CONSENT: "INV-01",
        NODE_ENV: "production",
      }),
    ).toThrow();
  });
  it("refuses remote and arbitrary connection parameters", () => {
    for (const value of [
      "postgresql://atlas_inventory_runtime@remote:55439/atlas_catalog_cat01?schema=inventory",
      "postgresql://atlas_inventory_runtime@127.0.0.1:55439/atlas_catalog_cat01?schema=inventory&sslmode=disable",
    ])
      expect(() => inventoryUrl(value, "INV-01")).toThrow();
  });
  it("cannot confirm using a boolean or business reference without trusted decision adapter", async () => {
    const service = new InventoryService(
      {
        reserve: async () => {
          throw new Error();
        },
        expire: async () => {
          throw new Error();
        },
        close: async () => {},
      },
      { read: async () => new Map() },
    );
    await expect(service.transition(a, "CONFIRMED")).rejects.toThrow(
      "DECISION_DENIED",
    );
  });
});
