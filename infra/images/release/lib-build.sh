#!/usr/bin/env bash
# Shared pruned-context builder for the four lab runtime images.
# Clean callers build every requested image from the lockfile. They do not reuse a previous stage.
set -euo pipefail

APP_RELEASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$APP_RELEASE_DIR/../../.." && pwd)"
# shellcheck source=/dev/null
source "$APP_RELEASE_DIR/images.pin"
DOCKER="${DOCKER:-docker}"
WEB_IMAGE="${OFFSCREEN_LAB_WEB_IMAGE:-offscreen-lab-game-web:turn02}"

image_ref() {
  case "$1" in
    web) echo "$WEB_IMAGE" ;;
    api) echo "$API_IMAGE" ;;
    game-authority) echo "$GA_IMAGE" ;;
    worker) echo "$WORKER_IMAGE" ;;
    *)
      echo "unknown image $1" >&2
      return 2
      ;;
  esac
}

workspace_filter() {
  case "$1" in
    web) echo "@offscreen/web" ;;
    api) echo "@offscreen/api" ;;
    game-authority) echo "@offscreen/game-authority" ;;
    worker) echo "@offscreen/worker" ;;
    *) return 2 ;;
  esac
}

dockerfile_for() {
  case "$1" in
    web) echo "Dockerfile.web" ;;
    api) echo "Dockerfile.api" ;;
    game-authority) echo "Dockerfile.game-authority" ;;
    worker) echo "Dockerfile.worker" ;;
    *) return 2 ;;
  esac
}

# Prints the stage directory. Caller deletes it.
stage_pruned_context() {
  local image="$1"
  local stage filter
  stage="$(mktemp -d)"
  filter="$(workspace_filter "$image")"
  (cd "$REPO_ROOT" && pnpm exec turbo prune "$filter" --docker --out-dir "$stage/prune" >&2)
  mkdir -p "$stage/prune/infra/images/release"
  cp "$APP_RELEASE_DIR/docker.npmrc" "$stage/prune/docker.npmrc"
  cp "$APP_RELEASE_DIR"/{prepare-runtime-tree.sh,production-workspace-closure.mjs,release-process-env-shim.mjs,release-service-origin.mjs,verify-production-rewrite.mjs} \
    "$stage/prune/infra/images/release/"
  cp "$APP_RELEASE_DIR/$(dockerfile_for "$image")" \
    "$stage/prune/infra/images/release/"
  echo "$stage"
}

build_release_image() {
  local image="$1"
  local ref stage docker_file
  ref="$(image_ref "$image")"
  echo "Building ${ref} from pruned ${image} context"
  stage="$(stage_pruned_context "$image")"
  docker_file="$stage/prune/infra/images/release/$(dockerfile_for "$image")"
  set +e
  "$DOCKER" build \
    -f "$docker_file" \
    --build-arg "OFFSCREEN_LAB_NEST_ORIGIN=${OFFSCREEN_LAB_NEST_ORIGIN:-http://game-api.lab-edge.svc.cluster.local:3001}" \
    -t "$ref" \
    "$stage/prune"
  local status=$?
  set -e
  rm -rf "$stage"
  if [[ "$status" -ne 0 ]]; then
    echo "build failed for ${image}" >&2
    return "$status"
  fi
  echo "Built ${ref}"
}
