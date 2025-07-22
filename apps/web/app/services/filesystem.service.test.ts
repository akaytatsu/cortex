import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs/promises";
import { FileSystemService } from "./filesystem.service";
import type { FileSystemItem } from "shared-types";

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

const mockFs = fs as any;

describe("FileSystemService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

      const result = await FileSystemService.getDirectoryStructure("/workspace");

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
      
      const result = await FileSystemService.getDirectoryStructure("/workspace");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("src");
    });

    it("should throw error for non-existent directory", async () => {
      const error = new Error("ENOENT") as any;
      error.code = "ENOENT";
      mockFs.readdir.mockRejectedValue(error);

      await expect(
        FileSystemService.getDirectoryStructure("/nonexistent")
      ).rejects.toThrow("Directory not found");
    });

    it("should throw error for permission denied", async () => {
      const error = new Error("EACCES") as any;
      error.code = "EACCES";
      mockFs.readdir.mockRejectedValue(error);

      await expect(
        FileSystemService.getDirectoryStructure("/forbidden")
      ).rejects.toThrow("Permission denied to access directory");
    });

    it("should prevent path traversal attacks", async () => {
      await expect(
        FileSystemService.getDirectoryStructure("/workspace", "../../../etc")
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

      const result = await FileSystemService.getFileContent("/workspace", "src/index.js");

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

      const binaryBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00]); // PNG header with null byte
      
      mockFs.stat.mockResolvedValue(mockStats);
      mockFs.readFile.mockResolvedValue(binaryBuffer);

      await expect(
        FileSystemService.getFileContent("/workspace", "image.png")
      ).rejects.toThrow("Cannot read binary file");
    });

    it("should reject files that are too large", async () => {
      const mockStats = {
        isFile: () => true,
        size: 1024 * 1024 * 15, // 15MB
      };

      mockFs.stat.mockResolvedValue(mockStats);

      await expect(
        FileSystemService.getFileContent("/workspace", "huge-file.txt")
      ).rejects.toThrow("File too large to display");
    });

    it("should throw error for non-existent file", async () => {
      const error = new Error("ENOENT") as any;
      error.code = "ENOENT";
      mockFs.stat.mockRejectedValue(error);

      await expect(
        FileSystemService.getFileContent("/workspace", "nonexistent.txt")
      ).rejects.toThrow("File not found");
    });

    it("should throw error if path is not a file", async () => {
      const mockStats = {
        isFile: () => false,
        size: 0,
      };

      mockFs.stat.mockResolvedValue(mockStats);

      await expect(
        FileSystemService.getFileContent("/workspace", "src")
      ).rejects.toThrow("Path is not a file");
    });

    it("should prevent path traversal attacks", async () => {
      await expect(
        FileSystemService.getFileContent("/workspace", "../../../etc/passwd")
      ).rejects.toThrow("Access denied: path is outside workspace");
    });
  });
});