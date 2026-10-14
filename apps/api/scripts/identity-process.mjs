// Cold-process persistence proof, usable only against the dedicated disposable DB.
import { PrismaIdentityRepository } from "../dist/modules/identity/infrastructure/identity-database.js";
if (process.env.IDENTITY_DISPOSABLE !== "1" || process.env.NODE_ENV !== "test")
  throw new Error("IDENTITY_TEST_PROCESS_REQUIRED");
let input = "";
for await (const chunk of process.stdin) {
  input += chunk;
  if (input.length > 256) throw new Error("IDENTITY_TEST_INPUT_INVALID");
}
const { key } = JSON.parse(input);
if (typeof key !== "string" || !/^[a-f0-9]{64}$/.test(key))
  throw new Error("IDENTITY_TEST_INPUT_INVALID");
const repository = new PrismaIdentityRepository("atlas-id01-cold-process");
try {
  const delay = await repository.limit(key, 900, 5);
  process.stdout.write(JSON.stringify({ limited: delay !== undefined }));
} finally {
  await repository.close();
}
