#!/usr/bin/env bash
# Install a pinned Temporal server with its own PostgreSQL claim on local-path.
# Does not delete the cluster, Docker volumes, or foreign kubectl contexts.
# Does not print Secret values. Does not run a game workflow.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "install.sh takes no arguments." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../clusters/kind/release/lib.sh"
TEMPORAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPORAL_WORKER_DIR="$TEMPORAL_DIR/../../verification/smoke/temporal/worker"

command -v docker >/dev/null
command -v openssl >/dev/null

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi

pin="$TEMPORAL_DIR/images.pin"
read_pin() {
  local key="$1"
  local value
  value="$(awk -F= -v key="$key" '$1 == key { print substr($0, index($0, "=") + 1) }' "$pin")"
  if [[ -z "$value" ]]; then
    echo "images.pin is missing ${key}." >&2
    exit 1
  fi
  printf '%s' "$value"
}

SERVER_IMAGE="$(read_pin SERVER_IMAGE)"
SERVER_DIGEST="$(read_pin SERVER_DIGEST)"
ADMIN_IMAGE="$(read_pin ADMIN_IMAGE)"
ADMIN_DIGEST="$(read_pin ADMIN_DIGEST)"
POSTGRES_IMAGE="$(read_pin POSTGRES_IMAGE)"
POSTGRES_DIGEST="$(read_pin POSTGRES_DIGEST)"
WORKER_IMAGE="$(read_pin WORKER_IMAGE)"

if ! grep -q "image: ${SERVER_IMAGE}" "$TEMPORAL_DIR/server.yaml"; then
  echo "server.yaml image does not match images.pin." >&2
  exit 1
fi
if ! grep -q "image: ${ADMIN_IMAGE}" "$TEMPORAL_DIR/admin.yaml"; then
  echo "admin.yaml image does not match images.pin." >&2
  exit 1
fi
if ! grep -q "image: ${POSTGRES_IMAGE}" "$TEMPORAL_DIR/postgres.yaml"; then
  echo "postgres.yaml image does not match images.pin." >&2
  exit 1
fi
if ! grep -q 'storageClassName: local-path' "$TEMPORAL_DIR/postgres.yaml"; then
  echo "postgres.yaml must request local-path." >&2
  exit 1
fi
if grep -R -n 'start-dev' "$TEMPORAL_DIR" --include='*.yaml' --include='*.mjs' --include='*.pin' >/dev/null; then
  echo "Refusing to install: a lab manifest names start-dev." >&2
  exit 1
fi

assert_digest() {
  local ref="$1"
  local digest="$2"
  local actual
  actual="$(docker image inspect "$ref" --format '{{index .RepoDigests 0}}' 2>/dev/null || true)"
  case "$actual" in
    *"@${digest}") ;;
    *)
      echo "Image ${ref} digest is ${actual:-absent}, expected ${digest}." >&2
      exit 1
      ;;
  esac
}

assert_digest "$SERVER_IMAGE" "$SERVER_DIGEST"
assert_digest "$ADMIN_IMAGE" "$ADMIN_DIGEST"
assert_digest "$POSTGRES_IMAGE" "$POSTGRES_DIGEST"

require_memory

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
volume_guard_begin "$work"

import_image() {
  local image_ref="$1"
  local required="$2"
  if ! docker image inspect "$image_ref" >/dev/null 2>&1; then
    if [[ "$required" == "yes" ]]; then
      echo "Local image ${image_ref} is absent." >&2
      exit 1
    fi
    echo "Local image ${image_ref} is absent. The nodes will pull it."
    return 0
  fi
  local node
  while read -r node; do
    [[ -z "$node" ]] && continue
    echo "Importing ${image_ref} into ${node}"
    if ! docker save "$image_ref" | docker exec -i "$node" ctr --namespace=k8s.io images import -; then
      if [[ "$required" == "yes" ]]; then
        echo "Import of ${image_ref} into ${node} failed." >&2
        exit 1
      fi
      echo "Import into ${node} failed. The kubelet may still pull ${image_ref}."
    fi
  done < <(kind get nodes --name "$CLUSTER_NAME")
}

if ! docker image inspect "$WORKER_IMAGE" >/dev/null 2>&1; then
  echo "Building ${WORKER_IMAGE}"
  docker build -t "$WORKER_IMAGE" "$TEMPORAL_WORKER_DIR"
fi

import_image "$POSTGRES_IMAGE" no
import_image "$SERVER_IMAGE" no
import_image "$ADMIN_IMAGE" no
import_image "$WORKER_IMAGE" yes

"${KUBECTL[@]}" apply -f "$TEMPORAL_DIR/namespace.yaml"

password="$(openssl rand -hex 24)"
if [[ ! "$password" =~ ^[0-9a-f]{48}$ ]]; then
  echo "Generated password was not 48 hex characters." >&2
  exit 1
fi
passfile="$(mktemp)"
chmod 600 "$passfile"
printf '%s' "$password" >"$passfile"
if grep -R -F -f "$passfile" "$TEMPORAL_DIR" >/dev/null; then
  rm -f "$passfile"
  unset password
  echo "Refusing to continue: the generated password was written under the lab tree." >&2
  exit 1
fi
rm -f "$passfile"

