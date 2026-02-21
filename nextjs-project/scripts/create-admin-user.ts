#!/usr/bin/env ts-node

import path from 'path'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcrypt'

dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') })

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL не задан. Проверьте файл .env.local в корне проекта.')
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const ADMIN_PASSWORD = 'admin123'

async function main() {
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12)
  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
    },
    create: {
      email: 'toxa.krotoff@gmail.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  })

  console.log('Created/updated admin user:', user.email)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await pool.end()
    await prisma.$disconnect()
  })
