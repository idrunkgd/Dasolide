#!/bin/sh
set -e

# ---------------------------------------------------------------------------
# Démarrage du conteneur Muscu.
#
#   1. contrôle des variables obligatoires ;
#   2. application des migrations SQL (idempotent, sans moteur Prisma) ;
#   3. lancement du serveur Next.js.
#
# Si les migrations échouent, le conteneur s'arrête plutôt que de servir une
# application branchée sur une base incohérente.
# ---------------------------------------------------------------------------

# On se place dans le dossier de l'application, quel que soit le WORKDIR.
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

if [ -z "$DATABASE_URL" ]; then
  echo "[muscu] DATABASE_URL n'est pas défini." >&2
  exit 1
fi

if [ -z "$AUTH_SECRET" ]; then
  echo "[muscu] AUTH_SECRET n'est pas défini (générer avec : openssl rand -base64 32)." >&2
  exit 1
fi

if [ "${#AUTH_SECRET}" -lt 16 ]; then
  echo "[muscu] AUTH_SECRET est trop court : 32 caractères au minimum." >&2
  exit 1
fi

if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  echo "[muscu] Application des migrations…"
  node "$APP_DIR/scripts/apply-migrations.mjs"
else
  echo "[muscu] Migrations ignorées (RUN_MIGRATIONS=0)."
fi

echo "[muscu] Démarrage du serveur sur le port ${PORT:-3000}."
exec "$@"
