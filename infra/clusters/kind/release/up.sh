#!/usr/bin/env bash
# Create the disposable offscreen-lab kind cluster. Does not delete volumes or foreign contexts.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "up.sh takes no arguments. It only creates kind cluster offscreen-lab." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

command -v docker >/dev/null
command -v kind >/dev/null
command -v kubectl >/dev/null
docker info >/dev/null
require_memory

if kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} already exists. Run destroy.sh with confirmation ${CONTEXT_NAME} before creating it again." >&2
  exit 1
fi

previous_context="$(kubectl config current-context 2>/dev/null || true)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
snapshot_volumes "$work/volumes-before"
snapshot_foreign_contexts "$work/contexts-before"

node "$LAB_ROOT/../manager/cli.mjs" create release

RELEASE_ENV_ROOT="$(cd "$LAB_ROOT/../../../environments/release" && pwd)"
COMMON_ROOT="$(cd "$LAB_ROOT/../common" && pwd)"

"${KUBECTL[@]}" wait --for=condition=Ready nodes --all --timeout=180s
"${KUBECTL[@]}" apply -f "$RELEASE_ENV_ROOT/namespaces.yaml"
"${KUBECTL[@]}" apply -f "$COMMON_ROOT/local-path-storage.yaml"
"${KUBECTL[@]}" -n local-path-storage wait --for=condition=Available deployment/local-path-provisioner --timeout=180s
assert_loopback_only

snapshot_volumes "$work/volumes-after"
snapshot_foreign_contexts "$work/contexts-after"
assert_no_volume_loss "$work/volumes-before" "$work/volumes-after"
assert_same_file "$work/contexts-before" "$work/contexts-after" "foreign kubectl contexts"

echo "Cluster ${CLUSTER_NAME} is ready. Context: ${CONTEXT_NAME}."
require_memory
