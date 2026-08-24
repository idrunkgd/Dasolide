#!/usr/bin/env node
/**
 * Bascule le `provider` de prisma/schema.prisma entre SQLite et PostgreSQL.
 *
 *   node scripts/set-db-provider.mjs sqlite
 *   node scripts/set-db-provider.mjs postgresql
 *
 * Prisma fige le moteur au moment de la génération du client : c'est la seule
 * ligne du schéma qui change entre le développement et la production. Le reste
 * du modèle est volontairement écrit dans un sous-ensemble commun aux deux
 * moteurs (aucun enum SQL, aucun tableau, aucun type JSON).
 */
import fs from "node:fs";
import path from "node:path";

const target = (process.argv[2] ?? "").toLowerCase();
const VALID = new Set(["sqlite", "postgresql"]);

if (!VALID.has(target)) {
  console.error("Usage : node scripts/set-db-provider.mjs <sqlite|postgresql>");
  process.exit(1);
}

const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
const schema = fs.readFileSync(schemaPath, "utf8");

const updated = schema.replace(
  /(datasource\s+db\s*\{[^}]*?provider\s*=\s*")[^"]+(")/s,
  `$1${target}$2`
);

if (updated === schema) {
  console.log(`Le provider est déjà « ${target} ».`);
} else {
  fs.writeFileSync(schemaPath, updated);
  console.log(`Provider Prisma → ${target}`);
}
