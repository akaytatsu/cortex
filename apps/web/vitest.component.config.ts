import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["**/components/*.test.{ts,tsx}"],
    setupFiles: ["./test-setup-components.ts"],
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      "~": resolve(__dirname, "./app"),
      "shared-types": resolve(__dirname, "../../packages/shared-types"),
    },
  },
});