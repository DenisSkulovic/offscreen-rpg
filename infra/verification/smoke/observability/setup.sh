#!/usr/bin/env bash
# Apply synthetic observability hops after platform collector install.
# Does not install the game, mutate foreign contexts, or change app instrumentation.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "setup.sh takes no arguments." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../../clusters/kind/release/lib.sh"
VERIFICATION_OBS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../fixtures/probes/ensure-namespaces.sh"

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi

if ! kubectl config get-contexts -o name 2>/dev/null | grep -qx "$CONTEXT_NAME"; then
  echo "Refusing setup: kubectl context ${CONTEXT_NAME} is unreadable or absent." >&2
  exit 1
fi

if ! "${KUBECTL[@]}" -n lab-a get deployment otel-collector >/dev/null 2>&1; then
  echo "Collector otel-collector is absent. Run infra/platform/observability/install.sh first." >&2
  exit 1
fi

PYTHON_IMAGE="python:3.12-alpine"
PYTHON_DIGEST="sha256:c5ba3deef00c7758561a0f03c26f44f10589263d40e732b8748e0d1f38f6dd89"

require_digest() {
  local image="$1"
  local digest="$2"
  local actual
  actual="$(docker image inspect "$image" --format '{{range .RepoDigests}}{{.}}{{"\n"}}{{end}}')"
  if ! printf '%s\n' "$actual" | grep -q "$digest"; then
    echo "Refusing to install: ${image} is not ${digest}." >&2
    printf '%s\n' "$actual" >&2
    exit 1
  fi
}

import_image() {
  local image="$1"
  local node
  while read -r node; do
    [[ -z "$node" ]] && continue
    echo "Importing ${image} into ${node}"
    if ! docker save "$image" | docker exec -i "$node" ctr --namespace=k8s.io images import -; then
      echo "Import into ${node} failed. The kubelet may still pull ${image}."
    fi
  done < <(kind get nodes --name "$CLUSTER_NAME")
}

echo "Synthetic hop image: ${PYTHON_IMAGE} ${PYTHON_DIGEST}"

require_digest "$PYTHON_IMAGE" "$PYTHON_DIGEST"

if grep -REi 'password:|api[_-]?key|bearer |player-id|player_id' \
  "$VERIFICATION_OBS_ROOT"/hop.py "$VERIFICATION_OBS_ROOT"/hops.yaml >/dev/null; then
  echo "Refusing setup: observability smoke files contain secret or player-id material." >&2
  exit 1
fi

import_image "$PYTHON_IMAGE"

ensure_probe_namespaces

"${KUBECTL[@]}" -n lab-a create configmap synthetic-hop \
  --from-file=hop.py="$VERIFICATION_OBS_ROOT/hop.py" \
  --dry-run=client -o yaml | "${KUBECTL[@]}" apply -f -
"${KUBECTL[@]}" apply -f "$VERIFICATION_OBS_ROOT/hops.yaml"

"${KUBECTL[@]}" -n lab-a rollout status deployment/hop-a --timeout=240s
"${KUBECTL[@]}" -n lab-a rollout status deployment/hop-b --timeout=240s

hop_a_type="$("${KUBECTL[@]}" -n lab-a get svc hop-a -o jsonpath='{.spec.type}')"
hop_b_type="$("${KUBECTL[@]}" -n lab-a get svc hop-b -o jsonpath='{.spec.type}')"
echo "Service types: hop-a=${hop_a_type} hop-b=${hop_b_type}"
if [[ "$hop_a_type" != "ClusterIP" || "$hop_b_type" != "ClusterIP" ]]; then
  echo "An observability hop Service is not ClusterIP." >&2
  exit 1
fi

echo "Observability smoke fixtures are ready. Context: ${CONTEXT_NAME}."