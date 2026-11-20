#!/usr/bin/env bash
# Apply the TURN02 app release overlay after local image and cluster guards.
# Does not delete Docker volumes, namespaces, or clusters. Does not print Secret values.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "install.sh takes no arguments." >&2
  exit 2
fi

RELEASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OVERLAY_DIR="${RELEASE_DIR}/overlay"
CONTEXT_NAME="kind-offscreen-lab"
CLUSTER_NAME="offscreen-lab"
KUBECTL=(kubectl --context "$CONTEXT_NAME")

WEB_IMAGE="offscreen-lab-game-web:turn02"
API_IMAGE="offscreen-lab-app-release-api:turn02"
GA_IMAGE="offscreen-lab-app-release-ga:turn02"
WORKER_IMAGE="offscreen-lab-app-release-worker:turn02"

if ! kubectl config get-contexts -o name 2>/dev/null | grep -qx "$CONTEXT_NAME"; then
  echo "Refusing install: kubectl context ${CONTEXT_NAME} is absent. Not switching contexts." >&2
  exit 1
fi

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Refusing install: kind cluster ${CLUSTER_NAME} is not running." >&2
  exit 1
fi

for image in "$WEB_IMAGE" "$API_IMAGE" "$GA_IMAGE"; do
  if ! docker image inspect "$image" >/dev/null 2>&1; then
    echo "Refusing install: local image ${image} is missing." >&2
    exit 1
  fi
done

if ! docker image inspect "$WORKER_IMAGE" >/dev/null 2>&1; then
  echo "Refusing install: local image ${WORKER_IMAGE} is missing." >&2
  exit 1
fi

if ! "${KUBECTL[@]}" -n lab-edge get gateway lab-edge >/dev/null 2>&1; then
  echo "Refusing install: Gateway lab-edge is missing in lab-edge." >&2
  exit 1
fi

if ! "${KUBECTL[@]}" -n lab-postgres get secret lab-pg-app >/dev/null 2>&1; then
  echo "Refusing install: Secret lab-pg-app is missing in lab-postgres." >&2
  exit 1
fi

if ! "${KUBECTL[@]}" -n lab-objects get service object-store >/dev/null 2>&1; then
  echo "Refusing install: Service object-store is missing in lab-objects." >&2
  exit 1
fi

if ! "${KUBECTL[@]}" -n lab-temporal get service temporal-server >/dev/null 2>&1; then
  echo "Refusing install: Service temporal-server is missing in lab-temporal." >&2
  exit 1
fi

echo "Applying migration Job ${OVERLAY_DIR}/migrate.yaml and waiting for completion…"
"${KUBECTL[@]}" apply -f "${OVERLAY_DIR}/migrate.yaml"
"${KUBECTL[@]}" -n lab-edge wait --for=condition=complete "job/game-migrate" --timeout=300s

if ! "${KUBECTL[@]}" -n lab-workers get secret game-db >/dev/null 2>&1; then
  if ! "${KUBECTL[@]}" -n lab-edge get secret game-db >/dev/null 2>&1; then
    echo "Refusing install: Secret game-db is missing in lab-edge." >&2
    exit 1
  fi
  echo "Copying Secret game-db into lab-workers for game-relay…"
  "${KUBECTL[@]}" -n lab-edge get secret game-db -o json \
    | python3 -c 'import json,sys; s=json.load(sys.stdin); s["metadata"]={"name":"game-db","namespace":"lab-workers","labels":s.get("metadata",{}).get("labels") or {}}; print(json.dumps(s))' \
    | "${KUBECTL[@]}" apply -f -
fi

if ! "${KUBECTL[@]}" -n lab-workers get secret game-runtime >/dev/null 2>&1; then
  if ! "${KUBECTL[@]}" -n lab-edge get secret game-runtime >/dev/null 2>&1; then
    echo "Refusing install: Secret game-runtime is missing in lab-edge." >&2
    exit 1
  fi
  echo "Copying Secret game-runtime into lab-workers for game-relay document access…"
  "${KUBECTL[@]}" -n lab-edge get secret game-runtime -o json \
    | python3 -c 'import json,sys; s=json.load(sys.stdin); s["metadata"]={"name":"game-runtime","namespace":"lab-workers","labels":s.get("metadata",{}).get("labels") or {}}; print(json.dumps(s))' \
    | "${KUBECTL[@]}" apply -f -
fi

echo "Applying authority, workers, and edge overlays…"
"${KUBECTL[@]}" apply -f "${OVERLAY_DIR}/authority.yaml"
"${KUBECTL[@]}" apply -f "${OVERLAY_DIR}/workers.yaml"
"${KUBECTL[@]}" apply -f "${OVERLAY_DIR}/edge.yaml"

"${KUBECTL[@]}" -n lab-edge rollout status deployment/game-api --timeout=300s
"${KUBECTL[@]}" -n lab-edge rollout status deployment/game-web --timeout=300s
"${KUBECTL[@]}" -n lab-authority rollout status deployment/game-authority --timeout=300s
"${KUBECTL[@]}" -n lab-workers rollout status deployment/game-control --timeout=300s
"${KUBECTL[@]}" -n lab-workers rollout status deployment/game-executor --timeout=300s
"${KUBECTL[@]}" -n lab-workers rollout status deployment/game-relay --timeout=300s

echo "App release overlay applied."