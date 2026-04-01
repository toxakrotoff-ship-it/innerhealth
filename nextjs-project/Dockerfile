# --- Shared base ---
FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# --- Build stage (web app only) ---
FROM base AS builder

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

# --- Production stage (образ для web app) ---
FROM base AS runner

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

# --- Production stage (lightweight image for bot runners only) ---
FROM base AS bot-runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY prisma.config.ts ./
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npm ci --omit=dev --ignore-scripts \
  && npm install ts-node tsconfig-paths typescript --no-save \
  && npx prisma generate

COPY --chown=nextjs:nodejs scripts ./scripts
COPY --chown=nextjs:nodejs tsconfig.json ./tsconfig.json
COPY --chown=nextjs:nodejs src/bot ./src/bot
COPY --chown=nextjs:nodejs src/lib/brand ./src/lib/brand
COPY --chown=nextjs:nodejs src/lib/max ./src/lib/max
COPY --chown=nextjs:nodejs src/lib/max-bot-menu.ts ./src/lib/max-bot-menu.ts
COPY --chown=nextjs:nodejs src/lib/prisma.ts ./src/lib/prisma.ts
COPY --chown=nextjs:nodejs src/lib/project-root.ts ./src/lib/project-root.ts
COPY --chown=nextjs:nodejs src/lib/settings-encryption.ts ./src/lib/settings-encryption.ts

RUN chown -R nextjs:nodejs /app

USER nextjs

CMD ["npm", "run", "telegram-bot"]
