import { once } from "node:events";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createSpikeDatabase,
  fixtureLimits,
  safeFixture,
  sqlState,
} from "../../src/infrastructure/persistence/spike-database.js";
import {
  PrismaSpikeRepository,
  claimFixtureOutbox,
} from "../../src/infrastructure/persistence/spike-repository.js";
import {
  a,
  b,
  control,
  ra,
  rb,
  latch,
  until,
  blocked,
  compete,
  stock,
  reserve,
  reset,
  child,
  message,
  kill,
} from "./harness.js";

describe("F04-04 isolated PostgreSQL evidence (no network PSP)", () => {
  beforeAll(async () => {
    await Promise.all([
      a.client.$connect(),
      b.client.$connect(),
      control.client.$connect(),
    ]);
    const version = await control.client.$queryRaw<
      { version: string }[]
    >`SELECT version()`;
    const connections = await Promise.all([
      a.client.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`,
      b.client.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`,
    ]);
    expect(connections[0][0]?.pid).not.toBe(connections[1][0]?.pid);
    console.log(
      "ENV",
      JSON.stringify({
        server: version[0]?.version,
        node: process.version,
        pids: connections.map((rows) => rows[0]?.pid),
        poolMax: 2,
        ...fixtureLimits,
        isolation: "ReadCommitted",
        retries: 0,
      }),
    );
  });
  beforeEach(reset);
  afterAll(async () => {
    await Promise.all([
      a.onApplicationShutdown(),
      b.onApplicationShutdown(),
      control.onApplicationShutdown(),
    ]);
  });
  it("PGSP-01 disposable migrations and constraints exist", async () => {
    const migrations = await control.client.$queryRaw<
      { name: string }[]
    >`SELECT migration_name AS name FROM spike._prisma_migrations WHERE finished_at IS NOT NULL`;
    expect(migrations.map((row) => row.name)).toContain("202610130001_spike");
    const checks = await control.client.$queryRaw<
      { name: string }[]
    >`SELECT conname AS name FROM pg_constraint WHERE connamespace='spike'::regnamespace AND contype='c'`;
    expect(checks.map((row) => row.name)).toEqual(
      expect.arrayContaining([
        "stock_capacity",
        "refund_capacity",
        "reservation_status",
      ]),
    );
    await stock();
    let state: string | undefined;
    try {
      await control.client
        .$executeRaw`UPDATE spike.stock SET reserved_active=2 WHERE sku='sku'`;
    } catch (error) {
      state = sqlState(error);
    }
    expect(state).toBe("23514");
    console.log("PGSP-01 constraint SQLSTATE", state);
  });
  it("PGSP-02 adapter generation, CRUD, independent connection and shutdown", async () => {
    const isolated = createSpikeDatabase(process.env, "pgsp-lifecycle");
    await isolated.client.$connect();
    try {
      await isolated.client.stock.create({
        data: { sku: "lifecycle", onHand: 2 },
      });
      expect(
        (
          await isolated.client.stock.findUniqueOrThrow({
            where: { sku: "lifecycle" },
          })
        ).onHand,
      ).toBe(2);
    } finally {
      await isolated.onApplicationShutdown();
    }
    const rows = await control.client.$queryRaw<
      { count: bigint }[]
    >`SELECT count(*) FROM pg_stat_activity WHERE application_name='pgsp-lifecycle'`;
    expect(rows[0]?.count).toBe(0n);
  });
  it("PGSP-03 DB-04 same TX: parameterized lock, Prisma write, raw read, joint rollback", async () => {
    const sku = "sku'; DROP TABLE spike.stock; --";
    await stock(sku, 2);
    await expect(
      a.client.$transaction(async (tx) => {
        const [start] = await tx.$queryRaw<
          { pid: number; xid: string }[]
        >`SELECT pg_backend_pid() AS pid,txid_current()::text AS xid`;
        await tx.$queryRaw`SELECT sku FROM spike.stock WHERE sku=${sku} FOR UPDATE`;
        await tx.stock.update({ where: { sku }, data: { reservedActive: 1 } });
        await tx.outbox.create({ data: { factId: sku, kind: "ATOMIC" } });
        const [end] = await tx.$queryRaw<
          { pid: number; xid: string; reserved: number }[]
        >`SELECT pg_backend_pid() AS pid,txid_current()::text AS xid,reserved_active AS reserved FROM spike.stock WHERE sku=${sku}`;
        expect(end).toEqual({ ...start, reserved: 1 });
        console.log(
          "PGSP-03 same transaction",
          JSON.stringify({
            pid: start?.pid,
            xid: start?.xid,
            rawSeesOrm: end?.reserved,
          }),
        );
        throw new Error("INDUCED_ROLLBACK");
      }),
    ).rejects.toThrow("INDUCED_ROLLBACK");
    expect(
      (await control.client.stock.findUniqueOrThrow({ where: { sku } }))
        .reservedActive,
    ).toBe(0);
    expect(await control.client.outbox.count()).toBe(0);
  });
  it("PGSP-04 DB-001 two blocked independent clients contest the last SKU", async () => {
    await stock();
    const results = await compete(
      "stock",
      "sku",
      () => ra.reserve(reserve("a")),
      () => rb.reserve(reserve("b")),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toEqual([
      expect.objectContaining({
        reason: expect.objectContaining({ code: "OUT_OF_STOCK" }),
      }),
    ]);
    expect(await control.client.reservation.count()).toBe(1);
    expect(await control.client.outbox.count()).toBe(1);
    const balance = await control.client.stock.findUniqueOrThrow({
      where: { sku: "sku" },
    });
    expect(balance.reservedActive).toBe(1);
    expect(balance.onHand).toBe(1);
    const row = await control.client.reservation.findFirstOrThrow();
    expect(row.expiresAt.getTime() - row.createdAt.getTime()).toBe(
      40 * 60 * 1000,
    );
    console.log(
      "PGSP-04",
      JSON.stringify({
        fulfilled: 1,
        rejected: 1,
        reserved: balance.reservedActive,
        ttlMs: row.expiresAt.getTime() - row.createdAt.getTime(),
      }),
    );
  });
  it("PGSP-05 DB-002 unrelated SKU commits while first SKU is locked", async () => {
    await stock("a");
    await stock("b");
    const ready = latch(),
      release = latch();
    const holder = a.client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT sku FROM spike.stock WHERE sku='a' FOR UPDATE`;
      ready.release();
      await release.wait;
    });
    await ready.wait;
    try {
      const other = await rb.reserve(reserve("independent", "b"));
      expect(other.status).toBe("ACTIVE");
    } finally {
      release.release();
      await holder;
    }
  });
  it("PGSP-06 DB-003 kit rollback for two and three SKUs includes all facts/outbox", async () => {
    await stock("a", 2);
    await stock("b", 0);
    await stock("c", 2);
    for (const lines of [
      [
        { sku: "a", quantity: 1 },
        { sku: "b", quantity: 1 },
      ],
      [
        { sku: "c", quantity: 1 },
        { sku: "b", quantity: 1 },
        { sku: "a", quantity: 1 },
      ],
    ]) {
      await expect(
        ra.reserve({ actor: "kit", key: "failure", lines }),
      ).rejects.toMatchObject({ code: "OUT_OF_STOCK" });
      expect(await control.client.reservation.count()).toBe(0);
      expect(await control.client.reservationLine.count()).toBe(0);
      expect(await control.client.outbox.count()).toBe(0);
      expect(
        (await control.client.stock.findMany()).every(
          (row) => row.reservedActive === 0,
        ),
      ).toBe(true);
    }
  });
  it("PGSP-07 DB-004/009 aggregate duplicates and use stable order for opposite kits", async () => {
    await stock("a", 4);
    await stock("b", 2);
    const first = {
      actor: "kit",
      key: "one",
      lines: [
        { sku: "b", quantity: 1 },
        { sku: "a", quantity: 1 },
        { sku: "a", quantity: 1 },
      ],
    };
    const second = {
      actor: "kit",
      key: "two",
      lines: [
        { sku: "a", quantity: 2 },
        { sku: "b", quantity: 1 },
      ],
    };
    const results = await compete(
      "stock",
      "a",
      () => ra.reserve(first),
      () => rb.reserve(second),
    );
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    expect(await control.client.reservationLine.count()).toBe(4);
    expect(
      (await control.client.stock.findUniqueOrThrow({ where: { sku: "a" } }))
        .reservedActive,
    ).toBe(4);
  });
  it("PGSP-08 DB-005/006 simulated persisted payment versus expiration has one terminal", async () => {
    for (const expired of [false, true]) {
      await reset();
      await stock();
      const row = await ra.reserve(reserve("race"));
      if (expired)
        await control.client
          .$executeRaw`UPDATE spike.reservation SET expires_at=clock_timestamp()-interval '1 second' WHERE id=${row.id}`;
      const results = await compete(
        "reservation",
        row.id,
        () => ra.simulatedPayment(row.id, "event"),
        () => rb.expire(row.id),
      );
      expect(results.every((r) => r.status === "fulfilled")).toBe(true);
      const final = await control.client.reservation.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(final.status).toBe(expired ? "EXPIRED" : "CONFIRMED");
      expect(await rb.simulatedPayment(row.id, "event")).toBe(
        expired ? "PAYMENT_REVIEW" : "CONFIRMED",
      );
      await Promise.all([ra.expire(row.id), rb.expire(row.id)]);
      const balance = await control.client.stock.findUniqueOrThrow({
        where: { sku: "sku" },
      });
      expect(balance.reservedActive).toBe(0);
      expect(balance.allocated).toBe(expired ? 0 : 1);
      expect(await control.client.simulatedEvent.count()).toBe(1);
      expect(
        await control.client.outbox.count({
          where: { kind: expired ? "EXPIRED" : "CONFIRMED" },
        }),
      ).toBe(1);
      if (expired)
        await expect(
          control.client.reservation.update({
            where: { id: row.id },
            data: { status: "CONFIRMED" },
          }),
        ).rejects.toBeDefined();
    }
  });
  it("PGSP-09 DB-007/008 transaction starts before TTL and reevaluates PostgreSQL time after lock", async () => {
    await stock();
    const row = await ra.reserve(reserve("ttl"));
    await control.client
      .$executeRaw`UPDATE spike.reservation SET expires_at=clock_timestamp()+interval '1 second' WHERE id=${row.id}`;
    const locked = latch(),
      release = latch();
    const holder = b.client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM spike.reservation WHERE id=${row.id} FOR UPDATE`;
      locked.release();
      await release.wait;
    });
    await locked.wait;
    const confirmation = ra.simulatedPayment(row.id, "late-event");
    let proof: unknown;
    try {
      await blocked(["pgsp-a"]);
      const [start] = await control.client.$queryRaw<
        { before: boolean }[]
      >`SELECT s.xact_start < r.expires_at AS before FROM pg_stat_activity s CROSS JOIN spike.reservation r WHERE s.application_name='pgsp-a' AND cardinality(pg_blocking_pids(s.pid))>0 AND r.id=${row.id}`;
      expect(start?.before).toBe(true);
      await until(async () => {
        const [r] = await control.client.$queryRaw<
          { expired: boolean }[]
        >`SELECT clock_timestamp()>=expires_at AS expired FROM spike.reservation WHERE id=${row.id}`;
        return r?.expired === true;
      }, "server clock crosses TTL");
      proof = await control.client
        .$queryRaw`SELECT s.xact_start,r.expires_at,clock_timestamp() AS post_lock_release FROM pg_stat_activity s CROSS JOIN spike.reservation r WHERE s.application_name='pgsp-a' AND cardinality(pg_blocking_pids(s.pid))>0 AND r.id=${row.id}`;
    } finally {
      release.release();
      await holder;
    }
    expect(await confirmation).toBe("PAYMENT_REVIEW");
    expect(
      (
        await control.client.reservation.findUniqueOrThrow({
          where: { id: row.id },
        })
      ).status,
    ).toBe("EXPIRED");
    console.log("PGSP-09 server time proof", JSON.stringify(proof));
  });
  it("PGSP-10 DB-010/011 durable concurrent idempotency and fingerprint conflict", async () => {
    await stock("sku", 3);
    const input = reserve("same");
    const results = await compete(
      "stock",
      "sku",
      () => ra.reserve(input),
      () => rb.reserve(input),
    );
    expect(results[0]?.status).toBe("fulfilled");
    expect(results[1]).toEqual(results[0]);
    const first = await ra.reserve(input);
    expect((await rb.reserve(input)).id).toBe(first.id);
    await expect(
      rb.reserve({ ...input, lines: [{ sku: "sku", quantity: 2 }] }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    expect(await control.client.reservation.count()).toBe(1);
    expect(await control.client.outbox.count()).toBe(1);
  });
  it("PGSP-11 DB-014 capture 10000, succeeded 3000, pending 5000, concurrent requests 2000", async () => {
    await control.client.capture.create({
      data: {
        id: "capture",
        capturedCents: 10000,
        succeededCents: 3000,
        pendingCents: 5000,
      },
    });
    const results = await compete(
      "capture",
      "capture",
      () => ra.reserveRefund("capture", "a", 2000),
      () => rb.reserveRefund("capture", "b", 2000),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toEqual([
      expect.objectContaining({
        reason: expect.objectContaining({ code: "REFUND_BALANCE" }),
      }),
    ]);
    expect(await control.client.refund.count()).toBe(1);
    const accepted = await control.client.refund.findFirstOrThrow();
    expect(await ra.reserveRefund("capture", accepted.key, 2000)).toBe(
      accepted.id,
    );
    await expect(
      rb.reserveRefund("capture", accepted.key, 1000),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    expect(
      (
        await control.client.capture.findUniqueOrThrow({
          where: { id: "capture" },
        })
      ).pendingCents,
    ).toBe(7000);
    expect((await control.client.refund.findFirstOrThrow()).status).toBe(
      "PENDING",
    );
    await expect(
      control.client
        .$executeRaw`UPDATE spike.capture SET pending_cents=7001 WHERE id='capture'`,
    ).rejects.toBeDefined();
    console.log(
      "PGSP-11 cents",
      JSON.stringify({
        captured: 10000,
        succeeded: 3000,
        pending: 7000,
        remaining: 0,
        accepted: 1,
      }),
    );
  });
  it("PGSP-12 DB-018 commit survives killed process, outbox replay has durable identity", async () => {
    await stock();
    const writer = child("commit");
    let id: string;
    try {
      const event = await message(writer);
      id = String(event.committed);
    } finally {
      await kill(writer);
    }
    const restarted = child("inspect", id!);
    const exited = once(restarted, "exit");
    expect(await message(restarted)).toMatchObject({ count: 1 });
    await exited;
    expect(await control.client.reservation.count()).toBe(1);
    const [claim] = await ra.claim("first", 1);
    expect(claim).toBeDefined();
    await control.client
      .$executeRaw`UPDATE spike.outbox SET lease_until=clock_timestamp()-interval '1 second' WHERE id=${claim}`;
    expect(await rb.claim("replay", 1)).toEqual([claim]);
    console.log(
      "PGSP-12 persisted after process crash",
      JSON.stringify({ fact: id!, outboxId: claim, replayed: claim }),
    );
  });
  it("PGSP-13 DB-019 SKIP LOCKED on outbox only, overlapping real transactions", async () => {
    await control.client.outbox.createMany({
      data: [
        { id: "one", factId: "one", kind: "TEST" },
        { id: "two", factId: "two", kind: "TEST" },
      ],
    });
    const ready = latch(),
      release = latch();
    const first = a.client.$transaction(async (tx) => {
      const ids = await claimFixtureOutbox(tx, "a", 1);
      expect(ids).toEqual(["one"]);
      ready.release();
      await release.wait;
      return ids;
    });
    await ready.wait;
    let second: string[];
    try {
      second = await rb.claim("b", 1);
      expect(second).toEqual(["two"]);
    } finally {
      release.release();
    }
    expect(await first).toEqual(["one"]);
    expect(await ra.claim("third", 1)).toEqual([]);
  });
  it("PGSP-14 driver pool max=1 timeout, terminated backend, killed open TX and restart", async () => {
    const small = createSpikeDatabase(
      { ...process.env, SPIKE_POOL_MAX: "1" },
      "pgsp-small",
    );
    const rsmall = new PrismaSpikeRepository(small);
    await small.client.$connect();
    await stock();
    const held = latch(),
      release = latch();
    const holder = small.client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1`;
      held.release();
      await release.wait;
    });
    await held.wait;
    const start = performance.now();
    try {
      await expect(
        rsmall.reserve(reserve("pool-timeout")),
      ).rejects.toMatchObject({ code: "DB_UNAVAILABLE" });
    } finally {
      release.release();
      await holder;
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeGreaterThan(100);
    expect(elapsed).toBeLessThan(2500);
    expect(await control.client.reservation.count()).toBe(0);
    const active = latch(),
      finish = latch();
    let backend = 0;
    const broken = safeFixture(() =>
      small.client.$transaction(async (tx) => {
        const [row] = await tx.$queryRaw<
          { pid: number }[]
        >`SELECT pg_backend_pid() AS pid`;
        backend = row!.pid;
        await tx.stock.update({
          where: { sku: "sku" },
          data: { reservedActive: 1 },
        });
        active.release();
        await finish.wait;
        await tx.outbox.create({ data: { factId: "lost", kind: "LOST" } });
      }),
    );
    const failure = expect(broken).rejects.toMatchObject({
      code: "DB_UNAVAILABLE",
    });
    await active.wait;
    await control.client.$queryRaw`SELECT pg_terminate_backend(${backend})`;
    finish.release();
    await failure;
    expect(
      (await small.client.stock.findUniqueOrThrow({ where: { sku: "sku" } }))
        .reservedActive,
    ).toBe(0);
    expect(await small.client.outbox.count()).toBe(0);
    await small.onApplicationShutdown();
    const writer = child("uncommitted");
    try {
      expect(await message(writer)).toMatchObject({ uncommitted: true });
    } finally {
      await kill(writer);
    }
    await until(async () => {
      const [row] = await control.client.$queryRaw<
        { count: bigint }[]
      >`SELECT count(*) FROM pg_stat_activity WHERE application_name='pgsp-child'`;
      return row?.count === 0n;
    }, "killed process backend cleanup");
    expect(
      (await control.client.stock.findUniqueOrThrow({ where: { sku: "sku" } }))
        .reservedActive,
    ).toBe(0);
    expect(await control.client.outbox.count()).toBe(0);
    const restarted = child("inspect", "uncommitted");
    const exited = once(restarted, "exit");
    expect(await message(restarted)).toMatchObject({ count: 0 });
    await exited;
    console.log(
      "PGSP-14",
      JSON.stringify({
        poolMax: 1,
        acquireFailureMs: elapsed,
        connectionKilled: true,
        transactionRolledBack: true,
        processRestarted: true,
      }),
    );
  });
  it("PGSP-15 isolated gate and simple reservation latency sample (30, no SLA claim)", async () => {
    const samples: number[] = [];
    for (let i = 0; i < 30; i++) {
      await stock("bench-" + i);
      const start = performance.now();
      await ra.reserve(reserve("bench-" + i, "bench-" + i));
      samples.push(performance.now() - start);
    }
    samples.sort((x, y) => x - y);
    expect(await control.client.reservation.count()).toBe(30);
    console.log(
      "BENCH",
      JSON.stringify({
        n: 30,
        p50Ms: samples[14],
        p95Ms: samples[28],
        unit: "reservation TX, sequential local",
        includesNetwork: true,
      }),
    );
  });
  it("PGSP-16 DB-027/028 partial baseline restores only disposable fixture data", async () => {
    await stock();
    const intent = await ra.reserve(reserve("baseline"));
    expect(intent.status).toBe("ACTIVE");
    await reset();
    expect(await control.client.stock.count()).toBe(0);
    expect(await control.client.reservation.count()).toBe(0);
    expect(await control.client.outbox.count()).toBe(0);
    await stock();
    expect((await rb.reserve(reserve("fresh"))).status).toBe("ACTIVE");
    // This proves a clean fixture baseline; production backup/restore is out of scope.
  });
});
