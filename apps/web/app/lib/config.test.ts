import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock dotenv before importing config
const mockDotenvConfig = vi.fn()
vi.mock('dotenv', () => ({
  config: mockDotenvConfig,
}))

describe('Config Module', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env }
    // Clear any existing env vars that might interfere
    delete process.env.DATABASE_URL
    delete process.env.NODE_ENV
    // Clear module cache to ensure fresh imports
    vi.resetModules()
    // Reset dotenv mock
    mockDotenvConfig.mockClear()
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
    // Clear module cache to ensure fresh imports
    vi.resetModules()
  })

  describe('DATABASE_URL configuration', () => {
    it('should load DATABASE_URL from environment variables', async () => {
      // Set environment variable
      process.env.DATABASE_URL = 'file:./test.db'
      
      // Import config after setting env vars
      const { config } = await import('./config.js')
      
      expect(config.database.url).toBe('file:./test.db')
    })

    it('should throw error when DATABASE_URL is missing', async () => {
      // Remove DATABASE_URL from environment
      delete process.env.DATABASE_URL
      
      // Import should throw error due to missing required env var
      await expect(async () => {
        await import('./config.js')
      }).rejects.toThrow('Required environment variable DATABASE_URL is not set')
    })

    it('should throw error when DATABASE_URL is empty string', async () => {
      // Set empty string
      process.env.DATABASE_URL = ''
      
      // Import should throw error due to empty required env var
      await expect(async () => {
        await import('./config.js')
      }).rejects.toThrow('Required environment variable DATABASE_URL is not set')
    })
  })

  describe('NODE_ENV configuration', () => {
    it('should use NODE_ENV from environment when set', async () => {
      process.env.DATABASE_URL = 'file:./test.db'
      process.env.NODE_ENV = 'production'
      
      const { config } = await import('./config.js')
      
      expect(config.node.env).toBe('production')
    })

    it('should default to development when NODE_ENV is not set', async () => {
      process.env.DATABASE_URL = 'file:./test.db'
      delete process.env.NODE_ENV
      
      const { config } = await import('./config.js')
      
      expect(config.node.env).toBe('development')
    })

    it('should default to development when NODE_ENV is empty', async () => {
      process.env.DATABASE_URL = 'file:./test.db'
      process.env.NODE_ENV = ''
      
      const { config } = await import('./config.js')
      
      expect(config.node.env).toBe('development')
    })

    it('should handle test environment', async () => {
      process.env.DATABASE_URL = 'file:./test.db'
      process.env.NODE_ENV = 'test'
      
      const { config } = await import('./config.js')
      
      expect(config.node.env).toBe('test')
    })
  })

  describe('Type safety', () => {
    it('should export proper types', async () => {
      process.env.DATABASE_URL = 'file:./test.db'
      process.env.NODE_ENV = 'development'
      
      const configModule = await import('./config.js')
      
      // Test that types are exported
      expect(typeof configModule.config).toBe('object')
      expect(configModule.config.database).toBeDefined()
      expect(configModule.config.node).toBeDefined()
    })

    it('should have proper structure', async () => {
      process.env.DATABASE_URL = 'file:./test.db'
      process.env.NODE_ENV = 'production'
      
      const { config } = await import('./config.js')
      
      // Test config structure
      expect(config).toHaveProperty('database')
      expect(config).toHaveProperty('node')
      expect(config.database).toHaveProperty('url')
      expect(config.node).toHaveProperty('env')
      expect(['development', 'production', 'test']).toContain(config.node.env)
    })
  })

  describe('dotenv integration', () => {
    it('should call dotenv config on module load', async () => {
      process.env.DATABASE_URL = 'file:./test.db'
      
      // Import config module
      await import('./config.js')
      
      expect(mockDotenvConfig).toHaveBeenCalled()
    })
  })
})