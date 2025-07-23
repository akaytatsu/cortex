import { spawn, type ChildProcess } from "child_process";
import { promisify } from "util";
import * as path from "path";

export interface ClaudeCodeExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  exitCode?: number;
}

export interface ExecutionOptions {
  sessionId?: string;
  timeout?: number; // milliseconds
  cwd?: string;
  env?: Record<string, string>;
}

class ClaudeCodeExecutionService {
  private activeSessions: Map<string, ChildProcess> = new Map();
  private readonly defaultTimeout = 30000; // 30 seconds
  private readonly maxTimeout = 300000; // 5 minutes

  /**
   * Execute a Claude Code CLI command
   */
  async executeCommand(
    workspacePath: string,
    command: string,
    args: string[] = [],
    options: ExecutionOptions = {}
  ): Promise<ClaudeCodeExecutionResult> {
    const startTime = Date.now();
    const timeout = Math.min(options.timeout || this.defaultTimeout, this.maxTimeout);
    
    // Validate command for security
    const validatedCommand = this.validateCommand(command);
    const sanitizedArgs = this.sanitizeArgs(args);

    try {
      const result = await this.spawnClaudeProcess(
        workspacePath,
        validatedCommand,
        sanitizedArgs,
        timeout,
        options
      );

      return {
        success: result.exitCode === 0,
        output: result.stdout,
        error: result.stderr || undefined,
        executionTime: Date.now() - startTime,
        exitCode: result.exitCode
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      if (error instanceof Error && error.message.includes('timeout')) {
        return {
          success: false,
          output: '',
          error: `Command timed out after ${timeout}ms`,
          executionTime
        };
      }

      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown execution error',
        executionTime
      };
    }
  }

  /**
   * Spawn Claude Code process with proper error handling
   */
  private async spawnClaudeProcess(
    workspacePath: string,
    command: string,
    args: string[],
    timeout: number,
    options: ExecutionOptions
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        ...options.env,
        // Ensure we're in the correct workspace context
        PWD: workspacePath
      };

      const cwd = options.cwd || workspacePath;
      
      // Construct the full command arguments
      const fullArgs = this.buildClaudeArgs(command, args);
      
      console.log(`Executing Claude Code: claude ${fullArgs.join(' ')} in ${cwd}`);

      // Spawn the process
      const childProcess = spawn('claude', fullArgs, {
        cwd,
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Track session if provided
      if (options.sessionId) {
        this.activeSessions.set(options.sessionId, childProcess);
      }

      let stdout = '';
      let stderr = '';
      let isResolved = false;

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          childProcess.kill('SIGTERM');
          
          // Force kill after grace period
          setTimeout(() => {
            if (!childProcess.killed) {
              childProcess.kill('SIGKILL');
            }
          }, 5000);
          
          reject(new Error(`timeout: Command timed out after ${timeout}ms`));
        }
      }, timeout);

      // Handle stdout
      childProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      // Handle stderr
      childProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle process completion
      childProcess.on('close', (code) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutHandle);
          
          // Clean up session tracking
          if (options.sessionId) {
            this.activeSessions.delete(options.sessionId);
          }
          
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code || 0
          });
        }
      });

      // Handle process errors
      childProcess.on('error', (error) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutHandle);
          
          // Clean up session tracking
          if (options.sessionId) {
            this.activeSessions.delete(options.sessionId);
          }
          
          reject(error);
        }
      });
    });
  }

  /**
   * Build Claude CLI arguments based on command type
   */
  private buildClaudeArgs(command: string, args: string[]): string[] {
    // Handle different command types
    switch (command) {
      case 'help':
        return ['--help', ...args];
      
      case 'clear':
        // Claude Code doesn't have a direct clear command via CLI
        // We'll simulate this by returning a success message
        return ['--version']; // Safe command that always works
      
      case 'status':
        return ['--version'];
      
      case 'review':
        // Use -p flag for non-interactive mode
        return ['-p', `Please review this code: ${args.join(' ')}`];
      
      case 'settings':
        if (args.length === 0) {
          return ['--help'];
        }
        return ['-p', `Show settings for: ${args.join(' ')}`];
      
      case 'vim':
        return ['-p', `Configure vim mode: ${args.join(' ')}`];
      
      case 'custom':
        // Custom command execution
        const [customCommand, ...customArgs] = args;
        return ['-p', `Execute custom command: /${customCommand} ${customArgs.join(' ')}`];
      
      case 'mcp':
        // MCP command execution  
        const [server, mcpCommand, ...mcpArgs] = args;
        return ['-p', `Execute MCP command: /mcp__${server}__${mcpCommand} ${mcpArgs.join(' ')}`];
      
      default:
        // Default to non-interactive prompt mode
        return ['-p', `${command} ${args.join(' ')}`];
    }
  }

  /**
   * Validate command for security
   */
  private validateCommand(command: string): string {
    // Whitelist of allowed commands
    const allowedCommands = [
      'help', 'clear', 'status', 'review', 'settings', 'vim',
      'custom', 'mcp'
    ];

    // Sanitize command string
    const sanitized = command.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '');
    
    if (!allowedCommands.includes(sanitized)) {
      throw new Error(`Command not allowed: ${command}`);
    }

    return sanitized;
  }

  /**
   * Sanitize arguments to prevent injection attacks
   */
  private sanitizeArgs(args: string[]): string[] {
    return args.map(arg => {
      // Remove dangerous characters and limit length
      return arg
        .replace(/[;&|`$(){}[\]]/g, '') // Remove shell metacharacters
        .substring(0, 1000) // Limit length
        .trim();
    });
  }

  /**
   * Kill active session
   */
  async killSession(sessionId: string): Promise<boolean> {
    const process = this.activeSessions.get(sessionId);
    if (process && !process.killed) {
      process.kill('SIGTERM');
      
      // Force kill after grace period
      setTimeout(() => {
        if (!process.killed) {
          process.kill('SIGKILL');
        }
      }, 5000);
      
      this.activeSessions.delete(sessionId);
      return true;
    }
    return false;
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Clean up all active sessions
   */
  async cleanup(): Promise<void> {
    const promises = Array.from(this.activeSessions.keys()).map(sessionId => 
      this.killSession(sessionId)
    );
    
    await Promise.all(promises);
    this.activeSessions.clear();
  }
}

export const claudeCodeExecutionService = new ClaudeCodeExecutionService();