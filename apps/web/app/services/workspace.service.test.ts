import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from 'fs/promises';
import { WorkspaceService } from "./workspace.service";
import type { Workspace } from "shared-types";

// Mock fs module
vi.mock('fs/promises');

describe("WorkspaceService", () => {
  const mockFs = vi.mocked(fs);
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("listWorkspaces", () => {
    it("should return empty array when workspaces file does not exist", async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.mkdir.mockResolvedValue(undefined);
      const enoentError = new Error("ENOENT") as NodeJS.ErrnoException;
      enoentError.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(enoentError);

      const result = await WorkspaceService.listWorkspaces();

      expect(result).toEqual([]);
    });

    it("should return workspaces when file exists", async () => {
      const mockWorkspaces = [
        { name: "Test Workspace", path: "/test/path" },
        { name: "Another Workspace", path: "/another/path" }
      ];
      
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(`- name: Test Workspace\n  path: /test/path\n- name: Another Workspace\n  path: /another/path`);

      const result = await WorkspaceService.listWorkspaces();

      expect(result).toEqual(mockWorkspaces);
    });

    it("should throw error when file format is invalid", async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue("invalid yaml content");

      await expect(WorkspaceService.listWorkspaces()).rejects.toThrow('Invalid workspaces file format');
    });
  });

  describe("addWorkspace", () => {
    beforeEach(() => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    it("should add workspace to empty list", async () => {
      const enoentError = new Error("ENOENT") as NodeJS.ErrnoException;
      enoentError.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(enoentError);

      const newWorkspace: Workspace = {
        name: "New Workspace",
        path: "/new/path"
      };

      await WorkspaceService.addWorkspace(newWorkspace);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("name: New Workspace"),
        'utf-8'
      );
    });

    it("should add workspace to existing list", async () => {
      mockFs.readFile.mockResolvedValue(`- name: Existing Workspace\n  path: /existing/path`);

      const newWorkspace: Workspace = {
        name: "New Workspace", 
        path: "/new/path"
      };

      await WorkspaceService.addWorkspace(newWorkspace);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("New Workspace"),
        'utf-8'
      );
    });

    it("should throw error when workspace name is empty", async () => {
      const invalidWorkspace: Workspace = {
        name: "",
        path: "/test/path"
      };

      await expect(WorkspaceService.addWorkspace(invalidWorkspace)).rejects.toThrow('Workspace name is required');
    });

    it("should throw error when workspace path is empty", async () => {
      const invalidWorkspace: Workspace = {
        name: "Test Workspace",
        path: ""
      };

      await expect(WorkspaceService.addWorkspace(invalidWorkspace)).rejects.toThrow('Workspace path is required');
    });

    it("should throw error when workspace with same name already exists", async () => {
      mockFs.readFile.mockResolvedValue(`- name: Existing Workspace\n  path: /existing/path`);

      const duplicateWorkspace: Workspace = {
        name: "Existing Workspace",
        path: "/different/path"
      };

      await expect(WorkspaceService.addWorkspace(duplicateWorkspace)).rejects.toThrow('A workspace with this name already exists');
    });

    it("should trim workspace name and path", async () => {
      const enoentError = new Error("ENOENT") as NodeJS.ErrnoException;
      enoentError.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(enoentError);

      const workspaceWithSpaces: Workspace = {
        name: "  Spaced Workspace  ",
        path: "  /spaced/path  "
      };

      await WorkspaceService.addWorkspace(workspaceWithSpaces);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("name: Spaced Workspace"),
        'utf-8'
      );
    });
  });
});