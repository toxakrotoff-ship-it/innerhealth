#!/usr/bin/env ts-node

import path from 'path'
import dotenv from 'dotenv'
import { Pool } from 'pg'

dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') })

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL не задан в .env.local')
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const sql = `
-- CreateEnum (идемпотентно: создаём только если нет)
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('USER', 'WRITER', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddColumn (идемпотентно: добавляем только если нет)
DO $$ BEGIN
  ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;
`

async function main() {
  await pool.query(sql)
  console.log('Колонка role в таблице User добавлена (или уже была).')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => pool.end())
