#!/usr/bin/env ts-node

import path from 'path'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
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

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { email: 'asc' },
    select: { id: true, email: true, name: true, role: true },
  })

  if (users.length === 0) {
    console.log('В БД нет пользователей.')
    return
  }

  const { action } = await prompts({
    type: 'select',
    name: 'action',
    message: 'Действие:',
    choices: [
      { title: 'Показать список пользователей', value: 'list' },
      { title: 'Удалить пользователя(ей)', value: 'delete' },
      { title: 'Выход', value: 'exit' },
    ],
  })

  if (action === undefined || action === 'exit') {
    console.log('Выход.')
    return
  }

  if (action === 'list') {
    console.log('\nПользователи в БД:')
    users.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.email} ${u.name ? `(${u.name})` : ''} — ${u.role}`)
    })
    console.log('')
    return
  }

  const choices = users.map((u) => ({
    title: `${u.email} ${u.name ? `(${u.name})` : ''} — ${u.role}`,
    value: u.id,
  }))

  const { userIds } = await prompts({
    type: 'multiselect',
    name: 'userIds',
    message: 'Выберите пользователей для удаления (пробел — выбор, Enter — подтвердить):',
    choices,
    min: 1,
  })

  if (!userIds?.length) {
    console.log('Никто не выбран.')
    return
  }

  const toDelete = users.filter((u) => userIds.includes(u.id))
  console.log('\nБудут удалены:')
  toDelete.forEach((u) => console.log('  -', u.email, u.name ? `(${u.name})` : '', `[${u.role}]`))

  const { confirm } = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: `Удалить ${toDelete.length} пользователей?`,
    initial: false,
  })

  if (!confirm) {
    console.log('Отменено.')
    return
  }

  const result = await prisma.user.deleteMany({
    where: { id: { in: toDelete.map((u) => u.id) } },
  })
  console.log('Удалено пользователей:', result.count)
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
