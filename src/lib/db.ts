import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Client Prisma partagé.
 *
 * Prisma 7 se connecte via un « driver adapter » : aucun binaire natif Rust
 * n'est requis. L'adaptateur est choisi d'après le schéma de DATABASE_URL :
 *
 *   file:./prisma/dev.db          → SQLite   (développement)
 *   postgresql://… ou postgres://… → PostgreSQL (production)
 *
 * Le `provider` du schéma Prisma doit correspondre : `npm run db:use:postgres`
 * ou `npm run db:use:sqlite` le bascule (voir scripts/set-db-provider.mjs).
 */
export function isPostgresUrl(url: string): boolean {
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

  const adapter = isPostgresUrl(url)
    ? new PrismaPg({ connectionString: url })
    : new PrismaBetterSqlite3({ url });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
