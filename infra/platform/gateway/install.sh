#!/usr/bin/env bash
# Install pinned Gateway API CRDs, Traefik, and the lab-edge Gateway.
# Does not create or delete the kind cluster, Docker volumes, or foreign kubectl contexts.
# Synthetic smoke fixtures live in infra/verification/smoke/gateway/setup.sh.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "install.sh takes no arguments." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../clusters/kind/release/lib.sh"
GATEWAY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi

if ! kubectl config get-contexts -o name 2>/dev/null | grep -qx "$CONTEXT_NAME"; then
  echo "Refusing install: kubectl context ${CONTEXT_NAME} is unreadable or absent." >&2
  exit 1
fi

TRAEFIK_IMAGE="traefik:v3.7.19"
TRAEFIK_DIGEST="sha256:a6c0194dda77bcb804824580f36fa7edc56e315b1acfe933366c8b52844a78a4"
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

require_digest "$TRAEFIK_IMAGE" "$TRAEFIK_DIGEST"
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
"${KUBECTL[@]}" apply -f "$GATEWAY_ROOT/gateway.yaml"

"${KUBECTL[@]}" -n gateway-system wait --for=condition=Available deployment/lab-gateway-traefik --timeout=240s

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

assert_loopback_only
echo "Gateway install is ready. Context: ${CONTEXT_NAME}."