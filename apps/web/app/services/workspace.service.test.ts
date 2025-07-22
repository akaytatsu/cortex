import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs/promises";
import { WorkspaceService } from "./workspace.service";
import type { Workspace } from "shared-types";

// Mock fs module
vi.mock("fs/promises");

// Mock path module
vi.mock("path", async () => {
  const actual = await vi.importActual("path");
  return {
    ...actual,
    join: vi.fn((...args: string[]) => args.join("/")),
    resolve: vi.fn((p: string) => `/resolved${p}`),
    dirname: vi.fn((p: string) => p.split("/").slice(0, -1).join("/")),
  };
});

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
      enoentError.code = "ENOENT";
      mockFs.readFile.mockRejectedValue(enoentError);

      const result = await WorkspaceService.listWorkspaces();

      expect(result).toEqual([]);
    });

    it("should return workspaces when file exists", async () => {
      const mockWorkspaces = [
        { name: "Test Workspace", path: "/test/path" },
        { name: "Another Workspace", path: "/another/path" },
      ];

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(
        `- name: Test Workspace\n  path: /test/path\n- name: Another Workspace\n  path: /another/path`
      );

      const result = await WorkspaceService.listWorkspaces();

      expect(result).toEqual(mockWorkspaces);
    });

    it("should throw error when file format is invalid", async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue("invalid yaml content");

      await expect(WorkspaceService.listWorkspaces()).rejects.toThrow(
        "Invalid workspaces file format"
      );
    });
  });

  describe("addWorkspace", () => {
    beforeEach(() => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      // Mock path validation for existing addWorkspace tests
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as fs.Stats);
      mockFs.readdir.mockResolvedValue([]);
    });

    it("should add workspace to empty list", async () => {
      const enoentError = new Error("ENOENT") as NodeJS.ErrnoException;
      enoentError.code = "ENOENT";
      mockFs.readFile.mockRejectedValue(enoentError);

      const newWorkspace: Workspace = {
        name: "New Workspace",
        path: "/new/path",
      };

      await WorkspaceService.addWorkspace(newWorkspace);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("name: New Workspace"),
        "utf-8"
      );
    });

    it("should add workspace to existing list", async () => {
      mockFs.readFile.mockResolvedValue(
        `- name: Existing Workspace\n  path: /existing/path`
      );

      const newWorkspace: Workspace = {
        name: "New Workspace",
        path: "/new/path",
      };

      await WorkspaceService.addWorkspace(newWorkspace);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("New Workspace"),
        "utf-8"
      );
    });

    it("should throw error when workspace name is empty", async () => {
      const invalidWorkspace: Workspace = {
        name: "",
        path: "/test/path",
      };

      await expect(
        WorkspaceService.addWorkspace(invalidWorkspace)
      ).rejects.toThrow("Workspace name is required");
    });

    it("should throw error when workspace path is empty", async () => {
      const invalidWorkspace: Workspace = {
        name: "Test Workspace",
        path: "",
      };

      await expect(
        WorkspaceService.addWorkspace(invalidWorkspace)
      ).rejects.toThrow("Workspace path is required");
    });

    it("should throw error when workspace with same name already exists", async () => {
      mockFs.readFile.mockResolvedValue(
        `- name: Existing Workspace\n  path: /existing/path`
      );

      const duplicateWorkspace: Workspace = {
        name: "Existing Workspace",
        path: "/different/path",
      };

      await expect(
        WorkspaceService.addWorkspace(duplicateWorkspace)
      ).rejects.toThrow("A workspace with this name already exists");
    });

    it("should trim workspace name and path", async () => {
      const enoentError = new Error("ENOENT") as NodeJS.ErrnoException;
      enoentError.code = "ENOENT";
      mockFs.readFile.mockRejectedValue(enoentError);

      const workspaceWithSpaces: Workspace = {
        name: "  Spaced Workspace  ",
        path: "  /spaced/path  ",
      };

      await WorkspaceService.addWorkspace(workspaceWithSpaces);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("name: Spaced Workspace"),
        "utf-8"
      );
    });
  });

  describe("validateAndCreatePath", () => {
    beforeEach(() => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as fs.Stats);
      mockFs.readdir.mockResolvedValue([]);
    });

    it("should validate existing directory successfully", async () => {
      const testPath = "/home/user/existing-project";

      const result = await WorkspaceService.validateAndCreatePath(
        testPath,
        undefined,
        false
      );

      expect(result).toBe("/resolved/home/user/existing-project");
      expect(mockFs.stat).toHaveBeenCalledWith(testPath);
      expect(mockFs.readdir).toHaveBeenCalledWith(testPath);
    });

    it("should reject path with '..' for security", async () => {
      const dangerousPath = "/home/user/../sensitive";

      await expect(
        WorkspaceService.validateAndCreatePath(dangerousPath, undefined, false)
      ).rejects.toThrow('Path cannot contain ".." for security reasons');
    });

    it("should reject empty path", async () => {
      await expect(
        WorkspaceService.validateAndCreatePath("", undefined, false)
      ).rejects.toThrow("Path cannot be empty");
    });

    it("should throw error when directory does not exist", async () => {
      const nonExistentPath = "/home/user/nonexistent";
      const enoentError = new Error("ENOENT") as NodeJS.ErrnoException;
      enoentError.code = "ENOENT";
      mockFs.stat.mockRejectedValue(enoentError);

      await expect(
        WorkspaceService.validateAndCreatePath(
          nonExistentPath,
          undefined,
          false
        )
      ).rejects.toThrow("Directory does not exist");
    });

    it("should throw error when path is not a directory", async () => {
      const filePath = "/home/user/file.txt";
      mockFs.stat.mockResolvedValue({ isDirectory: () => false } as fs.Stats);

      await expect(
        WorkspaceService.validateAndCreatePath(filePath, undefined, false)
      ).rejects.toThrow("Path is not a directory");
    });

    it("should throw error when permission denied to access directory", async () => {
      const restrictedPath = "/home/user/restricted";
      const eaccesError = new Error("EACCES") as NodeJS.ErrnoException;
      eaccesError.code = "EACCES";
      mockFs.readdir.mockRejectedValue(eaccesError);

      await expect(
        WorkspaceService.validateAndCreatePath(restrictedPath, undefined, false)
      ).rejects.toThrow("Permission denied to access directory");
    });

    describe("creating new folders", () => {
      beforeEach(() => {
        // Parent directory exists
        mockFs.stat.mockResolvedValue({ isDirectory: () => true } as fs.Stats);
        // Target folder doesn't exist yet
        const enoentError = new Error("ENOENT") as NodeJS.ErrnoException;
        enoentError.code = "ENOENT";
        mockFs.access.mockRejectedValue(enoentError);
        // Mkdir succeeds
        mockFs.mkdir.mockResolvedValue(undefined);
      });

      it("should create new folder successfully", async () => {
        const parentPath = "/home/user/projects";
        const folderName = "new-project";
        const expectedPath = "/home/user/projects/new-project";

        const result = await WorkspaceService.validateAndCreatePath(
          parentPath,
          folderName,
          true
        );

        expect(result).toBe("/resolved/home/user/projects/new-project");
        expect(mockFs.stat).toHaveBeenCalledWith(parentPath);
        expect(mockFs.access).toHaveBeenCalledWith(expectedPath);
        expect(mockFs.mkdir).toHaveBeenCalledWith(expectedPath, {
          recursive: false,
        });
      });

      it("should require folder name when creating new", async () => {
        await expect(
          WorkspaceService.validateAndCreatePath("/home/user", "", true)
        ).rejects.toThrow("Folder name is required when creating new folder");
      });

      it("should reject folder name with path separators", async () => {
        await expect(
          WorkspaceService.validateAndCreatePath("/home/user", "bad/name", true)
        ).rejects.toThrow("Folder name cannot contain path separators");

        await expect(
          WorkspaceService.validateAndCreatePath(
            "/home/user",
            "bad\\name",
            true
          )
        ).rejects.toThrow("Folder name cannot contain path separators");
      });

      it("should throw error when parent directory does not exist", async () => {
        const parentPath = "/home/user/nonexistent";
        const folderName = "new-project";

        const enoentError = new Error("ENOENT") as NodeJS.ErrnoException;
        enoentError.code = "ENOENT";
        mockFs.stat.mockRejectedValue(enoentError);

        await expect(
          WorkspaceService.validateAndCreatePath(parentPath, folderName, true)
        ).rejects.toThrow("Parent directory does not exist");
      });

      it("should throw error when folder already exists", async () => {
        const parentPath = "/home/user/projects";
        const folderName = "existing-project";

        // Target folder already exists
        mockFs.access.mockResolvedValue(undefined);

        await expect(
          WorkspaceService.validateAndCreatePath(parentPath, folderName, true)
        ).rejects.toThrow("Folder already exists at this location");
      });

      it("should handle permission denied when creating folder", async () => {
        const parentPath = "/home/user/projects";
        const folderName = "new-project";

        const eaccesError = new Error("EACCES") as NodeJS.ErrnoException;
        eaccesError.code = "EACCES";
        mockFs.mkdir.mockRejectedValue(eaccesError);

        await expect(
          WorkspaceService.validateAndCreatePath(parentPath, folderName, true)
        ).rejects.toThrow("Permission denied to create folder");
      });
    });
  });

  describe("removeWorkspace", () => {
    beforeEach(() => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    it("should remove workspace successfully", async () => {
      mockFs.readFile.mockResolvedValue(
        `- name: Project 1\n  path: /home/user/project1\n- name: Project 2\n  path: /home/user/project2`
      );

      await WorkspaceService.removeWorkspace("Project 1");

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("Project 2"),
        "utf-8"
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.not.stringContaining("Project 1"),
        "utf-8"
      );
    });

    it("should throw error when workspace name is empty", async () => {
      await expect(WorkspaceService.removeWorkspace("")).rejects.toThrow(
        "Workspace name is required"
      );
    });

    it("should throw error when workspace not found", async () => {
      mockFs.readFile.mockResolvedValue(
        `- name: Project 1\n  path: /home/user/project1`
      );

      await expect(
        WorkspaceService.removeWorkspace("Nonexistent Project")
      ).rejects.toThrow("Workspace not found");
    });
  });

  describe("addWorkspace with createNew flag", () => {
    beforeEach(() => {
      // Empty workspace list
      const enoentError = new Error("ENOENT") as NodeJS.ErrnoException;
      enoentError.code = "ENOENT";
      mockFs.readFile.mockRejectedValue(enoentError);

      mockFs.access.mockResolvedValue(undefined);
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      // Mock successful path validation
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as fs.Stats);
      mockFs.readdir.mockResolvedValue([]);
    });

    it("should add workspace with new folder creation", async () => {
      // Target folder doesn't exist yet
      const enoentError = new Error("ENOENT") as NodeJS.ErrnoException;
      enoentError.code = "ENOENT";
      mockFs.access.mockRejectedValue(enoentError);

      const workspace = { name: "Test Project", path: "/home/user/projects" };

      await WorkspaceService.addWorkspace(workspace, true);

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        "/home/user/projects/Test Project",
        { recursive: false }
      );
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it("should add workspace without creating folder", async () => {
      const workspace = {
        name: "Test Project",
        path: "/home/user/existing-project",
      };

      await WorkspaceService.addWorkspace(workspace, false);

      expect(mockFs.mkdir).not.toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });
});
