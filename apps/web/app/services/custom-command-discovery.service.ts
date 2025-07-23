import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { parse as parseYaml } from "yaml";

export interface CustomCommand {
  name: string;
  filePath: string;
  description?: string;
  allowedTools?: string[];
  argumentHint?: string;
  frontmatter?: Record<string, unknown>;
}

export interface CommandFrontmatter {
  description?: string;
  allowedTools?: string[];
  argumentHint?: string;
  [key: string]: unknown;
}

class CustomCommandDiscoveryService {
  private readonly cache = new Map<string, { commands: CustomCommand[]; timestamp: number }>();
  private readonly cacheTimeout = 60000; // 1 minute

  /**
   * Discover custom commands using Claude Code standard paths
   */
  async discoverCommands(workspacePath: string): Promise<CustomCommand[]> {
    const cacheKey = workspacePath;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.commands;
    }

    try {
      const commands: CustomCommand[] = [];
      
      // Search in Claude Code standard paths
      const commandDirs = [
        path.join(workspacePath, '.claude/commands'), // Project commands
        path.join(os.homedir(), '.claude/commands')   // User commands
      ];
      
      for (const commandDir of commandDirs) {
        try {
          const dirCommands = await this.scanDirectory(commandDir);
          commands.push(...dirCommands);
        } catch (error) {
          // Silently skip directories that don't exist
          if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
            console.warn(`Error scanning command directory ${commandDir}:`, error);
          }
        }
      }

      // Cache the result
      this.cache.set(cacheKey, {
        commands,
        timestamp: Date.now()
      });

      return commands;
    } catch (error) {
      console.error("Error discovering custom commands:", error);
      return [];
    }
  }

  /**
   * Scan a directory for command files
   */
  private async scanDirectory(directoryPath: string): Promise<CustomCommand[]> {
    const commands: CustomCommand[] = [];
    
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(directoryPath, entry.name);
      
      if (entry.isFile() && this.isCommandFile(entry.name)) {
        try {
          const command = await this.parseCommandFile(fullPath);
          if (command) {
            commands.push(command);
          }
        } catch (error) {
          console.warn(`Failed to parse command file ${fullPath}:`, error);
        }
      } else if (entry.isDirectory()) {
        // Recursively scan subdirectories for namespaced commands
        try {
          const subCommands = await this.scanDirectory(fullPath);
          commands.push(...subCommands);
        } catch (error) {
          // Skip subdirectories that can't be read
        }
      }
    }
    
    return commands;
  }

  /**
   * Check if a file is a command file
   */
  private isCommandFile(filename: string): boolean {
    return filename.endsWith('.md');
  }

  /**
   * Parse a command file and extract metadata
   */
  private async parseCommandFile(filePath: string): Promise<CustomCommand | null> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const name = this.extractCommandName(filePath);
      
      // Parse frontmatter if it exists
      const frontmatter = this.parseFrontmatter(content);
      
      // Extract description from frontmatter or content
      const description = this.extractDescription(frontmatter, content);
      
      return {
        name,
        filePath,
        description,
        allowedTools: frontmatter?.allowedTools,
        argumentHint: frontmatter?.argumentHint,
        frontmatter: frontmatter || undefined
      };
    } catch (error) {
      console.warn(`Failed to parse command file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Extract command name from file path
   */
  private extractCommandName(filePath: string): string {
    const relativePath = filePath.includes('.claude/commands/') 
      ? filePath.split('.claude/commands/')[1]
      : path.basename(filePath);
    
    const nameWithoutExt = relativePath.replace(/\.md$/, '');
    
    // Convert file path to command format (support namespaces)
    return nameWithoutExt.replace(/\//g, ':');
  }

  /**
   * Parse YAML frontmatter from content
   */
  private parseFrontmatter(content: string): CommandFrontmatter | null {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    
    if (!frontmatterMatch) {
      return null;
    }

    try {
      const yamlContent = frontmatterMatch[1];
      return parseYaml(yamlContent) as CommandFrontmatter;
    } catch (error) {
      console.warn("Failed to parse YAML frontmatter:", error);
      return null;
    }
  }

  /**
   * Extract description from frontmatter or content
   */
  private extractDescription(frontmatter: CommandFrontmatter | null, content: string): string | undefined {
    if (frontmatter?.description) {
      return frontmatter.description;
    }

    // Extract from first heading or paragraph
    const lines = content.split("\n");
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed === "---") continue;
      if (!trimmed) continue;
      
      if (trimmed.startsWith("#")) {
        return trimmed.replace(/^#+\s*/, "").trim();
      }
      
      if (trimmed.length > 0) {
        return trimmed.substring(0, 100) + (trimmed.length > 100 ? "..." : "");
      }
    }

    return undefined;
  }

  /**
   * Get command content for execution
   */
  async getCommandContent(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      
      // Remove frontmatter from content for execution
      const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n?/, "");
      
      return withoutFrontmatter.trim();
    } catch (error) {
      throw new Error(`Failed to read command file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
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

export const customCommandDiscoveryService = new CustomCommandDiscoveryService();