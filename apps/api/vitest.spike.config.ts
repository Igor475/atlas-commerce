import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    disableConsoleIntercept: true,
    include: ["test/spike/**/*.pg.spec.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
