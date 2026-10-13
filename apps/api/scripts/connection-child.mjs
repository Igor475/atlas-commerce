// Disposable L0 cold-process probe only; no migrator or remote path.
import { createReadiness } from "../dist/infrastructure/persistence/probe-readiness.js";
if (process.env.CONNECTION_LOCAL_TEST !== "1")
  throw new Error("Explicit local runner required");
const probe = createReadiness(process.env);
try {
  console.log(JSON.stringify({ ready: await probe.check() }));
} finally {
  await probe.onApplicationShutdown();
}
