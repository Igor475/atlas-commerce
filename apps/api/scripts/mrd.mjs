// Manual local CLI. No NestJS startup import, dotenv, subprocess or remote path.
const started = performance.now();
let result;
let envelope;
try {
  const contract =
    await import("../dist/infrastructure/persistence/mrd-contract.js");
  envelope = contract.envelope;
  contract.validateEnvironment(process.env);
  const args = process.argv.slice(2);
  const operation = contract.parseArguments(args);
  if (operation === "HELP") {
    process.stdout.write(
      "MRD local: --profile=local-disposable --consent-local=MRD-G2 --operation=PING|SERVER_METADATA|PRIVILEGES_SUMMARY|SCHEMA_EXPOSURE_SUMMARY\n",
    );
  } else {
    const input = await new Promise((resolve, reject) => {
      let text = "";
      const timer = setTimeout(
        () => {
          process.stdin.destroy();
          reject(new contract.MrdError("MRD_CONFIGURATION_INVALID"));
        },
        Math.max(1, 1000 - (performance.now() - started)),
      );
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => {
        text += chunk;
        if (Buffer.byteLength(text) > 4096) {
          clearTimeout(timer);
          process.stdin.destroy();
          reject(new contract.MrdError("MRD_CONFIGURATION_INVALID"));
        }
      });
      process.stdin.once("error", () => {
        clearTimeout(timer);
        reject(new contract.MrdError("MRD_CONFIGURATION_INVALID"));
      });
      process.stdin.once("end", () => {
        clearTimeout(timer);
        try {
          resolve(JSON.parse(text));
        } catch {
          reject(new contract.MrdError("MRD_CONFIGURATION_INVALID"));
        }
      });
    });
    const controller = new AbortController();
    const stop = () => controller.abort();
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    try {
      const { observeLocal } =
        await import("../dist/infrastructure/persistence/mrd-executor.js");
      result = await observeLocal(
        args,
        input,
        process.env,
        controller.signal,
        started,
      );
    } finally {
      process.removeListener("SIGINT", stop);
      process.removeListener("SIGTERM", stop);
    }
  }
} catch (error) {
  const codes =
    await import("../dist/infrastructure/persistence/mrd-contract.js").catch(
      () => null,
    );
  if (envelope && codes)
    result = envelope(
      null,
      error instanceof codes.MrdError ? error.code : "MRD_INTERNAL_ERROR",
      performance.now() - started,
    );
  else {
    process.stderr.write("MRD_INTERNAL_ERROR\n");
    process.exitCode = 1;
  }
}
if (result) {
  process.exitCode =
    result.code === "MRD_OK"
      ? 0
      : result.code === "MRD_INTERRUPTED"
        ? 130
        : result.status === "MRD_BLOCKED"
          ? 2
          : 1;
  process.stdout.on("error", () => {
    process.exitCode = 1;
  });
  process.stdout.write(JSON.stringify(result) + "\n");
}
