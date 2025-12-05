Rapport TD Docker

Architecture
- db : PostgreSQL 16, initialisation auto via init.sql, persistance volume.
- api : Node.js/Express, routes /status /items /health; connexion Postgres via ENV.
- front : HTML/JS, servi par Nginx; proxy /api vers api:3000.

Commandes clés
- `docker compose up -d --build`, `docker compose ps`, `docker images`, `./scripts/build_and_deploy.sh`
- Scan : `docker scan IMAGE`
- Signature : `export DOCKER_CONTENT_TRUST=1`, puis `docker push`

Bonnes pratiques suivies
- Dockerfiles multi-étapes (API/front), images *-alpine*, .dockerignore, users non-root, ENV centralisé, healthchecks.

Difficultés et améliorations
- Pipeline CI, scaling, monitoring Prometheus, sécurité avancée.

- Voici une version plus courte mais complète, prête à mettre dans un fichier texte / Word.



Rapport TD Docker – API, Base de données et Front

1. Objectif

Mettre en place une petite architecture applicative complète avec Docker :

- Une API REST connectée à une base de données.
- Une base PostgreSQL initialisée automatiquement.
- Un front web statique qui consomme l’API.
- Orchestration via Docker Compose, avec healthchecks, variables d’environnement, et bonnes pratiques de construction d’images.


2. Architecture générale

La stack se compose de trois services Docker :

- db : base PostgreSQL.
- api : API Node.js / Express.
- front : front HTML/JS servi par Nginx et reverse proxy vers l’API.

Les services sont reliés par un réseau Docker `td-net`.  
Ports exposés :

- `localhost:3000` → API
- `localhost:8080` → Front

Les variables (login DB, nom de base, port API) sont centralisées dans un fichier `.env` et injectées par `docker-compose.yml`.


3. Base de données (service `db`)

- Image : `postgres:16-alpine` (image officielle, légère).
- Initialisation automatique via `db/init.sql`, monté dans `/docker-entrypoint-initdb.d/`.
  - Création de la table `items`.
  - Insertion de quelques éléments de test.
- Persistance des données avec un volume nommé `db_data` monté sur `/var/lib/postgresql/data`.
- Healthcheck configuré avec `pg_isready` pour que Compose sache quand la DB est prête.

Pour modifier les items, il suffit de changer `init.sql` puis de faire `docker compose down -v` et `docker compose up --build` pour rejouer le script.



4. API Node.js / Express (service `api`)

Fonctionnalités

- `GET /status` → `{ "status": "OK" }`
- `GET /items` → sélectionne les lignes de la table `items` dans PostgreSQL et les renvoie en JSON.
- `GET /health` → exécute `SELECT 1` pour vérifier la disponibilité de la base (utilisé pour le healthcheck).

La connexion à PostgreSQL utilise exclusivement des variables d’environnement (`DB_HOST`, `DB_PORT`, `DB_USER`, etc.), définies dans `docker-compose.yml` et `.env`.

Dockerfile multi‑étapes

- Étape build (`node:22-alpine`) :
  - Copie `package*.json` puis `npm ci --only=production` (installation déterministe grâce au `package-lock.json` généré par `npm install`).
  - Copie du code source (`src`).

- Étape runtime (`node:22-alpine`) :
  - Création d’un utilisateur non‑root (`appuser`).
  - (Optionnel) Installation de `curl` pour le healthcheck.
  - Copie des fichiers de l’étape build.
  - `USER appuser`, `EXPOSE 3000`, lancement avec `node src/index.js`.

Un `.dockerignore` exclut `node_modules`, `.git`, etc. pour alléger les builds.

Difficulté rencontrée

- Erreur au `npm ci` car `package-lock.json` manquait.
- Résolution : exécuter `npm install` dans `api/` pour générer le lockfile, puis rebuild.



5. Front statique + Nginx (service `front`)

Code front

- `index.html` : page simple avec un titre, un indicateur de statut de l’API, et une liste d’items.
- `app.js` :
  - `fetch("/api/status")` pour afficher l’état de l’API.
  - `fetch("/api/items")` pour récupérer les données et les afficher dans la liste.

Nginx

- `nginx.conf` :
  - Sert les fichiers statiques depuis `/usr/share/nginx/html`.
  - Définit un reverse proxy `/api/` → `http://api:3000/` (service API sur le réseau Docker).

Dockerfile

- Étape build (`node:22-alpine`) : copie des fichiers `src`.
- Étape runtime (`nginx:1.27-alpine`) :
  - Copie des fichiers HTML/JS dans `/usr/share/nginx/html`.
  - Copie de `nginx.conf` dans `/etc/nginx/nginx.conf`.
  - `EXPOSE 80`, Nginx lancé en mode foreground.

Un `.dockerignore` simplifie le contexte de build.

Difficulté rencontrée

