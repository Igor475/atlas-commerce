import { Module } from "@nestjs/common";
import {
  ProfileOrderIntegration,
  IntegrationError,
  type IntegrationPrincipal,
} from "../customer-profile/application/profile-order-integration.js";
import type { QuotePolicy } from "../quotes/application/checkout-quotes.js";
import { ShippingCheckout } from "../shipping/application/shipping-checkout.js";
import { QuoteConsumptionDatabase } from "./infrastructure/quote-consumption-database.js";
import { consumptionEnabled } from "./infrastructure/quote-consumption-config.js";
export const QUOTE_CONSUMPTION = Symbol("QUOTE_CONSUMPTION");
export function composeQuoteConsumption(
  env: NodeJS.ProcessEnv,
  identity: { current(): Promise<IntegrationPrincipal> },
  policy: QuotePolicy,
) {
  if (!consumptionEnabled(env))
    throw new IntegrationError("INTEGRATION_UNAVAILABLE");
  return new ShippingCheckout(
    new ProfileOrderIntegration(
      new QuoteConsumptionDatabase(
        env.QUSE_QUOTES_URL!,
        env.QUSE_ORDERS_URL!,
        env.QUSE_CONSENT,
        env.QUSE_FIXTURE_ROLE as "actor_a" | "actor_b",
      ),
      identity,
      policy,
    ),
  );
}
@Module({
  providers: [{ provide: QUOTE_CONSUMPTION, useValue: null }],
  exports: [QUOTE_CONSUMPTION],
})
export class QuoteConsumptionModule {}
