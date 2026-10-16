import { ProfileOrderIntegration } from "../../customer-profile/application/profile-order-integration.js";
import type { QuoteRequest } from "../../quotes/domain/quote.js";
import { shippingQuote, shippingPreparation } from "../domain/shipping.js";

export class ShippingCheckout {
  constructor(private readonly integration: ProfileOrderIntegration) {}
  async issue(request: QuoteRequest) {
    return shippingQuote(await this.integration.issue(request));
  }
  async quote(id: string) {
    return shippingQuote(await this.integration.quote(id));
  }
  async prepare(request: { key: string; quoteId: string }) {
    return shippingPreparation(await this.integration.prepare(request));
  }
  async read(id: string) {
    return shippingPreparation(await this.integration.read(id));
  }
  close() {
    return this.integration.close();
  }
}
