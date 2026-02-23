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

# Артефакты сборки Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Скрипты для telegram-bot (ts-node запускает scripts/telegram-bot.ts)
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
# typescript нужен ts-node в рантайме (в production иначе только --omit=dev)
RUN npm install typescript --no-save

RUN chown -R nextjs:nodejs /app

RUN printf '%s\n' '#!/bin/sh' 'set -e' \
  'if [ "$RUN_MIGRATE" = "1" ]; then' \
  '  npx prisma migrate deploy; fi' \
  'exec "$@"' > /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
