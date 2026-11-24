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

if ! grep -q 'image: docker.io/chrislusf/seaweedfs:4.54' "$STORE_DIR/chart/values.yaml"; then
  echo "chart/values.yaml image does not match the pinned SeaweedFS release." >&2
  exit 1
fi
if ! grep -q 'storageClass: local-path' "$STORE_DIR/chart/profiles/release.yaml"; then
  echo "release profile must request local-path." >&2
  exit 1
fi

require_memory

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
volume_guard_begin "$work"

node "$STORE_DIR/release-install.mjs"
install_rc=$?
if [[ "$install_rc" -ne 0 ]]; then
  echo "Object storage release install failed." >&2
  exit "$install_rc"
fi

assert_loopback_only
volume_guard_end "$work"

echo "Object storage is ready in lab-objects."