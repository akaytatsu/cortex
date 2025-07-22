import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./test-setup.ts"],
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Use jsdom for component tests
    environmentMatchGlobs: [
      ["**/*.test.tsx", "jsdom"],
    ],
    // Use different setup for DOM tests
    setupFilesAfterEnv: ["./test-setup-dom.ts"],
  },
  resolve: {
    alias: {
      "~": resolve(__dirname, "./app"),
    },
  },
});
