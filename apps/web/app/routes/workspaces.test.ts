import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loader } from "./workspaces";
import { SessionService } from "../services/session.service";
import { WorkspaceService } from "../services/workspace.service";

describe("Workspaces Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loader", () => {
    it("should redirect to /login when not authenticated", async () => {
      vi.spyOn(SessionService, 'requireUserId').mockRejectedValue(
        new Response(null, {
          status: 302,
          headers: { location: "/login" }
        })
      );

      const request = new Request("http://localhost:3000/workspaces");

      await expect(loader({ request, params: {}, context: {} })).rejects.toBeInstanceOf(Response);
    });

    it("should return workspaces data when authenticated", async () => {
      const mockWorkspaces = [
        { name: "Test Workspace", path: "/test/path" },
        { name: "Another Workspace", path: "/another/path" }
      ];

      vi.spyOn(SessionService, 'requireUserId').mockResolvedValue("user-123");
      vi.spyOn(WorkspaceService, 'listWorkspaces').mockResolvedValue(mockWorkspaces);

      const request = new Request("http://localhost:3000/workspaces");
      const response = await loader({ request, params: {}, context: {} });

      expect(response).toBeInstanceOf(Response);
      const data = await (response as Response).json();
      expect(data.workspaces).toEqual(mockWorkspaces);
      expect(SessionService.requireUserId).toHaveBeenCalledWith(request);
      expect(WorkspaceService.listWorkspaces).toHaveBeenCalled();
    });

    it("should return empty workspaces array when no workspaces exist", async () => {
      vi.spyOn(SessionService, 'requireUserId').mockResolvedValue("user-123");
      vi.spyOn(WorkspaceService, 'listWorkspaces').mockResolvedValue([]);

      const request = new Request("http://localhost:3000/workspaces");
      const response = await loader({ request, params: {}, context: {} });

      expect(response).toBeInstanceOf(Response);
      const data = await (response as Response).json();
      expect(data.workspaces).toEqual([]);
    });
  });
});