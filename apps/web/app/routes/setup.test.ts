import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loader, action } from './setup'
import { prisma } from '../lib/prisma'

describe('Setup Route', () => {
  // Database cleanup is handled by test-setup.ts globally

  describe('loader', () => {
    it('should allow access when no users exist', async () => {
      const request = new Request('http://localhost:3000/setup')
      const response = await loader({ request, params: {}, context: {} })
      
      expect(response).toBeNull()
    })

    it('should redirect to login when users exist', async () => {
      // Create a user
      await prisma.user.create({
        data: {
          email: 'existing@example.com',
          password: 'hashedpassword',
        },
      })

      const request = new Request('http://localhost:3000/setup')
      const response = await loader({ request, params: {}, context: {} })
      
      expect(response).toBeInstanceOf(Response)
      expect((response as Response).status).toBe(302)
      expect((response as Response).headers.get('location')).toBe('/login')
    })
  })

  describe('action', () => {
    it('should redirect to login when users already exist', async () => {
      // Create a user first
      await prisma.user.create({
        data: {
          email: 'existing@example.com',
          password: 'hashedpassword',
        },
      })

      const formData = new FormData()
      formData.append('email', 'admin@example.com')
      formData.append('password', 'password123')

      const request = new Request('http://localhost:3000/setup', {
        method: 'POST',
        body: formData,
      })

      const response = await action({ request, params: {}, context: {} })
      
      expect(response).toBeInstanceOf(Response)
      expect((response as Response).status).toBe(302)
      expect((response as Response).headers.get('location')).toBe('/login')
    })

    it('should return validation errors for invalid data', async () => {
      const formData = new FormData()
      formData.append('email', 'invalid-email')
      formData.append('password', 'short')

      const request = new Request('http://localhost:3000/setup', {
        method: 'POST',
        body: formData,
      })

      const response = await action({ request, params: {}, context: {} })
      
      expect(response).toBeInstanceOf(Response)
      expect((response as Response).status).toBe(400)
      
      const data = await (response as Response).json()
      expect(data.errors.email).toBe('Please enter a valid email address')
      expect(data.errors.password).toBe('Password must be at least 8 characters long')
    })

    it('should return validation errors for missing data', async () => {
      const formData = new FormData()

      const request = new Request('http://localhost:3000/setup', {
        method: 'POST',
        body: formData,
      })

      const response = await action({ request, params: {}, context: {} })
      
      expect(response).toBeInstanceOf(Response)
      expect((response as Response).status).toBe(400)
      
      const data = await (response as Response).json()
      expect(data.errors.email).toBe('Email is required')
      expect(data.errors.password).toBe('Password is required')
    })

    it('should create user and redirect to workspaces on success', async () => {
      const formData = new FormData()
      formData.append('email', 'admin@example.com')
      formData.append('password', 'password123')

      const request = new Request('http://localhost:3000/setup', {
        method: 'POST',
        body: formData,
      })

      const response = await action({ request, params: {}, context: {} })
      
      expect(response).toBeInstanceOf(Response)
      expect((response as Response).status).toBe(302)
      expect((response as Response).headers.get('location')).toBe('/workspaces')
      
      // Verify user was created
      const user = await prisma.user.findUnique({
        where: { email: 'admin@example.com' },
      })
      expect(user).toBeDefined()
      expect(user!.email).toBe('admin@example.com')
      
      // Verify session cookie is set
      const setCookieHeader = (response as Response).headers.get('Set-Cookie')
      expect(setCookieHeader).toContain('__session=')
    })
  })
})