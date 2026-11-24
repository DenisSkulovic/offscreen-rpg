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
COMMON_CLI="$REDIS_DIR/../common/cli.mjs"

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi

rendered="$(mktemp)"
trap 'rm -f "$rendered"' EXIT

node "$COMMON_CLI" target release
node "$COMMON_CLI" render redis release all >"$rendered"

if grep -Ei 'requirepass|REDIS_PASSWORD|password:' "$rendered" >/dev/null; then
  echo "Refusing to apply Redis: rendered manifest contains authentication material." >&2
  exit 1
fi

"${KUBECTL[@]}" apply -f "$rendered"
"${KUBECTL[@]}" -n lab-a rollout status deployment/redis --timeout=180s

svc_type="$("${KUBECTL[@]}" -n lab-a get svc redis -o jsonpath='{.spec.type}')"
if [[ "$svc_type" != "ClusterIP" ]]; then
  echo "Redis Service is not ClusterIP." >&2
  exit 1
fi

assert_loopback_only
echo "Redis install is ready on context ${CONTEXT_NAME}."