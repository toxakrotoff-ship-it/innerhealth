import dotenv from 'dotenv'

// Для CLI (migrate, generate): загружаем .env из корня проекта
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
})
