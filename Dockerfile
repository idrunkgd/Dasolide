# syntax=docker/dockerfile:1

# ============================================================================
# Muscu — image de production
#
# Trois étapes : dépendances, build, exécution. L'image finale ne contient que
# la sortie « standalone » de Next.js (les dépendances réellement tracées),
# les migrations SQL et l'entrypoint.
# ============================================================================

FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
ARG APP_TIMEZONE=Europe/Brussels
ENV TZ=$APP_TIMEZONE \
    NEXT_PUBLIC_APP_TIMEZONE=$APP_TIMEZONE
WORKDIR /app

# ---------------------------------------------------------------- dépendances
FROM base AS deps
RUN apt-get update && apt-get install -y build-essential python3 python3-dev && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund

# ---------------------------------------------------------------------- build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN node scripts/set-db-provider.mjs postgresql \
 && npx prisma generate \
 && npm run build

# ------------------------------------------------------------------ exécution
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/prisma/migrations-postgres ./prisma/migrations-postgres
COPY --from=builder --chown=nextjs:nodejs /app/prisma/migrations ./prisma/migrations
COPY --from=builder --chown=nextjs:nodejs /app/scripts/apply-migrations.mjs ./scripts/apply-migrations.mjs
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN mkdir -p /app/public/uploads \
 && chown -R nextjs:nodejs /app/public/uploads \
 && chmod +x /app/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]