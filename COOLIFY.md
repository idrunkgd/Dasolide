# Déployer Muscu sur Coolify

Guide pas à pas pour une instance Coolify déjà en place, un dépôt GitHub privé
et une base PostgreSQL gérée par Coolify.

Compte trente minutes la première fois, cinq les suivantes.

---

## 1. Pousser le code sur GitHub

Depuis le dossier du projet :

```bash
git init
git add .
git commit -m "Muscu — application de suivi musculation et nutrition"
git branch -M main
git remote add origin git@github.com:<ton-compte>/muscu.git
git push -u origin main
```

Le `.gitignore` exclut déjà `node_modules`, `.next`, `.env`, la base SQLite de
développement et les photos. Vérifie avant de pousser qu'aucun secret ne part :

```bash
git ls-files | grep -E "^\.env$|dev\.db" || echo "Rien de sensible."
```

### Connecter GitHub à Coolify

Dans Coolify : **Sources → + Add → GitHub App**. Suis l'assistant, installe
l'application GitHub sur ton compte et donne-lui accès au dépôt `muscu`.

C'est la méthode à privilégier sur un dépôt privé : elle gère l'authentification
et les webhooks de redéploiement automatique. Une clé de déploiement SSH marche
aussi, mais sans redéploiement automatique au push.

---

## 2. Créer la base de données

Dans ton projet Coolify : **+ New → Database → PostgreSQL**.

| Réglage | Valeur |
|---|---|
| Version | 16 ou 17 |
| Nom | `muscu-db` |

Démarre-la, puis ouvre son onglet et copie l'**URL de connexion interne** — elle
ressemble à `postgres://postgres:<mot-de-passe>@<id-du-service>:5432/postgres`.

C'est cette URL interne qu'il faut utiliser : elle passe par le réseau Docker,
sans exposer la base sur Internet.

> Active tout de suite les sauvegardes dans l'onglet **Backups** de la base :
> une sauvegarde quotidienne suffit pour un usage personnel.

---

## 3. Créer l'application

**+ New → Application → Public/Private Repository** puis choisis la source
GitHub configurée à l'étape 1.

| Réglage | Valeur |
|---|---|
| Repository | `<ton-compte>/muscu` |
| Branch | `main` |
| **Build Pack** | **Dockerfile** — surtout pas Nixpacks |
| Dockerfile Location | `/Dockerfile` |
| Base Directory | `/` |
| **Ports Exposes** | `3000` |

Le `Dockerfile` du dépôt fait tout : il bascule Prisma sur PostgreSQL, génère le
client, construit Next.js en mode *standalone* et produit une image légère qui
tourne sous un utilisateur non privilégié.

---

## 4. Variables d'environnement

Onglet **Environment Variables**. Ajoute-les **avant** le premier déploiement.

| Variable | Valeur | Obligatoire |
|---|---|---|
| `DATABASE_URL` | l'URL interne PostgreSQL de l'étape 2 | oui |
| `AUTH_SECRET` | `openssl rand -base64 32` | oui |
| `ADMIN_EMAIL` | ton adresse email | non — mais recommandé |
| `ALLOWED_ORIGINS` | ton domaine, ex. `muscu.mondomaine.be` | seulement en cas de souci (voir §8) |

Génère le secret sur ta machine :

```bash
openssl rand -base64 32
```

Ce secret signe les cookies de session. Le changer déconnecte tout le monde ;
le perdre n'entraîne aucune perte de données.

`ADMIN_EMAIL` désigne le compte qui aura accès à `/admin` : le rôle est
réévalué à chaque connexion, donc inscris-toi avec cette adresse (ou reconnecte-toi
si le compte existe déjà) et l'accès apparaît. Laissée vide, la page
d'administration n'est accessible à personne.

Coche **Build Variable** uniquement si une variable doit exister pendant le
build. Ici, aucune ne le doit : tout est lu au démarrage.

---

## 5. Stockage persistant des photos

Sans cette étape, les photos de progression disparaissent à chaque
redéploiement — l'image Docker est recréée à neuf.

Onglet **Storages → + Add** :

| Champ | Valeur |
|---|---|
| Name | `uploads` |
| Type | Volume |
| Destination Path | `/app/public/uploads` |

---

## 6. Domaine et HTTPS

Onglet **Domains** : saisis `https://muscu.mondomaine.be`.

Chez ton registraire, crée un enregistrement DNS :

```
A    muscu    <adresse-ip-de-ton-serveur>
```

Coolify obtient le certificat Let's Encrypt automatiquement une fois le DNS
propagé. HTTPS n'est pas optionnel ici : les cookies de session sont marqués
`Secure` en production et ne seront pas transmis en HTTP.

