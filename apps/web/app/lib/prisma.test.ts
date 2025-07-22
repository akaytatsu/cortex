import { describe, it, expect } from 'vitest'
import { prisma } from './prisma'

describe('Prisma Client Integration', () => {
  it('should connect to the database', async () => {
    // Test database connection
    await expect(prisma.$connect()).resolves.not.toThrow()
  })

  it('should disconnect from the database', async () => {
    // Test database disconnection
    await expect(prisma.$disconnect()).resolves.not.toThrow()
  })

  it('should be able to query the database', async () => {
    // Test basic query
    const result = await prisma.user.findMany()
    expect(Array.isArray(result)).toBe(true)
  })
})