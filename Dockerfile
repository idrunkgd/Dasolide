# syntax=docker/dockerfile:1

# ============================================================================
# Muscu — image de production
#
# Trois étapes : dépendances, build, exécution. L'image finale ne contient que
# la sortie « standalone » de Next.js (les dépendances réellement tracées),
# les migrations SQL et l'entrypoint.
#
# Base Debian slim plutôt qu'Alpine : better-sqlite3 y trouve un binaire
# précompilé, aucune chaîne de compilation n'est nécessaire.
# ============================================================================

FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
# Fuseau de référence : le serveur et le navigateur doivent afficher le même
# jour pour une séance de fin de soirée. Surchargeable au build et au runtime.
ARG APP_TIMEZONE=Europe/Brussels
ENV TZ=$APP_TIMEZONE \
    NEXT_PUBLIC_APP_TIMEZONE=$APP_TIMEZONE
WORKDIR /app

   # ---------------------------------------------------------------- dépendances
   FROM base AS deps
COPY package.json package-lock.json scripts/set-db-provider.mjs ./
COPY prisma ./prisma
RUN node set-db-provider.mjs postgresql \
 && npm ci --no-audit --no-fund

# ---------------------------------------------------------------------- build
   FROM base AS builder
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   
   RUN npx prisma generate \
    && npm run build

# ------------------------------------------------------------------ exécution
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

# Sortie autonome : server.js, .next/ et les node_modules tracés.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Nécessaires au démarrage : migrations SQL et script qui les applique.
COPY --from=builder --chown=nextjs:nodejs /app/prisma/migrations-postgres ./prisma/migrations-postgres
COPY --from=builder --chown=nextjs:nodejs /app/prisma/migrations ./prisma/migrations
COPY --from=builder --chown=nextjs:nodejs /app/scripts/apply-migrations.mjs ./scripts/apply-migrations.mjs
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh

# Les photos de progression sont écrites ici — à monter sur un volume
# persistant, sinon elles disparaissent à chaque redéploiement.
RUN mkdir -p /app/public/uploads \
 && chown -R nextjs:nodejs /app/public/uploads \
 && chmod +x /app/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
