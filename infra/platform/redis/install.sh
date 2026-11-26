#!/usr/bin/env bash
# Render and apply disposable lab Redis. Does not FLUSHALL, scale, or delete existing objects.
# Not a default application platform or dev profile target.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "install.sh takes no arguments." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../clusters/kind/release/lib.sh"
REDIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

command -v node >/dev/null

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi

if [[ "${OFFSCREEN_REDIS_ENSURE:-}" != "authorized" ]]; then
  echo "OFFSCREEN_REDIS_ENSURE must be exactly 'authorized'." >&2
  exit 1
fi

assert_loopback_only

node "$REDIS_DIR/install.mjs" ensure release "$CONTEXT_NAME"
install_rc=$?
if [[ "$install_rc" -ne 0 ]]; then
  echo "Redis release install failed." >&2
  exit "$install_rc"
fi

assert_loopback_only
echo "Redis install is ready on context ${CONTEXT_NAME}."