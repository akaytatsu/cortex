import * as chokidar from "chokidar";
import * as path from "path";
import * as fs from "fs/promises";
import { createServiceLogger } from "../lib/logger";
import type { ExternalChangeMessage } from "shared-types";

interface FileWatcherCallback {
  (message: ExternalChangeMessage): void;
}

interface WatchedWorkspace {
  workspaceName: string;
  workspacePath: string;
  watcher: chokidar.FSWatcher;
  callbacks: Set<FileWatcherCallback>;
}

const logger = createServiceLogger("FileWatcherService");

export class FileWatcherService {
  private watchedWorkspaces = new Map<string, WatchedWorkspace>();
  private isInitialized = false;

  constructor() {
    this.isInitialized = true;
  }

  /**
   * Start watching a workspace for file changes
   */
  async watchWorkspace(
    workspaceName: string,
    workspacePath: string,
    callback: FileWatcherCallback
  ): Promise<void> {
    logger.info("Starting to watch workspace", { workspaceName, workspacePath });

    let watchedWorkspace = this.watchedWorkspaces.get(workspaceName);

    if (watchedWorkspace) {
      // Workspace already being watched, just add the callback
      watchedWorkspace.callbacks.add(callback);
      logger.debug("Added callback to existing workspace watcher", {
        workspaceName,
        callbackCount: watchedWorkspace.callbacks.size,
      });
      return;
    }

    try {
      // Verify workspace path exists
      const stat = await fs.stat(workspacePath);
      if (!stat.isDirectory()) {
        throw new Error(`Workspace path is not a directory: ${workspacePath}`);
      }

      // Create new watcher
      const watcher = chokidar.watch(workspacePath, {
        ignored: [
          // Ignore common files that shouldn't trigger reloads
          /node_modules/,
          /\.git/,
          /\.DS_Store/,
          /\.vscode/,
          /\.idea/,
          /dist/,
          /build/,
          /coverage/,
          /\.cache/,
          /\.next/,
          /\.nuxt/,
          /\.env\.local/,
          /\.log$/,
          /\.tmp$/,
          /\.swp$/,
          /\.lock$/,
          /package-lock\.json$/,
          /yarn\.lock$/,
          /pnpm-lock\.yaml$/,
          /Thumbs\.db$/,
        ],
        persistent: true,
        ignoreInitial: true, // Don't trigger for existing files on startup
        followSymlinks: false,
        depth: 10, // Limit recursion depth to prevent performance issues
        awaitWriteFinish: {
          // Debounce file writes to prevent multiple events for single file save
          stabilityThreshold: 200, // Wait for file to be stable for 200ms
          pollInterval: 50, // Check every 50ms
        },
      });

      const callbacks = new Set<FileWatcherCallback>();
      callbacks.add(callback);

      watchedWorkspace = {
        workspaceName,
        workspacePath,
        watcher,
        callbacks,
      };

      this.watchedWorkspaces.set(workspaceName, watchedWorkspace);

      // Setup event handlers
      this.setupWatcherEvents(watchedWorkspace);

      logger.info("Successfully started watching workspace", {
        workspaceName,
        workspacePath,
      });
    } catch (error) {
      logger.error("Failed to start watching workspace", error as Error, {
        workspaceName,
        workspacePath,
      });
      throw error;
    }
  }

  /**
   * Stop watching a workspace
   */
  async unwatchWorkspace(
    workspaceName: string,
    callback?: FileWatcherCallback
  ): Promise<void> {
    const watchedWorkspace = this.watchedWorkspaces.get(workspaceName);
    if (!watchedWorkspace) {
      return;
    }

    if (callback) {
      // Remove specific callback
      watchedWorkspace.callbacks.delete(callback);
      
      // If no more callbacks, close the watcher
      if (watchedWorkspace.callbacks.size === 0) {
        await watchedWorkspace.watcher.close();
        this.watchedWorkspaces.delete(workspaceName);
        logger.info("Stopped watching workspace (no more callbacks)", {
          workspaceName,
        });
      } else {
        logger.debug("Removed callback from workspace watcher", {
          workspaceName,
          remainingCallbacks: watchedWorkspace.callbacks.size,
        });
      }
    } else {
      // Remove all callbacks and close watcher
      await watchedWorkspace.watcher.close();
      this.watchedWorkspaces.delete(workspaceName);
      logger.info("Stopped watching workspace (forced)", { workspaceName });
    }
  }

