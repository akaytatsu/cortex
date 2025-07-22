import { config } from "./config";
import type { ILogger, LogContext } from "../types/services";

type LogLevel = "error" | "warn" | "info" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  correlationId?: string;
}

class Logger implements ILogger {
  private correlationId?: string;
  private context?: LogContext;

  constructor(correlationId?: string, context?: LogContext) {
    this.correlationId = correlationId;
    this.context = context;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["error", "warn", "info", "debug"];
    const configLevel = config.logging.level;
    return levels.indexOf(level) <= levels.indexOf(configLevel);
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    error?: Error,
    additionalContext?: LogContext
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: this.correlationId || this.generateCorrelationId(),
    };

    // Merge contexts
    const mergedContext = {
      ...this.context,
      ...additionalContext,
    };

    if (Object.keys(mergedContext).length > 0) {
      entry.context = mergedContext;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  private output(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    if (config.logging.enableStructured) {
      // Structured JSON logging for production/parsing
      const structuredLog = JSON.stringify(entry);
      
      if (config.logging.enableConsole) {
        switch (entry.level) {
          case "error":
            console.error(structuredLog);
            break;
          case "warn":
            console.warn(structuredLog);
            break;
          case "debug":
            console.debug(structuredLog);
            break;
          default:
            console.log(structuredLog);
        }
      }
    } else {
      // Human-readable logging for development
      let output = `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`;
      
      if (entry.correlationId) {
        output += ` (${entry.correlationId})`;
      }

      if (entry.context) {
        const contextStr = Object.entries(entry.context)
          .map(([key, value]) => `${key}=${value}`)
          .join(", ");
        output += ` {${contextStr}}`;
      }

      if (config.logging.enableConsole) {
        switch (entry.level) {
          case "error":
            console.error(output);
            if (entry.error?.stack) {
              console.error(entry.error.stack);
            }
            break;
          case "warn":
            console.warn(output);
            break;
          case "debug":
            console.debug(output);
            break;
          default:
            console.log(output);
        }
      }
    }
  }

  info(message: string, context?: LogContext): void {
    const entry = this.createLogEntry("info", message, undefined, context);
    this.output(entry);
  }

  warn(message: string, context?: LogContext): void {
    const entry = this.createLogEntry("warn", message, undefined, context);
    this.output(entry);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const entry = this.createLogEntry("error", message, error, context);
    this.output(entry);
  }

  debug(message: string, context?: LogContext): void {
    const entry = this.createLogEntry("debug", message, undefined, context);
    this.output(entry);
  }

  withContext(context: LogContext): ILogger {
    return new Logger(this.correlationId, {
      ...this.context,
      ...context,
    });
  }

  withCorrelationId(correlationId: string): ILogger {
    return new Logger(correlationId, this.context);
  }
}

// Create default logger instance
export const logger = new Logger();

// Factory function for request-scoped loggers
export function createRequestLogger(request: Request): ILogger {
  const correlationId = request.headers.get("x-correlation-id") || 
                       `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  return new Logger(correlationId, {
    method: request.method,
    url: request.url,
  });
}

// Factory function for service-scoped loggers
export function createServiceLogger(serviceName: string, context?: LogContext): ILogger {
  return new Logger(undefined, {
    service: serviceName,
    ...context,
  });
}

// Export types
export type { LogLevel, LogEntry };