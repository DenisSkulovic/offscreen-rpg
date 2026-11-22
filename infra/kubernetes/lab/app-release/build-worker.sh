#!/usr/bin/env bash
# Build the lab Storyteller worker image. Does not start a cluster or copy content/.
set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "build-worker.sh takes no arguments." >&2
  exit 2
fi

APP_RELEASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$APP_RELEASE_DIR/../../../.." && pwd)"
# shellcheck source=/dev/null
source "$APP_RELEASE_DIR/images.pin"
DOCKER="${DOCKER:-docker}"
WORKER_IMAGE="${WORKER_IMAGE:-offscreen-lab-app-release-worker:turn02}"

if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync is required to stage a clean build context." >&2
  exit 1
fi

stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT

rsync -a \
  --exclude node_modules \
  --exclude .git \
  --exclude '**/.next' \
  --exclude '**/dist' \
  --exclude data \
  --exclude '/content' \
  --exclude evidence \
  --exclude work \
  "$REPO_ROOT/" "$stage/"

cp "$APP_RELEASE_DIR"/{Dockerfile.worker,docker.npmrc,prepare-runtime-tree.sh,release-process-env-shim.mjs} \
  "$stage/infra/kubernetes/lab/app-release/"

echo "Building ${WORKER_IMAGE}"
"$DOCKER" build -f "$stage/infra/kubernetes/lab/app-release/Dockerfile.worker" -t "$WORKER_IMAGE" "$stage"
echo "Built ${WORKER_IMAGE}"
