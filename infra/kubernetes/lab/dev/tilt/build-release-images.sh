#!/usr/bin/env bash
# Build lab app images. No arguments builds all four (clean acceptance).
# Warm mode: OFFSCREEN_RELEASE_IMAGES=worker or OFFSCREEN_AFFECTED_BASE=<git-ref>.
# Parallelism: OFFSCREEN_IMAGE_BUILD_CONCURRENCY (default 3).
set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "build-release-images.sh takes no arguments. Set OFFSCREEN_RELEASE_IMAGES or OFFSCREEN_AFFECTED_BASE." >&2
  exit 2
fi

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_RELEASE="$(cd "$HERE/../../app-release" && pwd)"
REPO="$(cd "$HERE/../../../../.." && pwd)"
# Dev Tilt sets OFFSCREEN_DEV_SLOT. Release builds leave it unset and skip this guard.
if [[ "${OFFSCREEN_DEV_SLOT:-}" == dev-* ]]; then
  (
    cd "$REPO"
    node --input-type=module -e '
    import { assertExclusiveHostWrite } from "./tools/dev-environments/src/domain/dev-host-output-guard.mjs";
    import { homedir } from "node:os";
    import { join } from "node:path";
    const registryRoot = process.env.OFFSCREEN_DEV_REGISTRY_ROOT
      ?? join(homedir(), ".local/state/offscreen-rpg/dev-worktree-registry");
    assertExclusiveHostWrite({
      checkout: process.cwd(),
      registryRoot,
      selfSlotId: process.env.OFFSCREEN_DEV_SLOT,
      operation: "release image fallback",
      outputPath: "apps/web/.next",
    });
  '
  )
fi
CONCURRENCY="${OFFSCREEN_IMAGE_BUILD_CONCURRENCY:-3}"
if ! [[ "$CONCURRENCY" =~ ^[1-9][0-9]*$ ]]; then
  echo "OFFSCREEN_IMAGE_BUILD_CONCURRENCY must be a positive integer." >&2
  exit 2
fi

if [[ -n "${OFFSCREEN_AFFECTED_BASE:-}" ]]; then
  selected="$(node "$APP_RELEASE/select-affected-images.mjs" --base "$OFFSCREEN_AFFECTED_BASE")"
elif [[ -n "${OFFSCREEN_RELEASE_IMAGES:-}" ]]; then
  selected="$(node "$APP_RELEASE/select-affected-images.mjs" --images "$OFFSCREEN_RELEASE_IMAGES")"
else
  selected="$(node "$APP_RELEASE/select-affected-images.mjs" --all)"
fi

if [[ "$selected" == "none" || -z "$selected" ]]; then
  echo "no runtime images selected"
  exit 0
fi

echo "selected images: ${selected}"
IFS=',' read -ra IMAGES <<<"$selected"

retry() {
  local attempt=1
  until "$@"; do
    if [[ "$attempt" -ge 3 ]]; then
      echo "failed after ${attempt} attempts: $*" >&2
      return 1
    fi
    echo "retry ${attempt} after failure: $*" >&2
    attempt=$((attempt + 1))
    sleep 3
  done
}

build_named() {
  local image="$1"
  case "$image" in
    web) retry "$APP_RELEASE/build-web.sh" ;;
    api)
      # shellcheck source=/dev/null
      source "$APP_RELEASE/lib-build.sh"
      retry build_release_image api
      ;;
    game-authority)
      # shellcheck source=/dev/null
      source "$APP_RELEASE/lib-build.sh"
      retry build_release_image game-authority
      ;;
    worker) retry "$APP_RELEASE/build-worker.sh" ;;
    *)
      echo "unknown image ${image}" >&2
      return 2
      ;;
  esac
}

log_dir="$(mktemp -d)"
trap 'rm -rf "$log_dir"' EXIT
declare -a pids=()
declare -a names=()
running=0
fail=0

wait_one() {
  local finished
  if ! wait -n -p finished; then
    fail=1
  fi
  running=$((running - 1))
  local index name
  for index in "${!pids[@]}"; do
    if [[ "${pids[$index]}" == "$finished" ]]; then
      name="${names[$index]}"
      echo "----- ${name} log -----"
      cat "$log_dir/${name}.log"
      unset 'pids[index]'
      unset 'names[index]'
      break
    fi
  done
}

for image in "${IMAGES[@]}"; do
  while ((running >= CONCURRENCY)); do
    wait_one
  done
  echo "starting ${image}"
  build_named "$image" >"$log_dir/${image}.log" 2>&1 &
  pids+=("$!")
  names+=("$image")
  running=$((running + 1))
done

while ((running > 0)); do
  wait_one
done

if [[ "$fail" -ne 0 ]]; then
  echo "one or more image builds failed" >&2
  exit 1
fi
echo "built ${selected}"
