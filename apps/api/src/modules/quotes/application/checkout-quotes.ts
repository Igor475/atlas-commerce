import {
  QuoteError,
  quoteUuid,
  quoteRequest,
  quoteProjection,
  type QuoteRequest,
  type QuoteResult,
} from "../domain/quote.js";
export interface QuoteIdentity {
  principal(): Promise<{ actorId: string; purpose: "TEST_ONLY" }>;
}
// Server-owned fixture selection; this is never part of QuoteRequest or browser authority.
export interface QuotePolicy {
  authorize(
    actor: string,
  ): Promise<{ policyId: string; option: string | null; purpose: "TEST_ONLY" }>;
}
export interface QuoteStore {
  issue(
    actor: string,
    input: ReturnType<typeof quoteRequest>,
    policy: string,
    option: string | null,
  ): Promise<QuoteResult>;
  read(actor: string, id: string): Promise<QuoteResult>;
  close(): Promise<void>;
}
export class CheckoutQuotes {
  constructor(
    private readonly store: QuoteStore,
    private readonly identity: QuoteIdentity,
    private readonly policy: QuotePolicy,
  ) {}
  private async actor() {
    const p = await this.identity.principal();
    if (p?.purpose !== "TEST_ONLY" || !quoteUuid.test(p.actorId))
      throw new QuoteError("UNAUTHENTICATED");
    return p.actorId;
  }
  async issue(request: QuoteRequest) {
    const input = quoteRequest(request),
      actor = await this.actor(),
      policy = await this.policy.authorize(actor);
    if (
      policy?.purpose !== "TEST_ONLY" ||
      !quoteUuid.test(policy.policyId) ||
      (policy.option !== null && !/^TEST_[A-Z_]{1,40}$/.test(policy.option))
    )
      throw new QuoteError("QUOTE_REJECTED");
    return quoteProjection(
      await this.store.issue(actor, input, policy.policyId, policy.option),
    );
  }
  async read(id: string) {
    if (!quoteUuid.test(id)) throw new QuoteError("RESOURCE_NOT_FOUND");
    return quoteProjection(await this.store.read(await this.actor(), id));
  }
  close() {
    return this.store.close();
  }
  onModuleDestroy() {
    return this.close();
  }
}
