#!/usr/bin/env ts-node

import path from 'path'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcrypt'
import prompts from 'prompts'

dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL не задан. Проверьте .env.local')
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const ROLES = ['USER', 'WRITER', 'ADMIN'] as const

async function main() {
  const { email, password, name, role } = await prompts([
    {
      type: 'text',
      name: 'email',
      message: 'Email пользователя:',
      validate: (v) => (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Введите корректный email' : true),
    },
    {
      type: 'password',
      name: 'password',
      message: 'Пароль:',
      validate: (v) => (v && v.length >= 6 ? true : 'Минимум 6 символов'),
    },
    {
      type: 'text',
      name: 'name',
      message: 'Имя (необязательно):',
      initial: '',
    },
    {
      type: 'select',
      name: 'role',
      message: 'Роль:',
      choices: ROLES.map((r) => ({ title: r, value: r })),
      initial: 2,
    },
  ])

  if (email === undefined || password === undefined || role === undefined) {
    console.log('Ввод отменён.')
    process.exit(0)
  }

  const hashedPassword = await bcrypt.hash(password, 12)
  const user = await prisma.user.upsert({
    where: { email: email.trim().toLowerCase() },
    update: {
      password: hashedPassword,
      name: (name as string)?.trim() || null,
      role,
    },
    create: {
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      name: (name as string)?.trim() || null,
      role,
    },
  })

  console.log('Пользователь создан/обновлен:', user.email, 'роль:', user.role)
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
