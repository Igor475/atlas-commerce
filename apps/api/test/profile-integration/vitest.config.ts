import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/profile-integration/*.integration.ts"],
    fileParallelism: false,
    testTimeout: 25000,
    hookTimeout: 30000,
  },
});
