import { Module } from "@nestjs/common";
import {
  OrderPreparations,
  type PreparationIdentity,
  type PreparationQuote,
} from "./application/order-preparations.js";
import { OrdersError } from "./domain/preparation.js";
import { ordersEnabled } from "./infrastructure/orders-config.js";
import { OrdersDatabase } from "./infrastructure/orders-database.js";
export const ORDER_PREPARATIONS = Symbol("ORDER_PREPARATIONS");
// Not imported by AppModule. No commercial actor/quote, HTTP or payment composition.
export function composeOrders(
  env: NodeJS.ProcessEnv,
  identity: PreparationIdentity,
  quote: PreparationQuote,
) {
  if (!ordersEnabled(env)) throw new OrdersError("ORDERS_UNAVAILABLE");
  const role = env.ORDERS_FIXTURE_ROLE as "actor_a" | "actor_b";
  return new OrderPreparations(
    new OrdersDatabase(env.ORDERS_RUNTIME_URL!, env.ORDERS_CONSENT, role),
    identity,
    quote,
  );
}
@Module({
  providers: [{ provide: ORDER_PREPARATIONS, useValue: null }],
  exports: [ORDER_PREPARATIONS],
})
export class OrdersModule {}
