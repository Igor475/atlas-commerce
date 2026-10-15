// Only invoked by the guarded disposable suite. No destination argument or dotenv.
import pg from "pg";
const client = new pg.Client({
  host: "127.0.0.1",
  port: 55439,
  database: "atlas_catalog_cat01",
  user: "atlas_inventory_runtime",
  password: "",
  ssl: false,
  application_name: "atlas-inventory-crash-proof",
  connectionTimeoutMillis: 1000,
});
await client.connect();
const proof = (
  await client.query(
    "SELECT current_setting('atlas.inventory_fixture',true) marker",
  )
).rows[0];
if (proof?.marker !== "atlas-inv01-disposable")
  throw new Error("INVENTORY_FIXTURE_REQUIRED");
process.on("message", async (data) => {
  if (!data || data.action !== "reserve") return;
  await client.query("BEGIN");
  await client.query("SELECT * FROM inventory.reserve($1,$2,$3,$4)", [
    data.key,
    data.ref,
    data.fingerprint,
    JSON.stringify(data.lines),
  ]);
  process.send?.("UNCOMMITTED");
});
process.send?.("READY");
