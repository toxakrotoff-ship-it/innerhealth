#!/usr/bin/env ts-node
/**
 * Помечает перечисленные миграции как уже применённые (resolve --applied).
 * Использовать, когда таблицы/поля уже есть в БД, но записей в _prisma_migrations нет.
 * Если миграция уже помечена как применённая (P3008), пропускает и продолжает.
 *
 * Запуск из папки nextjs-project: npm run db:mark-applied
 */

import path from 'path'
import { spawnSync } from 'child_process'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const MIGRATIONS_TO_MARK = [
  '202602191103_add_promo_code_model',
  '202602191106_add_promo_code_to_order',
  '20260220160000_add_product_slug_and_tab_titles',
  '20260221100000_add_must_change_password',
  '20260221120000_add_partnership_lead',
  '20260221130000_add_partnership_lead_social_links',
  '20260221140000_add_tilda_lead_model',
]

function main() {
  const cwd = path.resolve(process.cwd())
  for (const name of MIGRATIONS_TO_MARK) {
    process.stdout.write(`Marking as applied: ${name} ... `)
    const result = spawnSync('npx', ['prisma', 'migrate', 'resolve', '--applied', name], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    if (result.status === 0) {
      console.log('OK')
    } else if (result.stderr?.includes('P3008') || result.stderr?.includes('already recorded as applied')) {
      console.log('already applied (skip)')
    } else {
      console.log('')
      if (result.stderr) process.stderr.write(result.stderr)
      if (result.stdout) process.stdout.write(result.stdout)
      process.exit(result.status ?? 1)
    }
  }
  console.log('Done. Run: npx prisma migrate status')
}

main()
