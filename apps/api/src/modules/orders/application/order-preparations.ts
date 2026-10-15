import {
  OrdersError,
  orderUuid,
  preparationRequest,
  validateProjection,
  type PreparationRequest,
  type PreparedOrderIntent,
} from "../domain/preparation.js";
export interface PreparationStore {
  prepare(
    actorId: string,
    request: PreparationRequest,
    quoteId: string,
  ): Promise<PreparedOrderIntent>;
  read(actorId: string, id: string): Promise<PreparedOrderIntent>;
  close(): Promise<void>;
}
// These are server-owned application boundaries, never request-body authority.
export interface PreparationIdentity {
  principal(): Promise<{ actorId: string; purpose: "TEST_ONLY" }>;
}
export interface PreparationQuote {
  authorize(
    actorId: string,
    items: PreparationRequest["items"],
  ): Promise<{ id: string; purpose: "TEST_ONLY" }>;
}
export class OrderPreparations {
  constructor(
    private readonly store: PreparationStore,
    private readonly identity: PreparationIdentity,
    private readonly quote: PreparationQuote,
  ) {}
  private async actor() {
    const p = await this.identity.principal();
    if (p?.purpose !== "TEST_ONLY" || !orderUuid.test(p.actorId))
      throw new OrdersError("UNAUTHENTICATED");
    return p.actorId;
  }
  async prepare(input: PreparationRequest) {
    const request = preparationRequest(input),
      actor = await this.actor();
    const quote = await this.quote.authorize(actor, request.items);
    if (quote?.purpose !== "TEST_ONLY" || !orderUuid.test(quote.id))
      throw new OrdersError("PREPARATION_NOT_ELIGIBLE");
    return validateProjection(
      await this.store.prepare(actor, request, quote.id),
    );
  }
  async read(id: string) {
    if (!orderUuid.test(id)) throw new OrdersError("RESOURCE_NOT_FOUND");
    return validateProjection(await this.store.read(await this.actor(), id));
  }
  close() {
    return this.store.close();
  }
  onModuleDestroy() {
    return this.close();
  }
}
