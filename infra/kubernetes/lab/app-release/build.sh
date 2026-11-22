#!/usr/bin/env bash
# Clean build of the lab API and Game Authority images. No cluster, no secrets, no content tree.
set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "build.sh takes no arguments. For one image, use lib-build.sh via build-release-images.sh." >&2
  exit 2
fi

APP_RELEASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$APP_RELEASE_DIR/lib-build.sh"
# production-workspace-closure.mjs is copied into the pruned context by lib-build.sh.

build_release_image api
build_release_image game-authority
echo "Built ${API_IMAGE} and ${GA_IMAGE}"
