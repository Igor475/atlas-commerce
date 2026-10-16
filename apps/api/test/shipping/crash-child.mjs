import pg from "pg";
const [mode, actor, key, quote] = process.argv.slice(2);
if (!["before", "after"].includes(mode) || process.argv.length !== 6)
  throw new Error("SHIP_CHILD_INVALID");
const c = new pg.Client({
  host: "127.0.0.1",
  port: 55439,
  database: "atlas_catalog_cat01",
  user: "atlas_orders_actor_a",
  password: "",
  ssl: false,
  connectionTimeoutMillis: 1000,
  statement_timeout: 3000,
  application_name: "cpint-crash",
});
await c.connect();
if (
  (
    await c.query(
      "SELECT current_setting('atlas.shipping_fixture',true) marker",
    )
  ).rows[0].marker !== "atlas-ship01-disposable"
)
  throw new Error("SHIP_FIXTURE_REQUIRED");
await c.query("BEGIN");
await c.query("SELECT orders.prepare_shipping_quote($1,$2,$3)", [
  actor,
  key,
  quote,
]);
if (mode === "after") await c.query("COMMIT");
process.send?.({ boundary: mode });
setInterval(() => {}, 1000);
