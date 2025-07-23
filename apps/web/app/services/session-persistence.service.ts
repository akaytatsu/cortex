import fs from "fs/promises";
import path from "path";
import YAML from "yaml";
import type { PersistedSession } from "shared-types";
import type { ILogger, ISessionPersistenceService } from "../types/services";
import { createServiceLogger } from "../lib/logger";
import {
  validateSessionsYaml,
  validatePersistedSession,
  type SessionsYamlData,
} from "../lib/yaml-schema";

export class SessionPersistenceService implements ISessionPersistenceService {
  private logger: ILogger;
  private filePath: string;
  private cache?: SessionsYamlData;
  private cacheExpiry?: Date;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(filePath?: string, logger?: ILogger) {
    this.logger = logger || createServiceLogger("SessionPersistenceService");

    if (!filePath) {
      // Detect the correct config path based on current working directory
      const cwd = process.cwd();
      if (cwd.endsWith("apps/web")) {
        // Running from within apps/web directory
        this.filePath = path.join(cwd, "config", "sessions.yaml");
      } else {
        // Running from project root
        this.filePath = path.join(cwd, "apps", "web", "config", "sessions.yaml");
      }
    } else {
      this.filePath = filePath;
    }
  }

  async loadSessions(): Promise<PersistedSession[]> {
    // Check cache first
    if (this.cache && this.cacheExpiry && new Date() < this.cacheExpiry) {
      this.logger.debug("Returning cached sessions data");
      return this.cache.sessions;
    }

    try {
      this.logger.debug("Reading sessions from YAML file", {
        filePath: this.filePath,
      });

      // Check if file exists
      try {
        await fs.access(this.filePath);
      } catch {
        this.logger.info("Sessions file doesn't exist, returning empty array");
        const emptyData = { sessions: [] };
        return validateSessionsYaml(emptyData).sessions;
      }

      const fileContent = await fs.readFile(this.filePath, "utf8");
      const yamlData = YAML.parse(fileContent);
      const validatedData = validateSessionsYaml(yamlData);

      // Update cache
      this.cache = validatedData;
      this.cacheExpiry = new Date(Date.now() + this.CACHE_TTL);

      this.logger.debug("Sessions data read successfully", {
        sessionCount: validatedData.sessions.length,
      });

      return validatedData.sessions;
    } catch (error) {
      this.logger.error("Failed to read sessions YAML file", error as Error, {
        filePath: this.filePath,
      });
      
      // Fallback to empty array in case of corrupted file
      this.logger.warn("Returning empty sessions array due to read error");
      return [];
    }
  }

  private async writeSessions(data: SessionsYamlData): Promise<void> {
    const requestLogger = this.logger.withContext({
      sessionCount: data.sessions.length,
    });

    try {
      requestLogger.debug("Writing sessions to YAML file");

      // Validate data before writing
      const validatedData = validateSessionsYaml(data);

      // Ensure directory exists first
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });

      // Create backup after directory exists
      await this.createBackup();

      // Create empty file if it doesn't exist
      try {
        await fs.access(this.filePath);
      } catch {
        // File doesn't exist, create empty YAML structure
        const emptyYaml = YAML.stringify(
          { sessions: [] },
          { indent: 2 }
        );
        await fs.writeFile(this.filePath, emptyYaml, "utf8");
      }

      // Write the file
      const yamlContent = YAML.stringify(validatedData, {
        indent: 2,
        lineWidth: 0,
      });

      await fs.writeFile(this.filePath, yamlContent, "utf8");

      // Set secure permissions (600 - rw-------)
      await fs.chmod(this.filePath, 0o600);

      // Update cache
      this.cache = validatedData;
      this.cacheExpiry = new Date(Date.now() + this.CACHE_TTL);

