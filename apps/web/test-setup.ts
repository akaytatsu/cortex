import { beforeEach } from 'vitest'
import { prisma } from './app/lib/prisma'

beforeEach(async () => {
  // Clean up database before each test
  await prisma.user.deleteMany()
})