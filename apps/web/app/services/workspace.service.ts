import * as fs from "fs/promises";
import * as path from "path";
import * as yaml from "yaml";
import type { Workspace } from "../../../../packages/shared-types";
import type { IWorkspaceService } from "../types/services";
import { createServiceLogger } from "../lib/logger";

class WorkspaceServiceError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "WorkspaceServiceError";
  }
}

const logger = createServiceLogger("WorkspaceService");

const CORTEX_ROOT = process.env.CORTEX_ROOT || process.cwd();
const WORKSPACES_FILE = path.join(CORTEX_ROOT, "config", "workspaces.yaml");

/**
 * Service for managing workspace operations including CRUD operations and path validation
 */
export class WorkspaceService implements IWorkspaceService {
  /**
   * Ensures the config directory exists, creating it if necessary
   */
  private static async ensureConfigDir(): Promise<void> {
    const configDir = path.dirname(WORKSPACES_FILE);
    try {
      await fs.access(configDir);
    } catch {
      await fs.mkdir(configDir, { recursive: true });
    }
  }

  private static async readWorkspacesFile(): Promise<Workspace[]> {
    try {
      await this.ensureConfigDir();
      const fileContent = await fs.readFile(WORKSPACES_FILE, "utf-8");
      const parsed = yaml.parse(fileContent);

      if (!Array.isArray(parsed)) {
        throw new WorkspaceServiceError("Invalid workspaces file format");
      }

      return parsed as Workspace[];
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        // File doesn't exist, return empty array
        return [];
      }

      if (error instanceof WorkspaceServiceError) {
        throw error;
      }

      throw new WorkspaceServiceError(
        `Failed to read workspaces file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private static async writeWorkspacesFile(
    workspaces: Workspace[]
  ): Promise<void> {
    try {
      await this.ensureConfigDir();
      const yamlContent = yaml.stringify(workspaces);
      await fs.writeFile(WORKSPACES_FILE, yamlContent, "utf-8");
    } catch (error) {
      throw new WorkspaceServiceError(
        `Failed to write workspaces file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Returns list of all configured workspaces
   */
  static async listWorkspaces(): Promise<Workspace[]> {
    return await this.readWorkspacesFile();
  }

  /**
   * Validates and optionally creates a workspace path
   * @param basePath The base directory path
   * @param folderName The folder name to create (required when createNew is true)
   * @param createNew Whether to create a new folder or validate existing path
   * @returns The resolved absolute path
   * @throws WorkspaceServiceError for validation or creation failures
   */
  static async validateAndCreatePath(
    basePath: string,
    folderName?: string,
    createNew: boolean = false
  ): Promise<string> {
    const sanitizedBasePath = basePath.trim();

    // Security validation
    if (sanitizedBasePath.includes("..")) {
      throw new WorkspaceServiceError(
        'Path cannot contain ".." for security reasons',
        "INVALID_PATH"
      );
    }

    if (!sanitizedBasePath) {
      throw new WorkspaceServiceError("Path cannot be empty", "INVALID_PATH");
    }

    let finalPath: string;

    if (createNew) {
      if (!folderName?.trim()) {
        throw new WorkspaceServiceError(
          "Folder name is required when creating new folder",
          "INVALID_FOLDER_NAME"
        );
      }

      const sanitizedFolderName = folderName.trim();

      // Additional security check for folder name
      if (
        sanitizedFolderName.includes("/") ||
        sanitizedFolderName.includes("\\")
      ) {
        throw new WorkspaceServiceError(
          "Folder name cannot contain path separators",
          "INVALID_FOLDER_NAME"
        );
      }

      finalPath = path.join(sanitizedBasePath, sanitizedFolderName);

      try {
        // Check if parent directory exists
        const parentStats = await fs.stat(sanitizedBasePath);
        if (!parentStats.isDirectory()) {
          throw new WorkspaceServiceError(
            "Parent path is not a directory",
            "INVALID_PARENT_PATH"
          );
        }
      } catch (error) {
        if (error instanceof WorkspaceServiceError) {
          throw error;
        }
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          throw new WorkspaceServiceError(
            "Parent directory does not exist",
            "PARENT_NOT_FOUND"
          );
        }
        throw new WorkspaceServiceError(
          "Failed to access parent directory",
          "ACCESS_ERROR"
        );
      }

      try {
        // Check if target folder already exists
        await fs.access(finalPath);
        throw new WorkspaceServiceError(
          "Folder already exists at this location",
          "FOLDER_EXISTS"
        );
      } catch (error) {
        if (error instanceof WorkspaceServiceError) {
          throw error;
        }
        // ENOENT is expected - folder doesn't exist yet
      }

      try {
        // Create the new directory
        await fs.mkdir(finalPath, { recursive: false });
      } catch (error) {
        if (error instanceof Error && "code" in error) {
          switch (error.code) {
            case "EACCES":
              throw new WorkspaceServiceError(
                "Permission denied to create folder",
                "PERMISSION_DENIED"
              );
            case "EEXIST":
              throw new WorkspaceServiceError(
                "Folder already exists",
                "FOLDER_EXISTS"
              );
            default:
              throw new WorkspaceServiceError(
                `Failed to create folder: ${error.message}`,
                "CREATE_FAILED"
              );
          }
        }
        throw new WorkspaceServiceError(
          "Unknown error creating folder",
          "CREATE_FAILED"
        );
      }
    } else {
      finalPath = sanitizedBasePath;

      try {
        // Validate that path exists and is a directory
        const stats = await fs.stat(finalPath);
        if (!stats.isDirectory()) {
          throw new WorkspaceServiceError(
            "Path is not a directory",
            "NOT_DIRECTORY"
          );
        }
      } catch (error) {
        if (error instanceof WorkspaceServiceError) {
          throw error;
        }
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          throw new WorkspaceServiceError(
            "Directory does not exist",
            "DIRECTORY_NOT_FOUND"
          );
        }
        throw new WorkspaceServiceError(
          "Failed to access directory",
          "ACCESS_ERROR"
        );
      }

      try {
        // Test read access
        await fs.readdir(finalPath);
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "EACCES"
        ) {
          throw new WorkspaceServiceError(
            "Permission denied to access directory",
            "PERMISSION_DENIED"
          );
        }
        throw new WorkspaceServiceError(
          "Cannot access directory",
          "ACCESS_ERROR"
        );
      }
    }

