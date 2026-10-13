import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["test/spike/**"],
    include: ["test/**/*.spec.ts", "src/**/*.spec.ts"],
  },
});