  /**
   * Setup event handlers for a file watcher
   */
  private setupWatcherEvents(watchedWorkspace: WatchedWorkspace): void {
    const { watcher, workspaceName, workspacePath, callbacks } = watchedWorkspace;

    // File added
    watcher.on("add", async (filePath: string) => {
      try {
        const relativePath = path.relative(workspacePath, filePath);
        const content = await fs.readFile(filePath, "utf-8");
        const stats = await fs.stat(filePath);

        const message: ExternalChangeMessage = {
          type: "external_change",
          payload: {
            path: relativePath,
            newContent: content,
            lastModified: stats.mtime,
            changeType: "created",
          },
        };

        logger.debug("File created", { workspaceName, filePath: relativePath });
        this.notifyCallbacks(callbacks, message);
      } catch (error) {
        logger.error("Error handling file add event", error as Error, {
          workspaceName,
          filePath,
        });
      }
    });

    // File changed
    watcher.on("change", async (filePath: string) => {
      try {
        const relativePath = path.relative(workspacePath, filePath);
        const content = await fs.readFile(filePath, "utf-8");
        const stats = await fs.stat(filePath);

        const message: ExternalChangeMessage = {
          type: "external_change",
          payload: {
            path: relativePath,
            newContent: content,
            lastModified: stats.mtime,
            changeType: "modified",
          },
        };

        logger.debug("File changed", { workspaceName, filePath: relativePath });
        this.notifyCallbacks(callbacks, message);
      } catch (error) {
        logger.error("Error handling file change event", error as Error, {
          workspaceName,
          filePath,
        });
      }
    });

    // File deleted
    watcher.on("unlink", async (filePath: string) => {
      try {
        const relativePath = path.relative(workspacePath, filePath);

        const message: ExternalChangeMessage = {
          type: "external_change",
          payload: {
            path: relativePath,
            newContent: "",
            lastModified: new Date(),
            changeType: "deleted",
          },
        };

        logger.debug("File deleted", { workspaceName, filePath: relativePath });
        this.notifyCallbacks(callbacks, message);
      } catch (error) {
        logger.error("Error handling file delete event", error as Error, {
          workspaceName,
          filePath,
        });
      }
    });

    // Directory added
    watcher.on("addDir", (dirPath: string) => {
      const relativePath = path.relative(workspacePath, dirPath);
      logger.debug("Directory created", { workspaceName, dirPath: relativePath });
      // For now, we don't send notifications for directory creation
      // This could be added in the future if needed
    });

    // Directory deleted
    watcher.on("unlinkDir", (dirPath: string) => {
      const relativePath = path.relative(workspacePath, dirPath);
      logger.debug("Directory deleted", { workspaceName, dirPath: relativePath });
      // For now, we don't send notifications for directory deletion
      // This could be added in the future if needed
    });

    // Watcher errors
    watcher.on("error", (error: Error) => {
      logger.error("File watcher error", error, { workspaceName });
    });

    // Watcher ready
    watcher.on("ready", () => {
      logger.info("File watcher ready", {
        workspaceName,
        watchedPaths: watcher.getWatched(),
      });
    });
  }

  /**
   * Notify all callbacks about a file change
   */
  private notifyCallbacks(
    callbacks: Set<FileWatcherCallback>,
    message: ExternalChangeMessage
  ): void {
    callbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        logger.error("Error in file watcher callback", error as Error);
      }
    });
  }

  /**
   * Get information about watched workspaces
   */
  getWatchedWorkspaces(): Array<{
    workspaceName: string;
    workspacePath: string;
    callbackCount: number;
    watchedPaths: Record<string, string[]>;
  }> {
    return Array.from(this.watchedWorkspaces.entries()).map(
      ([workspaceName, workspace]) => ({
        workspaceName,
        workspacePath: workspace.workspacePath,
        callbackCount: workspace.callbacks.size,
        watchedPaths: workspace.watcher.getWatched(),
      })
    );
  }

  /**
   * Stop all watchers and cleanup
   */
  async cleanup(): Promise<void> {
    logger.info("Cleaning up file watchers", {
      watchedWorkspaceCount: this.watchedWorkspaces.size,
    });

    const closePromises = Array.from(this.watchedWorkspaces.values()).map(
      workspace => workspace.watcher.close()
    );

    try {
      await Promise.all(closePromises);
    } catch (error) {
      logger.error("Error during file watcher cleanup", error as Error);
    }

    this.watchedWorkspaces.clear();
    logger.info("File watcher cleanup completed");
  }
}

// Global singleton instance
let globalFileWatcherService: FileWatcherService | null = null;

export function getFileWatcherService(): FileWatcherService {
  if (!globalFileWatcherService) {
    globalFileWatcherService = new FileWatcherService();
  }
  return globalFileWatcherService;
}

// Cleanup on process exit
if (typeof process !== "undefined") {
  const cleanup = async () => {
    if (globalFileWatcherService) {
      await globalFileWatcherService.cleanup();
      globalFileWatcherService = null;
    }
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("exit", cleanup);
}