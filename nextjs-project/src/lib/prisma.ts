import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import dotenv from 'dotenv'

// Загружаем переменные окружения из .env.local
dotenv.config({ path: '../.env.local' })

const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Создаем pool подключения к PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Используем адаптер для PostgreSQL
const adapter = new PrismaPg(pool)
const prismaClient = new PrismaClient({
  adapter,
  log: ['query', 'info', 'warn', 'error'],
})

export const prisma = globalForPrisma.prisma || prismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma