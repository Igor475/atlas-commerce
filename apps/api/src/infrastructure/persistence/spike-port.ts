// Technical experiment port, not a public API or commercial domain contract.
export interface FixtureLine {
  sku: string;
  quantity: number;
}
export interface ReserveFixture {
  actor: string;
  key: string;
  lines: FixtureLine[];
}
export type ReservationState = "ACTIVE" | "CONFIRMED" | "EXPIRED" | "RELEASED";
export interface FixtureIntent {
  id: string;
  status: ReservationState;
  expiresAt: Date;
}
export interface SpikePort {
  reserve(input: ReserveFixture): Promise<FixtureIntent>;
  expire(id: string): Promise<ReservationState>;
  simulatedPayment(
    id: string,
    eventId: string,
  ): Promise<"CONFIRMED" | "PAYMENT_REVIEW">;
  reserveRefund(captureId: string, key: string, cents: number): Promise<string>;
  claim(owner: string, limit: number): Promise<string[]>;
}
export type FixtureErrorCode =
  | "INVALID_INPUT"
  | "IDEMPOTENCY_CONFLICT"
  | "OUT_OF_STOCK"
  | "REFUND_BALANCE"
  | "NOT_FOUND"
  | "DB_UNAVAILABLE"
  | "TX_REPLAY_REQUIRED";
export class FixtureError extends Error {
  constructor(
    public readonly code: FixtureErrorCode,
    public readonly sqlState?: string,
  ) {
    super(code);
    this.name = "FixtureError";
  }
}
