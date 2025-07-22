import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loader, action } from "./workspaces.new";
import { SessionService } from "../services/session.service";
import { WorkspaceService } from "../services/workspace.service";

describe("Workspaces New Route", () => {
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

      const request = new Request("http://localhost:3000/workspaces/new");

      await expect(loader({ request, params: {}, context: {} })).rejects.toBeInstanceOf(Response);
    });

    it("should return empty response when authenticated", async () => {
      vi.spyOn(SessionService, 'requireUserId').mockResolvedValue("user-123");

      const request = new Request("http://localhost:3000/workspaces/new");
      const response = await loader({ request, params: {}, context: {} });

      expect(response).toBeInstanceOf(Response);
      const data = await (response as Response).json();
      expect(data).toEqual({});
    });
  });

  describe("action", () => {
    it("should redirect to /login when not authenticated", async () => {
      vi.spyOn(SessionService, 'requireUserId').mockRejectedValue(
        new Response(null, {
          status: 302,
          headers: { location: "/login" }
        })
      );

      const formData = new FormData();
      formData.append("name", "Test Workspace");
      formData.append("path", "/test/path");

      const request = new Request("http://localhost:3000/workspaces/new", {
        method: "POST",
        body: formData
      });

      await expect(action({ request, params: {}, context: {} })).rejects.toBeInstanceOf(Response);
    });

    it("should create workspace and redirect on success", async () => {
      vi.spyOn(SessionService, 'requireUserId').mockResolvedValue("user-123");
      vi.spyOn(WorkspaceService, 'addWorkspace').mockResolvedValue();

      const formData = new FormData();
      formData.append("name", "Test Workspace");
      formData.append("path", "/test/path");

      const request = new Request("http://localhost:3000/workspaces/new", {
        method: "POST",
        body: formData
      });

      const response = await action({ request, params: {}, context: {} });

      expect(response).toBeInstanceOf(Response);
      expect((response as Response).status).toBe(302);
      expect((response as Response).headers.get("location")).toBe("/workspaces");
      expect(WorkspaceService.addWorkspace).toHaveBeenCalledWith({
        name: "Test Workspace",
        path: "/test/path"
      });
    });

    it("should return validation errors for missing name", async () => {
      vi.spyOn(SessionService, 'requireUserId').mockResolvedValue("user-123");

      const formData = new FormData();
      formData.append("path", "/test/path");

      const request = new Request("http://localhost:3000/workspaces/new", {
        method: "POST",
        body: formData
      });

      const response = await action({ request, params: {}, context: {} });

      expect(response).toBeInstanceOf(Response);
      expect((response as Response).status).toBe(400);
      const data = await (response as Response).json();
      expect(data.errors.name).toBe("Workspace name is required");
    });

    it("should return validation errors for missing path", async () => {
      vi.spyOn(SessionService, 'requireUserId').mockResolvedValue("user-123");

      const formData = new FormData();
      formData.append("name", "Test Workspace");

      const request = new Request("http://localhost:3000/workspaces/new", {
        method: "POST",
        body: formData
      });

      const response = await action({ request, params: {}, context: {} });

      expect(response).toBeInstanceOf(Response);
      expect((response as Response).status).toBe(400);
      const data = await (response as Response).json();
      expect(data.errors.path).toBe("Workspace path is required");
    });

    it("should return validation errors for empty trimmed values", async () => {
      vi.spyOn(SessionService, 'requireUserId').mockResolvedValue("user-123");

      const formData = new FormData();
      formData.append("name", "   ");
      formData.append("path", "   ");

      const request = new Request("http://localhost:3000/workspaces/new", {
        method: "POST",
        body: formData
      });

      const response = await action({ request, params: {}, context: {} });

      expect(response).toBeInstanceOf(Response);
      expect((response as Response).status).toBe(400);
      const data = await (response as Response).json();
      expect(data.errors.name).toBe("Workspace name is required");
      expect(data.errors.path).toBe("Workspace path is required");
    });

    it("should handle service errors", async () => {
      vi.spyOn(SessionService, 'requireUserId').mockResolvedValue("user-123");
      vi.spyOn(WorkspaceService, 'addWorkspace').mockRejectedValue(
        new Error("A workspace with this name already exists")
      );

      const formData = new FormData();
      formData.append("name", "Existing Workspace");
      formData.append("path", "/test/path");

      const request = new Request("http://localhost:3000/workspaces/new", {
        method: "POST",
        body: formData
      });

      const response = await action({ request, params: {}, context: {} });

      expect(response).toBeInstanceOf(Response);
      expect((response as Response).status).toBe(400);
      const data = await (response as Response).json();
      expect(data.errors.general).toBe("A workspace with this name already exists");
    });

    it("should handle unexpected errors", async () => {
      vi.spyOn(SessionService, 'requireUserId').mockResolvedValue("user-123");
      vi.spyOn(WorkspaceService, 'addWorkspace').mockRejectedValue("Unexpected error");

      const formData = new FormData();
      formData.append("name", "Test Workspace");
      formData.append("path", "/test/path");

      const request = new Request("http://localhost:3000/workspaces/new", {
        method: "POST",
        body: formData
      });

      const response = await action({ request, params: {}, context: {} });

      expect(response).toBeInstanceOf(Response);
      expect((response as Response).status).toBe(500);
      const data = await (response as Response).json();
      expect(data.errors.general).toBe("An unexpected error occurred. Please try again.");
    });
  });
});