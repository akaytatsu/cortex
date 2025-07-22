import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs/promises";
import { FileSystemService } from "./filesystem.service";
import type { FileSaveRequest } from "shared-types";

// Mock fs module
vi.mock("fs/promises");

// Mock path module
vi.mock("path", async () => {
  const actual = await vi.importActual("path");
  return {
    ...actual,
    join: vi.fn((...args: string[]) => args.join("/")),
    resolve: vi.fn((p: string) => `/resolved${p}`),
    basename: vi.fn((p: string) => p.split("/").pop() || ""),
    extname: vi.fn((p: string) => {
      const name = p.split("/").pop() || "";
      const dotIndex = name.lastIndexOf(".");
      return dotIndex >= 0 ? name.substring(dotIndex) : "";
    }),
  };
});

const mockFs = fs as {
  readdir: ReturnType<typeof vi.fn>;
  stat: ReturnType<typeof vi.fn>;
  readFile: ReturnType<typeof vi.fn>;
  writeFile: ReturnType<typeof vi.fn>;
  access: ReturnType<typeof vi.fn>;
  rename: ReturnType<typeof vi.fn>;
};

describe("FileSystemService", () => {
  let fileSystemService: FileSystemService;

  beforeEach(() => {
    vi.clearAllMocks();
    fileSystemService = new FileSystemService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getDirectoryStructure", () => {
    it("should return file structure for valid directory", async () => {
      const mockDirents = [
        { name: "src", isDirectory: () => true, isFile: () => false },
        { name: "package.json", isDirectory: () => false, isFile: () => true },
        { name: "README.md", isDirectory: () => false, isFile: () => true },
      ];

      const mockSubDirents = [
        { name: "index.ts", isDirectory: () => false, isFile: () => true },
        { name: "utils.ts", isDirectory: () => false, isFile: () => true },
      ];

      mockFs.readdir
        .mockResolvedValueOnce(mockDirents)
        .mockResolvedValueOnce(mockSubDirents);

      const result =
        await fileSystemService.getDirectoryStructure("/workspace");

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        name: "src",
        path: "src",
        type: "directory",
        children: [
          { name: "index.ts", path: "src/index.ts", type: "file" },
          { name: "utils.ts", path: "src/utils.ts", type: "file" },
        ],
      });
      expect(result[1]).toEqual({
        name: "package.json",
        path: "package.json",
        type: "file",
      });
      expect(result[2]).toEqual({
        name: "README.md",
        path: "README.md",
        type: "file",
      });
    });

    it("should skip hidden files and common build directories", async () => {
      const mockDirents = [
        { name: ".git", isDirectory: () => true, isFile: () => false },
        { name: ".env", isDirectory: () => false, isFile: () => true },
        { name: "node_modules", isDirectory: () => true, isFile: () => false },
        { name: "dist", isDirectory: () => true, isFile: () => false },
        { name: "src", isDirectory: () => true, isFile: () => false },
      ];

      mockFs.readdir.mockResolvedValue(mockDirents);

      const result =
        await fileSystemService.getDirectoryStructure("/workspace");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("src");
    });

    it("should throw error for non-existent directory", async () => {
      const error = new Error("ENOENT") as Error & { code: string };
      error.code = "ENOENT";
      mockFs.readdir.mockRejectedValue(error);

      await expect(
        fileSystemService.getDirectoryStructure("/nonexistent")
      ).rejects.toThrow("Directory not found");
    });

    it("should throw error for permission denied", async () => {
      const error = new Error("EACCES") as Error & { code: string };
      error.code = "EACCES";
      mockFs.readdir.mockRejectedValue(error);

      await expect(
        fileSystemService.getDirectoryStructure("/forbidden")
      ).rejects.toThrow("Permission denied to access directory");
    });

    it("should prevent path traversal attacks", async () => {
      await expect(
        fileSystemService.getDirectoryStructure("/workspace", "../../../etc")
      ).rejects.toThrow("Access denied: path is outside workspace");
    });
  });

  describe("getFileContent", () => {
    it("should return file content for text file", async () => {
      const mockStats = {
        isFile: () => true,
        size: 1024,
      };

      mockFs.stat.mockResolvedValue(mockStats);
      mockFs.readFile
        .mockResolvedValueOnce(Buffer.from("console.log('hello');")) // for binary check
        .mockResolvedValueOnce("console.log('hello');"); // for content

      const result = await fileSystemService.getFileContent(
        "/workspace",
        "src/index.js"
      );

      expect(result).toEqual({
        path: "src/index.js",
        content: "console.log('hello');",
        mimeType: "text/javascript",
      });
    });

    it("should reject binary files", async () => {
      const mockStats = {
        isFile: () => true,
        size: 1024,
      };

      const binaryBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
      ]); // PNG header with null byte

      mockFs.stat.mockResolvedValue(mockStats);
      mockFs.readFile.mockResolvedValue(binaryBuffer);

      await expect(
        fileSystemService.getFileContent("/workspace", "image.png")
      ).rejects.toThrow("Cannot read binary file");
    });

    it("should reject files that are too large", async () => {
      const mockStats = {
        isFile: () => true,
        size: 1024 * 1024 * 15, // 15MB
      };

      mockFs.stat.mockResolvedValue(mockStats);

      await expect(
        fileSystemService.getFileContent("/workspace", "huge-file.txt")
      ).rejects.toThrow("File too large to display");
    });

    it("should throw error for non-existent file", async () => {
      const error = new Error("ENOENT") as Error & { code: string };
      error.code = "ENOENT";
      mockFs.stat.mockRejectedValue(error);

      await expect(
        fileSystemService.getFileContent("/workspace", "nonexistent.txt")
      ).rejects.toThrow("File not found");
    });

    it("should throw error if path is not a file", async () => {
      const mockStats = {
        isFile: () => false,
        size: 0,
      };

      mockFs.stat.mockResolvedValue(mockStats);

      await expect(
        fileSystemService.getFileContent("/workspace", "src")
      ).rejects.toThrow("Path is not a file");
    });

    it("should prevent path traversal attacks", async () => {
      await expect(
        fileSystemService.getFileContent("/workspace", "../../../etc/passwd")
      ).rejects.toThrow("Access denied: path is outside workspace");
    });
  });

  describe("saveFileContent", () => {
    it("should save new file successfully", async () => {
      const saveRequest: FileSaveRequest = {
        path: "newfile.txt",
        content: "Hello, World!",
      };

      // Mock file doesn't exist initially
      mockFs.access.mockRejectedValueOnce(new Error("ENOENT"));
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);

      const result = await fileSystemService.saveFileContent(
        "/workspace",
        saveRequest
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("criado e salvo");
      expect(result.newLastModified).toBeInstanceOf(Date);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        "/resolved/workspace/newfile.txt.tmp",
        "Hello, World!",
        "utf-8"
      );
      expect(mockFs.rename).toHaveBeenCalledWith(
        "/resolved/workspace/newfile.txt.tmp",
        "/resolved/workspace/newfile.txt"
      );
    });

    it("should update existing file successfully", async () => {
      const saveRequest: FileSaveRequest = {
        path: "existing.txt",
        content: "Updated content",
      };

      // Mock file exists and is writable
      mockFs.access
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);

      const result = await fileSystemService.saveFileContent(
        "/workspace",
        saveRequest
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("salvo com sucesso");
      expect(result.newLastModified).toBeInstanceOf(Date);
    });

    it("should throw error for write permission denied", async () => {
      const saveRequest: FileSaveRequest = {
        path: "readonly.txt",
        content: "Content",
      };

      // Mock file exists but not writable
      const accessError = new Error("EACCES") as Error & { code: string };
      accessError.code = "EACCES";
      mockFs.access
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(accessError);

      await expect(
        fileSystemService.saveFileContent("/workspace", saveRequest)
      ).rejects.toThrow("Permission denied to write file");
    });

    it("should prevent path traversal attacks", async () => {
      const saveRequest: FileSaveRequest = {
        path: "../../../malicious.txt",
        content: "Bad content",
      };

      await expect(
        fileSystemService.saveFileContent("/workspace", saveRequest)
      ).rejects.toThrow("Access denied: path is outside workspace");
    });

    it("should handle disk full error", async () => {
      const saveRequest: FileSaveRequest = {
        path: "file.txt",
        content: "Content",
      };

      mockFs.access.mockRejectedValueOnce(new Error("ENOENT"));
      const diskFullError = new Error("ENOSPC") as Error & { code: string };
      diskFullError.code = "ENOSPC";
      mockFs.writeFile.mockRejectedValue(diskFullError);

      await expect(
        fileSystemService.saveFileContent("/workspace", saveRequest)
      ).rejects.toThrow("Not enough disk space to save file");
    });

    it("should handle directory not found error", async () => {
      const saveRequest: FileSaveRequest = {
        path: "nonexistent/directory/file.txt",
        content: "Content",
      };

      mockFs.access.mockRejectedValueOnce(new Error("ENOENT"));
      const dirError = new Error("ENOENT") as Error & { code: string };
      dirError.code = "ENOENT";
      mockFs.writeFile.mockRejectedValue(dirError);

      await expect(
        fileSystemService.saveFileContent("/workspace", saveRequest)
      ).rejects.toThrow("Directory not found for file path");
    });

    it("should use atomic writes with temp files", async () => {
      const saveRequest: FileSaveRequest = {
        path: "atomic.txt",
        content: "Atomic content",
      };

      mockFs.access.mockRejectedValueOnce(new Error("ENOENT"));
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);

      await fileSystemService.saveFileContent("/workspace", saveRequest);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        "/resolved/workspace/atomic.txt.tmp",
        "Atomic content",
        "utf-8"
      );
      expect(mockFs.rename).toHaveBeenCalledWith(
        "/resolved/workspace/atomic.txt.tmp",
        "/resolved/workspace/atomic.txt"
      );
    });

    it("should handle empty content", async () => {
      const saveRequest: FileSaveRequest = {
        path: "empty.txt",
        content: "",
      };

      mockFs.access.mockRejectedValueOnce(new Error("ENOENT"));
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);

      const result = await fileSystemService.saveFileContent(
        "/workspace",
        saveRequest
      );

      expect(result.success).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        "/resolved/workspace/empty.txt.tmp",
        "",
        "utf-8"
      );
    });

    it("should handle Unicode content", async () => {
      const saveRequest: FileSaveRequest = {
        path: "unicode.txt",
        content: "Hello 🌍! Olá 🇧🇷! こんにちは 🇯🇵!",
      };

      mockFs.access.mockRejectedValueOnce(new Error("ENOENT"));
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);

      const result = await fileSystemService.saveFileContent(
        "/workspace",
        saveRequest
      );

      expect(result.success).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        "/resolved/workspace/unicode.txt.tmp",
        "Hello 🌍! Olá 🇧🇷! こんにちは 🇯🇵!",
        "utf-8"
      );
    });
  });
});
