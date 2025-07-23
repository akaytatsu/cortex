import * as path from "path";
import { parse as parseYaml } from "yaml";
import type {
  ClaudeAgent,
  AgentCacheEntry,
  AgentListResponse,
} from "shared-types";
import type { IAgentService, IFileSystemService, ILogger } from "../types/services";
import { createServiceLogger } from "../lib/logger";

class AgentServiceError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "AgentServiceError";
  }
}

export class AgentService implements IAgentService {
  private logger: ILogger;
  private cache = new Map<string, AgentCacheEntry>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;
  private readonly ALLOWED_COMMAND_PREFIXES = [
    'claude code',
    'claude test',
    'claude review',
    'claude analyze',
    'claude help'
  ];

  constructor(
    private fileSystemService: IFileSystemService,
    logger?: ILogger
  ) {
    this.logger = logger || createServiceLogger("AgentService");
  }

  private validatePath(workspacePath: string): void {
    // Check for directory traversal patterns
    if (workspacePath.includes('..')) {
      throw new AgentServiceError(
        "Path traversal detected",
        "PATH_TRAVERSAL_DENIED"
      );
    }
  }

  private validateAgentStructure(data: unknown): data is ClaudeAgent[] {
    if (!Array.isArray(data)) {
      return false;
    }

    return data.every(agent => 
      typeof agent === 'object' &&
      agent !== null &&
      typeof agent.name === 'string' &&
      typeof agent.description === 'string' &&
      typeof agent.command === 'string'
    );
  }

  private async retryFileOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 100
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry if it's a "file not found" error
        if (lastError.message.toLowerCase().includes('not found') || 
            lastError.message.toLowerCase().includes('enoent')) {
          throw lastError;
        }
        
        this.logger.debug("File operation failed, retrying", {
          attempt,
          maxRetries,
          error: lastError.message
        });
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        }
      }
    }
    
    throw lastError!;
  }

  private isCacheValid(entry: AgentCacheEntry): boolean {
    const now = Date.now();
    const entryTime = entry.lastModified.getTime();
    return (now - entryTime) < this.CACHE_TTL_MS;
  }

  private evictOldestCacheEntry(): void {
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // Find and remove the oldest entry (least recently used)
      let oldestKey: string | undefined;
      let oldestTime = Date.now();
      
      for (const [key, entry] of this.cache.entries()) {
        if (entry.lastModified.getTime() < oldestTime) {
          oldestTime = entry.lastModified.getTime();
          oldestKey = key;
        }
      }
      
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.logger.debug("Evicted oldest cache entry", { 
          key: oldestKey, 
          lastModified: new Date(oldestTime).toISOString(),
          cacheSize: this.cache.size 
        });
      }
    }
  }

  validateAgentCommand(command: string): boolean {
    return this.ALLOWED_COMMAND_PREFIXES.some(prefix => 
      command.toLowerCase().startsWith(prefix.toLowerCase())
    );
  }

  invalidateCache(workspacePath: string): void {
    const normalizedPath = path.resolve(workspacePath);
    this.cache.delete(normalizedPath);
    this.logger.info("Cache invalidated", { workspacePath: normalizedPath });
  }

  async loadAgentsFromWorkspace(workspacePath: string): Promise<ClaudeAgent[]> {
    try {
      this.validatePath(workspacePath);
      const normalizedPath = path.resolve(workspacePath);
      
      // Check cache first
      const cached = this.cache.get(normalizedPath);
      if (cached && this.isCacheValid(cached)) {
        this.logger.debug("Cache hit", { workspacePath: normalizedPath });
        return cached.agents;
      }

      const agentFilePath = path.join(normalizedPath, '.claude-agents.yaml');
      
      try {
        const fileContent = await this.retryFileOperation(async () => 
          await this.fileSystemService.getFileContent(
            normalizedPath, 
            '.claude-agents.yaml'
          )
        );
        
        const parsedData = parseYaml(fileContent.content);
        
        if (!this.validateAgentStructure(parsedData)) {
          this.logger.warn("Invalid agent structure in YAML", { 
            workspacePath: normalizedPath,
            filePath: agentFilePath 
          });
          return [];
        }

        // Validate all agent commands
        const validAgents = parsedData.filter(agent => {
          const isValid = this.validateAgentCommand(agent.command);
          if (!isValid) {
            this.logger.warn("Invalid agent command rejected", {
              agentName: agent.name,
              command: agent.command,
              workspacePath: normalizedPath
            });
          }
          return isValid;
        });

        // Update cache
        this.evictOldestCacheEntry();
        const cacheEntry: AgentCacheEntry = {
          agents: validAgents,
          lastModified: new Date(),
          filePath: agentFilePath,
          ttl: this.CACHE_TTL_MS
        };
        this.cache.set(normalizedPath, cacheEntry);

        this.logger.info("Agents loaded successfully", { 
          workspacePath: normalizedPath,
          agentCount: validAgents.length,
          fromCache: false
        });

        return validAgents;

      } catch (fileError) {
        // File doesn't exist or can't be read - return empty array
        this.logger.debug("Agent file not found or unreadable", { 
          workspacePath: normalizedPath,
          error: fileError instanceof Error ? fileError.message : String(fileError)
        });
        return [];
      }

    } catch (error) {
      this.logger.error("Error loading agents", error as Error, { 
        workspacePath 
      });
      
      // Return empty array for any errors to maintain graceful degradation
      return [];
    }
  }

  async getAgentByName(workspacePath: string, agentName: string): Promise<ClaudeAgent | null> {
    const agents = await this.loadAgentsFromWorkspace(workspacePath);
    return agents.find(agent => agent.name === agentName) || null;
  }

  async getAgentsWithMetadata(workspacePath: string): Promise<AgentListResponse> {
    const normalizedPath = path.resolve(workspacePath);
    const cached = this.cache.get(normalizedPath);
    const fromCache = cached && this.isCacheValid(cached);
    
    const agents = await this.loadAgentsFromWorkspace(workspacePath);
    
    const response: AgentListResponse = {
      agents,
      metadata: {
        cacheTimestamp: new Date().toISOString(),
        fileLastModified: cached?.lastModified.toISOString() || new Date().toISOString(),
        version: "1.0.0",
        fromCache: Boolean(fromCache)
      }
    };

    return response;
  }
}