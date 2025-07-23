import fs from "fs/promises";
import path from "path";
import YAML from "yaml";
import * as chokidar from "chokidar";
import lockfile from "proper-lockfile";
import { validateUsersYaml, type UsersYamlData, type YamlUser } from "./yaml-schema";
import type { ILogger } from "../types/services";
import { createServiceLogger } from "./logger";

export interface IYamlFileService {
  readUsers(): Promise<UsersYamlData>;
  writeUsers(data: UsersYamlData): Promise<void>;
  addUser(user: YamlUser): Promise<void>;
  updateUser(id: string, updates: Partial<YamlUser>): Promise<void>;
  deleteUser(id: string): Promise<void>;
  getUserByEmail(email: string): Promise<YamlUser | null>;
  getUserById(id: string): Promise<YamlUser | null>;
  hasUsers(): Promise<boolean>;
  startWatching(): void;
  stopWatching(): void;
}

export class YamlFileService implements IYamlFileService {
  private logger: ILogger;
  private filePath: string;
  private lockFilePath: string;
  private watcher?: chokidar.FSWatcher;
  private cache?: UsersYamlData;
  private cacheExpiry?: Date;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(filePath?: string, logger?: ILogger) {
    this.logger = logger || createServiceLogger("YamlFileService");
    this.filePath = filePath || path.join(process.cwd(), "config", "users.yaml");
    this.lockFilePath = `${this.filePath}.lock`;
  }

