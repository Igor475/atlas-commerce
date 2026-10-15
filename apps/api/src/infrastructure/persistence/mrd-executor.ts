import pg, { type PoolClient } from "pg";
import {
  mkdirSync,
  writeFileSync,
  openSync,
  closeSync,
  unlinkSync,
  lstatSync,
} from "node:fs";
import { join, basename } from "node:path";
import { randomUUID } from "node:crypto";
import { catalogHashes, fixedQuery } from "./mrd-catalog.js";
import { localConfiguration, privatePath } from "./mrd-config.js";
import { projectResult } from "./mrd-results.js";
import {
  parseArguments,
  validateEnvironment,
  envelope,
  MrdError,
  fail,
  type Code,
  type Operation,
} from "./mrd-contract.js";
function errorCode(error: unknown): Code {
  if (error instanceof MrdError) return error.code;
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  const message = error instanceof Error ? error.message : "";
  if (/CERT|TLS|SSL|VERIFY|SELF_SIGNED/.test(code)) return "MRD_TLS_REJECTED";
  if (code === "57014" || /timeout/i.test(message)) return "MRD_TIMEOUT";
  return "MRD_DB_UNAVAILABLE";
}
export async function observeLocal(
  args: string[],
  input: unknown,
  env: NodeJS.ProcessEnv = process.env,
  signal?: AbortSignal,
  started = performance.now(),
) {
  let operation: Operation | null = null;
  let code: Code = "MRD_INTERNAL_ERROR";
  let data: unknown = null;
  let pool: pg.Pool | undefined;
  let client: PoolClient | undefined;
  let lock: string | undefined;
  let lockFd: number | undefined;
  let lockInode: number | undefined;
  let audit:
    ((event: string, code: Code, cleanup: boolean) => void) | undefined;
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abortListener: (() => void) | undefined;
  try {
    const parsed = parseArguments(args);
    if (parsed === "HELP")
      return envelope(
        null,
        "MRD_ARGUMENT_INVALID",
        performance.now() - started,
      );
    operation = parsed;
    validateEnvironment(env);
    const config = localConfiguration(input);
    const auditRoot = join(config.root, "audit");
    try {
      if (!lstatSync(auditRoot).isDirectory()) fail("MRD_AUDIT_FAILED");
    } catch (e) {
      if (e instanceof MrdError) throw e;
      try {
        mkdirSync(auditRoot, { mode: 0o700 });
      } catch {
        fail("MRD_AUDIT_FAILED");
      }
    }
    try {
      privatePath(auditRoot, config.root, true);
      const dir = join(auditRoot, randomUUID());
      mkdirSync(dir, { mode: 0o700 });
      audit = (event, finalCode, cleanup) => {
        const record = {
          event,
          occurredAt: new Date().toISOString(),
          contractVersion: "MRD-v1",
          runId: config.runId,
          invocationId: basename(dir),
          commit: config.commit,
          modality: "A",
          operationId: operation,
          catalogHashes,
          code: finalCode,
          status:
            event === "START"
              ? "MRD_UNVERIFIED"
              : envelope(operation, finalCode, 0).status,
          elapsedMs: Math.floor(performance.now() - started),
          cleanup,
        };
        const text = JSON.stringify(record);
        if (Buffer.byteLength(text) > 4096) fail("MRD_AUDIT_FAILED");
        try {
          writeFileSync(join(dir, event + ".json"), text, {
            flag: "wx",
            mode: 0o600,
          });
        } catch {
          fail("MRD_AUDIT_FAILED");
        }
      };
      audit("START", "MRD_OK", false);
    } catch {
      fail("MRD_AUDIT_FAILED");
    }
    lock = join(config.root, "execution.lock");
    try {
      lockFd = openSync(lock, "wx", 0o600);
      lockInode = lstatSync(lock).ino;
    } catch {
      lock = undefined;
      fail("MRD_BUSY");
    }
    pool = new pg.Pool(config.options);
    pool.on("error", () => {});
    let rejectStop: (error: MrdError) => void = () => {};
    const stopped = new Promise<never>((_resolve, reject) => {
      rejectStop = reject;
    });
    abortListener = () => {
      cancelled = true;
      rejectStop(new MrdError("MRD_INTERRUPTED"));
    };
    signal?.addEventListener("abort", abortListener, { once: true });
    if (signal?.aborted) abortListener();
    timer = setTimeout(
      () => {
        cancelled = true;
        rejectStop(new MrdError("MRD_TIMEOUT"));
      },
      Math.max(1, 15000 - (performance.now() - started)),
    );
    const acquisition = pool.connect().then((c) => {
      if (cancelled) {
        c.release(true);
        fail("MRD_TIMEOUT");
      }
      client = c;
      return c;
    });
    await Promise.race([acquisition, stopped]);
    const query = async (id: Operation) =>
      projectResult(id, await Promise.race([fixedQuery(client!, id), stopped]));
    const server = await query("SERVER_METADATA");
    const privileges = await query("PRIVILEGES_SUMMARY");
    data =
      operation === "SERVER_METADATA"
        ? server
        : operation === "PRIVILEGES_SUMMARY"
          ? privileges
          : await query(operation);
    code = "MRD_OK";
  } catch (error) {
    code = errorCode(error);
  } finally {
    if (timer) clearTimeout(timer);
    if (abortListener) signal?.removeEventListener("abort", abortListener);
    cancelled = true;
    try {
      client?.release(true);
      if (pool) {
        let endTimer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            pool.end(),
            new Promise<never>((_resolve, reject) => {
              endTimer = setTimeout(
                () => reject(new MrdError("MRD_CLEANUP_FAILED")),
                Math.max(1, 15000 - (performance.now() - started)),
              );
            }),
          ]);
        } finally {
          if (endTimer) clearTimeout(endTimer);
        }
      }
      if (lockFd !== undefined) closeSync(lockFd);
      if (lock) {
        if (
          lstatSync(lock).ino !== lockInode ||
          lstatSync(lock).isSymbolicLink()
        )
          fail("MRD_CLEANUP_FAILED");
        unlinkSync(lock);
      }
    } catch {
      code = "MRD_CLEANUP_FAILED";
    }
    if (audit) {
      try {
        audit("TERMINAL", code, code !== "MRD_CLEANUP_FAILED");
      } catch {
        if (code !== "MRD_CLEANUP_FAILED") code = "MRD_AUDIT_FAILED";
      }
    }
  }
  return envelope(operation, code, performance.now() - started, data);
}
