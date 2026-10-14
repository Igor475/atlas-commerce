import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/supabase-l1/*.integration.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
    disableConsoleIntercept: true,
  },
});
