#!/usr/bin/env bash
# Install the pinned lab OpenTelemetry collector. Renders the platform chart before apply.
# Does not create or delete the kind cluster, Docker volumes, or foreign kubectl contexts.
# Synthetic smoke hops live in infra/verification/smoke/observability/setup.sh.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "install.sh takes no arguments." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../clusters/kind/release/lib.sh"
OBS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMON_CLI="$OBS_DIR/../common/cli.mjs"
COLLECTOR_CONFIG="$OBS_DIR/chart/files/collector-config.yaml"

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi

if ! kubectl config get-contexts -o name 2>/dev/null | grep -qx "$CONTEXT_NAME"; then
  echo "Refusing install: kubectl context ${CONTEXT_NAME} is unreadable or absent." >&2
  exit 1
fi

COLLECTOR_IMAGE="otel/opentelemetry-collector:0.165.0"
COLLECTOR_DIGEST="sha256:34b24b740c3c88d3467740e8642a397c13898ef76d7295c5425164c482ed1b73"

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

echo "MemAvailable KiB: $(awk '/MemAvailable:/ {print $2}' /proc/meminfo)"
echo "kubectl client: $(kubectl version --client=true -o json | python3 -c 'import json,sys; print(json.load(sys.stdin)["clientVersion"]["gitVersion"])')"
echo "kind: $(kind version)"
echo "otelcol: $(docker run --rm --entrypoint /otelcol "$COLLECTOR_IMAGE" --version)"
echo "Collector image: ${COLLECTOR_IMAGE} ${COLLECTOR_DIGEST}"

require_digest "$COLLECTOR_IMAGE" "$COLLECTOR_DIGEST"

if grep -REi 'password:|api[_-]?key|bearer |player-id|player_id' \
  "$COLLECTOR_CONFIG" "$OBS_DIR"/chart/templates/*.yaml >/dev/null; then
  echo "Refusing to install: observability files contain secret or player-id material." >&2
  exit 1
fi

import_image "$COLLECTOR_IMAGE"

rendered="$(mktemp)"
trap 'rm -f "$rendered"' EXIT

node "$COMMON_CLI" target release
node "$COMMON_CLI" render observability release all >"$rendered"
"${KUBECTL[@]}" apply -f "$rendered"

if ! "${KUBECTL[@]}" -n lab-a rollout status deployment/otel-collector --timeout=240s; then
  echo "Collector did not become ready." >&2
  "${KUBECTL[@]}" -n lab-a describe deployment/otel-collector || true
  "${KUBECTL[@]}" -n lab-a get pods -l app=otel-collector -o wide || true
  "${KUBECTL[@]}" -n lab-a logs deployment/otel-collector --tail=120 || true
  exit 1
fi

collector_type="$("${KUBECTL[@]}" -n lab-a get svc otel-collector -o jsonpath='{.spec.type}')"
echo "Service type: otel-collector=${collector_type}"
if [[ "$collector_type" != "ClusterIP" ]]; then
  echo "An observability Service is not ClusterIP." >&2
  exit 1
fi

image_id="$("${KUBECTL[@]}" -n lab-a get pod -l app=otel-collector -o jsonpath='{.items[0].status.containerStatuses[0].imageID}')"
echo "Collector imageID: ${image_id}"
if [[ "$image_id" != *"${COLLECTOR_DIGEST}"* && "$image_id" != *"sha256:34b24b740c3c88d3467740e8642a397c13898ef76d7295c5425164c482ed1b73"* ]]; then
  echo "Running collector image does not match the pinned digest." >&2
  echo "imageID=${image_id}" >&2
  exit 1
fi

assert_loopback_only
echo "Observability install is ready. Context: ${CONTEXT_NAME}."