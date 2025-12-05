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
