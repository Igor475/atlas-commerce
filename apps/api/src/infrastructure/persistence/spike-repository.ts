import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "./generated/client.js";
import type { SpikeDatabase } from "./spike-database.js";
import { safeFixture } from "./spike-database.js";
import { FixtureError } from "./spike-port.js";
import type {
  FixtureLine,
  FixtureIntent,
  ReserveFixture,
  ReservationState,
  SpikePort,
} from "./spike-port.js";

type Tx = Prisma.TransactionClient;
function text(value: string) {
  if (!value || value.length > 128) throw new FixtureError("INVALID_INPUT");
}
function positive(value: number) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 2147483647)
    throw new FixtureError("INVALID_INPUT");
}
export function aggregateLines(lines: FixtureLine[]): FixtureLine[] {
  if (lines.length === 0 || lines.length > 100)
    throw new FixtureError("INVALID_INPUT");
  const sums = new Map<string, number>();
  for (const line of lines) {
    text(line.sku);
    positive(line.quantity);
    const total = (sums.get(line.sku) ?? 0) + line.quantity;
    positive(total);
    sums.set(line.sku, total);
  }
  return [...sums]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([sku, quantity]) => ({ sku, quantity }));
}
async function lockStocks(tx: Tx, lines: FixtureLine[]) {
  for (const { sku } of lines) {
    const rows = await tx.$queryRaw<
      { sku: string }[]
    >`SELECT sku FROM spike.stock WHERE sku = ${sku} FOR UPDATE`;
    if (rows.length !== 1) throw new FixtureError("OUT_OF_STOCK");
  }
}
function intent(row: {
  id: string;
  status: string;
  expiresAt: Date;
}): FixtureIntent {
  return {
    id: row.id,
    status: row.status as ReservationState,
    expiresAt: row.expiresAt,
  };
}
// Shared by the adapter and the overlapping-transaction experiment.
export async function claimFixtureOutbox(
  tx: Tx,
  owner: string,
  limit: number,
): Promise<string[]> {
  text(owner);
  positive(limit);
  if (limit > 100) throw new FixtureError("INVALID_INPUT");
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM spike.outbox
   WHERE lease_until IS NULL OR lease_until < clock_timestamp()
   ORDER BY created_at,id LIMIT ${limit} FOR UPDATE SKIP LOCKED`;
  const ids = rows.map((row) => row.id);
  for (const id of ids)
    await tx.$executeRaw`UPDATE spike.outbox SET owner=${owner}, lease_until=clock_timestamp()+interval '30 seconds' WHERE id=${id}`;
  return ids;
}
export class PrismaSpikeRepository implements SpikePort {
  constructor(private readonly db: SpikeDatabase) {}
  reserve(input: ReserveFixture): Promise<FixtureIntent> {
    text(input.actor);
    text(input.key);
    const lines = aggregateLines(input.lines);
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(lines))
      .digest("hex");
    return safeFixture(() =>
      this.db.client.$transaction(async (tx) => {
        const id = randomUUID();
        const inserted = await tx.$queryRaw<
          { id: string }[]
        >`INSERT INTO spike.reservation(id,actor,operation,key,fingerprint)
     VALUES (${id},${input.actor},'reserve',${input.key},${fingerprint}) ON CONFLICT (actor,operation,key) DO NOTHING RETURNING id`;
        if (!inserted.length) {
          const old = await tx.reservation.findUniqueOrThrow({
            where: {
              actor_operation_key: {
                actor: input.actor,
                operation: "reserve",
                key: input.key,
              },
            },
          });
          if (old.fingerprint !== fingerprint)
            throw new FixtureError("IDEMPOTENCY_CONFLICT");
          return intent(old);
        }
        await lockStocks(tx, lines);
        for (const { sku, quantity } of lines) {
          const changed =
            await tx.$executeRaw`UPDATE spike.stock SET reserved_active=reserved_active + ${quantity}
       WHERE sku=${sku} AND on_hand::bigint - reserved_active::bigint - allocated::bigint >= ${quantity}`;
          if (changed !== 1) throw new FixtureError("OUT_OF_STOCK");
          await tx.reservationLine.create({
            data: { reservationId: id, sku, quantity },
          });
        }
        // TTL starts after inventory locks, using one server timestamp for both columns.
        await tx.$executeRaw`UPDATE spike.reservation SET created_at=t.current, expires_at=t.current + interval '40 minutes'
     FROM (SELECT clock_timestamp() AS current) t WHERE id=${id}`;
        await tx.outbox.create({ data: { factId: id, kind: "RESERVED" } });
        return intent(
          await tx.reservation.findUniqueOrThrow({ where: { id } }),
        );
      }),
    );
  }
  expire(id: string): Promise<ReservationState> {
    text(id);
    return safeFixture(() =>
      this.db.client.$transaction((tx) => this.transition(tx, id, false)),
    );
  }
  simulatedPayment(
    id: string,
    eventId: string,
  ): Promise<"CONFIRMED" | "PAYMENT_REVIEW"> {
    text(id);
    text(eventId);
    return safeFixture(() =>
      this.db.client.$transaction(async (tx) => {
        // Same reservation lock also serializes locally persisted simulated evidence.
        const rows = await tx.$queryRaw<
          { id: string }[]
        >`SELECT id FROM spike.reservation WHERE id=${id} FOR UPDATE`;
        if (!rows.length) throw new FixtureError("NOT_FOUND");
        const prior = await tx.simulatedEvent.findUnique({
          where: { id: eventId },
        });
        if (prior) {
          if (prior.reservationId !== id)
            throw new FixtureError("IDEMPOTENCY_CONFLICT");
          return prior.outcome as "CONFIRMED" | "PAYMENT_REVIEW";
        }
        const state = await this.transition(tx, id, true);
        const outcome = state === "CONFIRMED" ? "CONFIRMED" : "PAYMENT_REVIEW";
        await tx.simulatedEvent.create({
          data: { id: eventId, reservationId: id, outcome },
        });
        // Persist a review fact only; no PSP, fulfillment or real refund implementation.
        if (outcome === "PAYMENT_REVIEW")
          await tx.outbox.upsert({
            where: { factId_kind: { factId: id, kind: "PAYMENT_REVIEW" } },
            create: { factId: id, kind: "PAYMENT_REVIEW" },
            update: {},
          });
        return outcome;
      }),
    );
  }
  private async transition(
    tx: Tx,
    id: string,
    confirm: boolean,
  ): Promise<ReservationState> {
    const rows = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM spike.reservation WHERE id=${id} FOR UPDATE`;
    if (!rows.length) throw new FixtureError("NOT_FOUND");
    const row = await tx.reservation.findUniqueOrThrow({
      where: { id },
      include: { lines: true },
    });
    if (row.status !== "ACTIVE") return row.status as ReservationState;
    const lines = aggregateLines(row.lines);
    await lockStocks(tx, lines);
    // All potentially blocking business locks precede the authoritative clock read.
    const [clock] = await tx.$queryRaw<
      { current: Date }[]
    >`SELECT clock_timestamp() AS current`;
    if (!clock) throw new FixtureError("DB_UNAVAILABLE");
    const expired = clock.current >= row.expiresAt;
    if (!confirm && !expired) return "ACTIVE";
    const status = expired ? "EXPIRED" : "CONFIRMED";
    for (const { sku, quantity } of lines)
      await tx.stock.update({
        where: { sku },
        data: {
          reservedActive: { decrement: quantity },
          ...(status === "CONFIRMED"
            ? { allocated: { increment: quantity } }
            : {}),
        },
      });
    await tx.reservation.update({ where: { id }, data: { status } });
    await tx.outbox.create({ data: { factId: id, kind: status } });
    return status;
  }
  reserveRefund(
    captureId: string,
    key: string,
    cents: number,
  ): Promise<string> {
    text(captureId);
    text(key);
    positive(cents);
    return safeFixture(() =>
      this.db.client.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<
          { id: string }[]
        >`SELECT id FROM spike.capture WHERE id=${captureId} FOR UPDATE`;
        if (!rows.length) throw new FixtureError("NOT_FOUND");
        const prior = await tx.refund.findUnique({
          where: { captureId_key: { captureId, key } },
        });
        if (prior) {
          if (prior.cents !== cents)
            throw new FixtureError("IDEMPOTENCY_CONFLICT");
          return prior.id;
        }
        const changed =
          await tx.$executeRaw`UPDATE spike.capture SET pending_cents=pending_cents + ${cents}
     WHERE id=${captureId} AND captured_cents::bigint - succeeded_cents::bigint - pending_cents::bigint >= ${cents}`;
        if (changed !== 1) throw new FixtureError("REFUND_BALANCE");
        const refund = await tx.refund.create({
          data: { captureId, key, cents },
        });
        await tx.outbox.create({
          data: { factId: refund.id, kind: "REFUND_RESERVED" },
        });
        return refund.id;
      }),
    );
  }
  claim(owner: string, limit: number): Promise<string[]> {
    text(owner);
    positive(limit);
    if (limit > 100) throw new FixtureError("INVALID_INPUT");
    return safeFixture(() =>
      this.db.client.$transaction((tx) => claimFixtureOutbox(tx, owner, limit)),
    );
  }
}
