#!/usr/bin/env bash
# Shared pruned-context builder for the four lab runtime images.
# Clean callers build every requested image from the lockfile. They do not reuse a previous stage.
set -euo pipefail

APP_RELEASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMON_DIR="$(cd "$APP_RELEASE_DIR/../common" && pwd)"
REPO_ROOT="$(cd "$APP_RELEASE_DIR/../../.." && pwd)"
# shellcheck source=/dev/null
source "$APP_RELEASE_DIR/images.pin"
DOCKER="${DOCKER:-docker}"
WEB_IMAGE="${OFFSCREEN_LAB_WEB_IMAGE:-$WEB_IMAGE}"
SERVICE_IMAGES=(api game-authority worker)
VALID_IMAGES=(web "${SERVICE_IMAGES[@]}")

read_toolchain_pin() {
  local pin_file="$COMMON_DIR/toolchain.pin"
  if [[ ! -f "$pin_file" ]]; then
    echo "missing toolchain.pin" >&2
    return 2
  fi
  # shellcheck source=/dev/null
  source "$pin_file"
  if [[ -z "${NODE_IMAGE:-}" || -z "${NODE_DIGEST:-}" || -z "${PNPM_VERSION:-}" ]]; then
    echo "malformed toolchain.pin" >&2
    return 2
  fi
  if [[ ! "$NODE_DIGEST" =~ ^sha256:[a-f0-9]{64}$ ]]; then
    echo "malformed NODE_DIGEST in toolchain.pin" >&2
    return 2
  fi
  TOOLCHAIN_NODE_IMAGE="${NODE_IMAGE}@${NODE_DIGEST}"
}

validate_image() {
  local image="$1"
  for candidate in "${VALID_IMAGES[@]}"; do
    if [[ "$candidate" == "$image" ]]; then
      return 0
    fi
  done
  echo "unknown image $image" >&2
  return 2
}

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
    api|game-authority|worker) echo "Dockerfile.services" ;;
    *) return 2 ;;
  esac
}

# Prints the stage directory. Caller deletes it.
stage_pruned_context() {
  local image="$1"
  validate_image "$image"
  read_toolchain_pin
  local stage filter
  stage="$(mktemp -d)"
  cleanup_stage() {
    rm -rf "$stage"
  }
  trap cleanup_stage EXIT
  filter="$(workspace_filter "$image")"
  if ! (cd "$REPO_ROOT" && pnpm exec turbo prune "$filter" --docker --out-dir "$stage/prune" >&2); then
    trap - EXIT
    cleanup_stage
    return 1
  fi
  mkdir -p "$stage/prune/infra/images/common" "$stage/prune/infra/images/release"
  cp "$COMMON_DIR/docker.npmrc" "$stage/prune/docker.npmrc"
  cp "$COMMON_DIR/workspace-graph.mjs" "$stage/prune/infra/images/common/"
  cp "$APP_RELEASE_DIR"/{prepare-runtime-tree.sh,production-workspace-closure.mjs,release-process-env-shim.mjs,release-service-origin.mjs,verify-production-rewrite.mjs} \
    "$stage/prune/infra/images/release/"
  cp "$APP_RELEASE_DIR/$(dockerfile_for "$image")" \
    "$stage/prune/infra/images/release/"
  trap - EXIT
  echo "$stage"
}

build_release_image() {
  local image="$1"
  validate_image "$image"
  read_toolchain_pin
  local ref stage docker_file
  ref="$(image_ref "$image")"
  echo "Building ${ref} from pruned ${image} context"
  stage="$(stage_pruned_context "$image")"
  docker_file="$stage/prune/infra/images/release/$(dockerfile_for "$image")"
  cleanup_build() {
    rm -rf "$stage"
  }
  trap cleanup_build EXIT
  local -a build_args=(
    --build-arg "NODE_IMAGE=${TOOLCHAIN_NODE_IMAGE}"
    --build-arg "PNPM_VERSION=${PNPM_VERSION}"
  )
  if [[ "$image" == "web" ]]; then
    build_args+=(
      --build-arg "OFFSCREEN_LAB_NEST_ORIGIN=${OFFSCREEN_LAB_NEST_ORIGIN:-http://game-api.lab-edge.svc.cluster.local:3001}"
    )
  else
    build_args+=(
      --target "$image"
      --build-arg "APP_WORKSPACE=$(workspace_filter "$image")"
      --build-arg "APP_PATH=apps/${image}"
    )
  fi
  set +e
  "$DOCKER" build \
    -f "$docker_file" \
    "${build_args[@]}" \
    -t "$ref" \
    "$stage/prune"
  local status=$?
  set -e
  trap - EXIT
  cleanup_build
  if [[ "$status" -ne 0 ]]; then
    echo "build failed for ${image}" >&2
    return "$status"
  fi
  echo "Built ${ref}"
}