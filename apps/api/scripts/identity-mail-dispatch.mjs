// No dotenv, daemon, HTTP route or automatic send. Requires separate human consent.
import { composeIdentity } from "../dist/modules/identity/identity-runtime.js";
const args = process.argv.slice(2);
const intent = args.find((value) => value.startsWith("--intent="))?.slice(9);
if (
  args.length !== 2 ||
  !args.includes("--consent-resend-local-proof") ||
  !intent ||
  !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
    intent,
  )
) {
  console.error("RESEND_SEPARATE_HUMAN_CONSENT_REQUIRED");
  process.exitCode = 1;
} else {
  let runtime;
  try {
    runtime = composeIdentity(process.env);
    if (!runtime.dispatcher || !(await runtime.repository.ready()))
      throw new Error("MAIL_NOT_CONFIGURED");
    const stop = () => {
      void runtime.dispatcher.stop();
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    try {
      const outcomes = await runtime.dispatcher.runOnce(intent);
      console.info(
        outcomes.length
          ? "RESEND_RESULT_" + outcomes[0].kind
          : "RESEND_NO_ELIGIBLE_INTENT",
      );
      if (!outcomes.length || outcomes[0].kind !== "ACCEPTED")
        process.exitCode = 1;
    } finally {
      process.removeListener("SIGINT", stop);
      process.removeListener("SIGTERM", stop);
    }
  } catch {
    console.error("RESEND_DISPATCH_BLOCKED_OR_UNCERTAIN");
    process.exitCode = 1;
  } finally {
    try {
      await runtime?.onApplicationShutdown();
    } catch {
      console.error("RESEND_SHUTDOWN_UNAVAILABLE");
      process.exitCode = 1;
    }
  }
}
