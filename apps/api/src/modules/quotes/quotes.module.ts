import { Module } from "@nestjs/common";
import {
  CheckoutQuotes,
  type QuoteIdentity,
  type QuotePolicy,
} from "./application/checkout-quotes.js";
import { QuoteError } from "./domain/quote.js";
import { quotesEnabled } from "./infrastructure/quote-config.js";
import { QuoteDatabase } from "./infrastructure/quote-database.js";
export const CHECKOUT_QUOTES = Symbol("CHECKOUT_QUOTES");
export function composeQuotes(
  env: NodeJS.ProcessEnv,
  identity: QuoteIdentity,
  policy: QuotePolicy,
) {
  if (!quotesEnabled(env)) throw new QuoteError("QUOTE_UNAVAILABLE");
  return new CheckoutQuotes(
    new QuoteDatabase(
      env.QUOTES_RUNTIME_URL!,
      env.QUOTES_CONSENT,
      env.QUOTES_FIXTURE_ROLE as "actor_a" | "actor_b",
    ),
    identity,
    policy,
  );
}
// Deliberately not imported by AppModule. No HTTP or real Identity/address composition.
@Module({
  providers: [{ provide: CHECKOUT_QUOTES, useValue: null }],
  exports: [CHECKOUT_QUOTES],
})
export class QuotesModule {}