    return path.resolve(finalPath);
  }

  /**
   * Adds a new workspace to the configuration
   * @param workspace The workspace to add
   * @param createNew Whether to create a new directory for the workspace
   * @throws WorkspaceServiceError for validation failures or duplicates
   */
  static async addWorkspace(
    workspace: Workspace,
    createNew: boolean = false
  ): Promise<void> {
    if (!workspace.name?.trim()) {
      throw new WorkspaceServiceError("Workspace name is required");
    }

    if (!workspace.path?.trim()) {
      throw new WorkspaceServiceError("Workspace path is required");
    }

    const workspaces = await this.readWorkspacesFile();

    // Check if workspace with same name already exists
    const existingWorkspace = workspaces.find(
      w => w.name === workspace.name.trim()
    );
    if (existingWorkspace) {
      throw new WorkspaceServiceError(
        "A workspace with this name already exists"
      );
    }

    // Validate and potentially create the path
    const validatedPath = await this.validateAndCreatePath(
      workspace.path.trim(),
      createNew ? workspace.name.trim() : undefined,
      createNew
    );

    workspaces.push({
      name: workspace.name.trim(),
      path: validatedPath,
    });

    await this.writeWorkspacesFile(workspaces);
  }

  /**
   * Gets a workspace by name
   * @param workspaceName The name of the workspace to find
   * @returns The workspace if found, null otherwise
   */
  static async getWorkspaceByName(
    workspaceName: string
  ): Promise<Workspace | null> {
    if (!workspaceName?.trim()) {
      return null;
    }

    const workspaces = await this.readWorkspacesFile();
    return workspaces.find(w => w.name === workspaceName.trim()) || null;
  }

  /**
   * Removes a workspace from the configuration (does not delete the directory)
   * @param workspaceName The name of the workspace to remove
   * @throws WorkspaceServiceError if workspace is not found or name is empty
   */
  static async removeWorkspace(workspaceName: string): Promise<void> {
    if (!workspaceName?.trim()) {
      throw new WorkspaceServiceError("Workspace name is required");
    }

    const workspaces = await this.readWorkspacesFile();

    const workspaceIndex = workspaces.findIndex(
      w => w.name === workspaceName.trim()
    );
    if (workspaceIndex === -1) {
      throw new WorkspaceServiceError(
        "Workspace not found",
        "WORKSPACE_NOT_FOUND"
      );
    }

    // Remove workspace from array (does not delete the actual folder)
    workspaces.splice(workspaceIndex, 1);

    await this.writeWorkspacesFile(workspaces);
  }
}
