import path from "node:path";
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Configuration Prisma 7.
 *
 * Prisma 7 n'embarque plus de moteur Rust côté client : la connexion passe par
 * un « driver adapter » déclaré dans src/lib/db.ts (better-sqlite3 en
 * développement). Ce fichier ne sert qu'aux commandes CLI (migrate, studio…),
 * qui ont besoin de connaître l'URL de la base.
 *
 * Passage en PostgreSQL :
 *   1. `provider = "postgresql"` dans prisma/schema.prisma ;
 *   2. `npm install @prisma/adapter-pg pg` et remplacer l'adaptateur dans
 *      src/lib/db.ts par `new PrismaPg({ connectionString: process.env.DATABASE_URL })` ;
 *   3. `DATABASE_URL="postgresql://…"` dans .env.
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
});
