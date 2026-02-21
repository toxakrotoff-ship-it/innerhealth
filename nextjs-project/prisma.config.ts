import dotenv from 'dotenv'

// Загружаем .env.local для prisma generate / migrate (DATABASE_URL)
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://localhost:5432/dummy?schema=public',
  },
})
