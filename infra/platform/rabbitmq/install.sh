#!/usr/bin/env bash
# Install pinned cert-manager, the RabbitMQ cluster operator, and one broker.
# Does not create or delete the kind cluster, Docker volumes, or foreign kubectl contexts.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "install.sh takes no arguments." >&2
  exit 2
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$ROOT/../../clusters/kind/release/lib.sh"
COMMON_CLI="$ROOT/../common/cli.mjs"

CERT_MANAGER_SHA256="c04a51295adda2b1a775146751f973e787190778c7f35180861d9678876e5c74"
CLUSTER_OPERATOR_SHA256="3ccd8a7c8a7f319ff21c444f3599829242f3cc1c18ae2dedea170cfcefeb8681"
CERT_MANAGER_MANIFEST="$ROOT/vendor/cert-manager-v1.21.3.yaml"
OPERATOR_MANIFEST="$ROOT/vendor/cluster-operator-v2.23.3.yml"

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi

echo "${CERT_MANAGER_SHA256}  ${CERT_MANAGER_MANIFEST}" | sha256sum -c -
echo "${CLUSTER_OPERATOR_SHA256}  ${OPERATOR_MANIFEST}" | sha256sum -c -
require_memory

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
volume_guard_begin "$work"

node "$COMMON_CLI" target release
node "$ROOT/release-install.mjs"

assert_loopback_only
volume_guard_end "$work"
awk '/MemAvailable:/ {print}' /proc/meminfo