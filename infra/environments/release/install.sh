#!/usr/bin/env bash
# Apply the TURN02 app release overlay after local image and cluster guards.
# Does not delete Docker volumes, namespaces, or clusters. Does not print Secret values.

set -euo pipefail

# No arguments: clean install of every runtime image and rollout.
# Warm install: OFFSCREEN_RELEASE_IMAGES=worker (comma-separated; web,api,game-authority,worker).
if [[ $# -ne 0 ]]; then
  echo "install.sh takes no arguments. Set OFFSCREEN_RELEASE_IMAGES for a warm subset." >&2
  exit 2
fi

RELEASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${RELEASE_DIR}/../../.." && pwd)"
OPERATION_ENTRYPOINT="${REPO_ROOT}/infra/monitoring/operation-entrypoint.mjs"
OFFSCREEN_SHELL_OPERATION_ID=""
OFFSCREEN_SHELL_OPERATION_NAME=""
RENDER_MJS="${REPO_ROOT}/infra/workloads/render.mjs"
ROLLOUT_MJS="${RELEASE_DIR}/rollout.mjs"
EDGE_ROUTE_YAML="${RELEASE_DIR}/game-edge-route.yaml"
APP_RELEASE_IMAGE_DIR="$(cd "${RELEASE_DIR}/../../images/release" && pwd)"
KIND_IMAGE_LOADER="$(cd "${RELEASE_DIR}/../../images/distribution" && pwd)/kind-image-loader.mjs"
CONTEXT_NAME="kind-offscreen-release"
CLUSTER_NAME="offscreen-release"
KUBECTL=(kubectl --context "$CONTEXT_NAME")

WEB_IMAGE="offscreen-lab-game-web:turn02"
API_IMAGE="offscreen-lab-app-release-api:turn02"
GA_IMAGE="offscreen-lab-app-release-ga:turn02"
WORKER_IMAGE="offscreen-lab-app-release-worker:turn02"

SELECTED="${OFFSCREEN_RELEASE_IMAGES:-web,api,game-authority,worker}"
IFS=',' read -ra SELECTED_IMAGES <<<"$SELECTED"
image_selected() {
  local name="$1"
  local item
  for item in "${SELECTED_IMAGES[@]}"; do
    if [[ "$item" == "$name" ]]; then
      return 0
    fi
  done
  return 1
}
for item in "${SELECTED_IMAGES[@]}"; do
  case "$item" in
    web | api | game-authority | worker) ;;
    *)
      echo "Refusing install: unknown image ${item}." >&2
      exit 2
      ;;
  esac
done

begin_release_install_operation() {
  if [[ "${OFFSCREEN_MONITOR_DISABLED:-}" == "1" ]]; then
    return 0
  fi
  if [[ ! -f "${OPERATION_ENTRYPOINT}" ]]; then
    return 0
  fi
  local line
  while IFS= read -r line; do
  case "$line" in
    OFFSCREEN_SHELL_OPERATION_ID=*)
      OFFSCREEN_SHELL_OPERATION_ID="${line#OFFSCREEN_SHELL_OPERATION_ID=}"
      ;;
    OFFSCREEN_SHELL_OPERATION_NAME=*)
      OFFSCREEN_SHELL_OPERATION_NAME="${line#OFFSCREEN_SHELL_OPERATION_NAME=}"
      ;;
  esac
  done < <(
    OFFSCREEN_REPO_ROOT="${REPO_ROOT}" node "${OPERATION_ENTRYPOINT}" begin release.install 2>/dev/null || true
  )
  if [[ -n "${OFFSCREEN_SHELL_OPERATION_ID}" ]]; then
    export OFFSCREEN_MONITOR_OPERATION_ID="${OFFSCREEN_SHELL_OPERATION_ID}"
  fi
}

finish_release_install_operation() {
  local exit_code="$1"
  if [[ -z "${OFFSCREEN_SHELL_OPERATION_ID}" || -z "${OFFSCREEN_SHELL_OPERATION_NAME}" ]]; then
    return 0
  fi
  if [[ ! -f "${OPERATION_ENTRYPOINT}" ]]; then
    return 0
  fi
  if [[ "${exit_code}" == "2" ]]; then
    export OFFSCREEN_SHELL_OPERATION_REFUSED=1
  else
    unset OFFSCREEN_SHELL_OPERATION_REFUSED
  fi
  OFFSCREEN_REPO_ROOT="${REPO_ROOT}" node "${OPERATION_ENTRYPOINT}" end \
    "${OFFSCREEN_SHELL_OPERATION_NAME}" \
    "${OFFSCREEN_SHELL_OPERATION_ID}" \
    "${exit_code}" >/dev/null 2>&1 || true
}

begin_release_install_operation

if ! kubectl config get-contexts -o name 2>/dev/null | grep -qx "$CONTEXT_NAME"; then
  echo "Refusing install: kubectl context ${CONTEXT_NAME} is absent. Not switching contexts." >&2
  exit 1
fi

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Refusing install: kind cluster ${CLUSTER_NAME} is not running." >&2
  exit 1
fi

require_local_image() {
  local name="$1"
  local image="$2"
  if image_selected "$name" && ! docker image inspect "$image" >/dev/null 2>&1; then
    echo "Refusing install: local image ${image} is missing." >&2
    exit 1
  fi
}
require_local_image web "$WEB_IMAGE"
require_local_image api "$API_IMAGE"
require_local_image game-authority "$GA_IMAGE"
require_local_image worker "$WORKER_IMAGE"

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

