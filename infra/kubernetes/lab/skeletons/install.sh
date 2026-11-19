#!/usr/bin/env bash
# Install four synthetic placeholder workloads.
# Does not create or delete the kind cluster, Docker volumes, or foreign kubectl contexts.
# Does not install RabbitMQ, the collector, Next, or Nest. The node pulls the Python image.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "install.sh takes no arguments." >&2
  exit 2
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$ROOT/../lib.sh"

PYTHON_IMAGE="docker.io/library/python:3.12-alpine@sha256:c5ba3deef00c7758561a0f03c26f44f10589263d40e732b8748e0d1f38f6dd89"

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi

echo "MemAvailable KiB: $(awk '/MemAvailable:/ {print $2}' /proc/meminfo)"
echo "kind: $(kind version)"
echo "kubectl client: $(kubectl version --client=true)"
echo "Placeholder image: ${PYTHON_IMAGE}"
echo "The node pulls that image. This script does not run kind load docker-image."

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
snapshot_volumes "$work/volumes-before"
snapshot_foreign_contexts "$work/contexts-before"

"${KUBECTL[@]}" apply -f "$ROOT/namespace.yaml"
"${KUBECTL[@]}" -n lab-skeletons create configmap synthetic-placeholder \
  --from-file=placeholder.py="$ROOT/placeholder.py" \
  --dry-run=client -o yaml | "${KUBECTL[@]}" apply -f -
"${KUBECTL[@]}" apply -f "$ROOT/workloads.yaml"

for name in web-api engine storyteller notifications; do
  if ! "${KUBECTL[@]}" -n lab-skeletons rollout status "deployment/${name}" --timeout=300s; then
    echo "Placeholder ${name} did not become ready." >&2
    "${KUBECTL[@]}" -n lab-skeletons describe "deployment/${name}" || true
    "${KUBECTL[@]}" -n lab-skeletons get pods -l "app=${name}" -o wide || true
    "${KUBECTL[@]}" -n lab-skeletons logs "deployment/${name}" --tail=80 || true
    exit 1
  fi
done

"${KUBECTL[@]}" -n lab-skeletons get deploy,svc,pods -o wide
types="$("${KUBECTL[@]}" -n lab-skeletons get svc -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.spec.type}{"\n"}{end}')"
printf '%s\n' "$types"
if printf '%s\n' "$types" | grep -v ' ClusterIP$' | grep -q .; then
  echo "A skeleton Service is not ClusterIP." >&2
  exit 1
fi

assert_loopback_only
snapshot_volumes "$work/volumes-after"
snapshot_foreign_contexts "$work/contexts-after"
assert_no_volume_loss "$work/volumes-before" "$work/volumes-after"
assert_same_file "$work/contexts-before" "$work/contexts-after" "foreign kubectl contexts"
echo "Four placeholder workloads are ready in namespace lab-skeletons. A ready pod is not a game service."
