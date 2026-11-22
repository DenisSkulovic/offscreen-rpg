#!/usr/bin/env bash
# Build lab-only API and Game Authority release images from the workspace root.
# Does not start a cluster, embed secrets, or copy the content/ tree into images.
set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "build.sh takes no arguments." >&2
  exit 2
fi

APP_RELEASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$APP_RELEASE_DIR/../../../.." && pwd)"
# shellcheck source=/dev/null
source "$APP_RELEASE_DIR/images.pin"
DOCKER="${DOCKER:-${HOME}/.local/bin/docker}"

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

cp "$APP_RELEASE_DIR"/{Dockerfile.api,Dockerfile.game-authority,docker.npmrc,prepare-runtime-tree.sh,release-process-env-shim.mjs,production-workspace-closure.mjs} \
  "$stage/infra/kubernetes/lab/app-release/"

echo "Building ${API_IMAGE}"
"$DOCKER" build -f "$stage/infra/kubernetes/lab/app-release/Dockerfile.api" -t "$API_IMAGE" "$stage"

echo "Building ${GA_IMAGE}"
"$DOCKER" build -f "$stage/infra/kubernetes/lab/app-release/Dockerfile.game-authority" -t "$GA_IMAGE" "$stage"

echo "Built ${API_IMAGE} and ${GA_IMAGE}"