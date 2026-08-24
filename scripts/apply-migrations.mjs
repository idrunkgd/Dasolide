#!/usr/bin/env node
/**
 * Applique les migrations SQL sur la base pointée par DATABASE_URL.
 *
 *   file:./prisma/dev.db   → prisma/migrations            (SQLite)
 *   postgresql://…         → prisma/migrations-postgres   (PostgreSQL)
 *
 * Pourquoi ce script plutôt que `prisma migrate deploy` ?
 * Il n'exige aucun moteur de schéma Prisma, donc aucun téléchargement au
 * démarrage d'un conteneur : il exécute les fichiers migration.sql dans
 * l'ordre et garde la trace de ce qui a déjà été appliqué. Le résultat est le
 * même, et `prisma migrate` reste utilisable si vous préférez.
 *
 * Sans danger à relancer : une migration déjà appliquée est ignorée.
 */
import fs from "node:fs";
import path from "node:path";

// dotenv n'est présent qu'en développement : dans un conteneur, les variables
// viennent de l'environnement.
try {
  await import("dotenv/config");
} catch {
  /* pas de fichier .env à charger */
}

const root = process.cwd();
const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL n'est pas défini. Copiez .env.example vers .env.");
  process.exit(1);
}

const isPostgres = url.startsWith("postgres://") || url.startsWith("postgresql://");
const migrationsDir = path.join(root, "prisma", isPostgres ? "migrations-postgres" : "migrations");

if (!fs.existsSync(migrationsDir)) {
  console.error(`Dossier de migrations introuvable : ${migrationsDir}`);
  process.exit(1);
}

const dirs = fs
  .readdirSync(migrationsDir)
  .filter((d) => fs.existsSync(path.join(migrationsDir, d, "migration.sql")))
  .sort();

const read = (dir) => fs.readFileSync(path.join(migrationsDir, dir, "migration.sql"), "utf8");

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS "_applied_migrations" (
  "name" TEXT NOT NULL PRIMARY KEY,
  "appliedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

if (isPostgres) {
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString: url,
    // Les bases managées exigent souvent TLS sans certificat vérifiable.
    ssl: /sslmode=(require|prefer)/.test(url) ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();

  try {
    await client.query(CREATE_TABLE);
    const { rows } = await client.query('SELECT "name" FROM "_applied_migrations"');
    const applied = new Set(rows.map((r) => r.name));

    let count = 0;
    for (const dir of dirs) {
      if (applied.has(dir)) continue;
      await client.query("BEGIN");
      try {
        await client.query(read(dir));
        await client.query('INSERT INTO "_applied_migrations" ("name") VALUES ($1)', [dir]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
      console.log(`  ✔ migration appliquée : ${dir}`);
      count++;
    }
    console.log(count === 0 ? "Base de données déjà à jour." : `${count} migration(s) appliquée(s).`);
  } finally {
    await client.end();
  }
} else {
  const { default: Database } = await import("better-sqlite3");
  const dbPath = path.resolve(root, url.replace(/^file:/, ""));
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(CREATE_TABLE.replace("TIMESTAMP", "DATETIME"));

  const applied = new Set(db.prepare('SELECT "name" FROM "_applied_migrations"').all().map((r) => r.name));

  let count = 0;
  for (const dir of dirs) {
    if (applied.has(dir)) continue;
    const run = db.transaction(() => {
      db.exec(read(dir));
      db.prepare('INSERT INTO "_applied_migrations" ("name") VALUES (?)').run(dir);
    });
    run();
    console.log(`  ✔ migration appliquée : ${dir}`);
    count++;
  }

  db.close();
  console.log(
    count === 0 ? "Base de données déjà à jour." : `${count} migration(s) appliquée(s) → ${path.relative(root, dbPath)}`
  );
}
