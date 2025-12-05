#!/usr/bin/env bash
set -euo pipefail

REGISTRY="${REGISTRY:-your-registry.example.com}"
IMAGE_API="$REGISTRY/td-api:latest"
IMAGE_FRONT="$REGISTRY/td-front:latest"

docker build --target build -t td-api-build ./api
docker run --rm td-api-build npm test

docker compose config > /dev/null

docker build -t "$IMAGE_API" ./api
docker build -t "$IMAGE_FRONT" ./front

# docker scan "$IMAGE_API"
# docker scan "$IMAGE_FRONT"
# export DOCKER_CONTENT_TRUST=1
# docker push "$IMAGE_API"
# docker push "$IMAGE_FRONT"

docker login "$REGISTRY"
docker push "$IMAGE_API"
docker push "$IMAGE_FRONT"

docker compose pull
docker compose up -d
