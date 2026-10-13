import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const port = 3102;
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["dist/main.js"], {
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});

let diagnostics = "";
child.stdout.on("data", (chunk) => {
  diagnostics += String(chunk);
});
child.stderr.on("data", (chunk) => {
  diagnostics += String(chunk);
});

async function waitForLive() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health/live`);
      if (response.status === 200) {
        return;
      }
    } catch {
      // O processo pode ainda estar inicializando.
    }
    await delay(100);
  }

  throw new Error(`A API não iniciou para o smoke test.\n${diagnostics}`);
}

try {
  await waitForLive();

  const live = await fetch(`${baseUrl}/health/live`);
  const ready = await fetch(`${baseUrl}/health/ready`);

  if (live.status !== 200 || (await live.json()).status !== "ok") {
    throw new Error("Liveness não retornou o contrato esperado.");
  }

  const readyBody = await ready.json();
  if (
    ready.status !== 503 ||
    readyBody.code !== "DEPENDENCIES_NOT_CONFIGURED"
  ) {
    throw new Error("Readiness anunciou dependências inexistentes.");
  }

  console.log("Smoke API: live=200; ready=503 DEPENDENCIES_NOT_CONFIGURED");
} finally {
  child.kill("SIGTERM");
}
