import { describe, it, expect, beforeEach, vi } from "vitest";
import { loader } from "./api.agents.$workspace";
import { serviceContainer } from "../lib/service-container";
import { SessionService } from "../services/session.service";
import type { AgentListResponse } from "shared-types";

// Mock dependencies
vi.mock("../lib/service-container");
vi.mock("../services/session.service");

const mockServiceContainer = vi.mocked(serviceContainer);
const mockSessionService = vi.mocked(SessionService);

describe("API Agents Loader Integration", () => {
  const mockRequest = new Request(
    "http://localhost:3000/api/agents/test-workspace"
  );
  const mockParams = { workspace: "test-workspace" };
  const mockUserId = "test-user-id";

  const mockWorkspaceData = {
    name: "test-workspace",
    path: "/path/to/workspace",
  };

  const mockAgentResponse: AgentListResponse = {
    agents: [
      {
        name: "TestAgent",
        description: "A test agent",
        command: "/test-command",
      },
    ],
    metadata: {
      cacheTimestamp: "2023-01-01T10:00:00Z",
      fileLastModified: "2023-01-01T09:00:00Z",
      version: "1.0.0",
      fromCache: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset global rate limit store
    (global as any).rateLimitStore = new Map();

    // Mock SessionService
    mockSessionService.requireUserId.mockResolvedValue(mockUserId);

    // Mock service container methods
    const mockWorkspaceService = {
      getWorkspaceByName: vi.fn().mockResolvedValue(mockWorkspaceData),
    };

    const mockAgentService = {
      getAgentsWithMetadata: vi.fn().mockResolvedValue(mockAgentResponse),
    };

    const mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
    };

    mockServiceContainer.getWorkspaceService.mockReturnValue(
      mockWorkspaceService as any
    );
    mockServiceContainer.getAgentService.mockReturnValue(
      mockAgentService as any
    );
    mockServiceContainer.getLogger.mockReturnValue(mockLogger as any);
  });

  it("successfully loads agents for valid workspace", async () => {
    const response = await loader({
      request: mockRequest,
      params: mockParams,
    } as any);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.agents).toHaveLength(1);
    expect(data.agents[0].name).toBe("TestAgent");
    expect(data.metadata.userId).toBe(mockUserId);
    expect(data.metadata.responseTimeMs).toBeGreaterThan(0);
  });

  it("returns 400 when workspace parameter is missing", async () => {
    const response = await loader({
      request: mockRequest,
      params: {},
    } as any);

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error.code).toBe("WORKSPACE_PARAMETER_MISSING");
    expect(data.error.message).toBe("Workspace parameter is required");
  });

  it("returns 404 when workspace is not found", async () => {
    const mockWorkspaceService = {
      getWorkspaceByName: vi.fn().mockResolvedValue(null),
    };
    mockServiceContainer.getWorkspaceService.mockReturnValue(
      mockWorkspaceService as any
    );

    const response = await loader({
      request: mockRequest,
      params: mockParams,
    } as any);

    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error.code).toBe("WORKSPACE_NOT_FOUND");
    expect(data.error.message).toBe("Workspace 'test-workspace' not found");
  });

  it("handles authentication failures", async () => {
    mockSessionService.requireUserId.mockRejectedValue(
      new Error("Authentication failed")
    );

    const response = await loader({
      request: mockRequest,
      params: mockParams,
    } as any);

    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error.code).toBe("INTERNAL_SERVER_ERROR");
  });

  it("implements rate limiting correctly", async () => {
    // Make multiple requests quickly
    const requests = Array.from({ length: 31 }, () =>
      loader({
        request: mockRequest,
        params: mockParams,
      } as any)
    );

    const responses = await Promise.all(requests);

    // The last request should be rate limited
    const lastResponse = responses[responses.length - 1];
    expect(lastResponse.status).toBe(429);

    const data = await lastResponse.json();
    expect(data.error.code).toBe("RATE_LIMIT_EXCEEDED");
  });

  it("includes proper rate limit headers", async () => {
    const response = await loader({
      request: mockRequest,
      params: mockParams,
    } as any);

    expect(response.headers.has("X-RateLimit-Limit")).toBe(true);
    expect(response.headers.has("X-RateLimit-Remaining")).toBe(true);
    expect(response.headers.has("X-RateLimit-Reset")).toBe(true);
  });

  it("handles agent service errors gracefully", async () => {
    const mockAgentService = {
      getAgentsWithMetadata: vi
        .fn()
        .mockRejectedValue(new Error("Agent service failed")),
    };
    mockServiceContainer.getAgentService.mockReturnValue(
      mockAgentService as any
    );

    const response = await loader({
      request: mockRequest,
      params: mockParams,
    } as any);

    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error.code).toBe("INTERNAL_SERVER_ERROR");
  });

  it("logs request metrics properly", async () => {
    const mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    mockServiceContainer.getLogger.mockReturnValue(mockLogger as any);

    await loader({
      request: mockRequest,
      params: mockParams,
    } as any);

    expect(mockLogger.info).toHaveBeenCalledWith(
      "Agents loaded via API",
      expect.objectContaining({
        userId: mockUserId,
        workspaceName: "test-workspace",
        agentCount: 1,
        responseTimeMs: expect.any(Number),
      })
    );
  });

  it("handles workspace service errors", async () => {
    const mockWorkspaceService = {
      getWorkspaceByName: vi
        .fn()
        .mockRejectedValue(new Error("Workspace service failed")),
    };
    mockServiceContainer.getWorkspaceService.mockReturnValue(
      mockWorkspaceService as any
    );

    const response = await loader({
      request: mockRequest,
      params: mockParams,
    } as any);

    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error.code).toBe("INTERNAL_SERVER_ERROR");
  });
});
