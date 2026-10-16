import { Module } from "@nestjs/common";
import {
  ProfileOrderIntegration,
  IntegrationError,
  type IntegrationPrincipal,
} from "./application/profile-order-integration.js";
import { ProfileIntegrationDatabase } from "./infrastructure/profile-integration-database.js";
import { integrationEnabled } from "./infrastructure/profile-integration-config.js";
import type { QuotePolicy } from "../quotes/application/checkout-quotes.js";
export const PROFILE_ORDERS = Symbol("PROFILE_ORDERS");
export function composeProfileOrders(
  env: NodeJS.ProcessEnv,
  identity: { current(): Promise<IntegrationPrincipal> },
  policy: QuotePolicy,
) {
  if (!integrationEnabled(env))
    throw new IntegrationError("INTEGRATION_UNAVAILABLE");
  return new ProfileOrderIntegration(
    new ProfileIntegrationDatabase(
      env.CPINT_QUOTES_URL!,
      env.CPINT_ORDERS_URL!,
      env.CPINT_CONSENT,
      env.CPINT_FIXTURE_ROLE as "actor_a" | "actor_b",
    ),
    identity,
    policy,
  );
}
@Module({
  providers: [{ provide: PROFILE_ORDERS, useValue: null }],
  exports: [PROFILE_ORDERS],
})
export class ProfileOrdersModule {}
