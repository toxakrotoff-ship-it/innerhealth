#!/usr/bin/env ts-node
/**
 * Удаляет из _prisma_migrations запись о старой миграции 20260214212546_init,
 * которой больше нет в репозитории. Запускать только при расхождении истории
 * (после resolve --applied для 20260213120000_init и resolve --applied для
 * упавшей 20260219104900_add_product_category_table).
 *
 * Запуск из папки nextjs-project:
 *   npx ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node"}' scripts/fix-migration-history.ts
 */

import path from 'path'
import dotenv from 'dotenv'
import { Pool } from 'pg'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL не задан. Проверьте .env.local')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })

async function main() {
  const res = await pool.query(
    `DELETE FROM "_prisma_migrations" WHERE migration_name = $1`,
    ['20260214212546_init']
  )
  console.log(
    `Удалено записей в _prisma_migrations для 20260214212546_init: ${res.rowCount ?? 0}`
  )
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