"${KUBECTL[@]}" -n lab-temporal create secret generic temporal-db \
  --from-literal=password="$password" \
  --dry-run=client -o yaml | "${KUBECTL[@]}" apply -f -
unset password

"${KUBECTL[@]}" apply -f "$TEMPORAL_DIR/postgres.yaml"
if ! "${KUBECTL[@]}" -n lab-temporal rollout status deployment/temporal-postgres --timeout=300s; then
  echo "PostgreSQL did not become ready." >&2
  "${KUBECTL[@]}" -n lab-temporal get pods -o wide >&2 || true
  "${KUBECTL[@]}" -n lab-temporal describe pod -l app=temporal-postgres >&2 || true
  "${KUBECTL[@]}" -n lab-temporal logs -l app=temporal-postgres --tail=80 >&2 || true
  exit 1
fi

"${KUBECTL[@]}" -n lab-temporal delete job temporal-schema --ignore-not-found >/dev/null
"${KUBECTL[@]}" apply -f "$TEMPORAL_DIR/schema-job.yaml"
if ! "${KUBECTL[@]}" -n lab-temporal wait --for=condition=complete job/temporal-schema --timeout=240s; then
  echo "Temporal schema job did not complete." >&2
  "${KUBECTL[@]}" -n lab-temporal logs job/temporal-schema --tail=80 >&2 || true
  exit 1
fi

"${KUBECTL[@]}" apply -f "$TEMPORAL_DIR/server.yaml"
"${KUBECTL[@]}" apply -f "$TEMPORAL_DIR/admin.yaml"
if ! "${KUBECTL[@]}" -n lab-temporal rollout status deployment/temporal-server --timeout=300s; then
  echo "Temporal server did not become ready." >&2
  "${KUBECTL[@]}" -n lab-temporal get pods -o wide >&2 || true
  "${KUBECTL[@]}" -n lab-temporal describe deploy/temporal-server >&2 || true
  exit 1
fi
"${KUBECTL[@]}" -n lab-temporal rollout status deployment/temporal-admin --timeout=180s

"${KUBECTL[@]}" -n lab-temporal delete job temporal-namespace --ignore-not-found >/dev/null
"${KUBECTL[@]}" apply -f "$TEMPORAL_DIR/namespace-job.yaml"
if ! "${KUBECTL[@]}" -n lab-temporal wait --for=condition=complete job/temporal-namespace --timeout=240s; then
  echo "Temporal namespace job did not complete." >&2
  "${KUBECTL[@]}" -n lab-temporal logs job/temporal-namespace --tail=80 >&2 || true
  exit 1
fi

cmdline="$("${KUBECTL[@]}" -n lab-temporal exec deploy/temporal-server -- sh -c 'tr "\0" " " < /proc/1/cmdline')"
echo "Server command: ${cmdline}"
case "$cmdline" in
  *temporal-server*\ start*) ;;
  *)
    echo "Server process is not temporal-server start." >&2
    exit 1
    ;;
esac
if [[ "$cmdline" == *start-dev* ]]; then
  echo "Server process is the development server." >&2
  exit 1
fi
if [[ "$cmdline" != *--allow-no-auth* ]]; then
  echo "Server process is missing --allow-no-auth." >&2
  exit 1
fi

health="$("${KUBECTL[@]}" -n lab-temporal exec deploy/temporal-admin -- temporal operator cluster health)"
echo "Cluster health: ${health}"
if [[ "$health" != *SERVING* ]]; then
  echo "Temporal cluster health is not SERVING." >&2
  exit 1
fi

server_version="$("${KUBECTL[@]}" -n lab-temporal exec deploy/temporal-server -- temporal-server --version)"
admin_version="$("${KUBECTL[@]}" -n lab-temporal exec deploy/temporal-admin -- temporal --version)"
postgres_version="$("${KUBECTL[@]}" -n lab-temporal exec deploy/temporal-postgres -- postgres --version)"
echo "Server version: ${server_version}"
echo "Admin version: ${admin_version}"
echo "Postgres version: ${postgres_version}"

claim_class="$("${KUBECTL[@]}" -n lab-temporal get pvc temporal-postgres -o jsonpath='{.spec.storageClassName}')"
claim_phase="$("${KUBECTL[@]}" -n lab-temporal get pvc temporal-postgres -o jsonpath='{.status.phase}')"
echo "PVC class: ${claim_class}"
echo "PVC phase: ${claim_phase}"
if [[ "$claim_class" != "local-path" || "$claim_phase" != "Bound" ]]; then
  echo "Temporal persistence claim is not a Bound local-path volume." >&2
  exit 1
fi

server_svc="$("${KUBECTL[@]}" -n lab-temporal get svc temporal-server -o jsonpath='{.spec.type}')"
postgres_svc="$("${KUBECTL[@]}" -n lab-temporal get svc temporal-postgres -o jsonpath='{.spec.type}')"
echo "Server service: ${server_svc}"
echo "Postgres service: ${postgres_svc}"
if [[ "$server_svc" != "ClusterIP" || "$postgres_svc" != "ClusterIP" ]]; then
  echo "A Temporal service is not ClusterIP." >&2
  exit 1
fi

assert_loopback_only
volume_guard_end "$work"

echo "Temporal server ${server_version} is ready."
echo "Persistence claim temporal-postgres is Bound on local-path."
echo "This is a disposable lab server, not the Compose development server, and not a production cluster."
