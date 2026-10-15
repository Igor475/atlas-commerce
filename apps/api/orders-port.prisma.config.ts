import { defineConfig } from "prisma/config";
import {
  ordersPortUrl,
  type OrdersPhase,
} from "./src/modules/orders/infrastructure/orders-config.ts";
const phase = process.env.ORDERS_PORT_PHASE as OrdersPhase;
const url = ordersPortUrl(
  process.env.ORDERS_PORT_URL ?? "",
  process.env.ORDERS_CONSENT,
  phase,
);
export default defineConfig({
  schema: "prisma-orders-ports/schema.prisma",
  migrations: { path: `prisma-orders-ports/${phase}/migrations` },
  datasource: { url },
});
