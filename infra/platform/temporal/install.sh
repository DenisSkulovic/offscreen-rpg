#!/usr/bin/env bash
# Install a pinned Temporal server with its own PostgreSQL claim on local-path.
# Does not delete the cluster, Docker volumes, or foreign kubectl contexts.
# Does not print Secret values. Does not run a game workflow or smoke.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "install.sh takes no arguments." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../clusters/kind/release/lib.sh"
TEMPORAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

command -v docker >/dev/null
command -v node >/dev/null

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

(
  cd "$TEMPORAL_DIR"
  SERVER_IMAGE="$SERVER_IMAGE" ADMIN_IMAGE="$ADMIN_IMAGE" POSTGRES_IMAGE="$POSTGRES_IMAGE" node --input-type=module -e "
import { verifyReleaseRenderedPins } from './release-install.mjs';
verifyReleaseRenderedPins({
  images: {
    server: process.env.SERVER_IMAGE,
    admin: process.env.ADMIN_IMAGE,
    postgres: process.env.POSTGRES_IMAGE,
  },
});
"
)

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

import_image "$POSTGRES_IMAGE" no
import_image "$SERVER_IMAGE" no
import_image "$ADMIN_IMAGE" no

KUBECTL_JSON="$(node -e 'console.log(JSON.stringify(process.argv.slice(1)))' -- "${KUBECTL[@]}")"
(
  cd "$TEMPORAL_DIR"
  KUBECTL_JSON="$KUBECTL_JSON" node --input-type=module -e "
import { runLiveReleaseInstall } from './release-install.mjs';
const kubectlBase = JSON.parse(process.env.KUBECTL_JSON ?? '[]');
const result = runLiveReleaseInstall(kubectlBase);
if (!result.ok) {
  console.error(JSON.stringify(result.refusals));
  process.exit(1);
}
"
)

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