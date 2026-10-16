import { Module } from "@nestjs/common";
import {
  CustomerAddresses,
  type CustomerPrincipalSource,
} from "./application/customer-addresses.js";
import { ProfileDatabase } from "./infrastructure/profile-database.js";
import { profileEnabled } from "./infrastructure/profile-config.js";
import { ProfileError } from "./domain/address.js";
export const CUSTOMER_ADDRESSES = Symbol("CUSTOMER_ADDRESSES");
export function composeProfile(
  env: NodeJS.ProcessEnv,
  identity: CustomerPrincipalSource,
) {
  if (!profileEnabled(env)) throw new ProfileError("PROFILE_UNAVAILABLE");
  return new CustomerAddresses(
    new ProfileDatabase(
      env.PROFILE_RUNTIME_URL!,
      env.PROFILE_CONSENT,
      env.PROFILE_FIXTURE_ROLE as "actor_a" | "actor_b",
    ),
    identity,
  );
}
// Not imported by AppModule. No HTTP controller or real Identity composition.
@Module({
  providers: [{ provide: CUSTOMER_ADDRESSES, useValue: null }],
  exports: [CUSTOMER_ADDRESSES],
})
export class CustomerProfileModule {}
