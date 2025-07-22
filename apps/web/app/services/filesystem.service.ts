import * as fs from "fs/promises";
import * as path from "path";
import type { FileSystemItem, FileContent } from "../../../../packages/shared-types";

class FileSystemServiceError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "FileSystemServiceError";
  }
}

/**
 * Service for file system operations within workspaces
 */
export class FileSystemService {
  /**
   * Validates that a path is within the allowed workspace path
   */
  private static validatePath(workspacePath: string, targetPath: string): void {
    const normalizedWorkspace = path.resolve(workspacePath);
    const normalizedTarget = path.resolve(targetPath);
    
    if (!normalizedTarget.startsWith(normalizedWorkspace)) {
      throw new FileSystemServiceError(
        "Access denied: path is outside workspace",
        "PATH_TRAVERSAL_DENIED"
      );
    }
  }

  /**
   * Gets the MIME type for a file based on its extension
   */
  private static getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.js': 'text/javascript',
      '.jsx': 'text/javascript',
      '.ts': 'text/typescript',
      '.tsx': 'text/typescript',
      '.json': 'application/json',
      '.html': 'text/html',
      '.css': 'text/css',
      '.scss': 'text/css',
      '.sass': 'text/css',
      '.less': 'text/css',
      '.md': 'text/markdown',
      '.txt': 'text/plain',
      '.yml': 'text/yaml',
      '.yaml': 'text/yaml',
      '.xml': 'text/xml',
      '.py': 'text/x-python',
      '.java': 'text/x-java',
      '.php': 'text/x-php',
      '.go': 'text/x-go',
      '.rs': 'text/x-rust',
      '.c': 'text/x-c',
      '.cpp': 'text/x-c++',
      '.h': 'text/x-c',
      '.hpp': 'text/x-c++',
      '.sql': 'text/x-sql',
      '.sh': 'text/x-shellscript',
      '.dockerfile': 'text/plain',
      '.gitignore': 'text/plain',
      '.env': 'text/plain',
    };
    
    return mimeTypes[ext] || 'text/plain';
  }

  /**
   * Checks if a file is likely to be binary
   */
  private static async isBinaryFile(filePath: string): Promise<boolean> {
    try {
      const buffer = await fs.readFile(filePath);
      const chunk = buffer.subarray(0, Math.min(buffer.length, 1024));
      
      // Check for null bytes which indicate binary content
      for (let i = 0; i < chunk.length; i++) {
        if (chunk[i] === 0) {
          return true;
        }
      }
      
      return false;
    } catch {
      return true; // If we can't read it, assume it's binary
    }
  }

  /**
   * Reads the file structure of a directory recursively
   */
  static async getDirectoryStructure(
    workspacePath: string,
    relativePath: string = ""
  ): Promise<FileSystemItem[]> {
    const targetPath = path.join(workspacePath, relativePath);
    this.validatePath(workspacePath, targetPath);

    try {
      const entries = await fs.readdir(targetPath, { withFileTypes: true });
      const items: FileSystemItem[] = [];

      for (const entry of entries) {
        // Skip hidden files and directories (starting with .)
        if (entry.name.startsWith('.')) {
          continue;
        }

        // Skip common non-essential directories
        if (entry.isDirectory() && ['node_modules', 'dist', 'build', '.git'].includes(entry.name)) {
          continue;
        }

        const itemPath = path.join(relativePath, entry.name);
        const fullPath = path.join(targetPath, entry.name);

        if (entry.isDirectory()) {
          const directoryItem: FileSystemItem = {
            name: entry.name,
            path: itemPath,
            type: 'directory',
            children: await this.getDirectoryStructure(workspacePath, itemPath)
          };
          items.push(directoryItem);
        } else {
          const fileItem: FileSystemItem = {
            name: entry.name,
            path: itemPath,
            type: 'file'
          };
          items.push(fileItem);
        }
      }

      // Sort: directories first, then files, both alphabetically
      return items.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        switch (error.code) {
          case 'ENOENT':
            throw new FileSystemServiceError(
              "Directory not found",
              "DIRECTORY_NOT_FOUND"
            );
          case 'EACCES':
            throw new FileSystemServiceError(
              "Permission denied to access directory",
              "PERMISSION_DENIED"
            );
          default:
            throw new FileSystemServiceError(
              `Failed to read directory: ${error.message}`,
              "READ_ERROR"
            );
        }
      }
      throw new FileSystemServiceError(
        "Unknown error reading directory",
        "READ_ERROR"
      );
    }
  }

  /**
   * Reads the content of a file
   */
  static async getFileContent(
    workspacePath: string,
    relativePath: string
  ): Promise<FileContent> {
    const targetPath = path.join(workspacePath, relativePath);
    this.validatePath(workspacePath, targetPath);

    try {
      // Check if file exists and is a file
      const stats = await fs.stat(targetPath);
      if (!stats.isFile()) {
        throw new FileSystemServiceError(
          "Path is not a file",
          "NOT_A_FILE"
        );
      }

      // Check if file is binary
      const isBinary = await this.isBinaryFile(targetPath);
      if (isBinary) {
        throw new FileSystemServiceError(
          "Cannot read binary file",
          "BINARY_FILE"
        );
      }

      // Check file size to prevent reading huge files
      const maxSize = 1024 * 1024 * 10; // 10MB limit
      if (stats.size > maxSize) {
        throw new FileSystemServiceError(
          "File too large to display",
          "FILE_TOO_LARGE"
        );
      }

      const content = await fs.readFile(targetPath, 'utf-8');
      const mimeType = this.getMimeType(path.basename(targetPath));

      return {
        path: relativePath,
        content,
        mimeType
      };
    } catch (error) {
      if (error instanceof FileSystemServiceError) {
        throw error;
      }
      
      if (error instanceof Error && 'code' in error) {
        switch (error.code) {
          case 'ENOENT':
            throw new FileSystemServiceError(
              "File not found",
              "FILE_NOT_FOUND"
            );
          case 'EACCES':
            throw new FileSystemServiceError(
              "Permission denied to read file",
              "PERMISSION_DENIED"
            );
          default:
            throw new FileSystemServiceError(
              `Failed to read file: ${error.message}`,
              "READ_ERROR"
            );
        }
      }
      
      throw new FileSystemServiceError(
        "Unknown error reading file",
        "READ_ERROR"
      );
    }
  }
}