#!/usr/bin/env bash
# Apply synthetic Gateway smoke fixtures after platform install.
# Does not write application routes or delete clusters, volumes, or foreign contexts.
#
# Cleanup (only resources this script owns in lab-edge):
#   kubectl --context kind-offscreen-release -n lab-edge delete httproute lab-edge-routes --ignore-not-found
#   kubectl --context kind-offscreen-release -n lab-edge delete -f infra/verification/smoke/gateway/backends.yaml
#   kubectl --context kind-offscreen-release -n lab-edge delete configmap synthetic-backend --ignore-not-found
# Do not delete: shared Gateway API CRDs, gateway-system/lab-gateway-traefik, or lab-edge Gateway lab-edge.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "setup.sh takes no arguments." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../../clusters/kind/release/lib.sh"
GATEWAY_SMOKE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi

if ! kubectl config get-contexts -o name 2>/dev/null | grep -qx "$CONTEXT_NAME"; then
  echo "Refusing setup: kubectl context ${CONTEXT_NAME} is unreadable or absent." >&2
  exit 1
fi

if ! "${KUBECTL[@]}" -n lab-edge get gateway lab-edge >/dev/null 2>&1; then
  echo "Gateway lab-edge is absent. Run infra/platform/gateway/install.sh first." >&2
  exit 1
fi

if "${KUBECTL[@]}" -n lab-edge get httproute game-edge-routes >/dev/null 2>&1; then
  echo "Refusing setup: HTTPRoute game-edge-routes is present and overlaps the synthetic lab-edge-routes." >&2
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

echo "Synthetic backend: ${PYTHON_IMAGE} ${PYTHON_DIGEST}"
require_digest "$PYTHON_IMAGE" "$PYTHON_DIGEST"

"${KUBECTL[@]}" -n lab-edge create configmap synthetic-backend \
  --from-file=server.py="$GATEWAY_SMOKE_ROOT/backend.py" \
  --dry-run=client -o yaml | "${KUBECTL[@]}" apply -f -
"${KUBECTL[@]}" apply -f "$GATEWAY_SMOKE_ROOT/backends.yaml"
"${KUBECTL[@]}" apply -f "$GATEWAY_SMOKE_ROOT/routes.yaml"

"${KUBECTL[@]}" -n lab-edge wait --for=condition=Available deployment/synthetic-web --timeout=240s
"${KUBECTL[@]}" -n lab-edge wait --for=condition=Available deployment/synthetic-api --timeout=240s

accepted=""
for _ in $(seq 1 30); do
  accepted="$("${KUBECTL[@]}" -n lab-edge get httproute lab-edge-routes -o jsonpath='{.status.parents[0].conditions[?(@.type=="Accepted")].status}' 2>/dev/null || true)"
  if [[ "$accepted" == "True" ]]; then
    break
  fi
  sleep 2
done
echo "HTTPRoute Accepted=${accepted:-absent}"
if [[ "$accepted" != "True" ]]; then
  "${KUBECTL[@]}" -n lab-edge describe httproute lab-edge-routes || true
  "${KUBECTL[@]}" -n gateway-system logs deployment/lab-gateway-traefik --tail=120 || true
  exit 1
fi

echo "Gateway smoke fixtures are ready. Context: ${CONTEXT_NAME}."