      requestLogger.info("Sessions data written successfully");
    } catch (error) {
      requestLogger.error("Failed to write sessions YAML file", error as Error);
      throw new Error(
        `Failed to write sessions file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async saveSession(session: PersistedSession): Promise<void> {
    const requestLogger = this.logger.withContext({
      sessionId: session.id,
      workspaceName: session.workspaceName,
      pid: session.pid,
    });

    try {
      requestLogger.debug("Saving session");

      // Validate session data
      const validatedSession = validatePersistedSession(session);

      const sessions = await this.loadSessions();

      // Check if session already exists
      const existingIndex = sessions.findIndex(s => s.id === session.id);
      
      if (existingIndex !== -1) {
        // Update existing session
        sessions[existingIndex] = validatedSession;
        requestLogger.debug("Updated existing session");
      } else {
        // Add new session
        sessions.push(validatedSession);
        requestLogger.debug("Added new session");
      }

      await this.writeSessions({ sessions });

      requestLogger.info("Session saved successfully");
    } catch (error) {
      requestLogger.error("Failed to save session", error as Error);
      throw error;
    }
  }

  async removeSession(sessionId: string): Promise<void> {
    const requestLogger = this.logger.withContext({ sessionId });

    try {
      requestLogger.debug("Removing session");

      const sessions = await this.loadSessions();
      const initialCount = sessions.length;
      
      const filteredSessions = sessions.filter(s => s.id !== sessionId);

      if (filteredSessions.length === initialCount) {
        requestLogger.warn("Session not found for removal");
        return; // Session doesn't exist, nothing to remove
      }

      await this.writeSessions({ sessions: filteredSessions });

      requestLogger.info("Session removed successfully");
    } catch (error) {
      requestLogger.error("Failed to remove session", error as Error);
      throw error;
    }
  }

  async updateSession(sessionId: string, updates: Partial<PersistedSession>): Promise<void> {
    const requestLogger = this.logger.withContext({ sessionId });

    try {
      requestLogger.debug("Updating session");

      const sessions = await this.loadSessions();
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);

      if (sessionIndex === -1) {
        throw new Error(`Session with id ${sessionId} not found`);
      }

      // Merge updates with existing session
      const updatedSession = {
        ...sessions[sessionIndex],
        ...updates,
      };

      // Validate updated session
      const validatedSession = validatePersistedSession(updatedSession);
      sessions[sessionIndex] = validatedSession;

      await this.writeSessions({ sessions });

      requestLogger.info("Session updated successfully");
    } catch (error) {
      requestLogger.error("Failed to update session", error as Error);
      throw error;
    }
  }

  private async createBackup(): Promise<void> {
    try {
      // Check if original file exists
      try {
        await fs.access(this.filePath);
      } catch {
        // File doesn't exist, no backup needed
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = `${this.filePath}.backup.${timestamp}`;

      await fs.copyFile(this.filePath, backupPath);
      this.logger.debug("Backup created", { backupPath });

      // Keep only last 5 backups
      await this.cleanupOldBackups();
    } catch (error) {
      this.logger.warn("Failed to create backup", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - backup failure shouldn't prevent writes
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const dir = path.dirname(this.filePath);
      const baseName = path.basename(this.filePath);

      // Check if directory exists before trying to read it
      try {
        await fs.access(dir);
      } catch {
        // Directory doesn't exist, no backups to clean up
        return;
      }

      const files = await fs.readdir(dir);

      const backupFiles = files
        .filter(file => file.startsWith(`${baseName}.backup.`))
        .map(file => ({
          name: file,
          path: path.join(dir, file),
        }));

      if (backupFiles.length <= 5) return;

      // Get file stats and sort by modification time
      const backupsWithStats = [];
      for (const backup of backupFiles) {
        try {
          const stat = await fs.stat(backup.path);
          backupsWithStats.push({ ...backup, stat });
        } catch (error) {
          // File might have been deleted, skip it
          this.logger.debug("Backup file no longer exists, skipping", {
            path: backup.path,
          });
        }
      }

      backupsWithStats.sort(
        (a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime()
      );

      // Remove old backups (keep only 5 most recent)
      const toDelete = backupsWithStats.slice(5);

      for (const backup of toDelete) {
        await fs.unlink(backup.path);
        this.logger.debug("Old backup removed", { path: backup.path });
      }
    } catch (error) {
      this.logger.warn("Failed to cleanup old backups", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}