---

## 7. Health check

Onglet **Health Checks** :

| Champ | Valeur |
|---|---|
| Path | `/api/health` |
| Port | `3000` |
| Interval | `30` |
| Timeout | `5` |
| Retries | `3` |
| Start Period | `30` |

Cette route vérifie que le serveur répond **et** que la base est joignable. Elle
renvoie `503` si PostgreSQL est tombé, ce qui évite que Coolify considère
l'application saine alors qu'elle ne peut rien afficher.

---

## 8. Déployer

Clique sur **Deploy** et suis les logs.

Au démarrage, tu dois voir :

```
[muscu] Application des migrations…
  ✔ migration appliquée : 20260801000000_init
  ✔ migration appliquée : 20260801000100_libraries
2 migration(s) appliquée(s).
[muscu] Démarrage du serveur sur le port 3000.
 ✓ Ready
```

La seconde migration charge les **24 groupes musculaires, 173 exercices et 235
aliments**. L'application est immédiatement utilisable : tu ouvres le domaine,
tu crées ton compte, tu fais l'onboarding, et ton programme est prêt.

Aucun compte de démonstration n'est créé en production — c'est voulu.

---

## 9. Si quelque chose coince

**Le build échoue sur `npm ci`.**
Le `package-lock.json` doit être commité et à jour. `npm install` puis
recommite-le.

**Le build échoue sur `prisma generate`.**
Cette étape télécharge le moteur de schéma Prisma. Le serveur qui construit
l'image doit pouvoir joindre `registry.npmjs.org` et `binaries.prisma.sh` en
sortie. Sur un serveur derrière un pare-feu sortant strict, autorise ces deux
domaines. Rien de tout cela n'est nécessaire à l'exécution : le conteneur qui
tourne n'a besoin que de la base de données.

**Le conteneur redémarre en boucle avec « DATABASE_URL n'est pas défini ».**
La variable n'est pas visible au runtime. Vérifie qu'elle est bien dans
*Environment Variables* et redéploie — Coolify n'injecte pas les variables
ajoutées après le déploiement sans nouveau déploiement.

**« AUTH_SECRET est trop court ».**
Il faut au moins 32 caractères. Régénère-le avec `openssl rand -base64 32`.

**Erreur de connexion à la base.**
Utilise l'URL **interne** (nom de service Docker), pas l'URL publique.
L'application et la base doivent être dans le même projet Coolify pour partager
le réseau. Si ta base impose TLS, ajoute `?sslmode=require` à l'URL.

**Les formulaires renvoient « Invalid Server Actions request ».**
Next.js compare l'origine de la requête à l'hôte, et le reverse proxy peut
brouiller la comparaison. Ajoute la variable `ALLOWED_ORIGINS` avec ton domaine
(sans `https://`) et redéploie.

**Les photos disparaissent après un déploiement.**
Le volume de l'étape 5 est manquant ou monté au mauvais endroit. Le chemin doit
être exactement `/app/public/uploads`.

**Voir ce qui se passe dans la base.**
Depuis ta machine, avec l'URL publique de la base activée temporairement :

```bash
DATABASE_URL="postgresql://…" npm run db:studio
```

---

## 10. Mises à jour

Chaque `git push` sur `main` déclenche un redéploiement si le webhook GitHub est
en place (onglet **Webhooks** de l'application).

Les nouvelles migrations sont appliquées automatiquement au démarrage du
conteneur. Elles ne sont jamais rejouées deux fois : le script tient un journal
dans la table `_applied_migrations`.

Pour désactiver temporairement les migrations au démarrage (par exemple pour
diagnostiquer un problème) : variable `RUN_MIGRATIONS=0`.

---

## Alternative : tout en Docker Compose

Si tu préfères que Coolify gère l'application **et** la base depuis un seul
fichier, le dépôt contient un `docker-compose.yml` complet. Dans Coolify :
**+ New → Docker Compose**, colle le fichier, et définis `POSTGRES_PASSWORD` et
`AUTH_SECRET` dans les variables d'environnement.

C'est plus autonome, mais tu perds les sauvegardes automatiques et l'interface
de gestion de base que Coolify offre sur une base managée. Pour un usage
personnel, la base managée reste le meilleur compromis.

---

## Tester l'image en local avant de déployer

```bash
export POSTGRES_PASSWORD=motdepasse
export AUTH_SECRET="$(openssl rand -base64 32)"
docker compose up --build
```

Puis http://localhost:3000. C'est exactement l'image que Coolify construira.