RENDER_WORK="$(mktemp -d)"
cleanup_render_work() {
  rm -rf "${RENDER_WORK}"
}
on_release_install_exit() {
  local exit_code="$1"
  finish_release_install_operation "${exit_code}"
  cleanup_render_work
}
trap 'on_release_install_exit $?' EXIT

verify_helm() {
  local short
  if ! short="$(helm version --short 2>/dev/null | head -n1)"; then
    echo "Refusing install: helm is not available." >&2
    exit 1
  fi
  if [[ ! "${short}" =~ ^v[34]\. ]]; then
    echo "Refusing install: unsupported helm version (${short:-unknown})." >&2
    exit 1
  fi
}

render_release_section() {
  local section="$1"
  local outfile="$2"
  if ! node "${RENDER_MJS}" release "${section}" >"${outfile}"; then
    echo "Refusing install: could not render release ${section} manifests." >&2
    exit 1
  fi
}

verify_helm
render_release_section migration "${RENDER_WORK}/migration.yaml"
if image_selected game-authority; then
  render_release_section authority "${RENDER_WORK}/authority.yaml"
fi
if image_selected worker; then
  render_release_section workers "${RENDER_WORK}/workers.yaml"
fi
if image_selected web || image_selected api; then
  render_release_section edge "${RENDER_WORK}/edge.yaml"
fi

LOADER_RECEIPTS_FILE="${RENDER_WORK}/loader-receipts.json"
echo '{}' >"${LOADER_RECEIPTS_FILE}"

echo "Loading selected release images into ${CLUSTER_NAME}…"
API_LOADER_RECEIPT=""
load_image_if_changed() {
  local name="$1"
  local image="$2"
  if ! image_selected "$name"; then
    return 0
  fi
  local receipt
  if ! receipt="$(node "$KIND_IMAGE_LOADER" release "$image")"; then
    echo "Refusing install: could not verify/load ${image} into ${CLUSTER_NAME}." >&2
    exit 1
  fi
  RECEIPT_LINE="$receipt" node --input-type=module -e "
import fs from 'node:fs';
const map = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
map[process.argv[2]] = process.env.RECEIPT_LINE.trim();
fs.writeFileSync(process.argv[1], JSON.stringify(map));
" "${LOADER_RECEIPTS_FILE}" "${name}"
  if [[ "$name" == "api" ]]; then
    API_LOADER_RECEIPT="$receipt"
  fi
}
load_image_if_changed web "$WEB_IMAGE"
load_image_if_changed api "$API_IMAGE"
load_image_if_changed game-authority "$GA_IMAGE"
load_image_if_changed worker "$WORKER_IMAGE"

prepare_release_apply() {
  local section="$1"
  local rendered="$2"
  local apply_out="$3"
  export OFFSCREEN_RELEASE_LOADER_RECEIPTS_FILE="${LOADER_RECEIPTS_FILE}"
  if ! node "${ROLLOUT_MJS}" prepare "${section}" "${rendered}" "${apply_out}"; then
    echo "Refusing install: could not prepare release ${section} apply manifest." >&2
    exit 1
  fi
}

echo "Preparing release Secrets from the lab database, object store, and root .env…"
export OFFSCREEN_REPO_ROOT="${REPO_ROOT}"
if ! node "${RELEASE_DIR}/credentials.mjs"; then
  echo "Refusing install: release credential preparation failed." >&2
  exit 1
fi

# Schema migrations travel with the API image. A worker-only or web-only warm install observes the Job only.
if image_selected api; then
  echo "Reconciling migration Job from rendered manifests and waiting for completion…"
  export OFFSCREEN_MIGRATION_LOADER_RECEIPT="${API_LOADER_RECEIPT}"
  if ! node "${RELEASE_DIR}/migration.mjs" "${RENDER_WORK}/migration.yaml"; then
    echo "Refusing install: release migration reconciliation failed." >&2
    exit 1
  fi
elif image_selected web || image_selected game-authority || image_selected worker; then
  echo "Observing existing migration Job without mutation…"
  if ! node "${RELEASE_DIR}/migration.mjs" "${RENDER_WORK}/migration.yaml"; then
    echo "Refusing install: existing migration Job is not successful." >&2
    exit 1
  fi
fi

if image_selected game-authority; then
  echo "Applying authority overlay…"
  prepare_release_apply authority "${RENDER_WORK}/authority.yaml" "${RENDER_WORK}/authority.apply.yaml"
  "${KUBECTL[@]}" apply -f "${RENDER_WORK}/authority.apply.yaml"
fi
if image_selected worker; then
  echo "Applying workers overlay…"
  prepare_release_apply workers "${RENDER_WORK}/workers.yaml" "${RENDER_WORK}/workers.apply.yaml"
  "${KUBECTL[@]}" apply -f "${RENDER_WORK}/workers.apply.yaml"
fi
if image_selected web || image_selected api; then
  echo "Applying edge overlay and HTTPRoute…"
  prepare_release_apply edge "${RENDER_WORK}/edge.yaml" "${RENDER_WORK}/edge.apply.yaml"
  "${KUBECTL[@]}" apply -f "${RENDER_WORK}/edge.apply.yaml" -f "${EDGE_ROUTE_YAML}"
fi

echo "Verifying selected release rollouts and running pod image identities…"
export OFFSCREEN_RELEASE_LOADER_RECEIPTS_FILE="${LOADER_RECEIPTS_FILE}"
if image_selected web || image_selected api || image_selected game-authority || image_selected worker; then
  if ! node "${ROLLOUT_MJS}" verify; then
    echo "Refusing install: release rollout verification failed." >&2
    exit 1
  fi
fi

echo "App release overlay applied."