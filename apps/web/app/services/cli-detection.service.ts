import { exec } from "child_process";
import { promisify } from "util";
import { createServiceLogger } from "../lib/logger";

export class CliDetectionServiceError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "CliDetectionServiceError";
  }
}

export interface CliDetectionResult {
  status: 'available' | 'not-available' | 'error';
  version?: string;
  error?: string;
}

interface CacheEntry {
  result: CliDetectionResult;
  timestamp: Date;
}

const execAsync = promisify(exec);
const logger = createServiceLogger("CliDetectionService");

class CliDetectionService {
  private cache = new Map<string, CacheEntry>();
  private readonly cacheTimeoutMs = 30000; // 30 seconds cache

  private sanitizeOutput(output: string): string {
    // Sanitize output for logging - remove potential sensitive paths
    return output.replace(/\/[^\s]+/g, '[PATH]').trim();
  }

  private isCacheValid(entry: CacheEntry): boolean {
    const now = new Date();
    return (now.getTime() - entry.timestamp.getTime()) < this.cacheTimeoutMs;
  }

  async checkClaudeCodeAvailability(workingDirectory?: string): Promise<CliDetectionResult> {
    const cacheKey = workingDirectory || 'default';
    
    // Check cache first
    const cachedEntry = this.cache.get(cacheKey);
    if (cachedEntry && this.isCacheValid(cachedEntry)) {
      logger.debug("Returning cached CLI detection result", { 
        status: cachedEntry.result.status,
        workingDirectory: workingDirectory || '[default]'
      });
      return cachedEntry.result;
    }

    logger.info("Checking Claude Code CLI availability", { 
      workingDirectory: workingDirectory || '[default]'
    });

    try {
      // First try to check if claude command exists
      const whichResult = await this.checkWhichClaude(workingDirectory);
      if (whichResult.status === 'not-available') {
        return this.cacheAndReturn(cacheKey, whichResult);
      }

      // If which found it, try to get version
      const versionResult = await this.getClaudeVersion(workingDirectory);
      return this.cacheAndReturn(cacheKey, versionResult);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error("Failed to check Claude Code CLI availability", error as Error);
      
      const result: CliDetectionResult = {
        status: 'error',
        error: errorMessage
      };
      
      return this.cacheAndReturn(cacheKey, result);
    }
  }

  private async checkWhichClaude(workingDirectory?: string): Promise<CliDetectionResult> {
    try {
      const options = workingDirectory ? { cwd: workingDirectory } : {};
      await execAsync('which claude', options);
      
      return {
        status: 'available'
      };
    } catch (error) {
      logger.debug("which claude failed", { 
        error: error instanceof Error ? this.sanitizeOutput(error.message) : 'Unknown error'
      });
      
      return {
        status: 'not-available',
        error: 'Claude Code CLI not found in PATH'
      };
    }
  }

  private async getClaudeVersion(workingDirectory?: string): Promise<CliDetectionResult> {
    try {
      const options = workingDirectory ? { cwd: workingDirectory } : {};
      const { stdout, stderr } = await execAsync('claude --version', options);
      
      const output = stdout || stderr;
      const sanitizedOutput = this.sanitizeOutput(output);
      
      // Extract version from output (claude version might be in different formats)
      const versionMatch = output.match(/(\d+\.\d+\.\d+)/);
      const version = versionMatch ? versionMatch[1] : sanitizedOutput;
      
      logger.info("Claude Code CLI detected", { version: sanitizedOutput });
      
      return {
        status: 'available',
        version
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? this.sanitizeOutput(error.message) : 'Unknown error';
      logger.warn("Failed to get Claude Code CLI version", { error: errorMessage });
      
      // If which found it but version failed, still consider it available
      return {
        status: 'available',
        error: 'Version check failed but CLI is present'
      };
    }
  }

  private cacheAndReturn(cacheKey: string, result: CliDetectionResult): CliDetectionResult {
    this.cache.set(cacheKey, {
      result,
      timestamp: new Date()
    });
    
    return result;
  }

  clearCache(workingDirectory?: string): void {
    if (workingDirectory) {
      this.cache.delete(workingDirectory);
      logger.debug("Cleared CLI detection cache", { workingDirectory });
    } else {
      this.cache.clear();
      logger.debug("Cleared all CLI detection cache");
    }
  }

  getCacheStats(): { entries: number; oldestEntry?: Date } {
    const entries = this.cache.size;
    let oldestEntry: Date | undefined;
    
    for (const entry of this.cache.values()) {
      if (!oldestEntry || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
    }
    
    return { entries, oldestEntry };
  }
}

export const cliDetectionService = new CliDetectionService();