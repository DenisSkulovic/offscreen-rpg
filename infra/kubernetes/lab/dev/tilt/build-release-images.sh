#!/usr/bin/env bash
# Build the four lab app images with the TURN02 release scripts, one after another.
# Does not create a cluster or apply manifests.
set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "build-release-images.sh takes no arguments." >&2
  exit 2
fi

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_RELEASE="$(cd "$HERE/../../app-release" && pwd)"

# Docker Desktop's WSL vsock intermittently returns accept4 timeout while Tilt is up.
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

retry "$APP_RELEASE/build-web.sh"
retry "$APP_RELEASE/build.sh"
retry "$APP_RELEASE/build-worker.sh"
