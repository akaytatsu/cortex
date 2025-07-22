import { config as dotenvConfig } from 'dotenv'

// Load environment variables from .env file
dotenvConfig()

/**
 * Gets a required environment variable with validation
 * @param name - Environment variable name
 * @param validate - Optional validation function
 * @throws Error if variable is missing or validation fails
 */
function getRequiredEnvVar(name: string, validate?: (value: string) => boolean): string {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    throw new Error(`Required environment variable ${name} is not set or is empty`)
  }
  
  if (validate && !validate(value)) {
    throw new Error(`Environment variable ${name} has invalid value: ${value}`)
  }
  
  return value
}

/**
 * Gets an optional environment variable with type safety
 * @param name - Environment variable name
 * @param defaultValue - Default value if not set
 * @param validate - Optional validation function
 */
function getOptionalEnvVar(name: string, defaultValue: string, validate?: (value: string) => boolean): string {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    return defaultValue
  }
  
  if (validate && !validate(value)) {
    console.warn(`Environment variable ${name} has invalid value: ${value}, using default: ${defaultValue}`)
    return defaultValue
  }
  
  return value
}

// Validation functions
const isValidNodeEnv = (value: string): boolean => {
  return ['development', 'production', 'test'].includes(value)
}

const isValidDatabaseUrl = (value: string): boolean => {
  return value.startsWith('file:') || value.startsWith('postgresql:') || value.startsWith('mysql:')
}

// Type-safe configuration object with validation
export const config = {
  database: {
    url: getRequiredEnvVar('DATABASE_URL', isValidDatabaseUrl),
  },
  node: {
    env: getOptionalEnvVar('NODE_ENV', 'development', isValidNodeEnv) as 'development' | 'production' | 'test',
  },
  sessionSecret: getOptionalEnvVar('SESSION_SECRET', 'default-dev-secret-change-in-production'),
  env: getOptionalEnvVar('NODE_ENV', 'development', isValidNodeEnv) as 'development' | 'production' | 'test',
} as const

// Type exports for use throughout the application
export type Config = typeof config
export type NodeEnv = typeof config.node.env