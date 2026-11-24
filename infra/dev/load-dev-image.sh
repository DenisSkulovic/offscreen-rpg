#!/bin/bash
# Tilt custom_build adapter: slot aliases delegate to the slot loader; the legacy
# non-slot lab profile builds once and distributes through the shared Kind loader.
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

if [[ "${OFFSCREEN_DEV_SLOT:-unassigned}" =~ ^dev- ]]; then
  echo "refusing legacy profile ref while slot session is active" >&2
  exit 1
fi

case "${EXPECTED_REF}" in
  offscreen-lab-dev-workspace:dxk08|offscreen-lab-dev-workspace:dxk08-api|offscreen-lab-dev-workspace:dxk08-game-authority|offscreen-lab-dev-workspace:dxk08-worker) ;;
  offscreen-dev-workspace:*)
    echo "refusing malformed slot ref without active slot session" >&2
    exit 1
    ;;
  *)
    echo "refusing ref ${EXPECTED_REF}" >&2
    exit 1
    ;;
esac

fingerprint="$(node --input-type=module -e "
import { fingerprintDevImageContext, UNION_ROLE_FILTER } from './tools/dev-environments/src/image-cache/dev-slot-image-plan.mjs';
const result = fingerprintDevImageContext(process.cwd(), { roleFilter: UNION_ROLE_FILTER });
if (!result.ok) { console.error(result.reason); process.exit(2); }
process.stdout.write(result.fingerprint);
")"
mkdir -p "${TMPDIR:-/tmp}/offscreen-dev-image-locks"
lock="${TMPDIR:-/tmp}/offscreen-dev-image-locks/${fingerprint}.lock"
exec 8>"$lock"
flock 8
ensureDevArtifact "$fingerprint"
canonical="$DEV_CANONICAL_REF"
digest="$DEV_ARTIFACT_DIGEST"
echo "phase=alias-canonical ref=${EXPECTED_REF}" >&2
docker tag "$canonical" "$EXPECTED_REF"
node "$repo/infra/images/distribution/kind-image-loader.mjs" release "$EXPECTED_REF" "$digest"
if [[ -n "${OFFSCREEN_IMAGE_REF_FILE:-}" ]]; then
  write_image_ref_receipt "$OFFSCREEN_IMAGE_REF_FILE" "$EXPECTED_REF"
fi