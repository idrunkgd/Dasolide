# Muscu

Application web de suivi de **musculation, nutrition et progression**.
Conçue pour le smartphone d'abord, installable en PWA, utilisable hors ligne pendant une séance.

---

## Démarrage rapide

Prérequis : **Node.js 20 ou plus** (`node -v` pour vérifier).

```bash
npm install          # installe les dépendances
cp .env.example .env # crée le fichier d'environnement
npm run setup        # génère le client Prisma, crée la base et charge les données
npm run dev          # démarre l'application
```

Puis ouvre **http://localhost:3000**.

### Compte de démonstration

| | |
|---|---|
| Email | `demo@muscu.app` |
| Mot de passe | `demo1234` |

Ce compte contient **10 semaines d'historique réaliste** : 38 séances avec charges progressives,
records personnels détectés, 63 pesées, mensurations, journal alimentaire, objectifs et rappels.
Tu peux aussi créer un compte vierge depuis l'écran d'inscription pour tester l'onboarding.

> **Important** : ouvre `.env` et remplace `AUTH_SECRET` par une valeur aléatoire :
> `openssl rand -base64 32`

### Tester comme sur un téléphone

Ouvre les outils de développement du navigateur (`⌥⌘I` sur Mac) puis active le mode responsive
(`⌥⌘M`) et choisis un iPhone. C'est le format pour lequel l'application est pensée.

---

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement sur le port 3000 |
| `npm run build` | Build de production |
| `npm start` | Démarre le build de production |
| `npm run typecheck` | Vérification TypeScript |
| `npm run setup` | Client Prisma + base + données de démonstration |
| `npm run db:migrate` | Applique les migrations SQL |
| `npm run db:seed` | Recharge les données de démonstration |
| `npm run db:reset` | Efface la base et repart de zéro |
| `npm run db:studio` | Explorateur de base de données Prisma |
| `npm run db:use:sqlite` | Bascule Prisma sur SQLite (développement) |
| `npm run db:use:postgres` | Bascule Prisma sur PostgreSQL (production) |
| `npm run test:e2e` | Tests de bout en bout dans un vrai navigateur (Playwright) |

### Tests

`npm run test:e2e` rejoue dans Chromium les trois parcours de bout en bout :
inscription → onboarding → séance complète avec détection de record ; ajout d'un aliment au
journal ; encodage du poids et mise à jour de la courbe. Il visite ensuite les 23 écrans de
l'application et échoue à la moindre erreur console, erreur 500 ou page vide.
Les captures sont écrites dans `e2e-screenshots/`.

L'application doit tourner avant de lancer les tests. Sur un autre port :
`BASE=http://localhost:4000 npm run test:e2e`.

---

## Ce que fait l'application

### Entraînement
- **Mode séance** pensé pour être utilisé à une main dans une salle : gros boutons ±,
  validation d'une série en un geste, dernière performance affichée en tête, suggestion de charge.
- **Timer de repos** configurable par exercice, avec vibration, son et notification.
- **Supersets**, types de séries (échauffement, normale, dropset, échec, assistée) — les séries
  d'échauffement sont exclues des statistiques et ne peuvent pas générer de record.
- **Remplacement d'exercice** en cours de séance, avec proposition d'alternatives sollicitant
  les mêmes muscles (utile quand une machine est occupée).
- **Sauvegarde permanente** : la séance est écrite en local à chaque modification et synchronisée
  au serveur. Fermer le navigateur, perdre le réseau ou verrouiller le téléphone ne perd rien.
- **Détection automatique des records** (charge max, répétitions, volume sur une série, volume sur
  une séance, 1RM estimé) avec résumé de fin de séance.
- Programmes avec journées, exercices, séries/répétitions cibles, RPE, RIR, tempo, repos,
  réorganisation par glisser-déposer.
- Bibliothèque de **173 exercices** avec muscles primaires et secondaires, plus exercices personnalisés.
- Calendrier, historique complet, statistiques, carte des muscles.

### Nutrition
- Journal par repas avec macros calculées, base de **235 aliments**, aliments personnalisés,
  favoris et récents.
- Repas enregistrés et recettes (macros totales et par portion).
- Objectifs caloriques estimés (Mifflin-St Jeor) **et** toujours modifiables manuellement.
- Suivi de l'hydratation, duplication d'une journée.

### Progression
- Poids avec **moyenne glissante 7 jours** — c'est la courbe qui compte, pas les variations
  quotidiennes.
- Mensurations complètes avec graphiques.
- Photos de progression avec comparateur avant/après à curseur.
- Objectifs de poids, de force, de mensuration, avec progression et date cible.

---

## Architecture

