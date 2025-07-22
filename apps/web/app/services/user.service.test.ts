import { describe, it, expect, beforeEach } from 'vitest'
import { UserService } from './user.service'
import { prisma } from '../lib/prisma'

describe('UserService CRUD Operations', () => {
  beforeEach(async () => {
    // Ensure clean state for each test
    await prisma.user.deleteMany()
  })

  describe('createUser', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedpassword',
      }

      const user = await UserService.createUser(userData)

      expect(user).toMatchObject({
        id: expect.any(String),
        email: userData.email,
        password: userData.password,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      })
    })

    it('should fail to create user with duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'hashedpassword',
      }

      await UserService.createUser(userData)
      
      await expect(UserService.createUser(userData)).rejects.toThrow('User with email duplicate@example.com already exists')
    })
  })

  describe('getUserByEmail', () => {
    it('should find user by email', async () => {
      const userData = {
        email: 'find@example.com',
        password: 'hashedpassword',
      }

      const createdUser = await UserService.createUser(userData)
      const foundUser = await UserService.getUserByEmail(userData.email)

      expect(foundUser).toEqual(createdUser)
    })

    it('should return null for non-existent email', async () => {
      const foundUser = await UserService.getUserByEmail('nonexistent@example.com')
      expect(foundUser).toBeNull()
    })
  })

  describe('getUserById', () => {
    it('should find user by ID', async () => {
      const userData = {
        email: 'findbyid@example.com',
        password: 'hashedpassword',
      }

      const createdUser = await UserService.createUser(userData)
      const foundUser = await UserService.getUserById(createdUser.id)

      expect(foundUser).toEqual(createdUser)
    })

    it('should return null for non-existent ID', async () => {
      const foundUser = await UserService.getUserById('nonexistent-id')
      expect(foundUser).toBeNull()
    })
  })

  describe('updateUser', () => {
    it('should update user data', async () => {
      const userData = {
        email: 'update@example.com',
        password: 'hashedpassword',
      }

      const createdUser = await UserService.createUser(userData)
      
      const updateData = { email: 'updated@example.com' }
      const updatedUser = await UserService.updateUser(createdUser.id, updateData)

      expect(updatedUser.email).toBe(updateData.email)
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(createdUser.updatedAt.getTime())
    })

    it('should fail to update non-existent user', async () => {
      const updateData = { email: 'updated@example.com' }
      
      await expect(UserService.updateUser('non-existent-id', updateData)).rejects.toThrow('User with id non-existent-id not found')
    })
  })

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const userData = {
        email: 'delete@example.com',
        password: 'hashedpassword',
      }

      const createdUser = await UserService.createUser(userData)
      const deletedUser = await UserService.deleteUser(createdUser.id)

      expect(deletedUser).toEqual(createdUser)

      // Verify user is actually deleted
      const foundUser = await UserService.getUserById(createdUser.id)
      expect(foundUser).toBeNull()
    })

    it('should fail to delete non-existent user', async () => {
      await expect(UserService.deleteUser('non-existent-id')).rejects.toThrow('User with id non-existent-id not found')
    })
  })

  describe('getAllUsers', () => {
    it('should return all users ordered by creation date', async () => {
      const users = [
        { email: 'user1@example.com', password: 'password1' },
        { email: 'user2@example.com', password: 'password2' },
        { email: 'user3@example.com', password: 'password3' },
      ]

      // Create users with small delays to ensure different timestamps
      for (const userData of users) {
        await UserService.createUser(userData)
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      const allUsers = await UserService.getAllUsers()

      expect(allUsers).toHaveLength(3)
      expect(allUsers[0].email).toBe('user3@example.com') // Most recent first
      expect(allUsers[2].email).toBe('user1@example.com') // Oldest last
    })

    it('should return empty array when no users exist', async () => {
      const allUsers = await UserService.getAllUsers()
      expect(allUsers).toEqual([])
    })
  })
})