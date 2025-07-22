import { config as dotenvConfig } from "dotenv";

// Load environment variables from .env file
dotenvConfig();

/**
 * Gets a required environment variable with validation
 * @param name - Environment variable name
 * @param validate - Optional validation function
 * @throws Error if variable is missing or validation fails
 */
function getRequiredEnvVar(
  name: string,
  validate?: (value: string) => boolean
): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Required environment variable ${name} is not set or is empty`
    );
  }

  if (validate && !validate(value)) {
    throw new Error(`Environment variable ${name} has invalid value: ${value}`);
  }

  return value;
}

/**
 * Gets an optional environment variable with type safety
 * @param name - Environment variable name
 * @param defaultValue - Default value if not set
 * @param validate - Optional validation function
 */
function getOptionalEnvVar(
  name: string,
  defaultValue: string,
  validate?: (value: string) => boolean
): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    return defaultValue;
  }

  if (validate && !validate(value)) {
    console.warn(
      `Environment variable ${name} has invalid value: ${value}, using default: ${defaultValue}`
    );
    return defaultValue;
  }

  return value;
}

/**
 * Gets an optional numeric environment variable with validation
 */
function getOptionalNumericEnvVar(
  name: string,
  defaultValue: number,
  min?: number,
  max?: number
): number {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    return defaultValue;
  }

  const numValue = Number(value);
  if (isNaN(numValue)) {
    console.warn(
      `Environment variable ${name} is not a valid number: ${value}, using default: ${defaultValue}`
    );
    return defaultValue;
  }

  if (min !== undefined && numValue < min) {
    console.warn(
      `Environment variable ${name} is below minimum ${min}: ${numValue}, using default: ${defaultValue}`
    );
    return defaultValue;
  }

  if (max !== undefined && numValue > max) {
    console.warn(
      `Environment variable ${name} is above maximum ${max}: ${numValue}, using default: ${defaultValue}`
    );
    return defaultValue;
  }

  return numValue;
}

// Validation functions
const isValidNodeEnv = (value: string): boolean => {
  return ["development", "production", "test"].includes(value);
};

const isValidDatabaseUrl = (value: string): boolean => {
  return (
    value.startsWith("file:") ||
    value.startsWith("postgresql:") ||
    value.startsWith("mysql:")
  );
};

const isValidLogLevel = (value: string): boolean => {
  return ["error", "warn", "info", "debug"].includes(value);
};

// Type-safe configuration object with validation
export const config = {
  database: {
    url: getRequiredEnvVar("DATABASE_URL", isValidDatabaseUrl),
  },
  node: {
    env: getOptionalEnvVar("NODE_ENV", "development", isValidNodeEnv) as
      | "development"
      | "production"
      | "test",
  },
  server: {
    port: getOptionalNumericEnvVar("PORT", 8080, 1024, 65535),
    websocketPort: getOptionalNumericEnvVar("WS_PORT", 8000, 1024, 65535),
  },
  terminal: {
    maxInactivityMs: getOptionalNumericEnvVar(
      "TERMINAL_MAX_INACTIVITY_MS",
      30 * 60 * 1000, // 30 minutes
      60 * 1000, // minimum 1 minute
      24 * 60 * 60 * 1000 // maximum 24 hours
    ),
    cleanupIntervalMs: getOptionalNumericEnvVar(
      "TERMINAL_CLEANUP_INTERVAL_MS",
      60 * 1000, // 1 minute
      10 * 1000, // minimum 10 seconds
      10 * 60 * 1000 // maximum 10 minutes
    ),
    maxSessions: getOptionalNumericEnvVar(
      "TERMINAL_MAX_SESSIONS",
      10,
      1,
      100
    ),
  },
  files: {
    maxSizeBytes: getOptionalNumericEnvVar(
      "FILE_MAX_SIZE_BYTES",
      10 * 1024 * 1024, // 10MB
      1024, // minimum 1KB
      100 * 1024 * 1024 // maximum 100MB
    ),
    allowedExtensions: (
      getOptionalEnvVar(
        "FILE_ALLOWED_EXTENSIONS",
        ".js,.ts,.tsx,.jsx,.json,.md,.txt,.yml,.yaml,.xml,.py,.java,.php,.go,.rs,.c,.cpp,.h,.hpp,.sql,.sh,.dockerfile,.gitignore,.env"
      )
    ).split(",").map(ext => ext.trim()),
  },
  auth: {
    saltRounds: getOptionalNumericEnvVar("AUTH_SALT_ROUNDS", 12, 10, 15),
    sessionMaxAge: getOptionalNumericEnvVar(
      "SESSION_MAX_AGE_MS",
      7 * 24 * 60 * 60 * 1000, // 7 days
      60 * 60 * 1000, // minimum 1 hour
      30 * 24 * 60 * 60 * 1000 // maximum 30 days
    ),
  },
  logging: {
    level: getOptionalEnvVar("LOG_LEVEL", "info", isValidLogLevel) as
      | "error"
      | "warn"
      | "info"
      | "debug",
    enableConsole: getOptionalEnvVar("LOG_ENABLE_CONSOLE", "true") === "true",
    enableStructured: getOptionalEnvVar("LOG_ENABLE_STRUCTURED", "true") === "true",
  },
  sessionSecret: getOptionalEnvVar(
    "SESSION_SECRET",
    "default-dev-secret-change-in-production"
  ),
  env: getOptionalEnvVar("NODE_ENV", "development", isValidNodeEnv) as
    | "development"
    | "production"
    | "test",
} as const;

/**
 * Validates the complete configuration at startup
 * @throws Error if any critical configuration is invalid
 */
export function validateConfig(): void {
  try {
    // Test database URL accessibility (basic validation)
    if (!config.database.url) {
      throw new Error("DATABASE_URL is required");
    }

    // Validate server ports
    if (config.server.port === config.server.websocketPort) {
      throw new Error("PORT and WS_PORT cannot be the same");
    }

    // Validate file extensions format
    config.files.allowedExtensions.forEach(ext => {
      if (!ext.startsWith(".")) {
        throw new Error(`Invalid file extension format: ${ext}. Must start with dot.`);
      }
    });

    console.log("✅ Configuration validation successful");
  } catch (error) {
    console.error("❌ Configuration validation failed:", error);
    throw error;
  }
}

// Type exports for use throughout the application
export type Config = typeof config;
export type NodeEnv = typeof config.node.env;
