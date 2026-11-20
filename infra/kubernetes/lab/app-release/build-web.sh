#!/usr/bin/env bash
# Build the lab game-web release image. Does not start a cluster.
set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "build-web.sh takes no arguments." >&2
  exit 2
fi

BOOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$BOOT_DIR/../../../.." && pwd)"
IMAGE="${OFFSCREEN_LAB_WEB_IMAGE:-offscreen-lab-game-web:turn02}"
NEST_ORIGIN="${OFFSCREEN_LAB_NEST_ORIGIN:-http://game-api.lab-edge.svc.cluster.local:3001}"

cd "$REPO_ROOT"
rm -rf out
pnpm exec turbo prune @offscreen/web --docker

docker build \
  -f "$BOOT_DIR/Dockerfile.web" \
  --build-arg "OFFSCREEN_LAB_NEST_ORIGIN=${NEST_ORIGIN}" \
  -t "$IMAGE" \
  "$REPO_ROOT"

echo "Built ${IMAGE} with API_PROXY_ORIGIN=${NEST_ORIGIN}"