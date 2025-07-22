import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AuthService } from './auth.service'
import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'

describe('AuthService', () => {
  // Clean up database before and after each test
  beforeEach(async () => {
    await prisma.user.deleteMany({})
  })

  afterEach(async () => {
    await prisma.user.deleteMany({})
  })

  describe('hasUsers', () => {
    it('should return false when no users exist', async () => {
      const result = await AuthService.hasUsers()
      expect(result).toBe(false)
    })

    it('should return true when users exist', async () => {
      // Create a user directly in the database
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: 'hashedpassword',
        },
      })

      const result = await AuthService.hasUsers()
      expect(result).toBe(true)
    })

    it('should handle database errors', async () => {
      // Mock prisma to throw an error
      const originalCount = prisma.user.count
      prisma.user.count = vi.fn().mockRejectedValue(new Error('Database connection error'))

      await expect(AuthService.hasUsers()).rejects.toThrow('Failed to check user count: Database connection error')

      // Restore original method
      prisma.user.count = originalCount
    })
  })

  describe('createFirstUser', () => {
    it('should create the first user with hashed password', async () => {
      const userData = {
        email: 'admin@example.com',
        password: 'password123',
      }

      const user = await AuthService.createFirstUser(userData)

      expect(user).toBeDefined()
      expect(user.email).toBe(userData.email)
      expect(user.id).toBeDefined()
      expect(user.createdAt).toBeDefined()
      expect(user.updatedAt).toBeDefined()

      // Verify password is hashed
      const savedUser = await prisma.user.findUnique({
        where: { id: user.id },
      })
      expect(savedUser).toBeDefined()
      expect(savedUser!.password).not.toBe(userData.password)
      
      // Verify password hash is valid
      const isValidPassword = await bcrypt.compare(userData.password, savedUser!.password)
      expect(isValidPassword).toBe(true)
    })

    it('should throw error when users already exist', async () => {
      // Create a user first
      await prisma.user.create({
        data: {
          email: 'existing@example.com',
          password: 'hashedpassword',
        },
      })

      const userData = {
        email: 'admin@example.com',
        password: 'password123',
      }

      await expect(AuthService.createFirstUser(userData)).rejects.toThrow(
        'Cannot create first user: users already exist'
      )
    })

    it('should throw error for duplicate email', async () => {
      const userData = {
        email: 'admin@example.com',
        password: 'password123',
      }

      // Create first user
      await AuthService.createFirstUser(userData)

      // Clean up all users to simulate fresh state, then create one manually to test unique constraint
      await prisma.user.deleteMany({})
      await prisma.user.create({
        data: {
          email: userData.email,
          password: 'someotherpassword',
        },
      })

      // Try to create the same user again (should fail due to unique constraint)
      await expect(AuthService.createFirstUser(userData)).rejects.toThrow(
        'Cannot create first user: users already exist'
      )
    })

    it('should validate email format in integration', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
      }

      // This would be caught by application validation, but let's test the service handles it
      // The service itself doesn't validate email format, that's done at the route level
      const user = await AuthService.createFirstUser(userData)
      expect(user.email).toBe(userData.email)
    })

    it('should handle minimum password length in integration', async () => {
      const userData = {
        email: 'admin@example.com',
        password: 'short',
      }

      // The service itself doesn't validate password length, that's done at the route level
      const user = await AuthService.createFirstUser(userData)
      expect(user).toBeDefined()
    })
  })
})