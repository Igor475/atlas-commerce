import pg from "pg";
const [mode, actor, key, quote, items] = process.argv.slice(2);
if (!["before", "after"].includes(mode) || process.argv.length !== 7)
  throw new Error("ORDERS_CHILD_INVALID");
const c = new pg.Client({
  host: "127.0.0.1",
  port: 55439,
  database: "atlas_catalog_cat01",
  user: "atlas_orders_actor_a",
  password: "",
  ssl: false,
  connectionTimeoutMillis: 1000,
  application_name: "ord-crash",
  statement_timeout: 2500,
});
await c.connect();
if (
  (await c.query("SELECT current_setting('atlas.orders_fixture',true) marker"))
    .rows[0].marker !== "atlas-ord01-disposable"
)
  throw new Error("ORDERS_FIXTURE_REQUIRED");
await c.query("BEGIN");
await c.query("SELECT orders.prepare($1,$2,$3,$4::jsonb)", [
  actor,
  key,
  quote,
  items,
]);
if (mode === "after") await c.query("COMMIT");
process.send?.({ boundary: mode });
// Parent kills this process at a deterministic boundary. No application result is delivered.
setInterval(() => {}, 1000);
