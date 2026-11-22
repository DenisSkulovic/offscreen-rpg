#!/usr/bin/env bash
# Clean build of the lab game-web release image. Does not start a cluster.
set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "build-web.sh takes no arguments." >&2
  exit 2
fi

APP_RELEASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$APP_RELEASE_DIR/lib-build.sh"

build_release_image web
echo "Built ${WEB_IMAGE} with API_PROXY_ORIGIN=${OFFSCREEN_LAB_NEST_ORIGIN:-http://game-api.lab-edge.svc.cluster.local:3001}"
