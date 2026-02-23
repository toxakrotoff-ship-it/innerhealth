# --- Build stage ---
FROM node:20-alpine AS builder

# Для сборки нативных модулей (bcrypt и др.)
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Dependencies + Prisma schema (postinstall runs prisma generate)
COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# prisma.config.ts требует DATABASE_URL; при generate подключение не используется
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npm ci

COPY . .

# Generate Prisma Client (schema is in COPY .)
RUN npx prisma generate

# Build Next.js (standalone output)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Production stage ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build + static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma (schema, migrations, generated client) for optional migrate on start
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Entrypoint: optional migrate, then start app
COPY --from=builder /app/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
