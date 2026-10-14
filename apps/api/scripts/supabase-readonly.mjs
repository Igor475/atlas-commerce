// Manual diagnostic only; no dotenv, migrations, SDK or web activation.
import { readFileSync } from "node:fs";
import {
  l1Options,
  L1Error,
} from "../dist/infrastructure/persistence/l1-config.js";
import { L1Diagnostic } from "../dist/infrastructure/persistence/l1-diagnostic.js";
let diagnostic;
try {
  if (!process.version.startsWith("v24.")) throw new L1Error("NODE24_REQUIRED");
  if (!process.env.ATLAS_SUPABASE_REVIEW_FILE)
    throw new L1Error("BLOCKED_NO_PROJECT_OR_READONLY_ROLE");
  const review = JSON.parse(
    readFileSync(process.env.ATLAS_SUPABASE_REVIEW_FILE, "utf8"),
  );
  const options = l1Options(process.env, process.argv.slice(2), review);
  diagnostic = new L1Diagnostic(options, review.role, review.exposedSchemas);
  const result = await diagnostic.check();
  console.log(JSON.stringify(result));
  process.exitCode = result.ready ? 0 : 1;
} catch (error) {
  console.log(
    JSON.stringify({
      ready: false,
      status: 503,
      code: error instanceof L1Error ? error.code : "L1_CONFIGURATION_INVALID",
    }),
  );
  process.exitCode = 1;
} finally {
  await diagnostic?.close();
}
