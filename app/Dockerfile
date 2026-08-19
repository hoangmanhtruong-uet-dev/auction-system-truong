# syntax=docker/dockerfile:1.7
FROM node:22.17.0-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate --schema=prisma/schema.prisma

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL=mysql://build:build@localhost:3306/autobid
RUN npm run build

FROM base AS web
ENV NODE_ENV=production PORT=10000 HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
USER nextjs
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 CMD /bin/sh -c "node -e \"const p=process.env.PORT||10000;fetch('http://127.0.0.1:'+p+'/api/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(e=>{console.error(e.message||String(e));process.exit(1)})\""
CMD ["node", "server.js"]

FROM base AS worker
ENV NODE_ENV=production
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs worker
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --chown=worker:nodejs package.json package-lock.json tsconfig.json ./
COPY --chown=worker:nodejs prisma ./prisma
COPY --chown=worker:nodejs src ./src
RUN rm -rf src/__tests__
USER worker
STOPSIGNAL SIGTERM
CMD ["./node_modules/.bin/tsx", "src/workers/index.ts"]

FROM base AS verification-probe
ENV NODE_ENV=test
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts
STOPSIGNAL SIGTERM
CMD ["./node_modules/.bin/tsx", "scripts/active-job-shutdown-probe.ts"]
