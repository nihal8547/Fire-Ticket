# ── Stage 1: deps ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --ignore-scripts

# ── Stage 2: builder ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client for linux-musl-openssl-3.0.x and native
RUN npx prisma generate

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 3: runner ────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy runtime files
COPY --from=builder /app/public              ./public
COPY --from=builder /app/.next/standalone     ./
COPY --from=builder /app/.next/static         ./.next/static
COPY --from=builder /app/prisma               ./prisma
COPY --from=builder /app/package.json         ./package.json
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

# Ensure prisma CLI is available for startup schema sync
COPY --from=builder /app/node_modules/prisma           ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma           ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma           ./node_modules/.prisma
COPY --from=builder /app/node_modules/.bin/prisma       ./node_modules/.bin/prisma

# Fix CRLF line endings, set permissions
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && \
    chmod +x ./docker-entrypoint.sh && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
