import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock dotenv before importing config
const mockDotenvConfig = vi.fn();
vi.mock("dotenv", () => ({
  config: mockDotenvConfig,
}));

describe("Config Module", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    // Clear any existing env vars that might interfere
    delete process.env.NODE_ENV;
    // Clear module cache to ensure fresh imports
    vi.resetModules();
    // Reset dotenv mock
    mockDotenvConfig.mockClear();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    // Clear module cache to ensure fresh imports
    vi.resetModules();
  });

  describe("NODE_ENV configuration", () => {
    it("should use NODE_ENV from environment when set", async () => {
      process.env.NODE_ENV = "production";

      const { config } = await import("./config.js");

      expect(config.node.env).toBe("production");
    });

    it("should default to development when NODE_ENV is not set", async () => {
      delete process.env.NODE_ENV;

      const { config } = await import("./config.js");

      expect(config.node.env).toBe("development");
    });

    it("should default to development when NODE_ENV is empty", async () => {
      process.env.NODE_ENV = "";

      const { config } = await import("./config.js");

      expect(config.node.env).toBe("development");
    });

    it("should handle test environment", async () => {
      process.env.NODE_ENV = "test";

      const { config } = await import("./config.js");

      expect(config.node.env).toBe("test");
    });
  });

  describe("Type safety", () => {
    it("should export proper types", async () => {
      process.env.NODE_ENV = "development";

      const configModule = await import("./config.js");

      // Test that types are exported
      expect(typeof configModule.config).toBe("object");
      expect(configModule.config.node).toBeDefined();
    });

    it("should have proper structure", async () => {
      process.env.NODE_ENV = "production";

      const { config } = await import("./config.js");

      // Test config structure
      expect(config).toHaveProperty("node");
      expect(config.node).toHaveProperty("env");
      expect(["development", "production", "test"]).toContain(config.node.env);
    });
  });

  describe("Environment variable validation", () => {
    it("should handle invalid NODE_ENV gracefully", async () => {
      process.env.NODE_ENV = "invalid-env";

      // Should not throw but use default value
      const { config } = await import("./config.js");

      expect(config.node.env).toBe("development");
    });
  });

  describe("dotenv integration", () => {
    it("should call dotenv config on module load", async () => {
      // Import config module
      await import("./config.js");

      expect(mockDotenvConfig).toHaveBeenCalled();
    });
  });
});
