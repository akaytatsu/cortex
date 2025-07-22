import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger, createRequestLogger, createServiceLogger } from "./logger";

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

// Mock config
vi.mock("./config", () => ({
  config: {
    logging: {
      level: "info",
      enableConsole: true,
      enableStructured: false,
    },
  },
}));

describe("Logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(console, mockConsole);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Basic logging functionality", () => {
    it("should log info messages", () => {
      logger.info("Test message");
      expect(mockConsole.log).toHaveBeenCalledOnce();
    });

    it("should log error messages", () => {
      logger.error("Test error", new Error("Test"));
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it("should log warning messages", () => {
      logger.warn("Test warning");
      expect(mockConsole.warn).toHaveBeenCalledOnce();
    });

    it("should log debug messages when level allows", () => {
      logger.debug("Test debug");
      // Debug should not be logged when level is info
      expect(mockConsole.debug).not.toHaveBeenCalled();
    });
  });

  describe("Context handling", () => {
    it("should add context to logs", () => {
      const contextLogger = logger.withContext({ userId: "test-123" });
      contextLogger.info("Test with context");
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining("userId=test-123")
      );
    });

    it("should merge contexts properly", () => {
      const baseLogger = logger.withContext({ service: "auth" });
      const contextLogger = baseLogger.withContext({ userId: "test-123" });
      contextLogger.info("Test merged context");
      const logOutput = mockConsole.log.mock.calls[0][0];
      expect(logOutput).toContain("service=auth");
      expect(logOutput).toContain("userId=test-123");
    });
  });

  describe("Factory functions", () => {
    it("should create request logger with correlation ID", () => {
      const mockRequest = new Request("http://localhost", {
        method: "GET",
        headers: { "x-correlation-id": "test-correlation-123" },
      });

      const requestLogger = createRequestLogger(mockRequest);
      requestLogger.info("Test request log");

      const logOutput = mockConsole.log.mock.calls[0][0];
      expect(logOutput).toContain("test-correlation-123");
      expect(logOutput).toContain("method=GET");
    });

    it("should create service logger with service context", () => {
      const serviceLogger = createServiceLogger("AuthService");
      serviceLogger.info("Test service log");

      const logOutput = mockConsole.log.mock.calls[0][0];
      expect(logOutput).toContain("service=AuthService");
    });
  });

  describe("Error handling", () => {
    it("should format error objects properly", () => {
      const testError = new Error("Test error message");
      logger.error("Error occurred", testError);

      expect(mockConsole.error).toHaveBeenCalled();
      // Check that error was logged (either in main message or stack trace)
      const allCalls = mockConsole.error.mock.calls.flat().join(" ");
      expect(allCalls).toContain("Error occurred");
    });

    it("should handle undefined errors gracefully", () => {
      logger.error("Error without object");
      expect(mockConsole.error).toHaveBeenCalledOnce();
    });
  });
});
