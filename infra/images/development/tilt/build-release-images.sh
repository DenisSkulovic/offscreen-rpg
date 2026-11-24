#!/usr/bin/env bash
# Compatibility entry: release/build-release-images.sh owns warm/clean image builds.
set -euo pipefail
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")/../../release" && pwd)/build-release-images.sh"