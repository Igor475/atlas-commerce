import { Module } from "@nestjs/common";
import {
  ProfileOrderIntegration,
  IntegrationError,
  type IntegrationPrincipal,
} from "../customer-profile/application/profile-order-integration.js";
import type { QuotePolicy } from "../quotes/application/checkout-quotes.js";
import { ShippingCheckout } from "./application/shipping-checkout.js";
import { ShippingDatabase } from "./infrastructure/shipping-database.js";
import { shippingEnabled } from "./infrastructure/shipping-config.js";
export const SHIPPING = Symbol("SHIPPING");
export function composeShipping(
  env: NodeJS.ProcessEnv,
  identity: { current(): Promise<IntegrationPrincipal> },
  policy: QuotePolicy,
) {
  if (!shippingEnabled(env))
    throw new IntegrationError("INTEGRATION_UNAVAILABLE");
  return new ShippingCheckout(
    new ProfileOrderIntegration(
      new ShippingDatabase(
        env.SHIP_QUOTES_URL!,
        env.SHIP_ORDERS_URL!,
        env.SHIP_CONSENT,
        env.SHIP_FIXTURE_ROLE as "actor_a" | "actor_b",
      ),
      identity,
      policy,
    ),
  );
}
@Module({
  providers: [{ provide: SHIPPING, useValue: null }],
  exports: [SHIPPING],
})
export class ShippingModule {}
