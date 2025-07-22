import { config as dotenvConfig } from 'dotenv'

// Load environment variables from .env file
dotenvConfig()

function getRequiredEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`)
  }
  return value
}

function getOptionalEnvVar(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue
}

// Type-safe configuration object
export const config = {
  database: {
    url: getRequiredEnvVar('DATABASE_URL'),
  },
  node: {
    env: getOptionalEnvVar('NODE_ENV', 'development') as 'development' | 'production' | 'test',
  },
} as const

// Type exports for use throughout the application
export type Config = typeof config
export type NodeEnv = typeof config.node.env