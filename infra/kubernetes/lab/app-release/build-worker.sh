#!/usr/bin/env bash
# Clean build of the lab Storyteller worker image. Does not start a cluster or copy content/.
set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "build-worker.sh takes no arguments." >&2
  exit 2
fi

APP_RELEASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$APP_RELEASE_DIR/lib-build.sh"
# production-workspace-closure.mjs is copied into the pruned context by lib-build.sh.

build_release_image worker
