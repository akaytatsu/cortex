import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirect } from "@remix-run/node";
import { loader } from "./workspaces.$workspaceName";
import { WorkspaceService } from "../services/workspace.service";
import { SessionService } from "../services/session.service";
import type { Workspace } from "../../../../packages/shared-types";

vi.mock("../services/workspace.service");
vi.mock("../services/session.service");
vi.mock("@remix-run/node", async () => {
  const actual = await vi.importActual("@remix-run/node");
  return {
    ...actual,
    redirect: vi.fn(),
    json: vi.fn((data) => ({ data })),
  };
});

const mockWorkspaceService = vi.mocked(WorkspaceService);
const mockSessionService = vi.mocked(SessionService);
const mockRedirect = vi.mocked(redirect);

describe("workspaces.$workspaceName loader", () => {
  const mockWorkspaces: Workspace[] = [
    { name: "test-workspace", path: "/path/to/test" },
    { name: "another-workspace", path: "/path/to/another" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionService.requireUserId.mockResolvedValue("user-123");
    mockWorkspaceService.listWorkspaces.mockResolvedValue(mockWorkspaces);
  });

  it("should require user authentication", async () => {
    const request = new Request("http://localhost:3000/workspaces/test-workspace");
    const params = { workspaceName: "test-workspace" };

    await loader({ request, params } as any);

    expect(mockSessionService.requireUserId).toHaveBeenCalledWith(request);
  });

  it("should redirect to /workspaces when workspaceName is not provided", async () => {
    const request = new Request("http://localhost:3000/workspaces/");
    const params = {};

    mockRedirect.mockImplementation((url: string) => {
      throw new Error(`Redirect to ${url}`);
    });

    await expect(loader({ request, params } as any)).rejects.toThrow("Redirect to /workspaces");
    expect(mockRedirect).toHaveBeenCalledWith("/workspaces");
  });

  it("should redirect to /workspaces when workspace is not found", async () => {
    const request = new Request("http://localhost:3000/workspaces/nonexistent");
    const params = { workspaceName: "nonexistent" };

    mockRedirect.mockImplementation((url: string) => {
      throw new Error(`Redirect to ${url}`);
    });

    await expect(loader({ request, params } as any)).rejects.toThrow("Redirect to /workspaces");
    expect(mockWorkspaceService.listWorkspaces).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith("/workspaces");
  });

  it("should return workspace data when workspace exists", async () => {
    const request = new Request("http://localhost:3000/workspaces/test-workspace");
    const params = { workspaceName: "test-workspace" };

    const result = await loader({ request, params } as any);

    expect(mockWorkspaceService.listWorkspaces).toHaveBeenCalled();
    expect(result).toEqual({
      data: {
        workspace: mockWorkspaces[0],
      },
    });
  });

  it("should handle service errors by redirecting to /workspaces", async () => {
    const request = new Request("http://localhost:3000/workspaces/test-workspace");
    const params = { workspaceName: "test-workspace" };

    mockWorkspaceService.listWorkspaces.mockRejectedValue(new Error("Service error"));
    mockRedirect.mockImplementation((url: string) => {
      throw new Error(`Redirect to ${url}`);
    });

    await expect(loader({ request, params } as any)).rejects.toThrow("Redirect to /workspaces");
    expect(mockRedirect).toHaveBeenCalledWith("/workspaces");
  });

  it("should handle authentication errors by allowing SessionService to throw", async () => {
    const request = new Request("http://localhost:3000/workspaces/test-workspace");
    const params = { workspaceName: "test-workspace" };

    mockSessionService.requireUserId.mockRejectedValue(new Error("Auth error"));

    await expect(loader({ request, params } as any)).rejects.toThrow("Auth error");
  });

  it("should decode workspace names with special characters", async () => {
    const request = new Request("http://localhost:3000/workspaces/test%20workspace");
    const params = { workspaceName: "test workspace" };
    
    const specialWorkspaces: Workspace[] = [
      { name: "test workspace", path: "/path/to/test" },
    ];
    mockWorkspaceService.listWorkspaces.mockResolvedValue(specialWorkspaces);

    const result = await loader({ request, params } as any);

    expect(result).toEqual({
      data: {
        workspace: specialWorkspaces[0],
      },
    });
  });
});