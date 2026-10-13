// Disposable process-crash experiment only; never imported by the HTTP bootstrap.
import { createSpikeDatabase } from "../dist/infrastructure/persistence/spike-database.js";
import { PrismaSpikeRepository } from "../dist/infrastructure/persistence/spike-repository.js";
const db = createSpikeDatabase(process.env, "pgsp-child");
const [mode, id] = process.argv.slice(2);
try {
  if (mode === "commit") {
    const intent = await new PrismaSpikeRepository(db).reserve({
      actor: "child",
      key: "crash",
      lines: [{ sku: "sku", quantity: 1 }],
    });
    process.send?.({ committed: intent.id });
    await new Promise((resolve) => process.once("message", resolve));
  } else if (mode === "uncommitted") {
    await db.client.$transaction(async (tx) => {
      await tx.stock.update({
        where: { sku: "sku" },
        data: { reservedActive: { increment: 1 } },
      });
      await tx.outbox.create({
        data: { factId: "uncommitted", kind: "CRASH" },
      });
      process.send?.({ uncommitted: true });
      await new Promise((resolve) => process.once("message", resolve));
    });
  } else if (mode === "inspect") {
    const count = await db.client.outbox.count({ where: { factId: id } });
    process.send?.({ count });
  } else throw new Error("Invalid fixture mode");
} catch {
  process.send?.({ error: "DB_UNAVAILABLE" });
  process.exitCode = 1;
} finally {
  await db.onApplicationShutdown();
  process.disconnect?.();
}