  async readUsers(): Promise<UsersYamlData> {
    // Check cache first
    if (this.cache && this.cacheExpiry && new Date() < this.cacheExpiry) {
      this.logger.debug("Returning cached users data");
      return this.cache;
    }

    try {
      this.logger.debug("Reading users from YAML file", { filePath: this.filePath });
      
      // Check if file exists
      try {
        await fs.access(this.filePath);
      } catch {
        this.logger.info("Users file doesn't exist, returning empty structure");
        const emptyData = { users: [], config: {} };
        return validateUsersYaml(emptyData);
      }

      const fileContent = await fs.readFile(this.filePath, "utf8");
      const yamlData = YAML.parse(fileContent);
      const validatedData = validateUsersYaml(yamlData);

      // Update cache
      this.cache = validatedData;
      this.cacheExpiry = new Date(Date.now() + this.CACHE_TTL);

      this.logger.debug("Users data read successfully", { 
        userCount: validatedData.users.length 
      });
      
      return validatedData;
    } catch (error) {
      this.logger.error("Failed to read users YAML file", error as Error);
      throw new Error(`Failed to read users file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async writeUsers(data: UsersYamlData): Promise<void> {
    const requestLogger = this.logger.withContext({ userCount: data.users.length });
    
    try {
      requestLogger.debug("Writing users to YAML file");

      // Validate data before writing
      const validatedData = validateUsersYaml(data);

      // Create backup first
      await this.createBackup();

      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });

      // Use file locking for concurrent writes
      await lockfile.lock(this.filePath, {
        stale: 30000, // 30 seconds
        retries: {
          retries: 3,
          factor: 2,
          minTimeout: 1000,
          maxTimeout: 5000,
        },
      });

      try {
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

        requestLogger.info("Users data written successfully");
      } finally {
        await lockfile.unlock(this.filePath);
      }
    } catch (error) {
      requestLogger.error("Failed to write users YAML file", error as Error);
      throw new Error(`Failed to write users file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async addUser(user: YamlUser): Promise<void> {
    const requestLogger = this.logger.withContext({ userId: user.id, email: user.email });
    
    try {
      requestLogger.debug("Adding new user");
      
      const data = await this.readUsers();
      
      // Check if user already exists by email or ID
      const existingByEmail = data.users.find(u => u.email === user.email);
      const existingById = data.users.find(u => u.id === user.id);
      
      if (existingByEmail) {
        throw new Error(`User with email ${user.email} already exists`);
      }
      
      if (existingById) {
        throw new Error(`User with ID ${user.id} already exists`);
      }
      
      data.users.push(user);
      await this.writeUsers(data);
      
      requestLogger.info("User added successfully");
    } catch (error) {
      requestLogger.error("Failed to add user", error as Error);
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<YamlUser>): Promise<void> {
    const requestLogger = this.logger.withContext({ userId: id });
    
    try {
      requestLogger.debug("Updating user");
      
      const data = await this.readUsers();
      const userIndex = data.users.findIndex(u => u.id === id);
      
      if (userIndex === -1) {
        throw new Error(`User with id ${id} not found`);
      }
      
      // Check email uniqueness if email is being updated
      if (updates.email) {
        const existingByEmail = data.users.find(u => u.email === updates.email && u.id !== id);
        if (existingByEmail) {
          throw new Error(`Email ${updates.email} is already in use`);
        }
      }
      
      data.users[userIndex] = {
        ...data.users[userIndex],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      await this.writeUsers(data);
      
      requestLogger.info("User updated successfully");
    } catch (error) {
      requestLogger.error("Failed to update user", error as Error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    const requestLogger = this.logger.withContext({ userId: id });
    
    try {
      requestLogger.debug("Deleting user");
      
      const data = await this.readUsers();
      const userIndex = data.users.findIndex(u => u.id === id);
      
      if (userIndex === -1) {
        throw new Error(`User with id ${id} not found`);
      }
      
      data.users.splice(userIndex, 1);
      await this.writeUsers(data);
      
      requestLogger.info("User deleted successfully");
    } catch (error) {
      requestLogger.error("Failed to delete user", error as Error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<YamlUser | null> {
    const requestLogger = this.logger.withContext({ email });
    
    try {
      requestLogger.debug("Searching for user by email");
      
      const data = await this.readUsers();
      const user = data.users.find(u => u.email === email) || null;
      
      requestLogger.debug("User search completed", { found: !!user });
      return user;
    } catch (error) {
      requestLogger.error("Failed to find user by email", error as Error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<YamlUser | null> {
    const requestLogger = this.logger.withContext({ userId: id });
    
    try {
      requestLogger.debug("Searching for user by ID");
      
      const data = await this.readUsers();
      const user = data.users.find(u => u.id === id) || null;
      
      requestLogger.debug("User search by ID completed", { found: !!user });
      return user;
    } catch (error) {
      requestLogger.error("Failed to find user by ID", error as Error);
      throw error;
    }
  }

  async hasUsers(): Promise<boolean> {
    try {
      this.logger.debug("Checking if users exist");
      
      const data = await this.readUsers();
      const hasUsers = data.users.length > 0;
      
      this.logger.debug("User count check completed", { 
        userCount: data.users.length, 
        hasUsers 
      });
      
      return hasUsers;
    } catch (error) {
      this.logger.error("Failed to check user count", error as Error);
      throw error;
    }
  }

  startWatching(): void {
    if (this.watcher) {
      this.logger.warn("File watcher already started");
      return;
    }

    this.logger.info("Starting file watcher", { filePath: this.filePath });
    
    this.watcher = chokidar.watch(this.filePath, {
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher.on("change", () => {
      this.logger.debug("Users file changed, invalidating cache");
      this.cache = undefined;
      this.cacheExpiry = undefined;
    });

    this.watcher.on("error", (error: unknown) => {
      this.logger.error("File watcher error", error instanceof Error ? error : new Error(String(error)));
    });
  }

  stopWatching(): void {
    if (this.watcher) {
      this.logger.info("Stopping file watcher");
      this.watcher.close();
      this.watcher = undefined;
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
      this.logger.warn("Failed to create backup", { error: error instanceof Error ? error.message : String(error) });
      // Don't throw - backup failure shouldn't prevent writes
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const dir = path.dirname(this.filePath);
      const baseName = path.basename(this.filePath);
      const files = await fs.readdir(dir);
      
      const backupFiles = files
        .filter(file => file.startsWith(`${baseName}.backup.`))
        .map(file => ({
          name: file,
          path: path.join(dir, file),
          stat: fs.stat(path.join(dir, file))
        }));

      if (backupFiles.length <= 5) return;

      // Get file stats and sort by modification time
      const backupsWithStats = await Promise.all(
        backupFiles.map(async backup => ({
          ...backup,
          stat: await backup.stat
        }))
      );

      backupsWithStats.sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime());

      // Remove old backups (keep only 5 most recent)
      const toDelete = backupsWithStats.slice(5);
      
      for (const backup of toDelete) {
        await fs.unlink(backup.path);
        this.logger.debug("Old backup removed", { path: backup.path });
      }
    } catch (error) {
      this.logger.warn("Failed to cleanup old backups", { error: error instanceof Error ? error.message : String(error) });
    }
  }
}