```
Dockerfile               Image de production (build standalone multi-étapes)
docker-compose.yml       Pile complète application + PostgreSQL
docker-entrypoint.sh     Migrations puis démarrage du serveur
prisma/
  schema.prisma          Modèle de données (32 tables)
  migrations/            Migrations SQL — SQLite
  migrations-postgres/   Migrations SQL — PostgreSQL
  data/                  Bibliothèques de référence (exercices, aliments, muscles)
  seed.ts                Données de démonstration
scripts/
  apply-migrations.mjs   Application des migrations en SQLite sans binaire Prisma
src/
  app/
    (auth)/              Connexion, inscription, mot de passe oublié
    (app)/               Application authentifiée (navigation basse)
    seance/              Mode séance plein écran
    api/                 Routes de recherche (exercices, aliments)
  components/            Composants par domaine + design system (components/ui)
  lib/                   Calculs, validation Zod, authentification, utilitaires
  server/
    actions/             Server actions (mutations)
    queries/             Lectures composées
```

**Stack** : Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 ·
Prisma 7 · Recharts · dnd-kit · Zod · jose + bcrypt.

### Choix techniques

- **Prisma 7 sans binaire Rust** : la connexion passe par un *driver adapter*
  (`better-sqlite3` en développement). Rien à compiler, rien à télécharger au lancement.
- **Authentification maison** : cookie signé HS256, `httpOnly`, `SameSite=Lax`, mot de passe
  haché avec bcrypt (12 tours). Le modèle `Account` est déjà là pour brancher Google et Apple
  plus tard sans toucher au reste.
- **Schéma portable** : aucun type propre à un moteur (pas d'enum SQL, pas de tableau, pas de
  JSON). Les valeurs énumérées vivent dans `src/lib/constants.ts` et sont validées par Zod.
- **Isolation des données** : toute lecture et toute écriture est filtrée par `userId`.
  Les photos sont rangées dans un dossier par utilisateur.

---

## Passer en PostgreSQL

```bash
npm run db:use:postgres                              # provider Prisma + client
# puis dans .env :
# DATABASE_URL="postgresql://utilisateur:motdepasse@hote:5432/muscu"
npm run db:migrate                                   # applique le schéma et les bibliothèques
```

Deux jeux de migrations SQL sont fournis, `prisma/migrations` (SQLite) et
`prisma/migrations-postgres` (PostgreSQL) ; `scripts/apply-migrations.mjs` choisit le bon
dossier d'après `DATABASE_URL` et note ce qu'il a appliqué dans `_applied_migrations`.
Aucun binaire Prisma n'est téléchargé au démarrage — précieux dans un conteneur.
`prisma migrate` reste utilisable si vous préférez son historique.

La seconde migration charge les bibliothèques de référence (24 groupes musculaires,
173 exercices, 235 aliments). Une base de production fraîche est donc immédiatement
utilisable, sans exécuter le seed de démonstration.

Retour au développement : `npm run db:use:sqlite`.

### Déploiement

Le dépôt contient tout le nécessaire : `Dockerfile` (build *standalone* multi-étapes),
`docker-entrypoint.sh` (migrations puis démarrage), `docker-compose.yml` (application +
PostgreSQL) et une sonde `/api/health`.

**[COOLIFY.md](./COOLIFY.md) donne la procédure complète pour Coolify**, réglage par réglage.
Le même Dockerfile fonctionne sur n'importe quel hébergeur qui accepte une image Docker.

Tester l'image en local :

```bash
export POSTGRES_PASSWORD=motdepasse
export AUTH_SECRET="$(openssl rand -base64 32)"
docker compose up --build
```

Une seule variable est obligatoire en plus de `DATABASE_URL` : `AUTH_SECRET`.
Les photos de progression sont écrites dans `public/uploads` — à monter sur un volume
persistant, sinon elles disparaissent à chaque redéploiement.

---

## PWA

L'application est installable : sur iPhone, *Partager → Sur l'écran d'accueil* ; sur Android,
*Installer l'application*. Le service worker est actif en production uniquement
(`npm run build && npm start`) et met en cache la coquille de l'application.

---

## Prêt pour la suite

L'architecture anticipe, sans les implémenter :

- **connexions Google / Apple** — modèle `Account` déjà présent ;
- **scan de codes-barres** — champ `barcode` sur `Food`, API de recherche isolée ;
- **santé connectée** (Apple Health, Google Fit, Garmin, Strava) — les séances, pesées et
  mensurations sont des entités indépendantes, faciles à alimenter par une synchronisation ;
- **assistant IA** — `src/lib/progression.ts` isole déjà la logique de progression et la
  détection de plateau, avec une sortie explicable ;
- **social** — aucune donnée n'est globale, tout est déjà rattaché à un utilisateur.

---

## Confidentialité

- Export complet des données au format JSON depuis les paramètres.
- Suppression du compte : efface toutes les données en cascade **et** les photos sur le disque.
- Suppression des photos seules possible séparément.
- Aucune donnée d'un utilisateur n'est accessible à un autre, y compris pour l'administrateur,
  qui ne voit que des compteurs agrégés et les bibliothèques partagées.
