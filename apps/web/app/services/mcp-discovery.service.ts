import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

export interface McpServer {
  name: string;
  type: "stdio" | "sse" | "http";
  description?: string;
  commands: McpCommand[];
  resources: McpResource[];
  status: "connected" | "disconnected" | "error";
  configPath?: string;
  executable?: string;
  args?: string[];
}

export interface McpCommand {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

interface ClaudeSettings {
  mcpServers?: Record<string, {
    command: string;
    args?: string[];
    env?: Record<string, string>;
    description?: string;
  }>;
}

class McpDiscoveryService {
  private readonly cache = new Map<string, { servers: McpServer[]; timestamp: number }>();
  private readonly cacheTimeout = 120000; // 2 minutes

  /**
   * Discover MCP servers using Claude Code standard settings files
   */
  async discoverMcpServers(workspacePath: string): Promise<McpServer[]> {
    const cacheKey = workspacePath;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.servers;
    }

    try {
      const servers: McpServer[] = [];
      
      // Check Claude Code standard settings paths
      const settingsPaths = [
        path.join(workspacePath, '.claude/settings.json'), // Project settings
        path.join(os.homedir(), '.claude/settings.json')   // User settings
      ];
      
      for (const settingsPath of settingsPaths) {
        try {
          const settingsServers = await this.parseSettingsFile(settingsPath);
          
          // Merge without duplicates
          for (const server of settingsServers) {
            const existing = servers.find(s => s.name === server.name);
            if (!existing) {
              servers.push(server);
            }
          }
        } catch (error) {
          // Silently skip files that don't exist
          if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
            console.warn(`Error reading settings file ${settingsPath}:`, error);
          }
        }
      }

      // Cache the result
      this.cache.set(cacheKey, {
        servers,
        timestamp: Date.now()
      });

      return servers;
    } catch (error) {
      console.error("Error discovering MCP servers:", error);
      return [];
    }
  }

  /**
   * Parse Claude settings file for MCP servers
   */
  private async parseSettingsFile(settingsPath: string): Promise<McpServer[]> {
    const content = await fs.readFile(settingsPath, "utf-8");
    const settings: ClaudeSettings = JSON.parse(content);
    
    if (!settings.mcpServers) {
      return [];
    }

    const servers: McpServer[] = [];
    
    for (const [name, serverConfig] of Object.entries(settings.mcpServers)) {
      servers.push({
        name,
        type: "stdio", // Most MCP servers use stdio
        description: serverConfig.description || `MCP server: ${name}`,
        commands: [
          {
            name: "help",
            description: `Get help for ${name}`
          }
        ],
        resources: [],
        status: "disconnected", // Will be set to connected when actually tested
        executable: serverConfig.command,
        args: serverConfig.args
      });
    }

    return servers;
  }


  /**
   * Clear cache for a specific workspace
   */
  clearCache(workspacePath?: string): void {
    if (workspacePath) {
      this.cache.delete(workspacePath);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { entries: number; oldestEntry: number | null } {
    const entries = this.cache.size;
    let oldestEntry: number | null = null;
    
    if (entries > 0) {
      const timestamps = Array.from(this.cache.values()).map(entry => entry.timestamp);
      oldestEntry = Math.min(...timestamps);
    }
    
    return { entries, oldestEntry };
  }
}

export const mcpDiscoveryService = new McpDiscoveryService();