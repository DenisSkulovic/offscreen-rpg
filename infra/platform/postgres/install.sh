#!/usr/bin/env bash
# Install pinned CloudNativePG 1.30.2 and one primary in lab-postgres.
# Does not delete the cluster, Docker volumes, or foreign kubectl contexts.
# Does not print Secret values.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "install.sh takes no arguments." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../clusters/kind/release/lib.sh"
POSTGRES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

command -v curl >/dev/null
command -v sha256sum >/dev/null

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi

pin="$POSTGRES_DIR/operator.pin"
read_pin() {
  local key="$1"
  local value
  value="$(awk -F= -v key="$key" '$1 == key { print substr($0, index($0, "=") + 1) }' "$pin")"
  if [[ -z "$value" ]]; then
    echo "operator.pin is missing ${key}." >&2
    exit 1
  fi
  printf '%s' "$value"
}

CNPG_VERSION="$(read_pin CNPG_VERSION)"
CNPG_URL="$(read_pin CNPG_URL)"
CNPG_SHA256="$(read_pin CNPG_SHA256)"
CNPG_IMAGE="$(read_pin CNPG_IMAGE)"
POSTGRES_IMAGE="$(read_pin POSTGRES_IMAGE)"

if [[ ! "$CNPG_SHA256" =~ ^[0-9a-f]{64}$ ]]; then
  echo "operator.pin sha256 is not 64 hex characters." >&2
  exit 1
fi
if ! grep -q "imageName: ${POSTGRES_IMAGE}" "$POSTGRES_DIR/cluster.yaml"; then
  echo "cluster.yaml imageName does not match operator.pin." >&2
  exit 1
fi
if ! grep -q 'instances: 1' "$POSTGRES_DIR/cluster.yaml"; then
  echo "cluster.yaml must request one instance." >&2
  exit 1
fi

require_memory

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
volume_guard_begin "$work"

curl -fsSL --retry 3 --retry-delay 2 -o "$work/cnpg.yaml" "$CNPG_URL"
echo "${CNPG_SHA256}  $work/cnpg.yaml" | sha256sum -c -
if ! grep -q "image: ${CNPG_IMAGE}" "$work/cnpg.yaml"; then
  echo "Downloaded operator manifest does not contain ${CNPG_IMAGE}." >&2
  exit 1
fi

"${KUBECTL[@]}" apply --server-side --field-manager=offscreen-lab-cnpg -f "$work/cnpg.yaml"
"${KUBECTL[@]}" wait --for=condition=Established "crd/clusters.postgresql.cnpg.io" --timeout=180s
"${KUBECTL[@]}" -n cnpg-system rollout status deployment/cnpg-controller-manager --timeout=240s

webhook_ready=0
for _ in $(seq 1 60); do
  if [[ -n "$("${KUBECTL[@]}" -n cnpg-system get endpoints cnpg-webhook-service -o jsonpath='{.subsets[0].addresses[0].ip}' 2>/dev/null || true)" ]]; then
    webhook_ready=1
    break
  fi
  sleep 2
done
if [[ "$webhook_ready" -ne 1 ]]; then
  echo "CloudNativePG webhook has no endpoint." >&2
  exit 1
fi

"${KUBECTL[@]}" apply -f "$POSTGRES_DIR/namespace.yaml"

applied=0
for _ in $(seq 1 12); do
  if "${KUBECTL[@]}" apply -f "$POSTGRES_DIR/cluster.yaml"; then
    applied=1
    break
  fi
  sleep 5
done
if [[ "$applied" -ne 1 ]]; then
  echo "CloudNativePG cluster manifest was not accepted." >&2
  exit 1
fi

deadline=$((SECONDS + 600))
phase=""
ready=""
while (( SECONDS < deadline )); do
  phase="$("${KUBECTL[@]}" -n lab-postgres get cluster lab-pg -o jsonpath='{.status.phase}' 2>/dev/null || true)"
  ready="$("${KUBECTL[@]}" -n lab-postgres get cluster lab-pg -o jsonpath='{range .status.conditions[?(@.type=="Ready")]}{.status}{end}' 2>/dev/null || true)"
  if [[ "$phase" == "Cluster in healthy state" && "$ready" == "True" ]]; then
    break
  fi
  sleep 5
done
if [[ "$phase" != "Cluster in healthy state" || "$ready" != "True" ]]; then
  echo "CloudNativePG cluster lab-pg did not become ready. phase=${phase:-unknown} ready=${ready:-unknown}" >&2
  "${KUBECTL[@]}" -n lab-postgres get pods -o wide >&2 || true
  "${KUBECTL[@]}" -n cnpg-system logs deployment/cnpg-controller-manager --tail=80 >&2 || true
  exit 1
fi

instances="$("${KUBECTL[@]}" -n lab-postgres get cluster lab-pg -o jsonpath='{.spec.instances}')"
if [[ "$instances" != "1" ]]; then
  echo "Refusing to continue: lab-pg instances is ${instances}, expected 1." >&2
  exit 1
fi

assert_loopback_only
volume_guard_end "$work"

echo "CloudNativePG ${CNPG_VERSION} is ready."
echo "Operator image: ${CNPG_IMAGE}"
echo "Postgres image: ${POSTGRES_IMAGE}"
echo "Instances: ${instances}"
echo "Phase: ${phase}"
"${KUBECTL[@]}" -n lab-postgres get pvc -o custom-columns=NAME:.metadata.name,CLASS:.spec.storageClassName,STATUS:.status.phase --no-headers
