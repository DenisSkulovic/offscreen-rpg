#!/usr/bin/env bash
# Install pinned Gateway API CRDs, Traefik, and the synthetic lab routes.
# Does not create or delete the kind cluster, Docker volumes, or foreign kubectl contexts.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "install.sh takes no arguments." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../../clusters/kind/release/lib.sh"
GATEWAY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi

TRAEFIK_IMAGE="traefik:v3.7.19"
TRAEFIK_DIGEST="sha256:a6c0194dda77bcb804824580f36fa7edc56e315b1acfe933366c8b52844a78a4"
PYTHON_IMAGE="python:3.12-alpine"
PYTHON_DIGEST="sha256:c5ba3deef00c7758561a0f03c26f44f10589263d40e732b8748e0d1f38f6dd89"
CRD_URL="https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.6.3/standard-install.yaml"
CRD_SHA="356c2b8e286a964dc20995435659ad1095386329974793af10bbfe3eff977fe5"
HELM_CHART_VERSION="42.4.1"

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

echo "MemAvailable KiB: $(awk '/MemAvailable:/ {print $2}' /proc/meminfo)"
echo "kubectl client: $(kubectl version --client=true -o json | python3 -c 'import json,sys; print(json.load(sys.stdin)["clientVersion"]["gitVersion"])')"
echo "helm: $(helm version --short)"
echo "kind: $(kind version)"
echo "Gateway API CRDs: v1.6.3"
echo "Traefik chart: ${HELM_CHART_VERSION} image ${TRAEFIK_IMAGE} ${TRAEFIK_DIGEST}"
echo "Synthetic backend: ${PYTHON_IMAGE} ${PYTHON_DIGEST}"

require_digest "$TRAEFIK_IMAGE" "$TRAEFIK_DIGEST"
require_digest "$PYTHON_IMAGE" "$PYTHON_DIGEST"
# kind load rejects these multi-platform images (ctr: content digest not found).
# The Deployments pin the same digests, and the nodes pull them.

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
curl -fsSL -o "$work/standard-install.yaml" "$CRD_URL"
echo "${CRD_SHA}  $work/standard-install.yaml" | sha256sum -c -
"${KUBECTL[@]}" apply --server-side -f "$work/standard-install.yaml"
"${KUBECTL[@]}" wait --for=condition=Established crd/gatewayclasses.gateway.networking.k8s.io --timeout=180s
"${KUBECTL[@]}" wait --for=condition=Established crd/gateways.gateway.networking.k8s.io --timeout=180s
"${KUBECTL[@]}" wait --for=condition=Established crd/httproutes.gateway.networking.k8s.io --timeout=180s

if ! helm repo list -o json | python3 -c 'import json,sys; raise SystemExit(0 if any(item.get("name")=="traefik" for item in json.load(sys.stdin)) else 1)'; then
  helm repo add traefik https://traefik.github.io/charts
fi
helm repo update traefik
helm upgrade --install lab-gateway traefik/traefik \
  --version "$HELM_CHART_VERSION" \
  --kube-context "$CONTEXT_NAME" \
  --namespace gateway-system \
  --create-namespace \
  --skip-crds \
  --values "$GATEWAY_ROOT/values.yaml" \
  --wait \
  --timeout 240s

"${KUBECTL[@]}" create namespace lab-edge --dry-run=client -o yaml | "${KUBECTL[@]}" apply -f -
"${KUBECTL[@]}" label namespace lab-edge offscreen.rpg/lab=disposable --overwrite >/dev/null
"${KUBECTL[@]}" -n lab-edge create configmap synthetic-backend \
  --from-file=server.py="$GATEWAY_ROOT/backend.py" \
  --dry-run=client -o yaml | "${KUBECTL[@]}" apply -f -
"${KUBECTL[@]}" apply -f "$GATEWAY_ROOT/backends.yaml"
"${KUBECTL[@]}" apply -f "$GATEWAY_ROOT/routes.yaml"

"${KUBECTL[@]}" -n gateway-system wait --for=condition=Available deployment/lab-gateway-traefik --timeout=240s
"${KUBECTL[@]}" -n lab-edge wait --for=condition=Available deployment/synthetic-web --timeout=240s
"${KUBECTL[@]}" -n lab-edge wait --for=condition=Available deployment/synthetic-api --timeout=240s

programmed=""
for _ in $(seq 1 60); do
  programmed="$("${KUBECTL[@]}" -n lab-edge get gateway lab-edge -o jsonpath='{.status.conditions[?(@.type=="Programmed")].status}' 2>/dev/null || true)"
  if [[ "$programmed" == "True" ]]; then
    break
  fi
  sleep 2
done
echo "Gateway Programmed=${programmed:-absent}"
if [[ "$programmed" != "True" ]]; then
  "${KUBECTL[@]}" -n lab-edge describe gateway lab-edge || true
  "${KUBECTL[@]}" -n gateway-system logs deployment/lab-gateway-traefik --tail=120 || true
  exit 1
fi

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

assert_loopback_only
echo "Gateway install is ready. Context: ${CONTEXT_NAME}."
