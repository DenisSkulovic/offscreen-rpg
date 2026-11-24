#!/usr/bin/env bash
# Delete only the disposable offscreen-release kind cluster.
# This script does not run docker volume rm, docker system prune, or kubectl delete on another context.

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "destroy.sh requires exactly one confirmation argument: kind-offscreen-release" >&2
  exit 2
fi

if [[ "$1" != "kind-offscreen-release" ]]; then
  echo "destroy.sh refused: confirmation must be exactly kind-offscreen-release." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
snapshot_volumes "$work/volumes-before"
cluster_volume_names "$work/cluster-volumes"
snapshot_foreign_contexts "$work/contexts-before"

if kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  kind delete cluster --name "$CLUSTER_NAME"
else
  echo "Cluster ${CLUSTER_NAME} is already absent."
fi

snapshot_volumes "$work/volumes-after"
snapshot_foreign_contexts "$work/contexts-after"
assert_volumes_outside_cluster_remain "$work/volumes-before" "$work/cluster-volumes" "$work/volumes-after"
assert_same_file "$work/contexts-before" "$work/contexts-after" "foreign kubectl contexts"

if kubectl config get-contexts -o name 2>/dev/null | grep -qx "$CONTEXT_NAME"; then
  echo "kind delete left context ${CONTEXT_NAME} behind." >&2
  exit 1
fi

echo "Cluster ${CLUSTER_NAME} is gone. Named Docker volumes and foreign kubectl contexts are unchanged."