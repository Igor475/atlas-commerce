import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/mrd/*.integration.ts"],
    fileParallelism: false,
    testTimeout: 25000,
    hookTimeout: 30000,
    disableConsoleIntercept: true,
  },
});
