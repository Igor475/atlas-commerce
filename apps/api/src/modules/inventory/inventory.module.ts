import { Module } from "@nestjs/common";
import {
  InventoryService,
  type AuthorizedComposition,
} from "./application/inventory-service.js";
import { InventoryError } from "./domain/inventory.js";
import { inventoryEnabled } from "./infrastructure/inventory-config.js";
import { InventoryDatabase } from "./infrastructure/inventory-database.js";
export const INVENTORY_INTERNAL = Symbol("INVENTORY_INTERNAL");
// Not imported by AppModule. No decision adapter, HTTP route, scheduler or write capability in commercial composition.
export function composeInventory(
  env: NodeJS.ProcessEnv,
  catalog: AuthorizedComposition,
) {
  if (!inventoryEnabled(env)) throw new InventoryError("INVENTORY_UNAVAILABLE");
  return new InventoryService(
    new InventoryDatabase(env.INVENTORY_RUNTIME_URL!, env.INVENTORY_CONSENT),
    catalog,
  );
}
@Module({
  providers: [{ provide: INVENTORY_INTERNAL, useValue: null }],
  exports: [INVENTORY_INTERNAL],
})
export class InventoryModule {}
