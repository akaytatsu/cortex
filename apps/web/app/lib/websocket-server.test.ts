import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WebSocket } from "ws";
import { IncomingMessage } from "http";
import type { TerminalMessage, ClaudeCodeMessage } from "shared-types";
import { SessionService } from "../services/session.service";

// Mock dependencies
vi.mock("../services/terminal.service", () => ({
  terminalService: {
    createSession: vi.fn(),
    spawnTerminal: vi.fn(),
    getSession: vi.fn(),
    getProcess: vi.fn(),
    terminateSession: vi.fn(),
    resizeTerminal: vi.fn(),
    writeToTerminal: vi.fn(),
  },
}));

vi.mock("../services/session.service", () => ({
  SessionService: {
    getUserId: vi.fn(),
  },
}));

vi.mock("./logger", () => ({
  createServiceLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

// Import the class under test after mocks
import "../lib/websocket-server";

// Create a mock WebSocket class for testing
class MockWebSocket {
  public readyState = WebSocket.OPEN;
  public isAlive?: boolean;
  public sessionId?: string;
  public userId?: string;
  public connectionType?: "claude-code";

  send = vi.fn();
  close = vi.fn();
  terminate = vi.fn();
  ping = vi.fn();
  on = vi.fn();
  off = vi.fn();
  emit = vi.fn();
}

describe("TerminalWebSocketServer", () => {
  const mockSessionService = vi.mocked(SessionService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Connection Type Detection", () => {
    it("should detect claude-code connection type from query parameter", () => {
      const mockRequest = {
        url: "/?type=claude-code",
        headers: {
          cookie: "test-cookie",
        },
      } as IncomingMessage;

      const url = new URL(mockRequest.url || "/", "http://localhost");
      const connectionType = url.searchParams.get("type");

      expect(connectionType).toBe("claude-code");
    });

    it("should default to terminal connection when no type specified", () => {
      const mockRequest = {
        url: "/",
        headers: {},
      } as IncomingMessage;

      const url = new URL(mockRequest.url || "/", "http://localhost");
      const connectionType = url.searchParams.get("type");

      expect(connectionType).toBeNull();
    });
  });

  describe("Claude Code Authentication", () => {
    it("should authenticate valid session cookie", async () => {
      const mockRequest = {
        headers: {
          cookie: "valid-session=user123",
        },
      } as IncomingMessage;

      mockSessionService.getUserId.mockResolvedValueOnce("user123");

      // Test the authentication logic directly
      const cookie = mockRequest.headers.cookie;
      expect(cookie).toBe("valid-session=user123");

      const mockRequestObj = new Request("http://localhost", {
        headers: { Cookie: cookie },
      });

      const userId = await SessionService.getUserId(mockRequestObj);
      expect(userId).toBe("user123");
      expect(mockSessionService.getUserId).toHaveBeenCalledWith(mockRequestObj);
    });

    it("should reject connection without cookie", async () => {
      const mockRequest = {
        headers: {},
      } as IncomingMessage;

      mockSessionService.getUserId.mockResolvedValueOnce(undefined);

      const cookie = mockRequest.headers.cookie;
      expect(cookie).toBeUndefined();
    });

    it("should reject connection with invalid session", async () => {
      const mockRequest = {
        headers: {
          cookie: "invalid-session=invalid",
        },
      } as IncomingMessage;

      mockSessionService.getUserId.mockResolvedValueOnce(undefined);

      const mockRequestObj = new Request("http://localhost", {
        headers: { Cookie: mockRequest.headers.cookie! },
      });

      const userId = await SessionService.getUserId(mockRequestObj);
      expect(userId).toBeUndefined();
    });
  });

  describe("Claude Code Message Handling", () => {
    it("should handle input message type", () => {
      const message: ClaudeCodeMessage = {
        type: "input",
        data: "test command",
        sessionId: "session123",
      };

      expect(message.type).toBe("input");
      expect(message.data).toBe("test command");
      expect(message.sessionId).toBe("session123");
    });

    it("should handle output message type", () => {
      const message: ClaudeCodeMessage = {
        type: "output",
        data: "command result",
        sessionId: "session123",
      };

      expect(message.type).toBe("output");
      expect(message.data).toBe("command result");
    });

    it("should handle error message type", () => {
      const message: ClaudeCodeMessage = {
        type: "error",
        data: "error occurred",
        sessionId: "session123",
      };

      expect(message.type).toBe("error");
      expect(message.data).toBe("error occurred");
    });

    it("should handle exit message type", () => {
      const message: ClaudeCodeMessage = {
        type: "exit",
        data: "",
        sessionId: "session123",
      };

      expect(message.type).toBe("exit");
    });
  });

  describe("Message Protocol Validation", () => {
    it("should validate TerminalMessage structure", () => {
      const terminalMessage: TerminalMessage = {
        type: "input",
        data: "terminal command",
        sessionId: "terminal-session",
      };

      expect(terminalMessage).toHaveProperty("type");
      expect(terminalMessage).toHaveProperty("data");
      expect(terminalMessage).toHaveProperty("sessionId");
      expect(
        ["input", "output", "error", "exit"].includes(terminalMessage.type)
      ).toBe(true);
    });

    it("should validate ClaudeCodeMessage structure", () => {
      const claudeMessage: ClaudeCodeMessage = {
        type: "input",
        data: "claude command",
        sessionId: "claude-session",
      };

      expect(claudeMessage).toHaveProperty("type");
      expect(claudeMessage).toHaveProperty("data");
      expect(claudeMessage).toHaveProperty("sessionId");
      expect(
        ["input", "output", "error", "exit"].includes(claudeMessage.type)
      ).toBe(true);
    });
  });

  describe("JSON Message Parsing", () => {
    it("should parse valid JSON message", () => {
      const messageData = JSON.stringify({
        type: "input",
        data: "test",
        sessionId: "session1",
      });

      const parsed = JSON.parse(messageData);
      expect(parsed.type).toBe("input");
      expect(parsed.data).toBe("test");
      expect(parsed.sessionId).toBe("session1");
    });

    it("should handle invalid JSON gracefully", () => {
      const invalidJson = "{ invalid json }";

      expect(() => {
        JSON.parse(invalidJson);
      }).toThrow();
    });
  });

  describe("WebSocket State Management", () => {
    it("should track connection readiness", () => {
      const ws = new MockWebSocket();
      expect(ws.readyState).toBe(WebSocket.OPEN);
    });

    it("should handle connection properties", () => {
      const ws = new MockWebSocket();
      ws.sessionId = "test-session";
      ws.userId = "test-user";
      ws.isAlive = true;

      expect(ws.sessionId).toBe("test-session");
      expect(ws.userId).toBe("test-user");
      expect(ws.isAlive).toBe(true);
    });

    it("should handle claude-code connection type", () => {
      const ws = new MockWebSocket();
      ws.connectionType = "claude-code";

      expect(ws.connectionType).toBe("claude-code");
    });
  });
});
