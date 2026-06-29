## syntax=docker/dockerfile:1.7

FROM node:22-alpine AS build-base

RUN apk add --no-cache libc6-compat python3 make g++

FROM node:22-alpine AS runtime-base

RUN apk add --no-cache libc6-compat

# --- Build stage ---
FROM build-base AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY prisma.config.ts ./
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* встраиваются в клиентский бандл при сборке (нужны для карты СДЭК и контактов)
ARG NEXT_PUBLIC_YANDEX_MAPS_API_KEY
ENV NEXT_PUBLIC_YANDEX_MAPS_API_KEY=$NEXT_PUBLIC_YANDEX_MAPS_API_KEY
RUN npm run build
RUN npm run build:bot

FROM build-base AS prod-deps

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY prisma.config.ts ./
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --ignore-scripts \
  && npx prisma generate

FROM build-base AS migrator-deps

WORKDIR /app

COPY deploy/runtime/migrator.package.json ./package.json
COPY prisma ./prisma
COPY prisma.config.ts ./
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN --mount=type=cache,target=/root/.npm npm install --omit=dev --ignore-scripts --no-package-lock

FROM migrator-deps AS migrator

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

CMD ["npx", "prisma", "migrate", "deploy"]

FROM build-base AS bot-deps

WORKDIR /app

COPY deploy/runtime/bot.package.json ./package.json
COPY prisma ./prisma
COPY prisma.config.ts ./
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN --mount=type=cache,target=/root/.npm npm install --omit=dev --ignore-scripts --no-package-lock \
  && npx prisma generate

# --- Production stage (образ для web app) ---
FROM runtime-base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Артефакты сборки Next.js (standalone)
# В режиме `output: 'standalone'` достаточно:
# - `.next/standalone` (сервер и минимальный набор файлов)
# - `.next/static` (статические чанки)
# Важно: standalone-сервер `process.chdir(__dirname)` в `.next/standalone`,
# поэтому статика должна лежать по пути `.next/standalone/.next/static`.
# Аналогично `public/` (картинки `/images/...`, favicon и т.д.) должен быть доступен как
# `.next/standalone/public`, иначе запросы к статике из `public/` вернут 404.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./.next/standalone
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/geoip-lite ./.next/standalone/node_modules/geoip-lite
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
RUN mkdir -p ./.next/standalone/.next \
  && ln -s ../../static ./.next/standalone/.next/static \
  && ln -s ../../public ./.next/standalone/public

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/docker-entrypoint.sh"]
# Запуск standalone-сервера вместо `next start`, чтобы не требовать весь `.next`.
CMD ["node", ".next/standalone/server.js"]

# --- Production stage (lightweight image for bot runners only) ---
FROM runtime-base AS bot-runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=bot-deps --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=bot-deps --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=bot-deps --chown=nextjs:nodejs /app/prisma.config.ts ./
COPY --from=bot-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/dist-bot ./dist-bot

USER nextjs

CMD ["node", "dist-bot/telegram-bot.js"]
