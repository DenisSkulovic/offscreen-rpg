#!/bin/bash
# Tilt custom_build adapter: slot aliases delegate to the slot loader only.
set -euo pipefail
EXPECTED_REF="${1:?expected image ref}"
repo="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$repo"
if [[ -n "${OFFSCREEN_IMAGE_REF_FILE:-}" ]]; then
  rm -f "$OFFSCREEN_IMAGE_REF_FILE"
  mkdir -p "$(dirname "$OFFSCREEN_IMAGE_REF_FILE")"
fi
# shellcheck source=/dev/null
source "$repo/infra/images/common/read-toolchain-pin.sh"
read_offscreen_toolchain_pin "$repo"
# shellcheck source=../images/development/startup-timing.sh
source "$repo/infra/images/development/startup-timing.sh"
# shellcheck source=../images/development/build.sh
source "$repo/infra/images/development/build.sh"
DEV_IGNORE="${repo}/infra/images/development/Dockerfile.dockerignore"
test -f "$DEV_IGNORE"

if [[ "${EXPECTED_REF}" =~ ^offscreen-lab-dev-workspace: ]]; then
  echo "refusing legacy dev workspace ref ${EXPECTED_REF}" >&2
  exit 1
fi

if [[ "${EXPECTED_REF}" =~ ^offscreen-dev-workspace:dev-[1-9][0-9]*-(web|api|authority|worker)$ ]]; then
  parsed="${EXPECTED_REF#offscreen-dev-workspace:}"
  ref_role="${parsed##*-}"
  ref_slot="${parsed%-${ref_role}}"
  slot_env="${OFFSCREEN_DEV_SLOT:-}"
  if [[ ! "$slot_env" =~ ^dev-[1-9][0-9]*$ ]] || [[ "$ref_slot" != "$slot_env" ]]; then
    echo "refusing slot ref ${EXPECTED_REF} for OFFSCREEN_DEV_SLOT=${slot_env:-unset}" >&2
    exit 1
  fi
  exec env -u OFFSCREEN_IMAGE_FINGERPRINT bash "$repo/infra/images/development/load-dev-slot-image.sh" \
    "$ref_slot" "$ref_role"
fi

slot_env="${OFFSCREEN_DEV_SLOT:-}"
if [[ ! "$slot_env" =~ ^dev-[1-9][0-9]*$ ]]; then
  echo "refusing ref ${EXPECTED_REF} without valid OFFSCREEN_DEV_SLOT" >&2
  exit 1
fi

if [[ "${EXPECTED_REF}" =~ ^offscreen-dev-workspace: ]]; then
  echo "refusing malformed slot ref ${EXPECTED_REF}" >&2
  exit 1
fi

echo "refusing ref ${EXPECTED_REF}" >&2
exit 1