- En voulant forcer `USER nginx`, Nginx n’arrivait plus à écrire dans certains dossiers (`/var/cache/nginx`, `/run/nginx.pid`).  
- Pour le TD, la solution retenue : laisser l’entrypoint standard gérer cela, se concentrer sur le rôle du front + reverse proxy.



6. Orchestration avec Docker Compose

Services définis

- db : image PostgreSQL, variables d’environnement, volume `db_data`, healthcheck `pg_isready`.
- api : build local (`./api`), dépend de `db`, expose le port `API_PORT`, healthcheck HTTP sur `/health`.
- front : build local (`./front`), expose `8080:80`, appelle l’API via `/api`.

Healthchecks

- DB : `pg_isready` (état `healthy` quand la base est prête).
- API : HTTP `/health` (via `curl` dans le conteneur, si installé).
- Front : HTTP `/` (vérifie que la page HTML est servie).

Problème de démarrage de `td-front`

- Au départ, `front.depends_on.api.condition: service_healthy` empêchait `front` de démarrer tant que l’API était marquée `unhealthy` (healthcheck API non fonctionnel).
- Résolution :
  - Simplifier `depends_on` pour `front` en simple `depends_on: ["api"]`, afin qu’il se lance quand l’API est démarrée, même si le healthcheck API est imparfait.
  - Option complémentaire : améliorer le healthcheck API en installant `curl` dans l’image.

7. Sécurité et bonnes pratiques

- Images *alpine* (`node:22-alpine`, `postgres:16-alpine`, `nginx:1.27-alpine`) pour limiter la taille des images.
- Builds multi‑étapes pour API et front, séparant build et runtime.
- Exécution de l’API sous un utilisateur non‑root (`appuser`).
- Configuration externalisée via `.env` et variables d’environnement.
- Utilisation de healthchecks pour DB, API, front.
- Utilisation de `.dockerignore` pour réduire le contexte de build.

8. Difficultés principales et solutions

1. Échec du build API avec `npm ci`
   → Manque de `package-lock.json`.  
   → Solution : `npm install` pour générer le lockfile, puis `npm ci` dans le Dockerfile.

2. Erreurs de droits Nginx en mode non‑root (cache, pid)
   → Complexité pour créer et `chown` tous les dossiers nécessaires.  
   → Solution pragmatique pour le TD : laisser l’image Nginx gérer ça (ne pas forcer `USER nginx`), se concentrer sur le reverse proxy et le front.

3. `td-front` ne se lançait pas avec `docker compose up`
   → Cause : `depends_on` avec `condition: service_healthy` sur une API marquée `unhealthy`.  
   → Solution : simplifier `depends_on` (`depends_on: ["api"]`) + possibilité d’améliorer le healthcheck API.

9. Conclusion
    
- Une API fonctionnelle avec `/status` et `/items`, connectée à une base PostgreSQL initialisée automatiquement.
- Un front statique qui appelle l’API et affiche les données.
- Une orchestration Docker Compose avec variables d’environnement, volumes, réseaux, et healthchecks.
- Des Dockerfiles multi‑étapes et des images légères, avec au moins un service non‑root (API).

Les principales difficultés ont été liées aux détails des builds Node (lockfile) et à la gestion des permissions Nginx / healthchecks, et ont été résolues de manière adaptée au contexte du TD.

1. Principales commandes utilisées
Docker / Docker Compose
Lancer la stack avec build des images :
docker compose up --build

Lancer en arrière-plan :
docker compose up -d

Arrêter et supprimer les conteneurs :
docker compose down

Arrêter et supprimer aussi les volumes (réinitialiser la base) :
docker compose down -v

Voir l’état des services :
docker compose ps

Voir les logs d’un service :
docker compose logs api
docker compose logs front
docker compose logs db

Vérifier la configuration Compose :
docker compose config

Lancer seulement un service :
docker compose up front
docker compose up api

Lister toutes les images :
docker images

Lancer un conteneur spécifique manuellement (si besoin) :
docker start td-front
docker start td-api

Node / npm (côté API)
Installation des dépendances et génération du lockfile :
cd api
npm install

Lancement des tests (dans l’image de build ou localement si défini) :
npm test

2. Arborescence du projet :

text
TD-doc/
├── api/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── package.json
│   ├── package-lock.json
│   └── src/
│       ├── index.js        # Routes /status, /items, /health
│       └── db.js           # Connexion PostgreSQL via variables d'env
│
├── db/
│   └── init.sql            # Création table items + données d'exemple
│
├── front/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── nginx.conf          # Nginx + reverse proxy /api -> api:3000
│   └── src/
│       ├── index.html      # Page HTML affichant la liste des items
│       └── app.js          # Appels fetch vers /api/status et /api/items
│
├── docker-compose.yml      # Définition services db, api, front
├── .env                    # DB_USER, DB_PASSWORD, DB_NAME, API_PORT
├── scripts/
│   └── build_and_deploy.sh # Script d'automatisation (build, push, déploiement)
└── RAPPORT.txt / RAPPORT.md # Rapport du TD
