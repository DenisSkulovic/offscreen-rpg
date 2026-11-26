#!/usr/bin/env bash
# Install the disposable lab object store in lab-objects.
# Does not delete the cluster, Docker volumes, foreign kubectl contexts, or PVC data.
# Does not print Secret values. Does not run object-storage smoke.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "install.sh takes no arguments." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../clusters/kind/release/lib.sh"
STORE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

command -v node >/dev/null

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi

require_memory

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
volume_guard_begin "$work"

set +e
OFFSCREEN_OBJECT_STORAGE_ENSURE=authorized node "$STORE_DIR/providers/seaweedfs/install.mjs" ensure release
install_rc=$?
set -e
if [[ "$install_rc" -ne 0 ]]; then
  echo "Object storage release install failed." >&2
  exit "$install_rc"
fi

assert_loopback_only
volume_guard_end "$work"

echo "Object storage is ready in lab-objects."