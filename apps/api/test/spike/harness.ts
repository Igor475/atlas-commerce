import { fork, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { setTimeout as pause } from "node:timers/promises";
import { createSpikeDatabase } from "../../src/infrastructure/persistence/spike-database.js";
import { PrismaSpikeRepository } from "../../src/infrastructure/persistence/spike-repository.js";
export const a = createSpikeDatabase(process.env, "pgsp-a");
export const b = createSpikeDatabase(process.env, "pgsp-b");
export const control = createSpikeDatabase(process.env, "pgsp-control");
export const ra = new PrismaSpikeRepository(a);
export const rb = new PrismaSpikeRepository(b);
export function latch() {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { wait, release };
}
export async function until(
  check: () => Promise<boolean>,
  label: string,
  timeout = 2500,
) {
  const deadline = performance.now() + timeout;
  do {
    if (await check()) return;
    await pause(10);
  } while (performance.now() < deadline);
  throw new Error("Barrier deadline: " + label);
}
export async function blocked(names: string[]) {
  await until(async () => {
    const rows = await control.client.$queryRaw<
      { name: string }[]
    >`SELECT application_name AS name FROM pg_stat_activity
    WHERE application_name = ANY(${names}::text[]) AND cardinality(pg_blocking_pids(pid)) > 0`;
    return new Set(rows.map((row) => row.name)).size === names.length;
  }, "independent PostgreSQL lock waiters");
}
export async function compete<T>(
  table: "stock" | "reservation" | "capture",
  id: string,
  first: () => Promise<T>,
  second: () => Promise<T>,
) {
  const locked = latch(),
    release = latch();
  const holder = control.client.$transaction(async (tx) => {
    if (table === "stock")
      await tx.$queryRaw`SELECT sku FROM spike.stock WHERE sku=${id} FOR UPDATE`;
    if (table === "reservation")
      await tx.$queryRaw`SELECT id FROM spike.reservation WHERE id=${id} FOR UPDATE`;
    if (table === "capture")
      await tx.$queryRaw`SELECT id FROM spike.capture WHERE id=${id} FOR UPDATE`;
    locked.release();
    await release.wait;
  });
  await locked.wait;
  const results = Promise.allSettled([first(), second()]);
  try {
    await blocked(["pgsp-a", "pgsp-b"]);
  } finally {
    release.release();
    await holder;
  }
  return results;
}
export async function stock(sku = "sku", onHand = 1) {
  await control.client.stock.create({ data: { sku, onHand } });
}
export function reserve(key: string, sku = "sku", quantity = 1) {
  return { actor: "fixture", key, lines: [{ sku, quantity }] };
}
export async function reset() {
  // Only this fixed, guarded disposable schema. Never a generic reset command.
  await control.client
    .$executeRaw`TRUNCATE spike.simulated_event, spike.reservation_line, spike.reservation,
   spike.stock, spike.refund, spike.capture, spike.outbox`;
}
export function child(mode: string, id = "") {
  return fork(
    new URL("../../scripts/spike-process.mjs", import.meta.url),
    [mode, id],
    { stdio: ["ignore", "ignore", "ignore", "ipc"], env: process.env },
  );
}
export async function message(
  process: ChildProcess,
): Promise<Record<string, unknown>> {
  const event = await Promise.race([
    once(process, "message"),
    once(process, "exit").then(() => {
      throw new Error("Fixture child exited before acknowledgement");
    }),
  ]);
  const value = event[0] as Record<string, unknown>;
  if (value.error) throw new Error("Fixture subprocess failed safely");
  return value;
}
export async function kill(process: ChildProcess) {
  const exited = once(process, "exit");
  process.kill("SIGKILL");
  await exited;
}
