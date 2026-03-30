# --- Build stage ---
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY prisma.config.ts ./
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npm ci

COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* встраиваются в клиентский бандл при сборке (нужны для карты СДЭК и контактов)
ARG NEXT_PUBLIC_YANDEX_MAPS_API_KEY
ENV NEXT_PUBLIC_YANDEX_MAPS_API_KEY=$NEXT_PUBLIC_YANDEX_MAPS_API_KEY
RUN npm run build

# --- Production stage (образ для app и telegram-bot) ---
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Только манифесты и схема; зависимости ставим здесь (без postinstall — prisma ниже)
COPY --from=builder /app/package.json /app/package-lock.json* ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npm ci --omit=dev --ignore-scripts && npx prisma generate

# Артефакты сборки Next.js (standalone)
# В режиме `output: 'standalone'` достаточно:
# - `.next/standalone` (сервер и минимальный набор файлов)
# - `.next/static` (статические чанки)
# Важно: standalone-сервер `process.chdir(__dirname)` в `.next/standalone`,
# поэтому статика должна лежать по пути `.next/standalone/.next/static`.
# Аналогично `public/` (картинки `/images/...`, favicon и т.д.) должен быть доступен как
# `.next/standalone/public`, иначе запросы к статике из `public/` вернут 404.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./.next/standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/standalone/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/public ./.next/standalone/public

# Скрипты для telegram-bot (ts-node запускает scripts/telegram-bot.ts)
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
# src/ нужен раннерам ботов (MAX читает настройки через DAL)
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
# typescript нужен ts-node в рантайме (в production иначе только --omit=dev)
RUN npm install typescript --no-save

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/docker-entrypoint.sh"]
# Запуск standalone-сервера вместо `next start`, чтобы не требовать весь `.next`.
CMD ["node", ".next/standalone/server.js"]
