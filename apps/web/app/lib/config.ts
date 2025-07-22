function getRequiredEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`)
  }
  return value
}

export const config = {
  database: {
    url: getRequiredEnvVar('DATABASE_URL'),
  },
  node: {
    env: process.env.NODE_ENV || 'development',
  },
} as const