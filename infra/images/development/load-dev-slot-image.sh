#!/bin/bash
# Build the shared dev image once per fingerprint, then alias one slot role tag.
# A second slot or role waits on the fingerprint lock and must not build again.
set -euo pipefail
repo="$(cd "$(dirname "$0")/../../.." && pwd)"
test -f "$repo/package.json"

tilt_ref_mode=false
slot=""
role=""
cluster="offscreen-dev"

if [[ "${1:-}" == --tilt-ref ]]; then
  tilt_ref_mode=true
  expected_ref="${2:?expected image ref with --tilt-ref}"
  if [[ "${expected_ref}" =~ ^offscreen-lab-dev-workspace: ]]; then
    echo "refusing legacy dev workspace ref ${expected_ref}" >&2
    exit 1
  fi
  if [[ ! "${expected_ref}" =~ ^offscreen-dev-workspace:dev-[1-9][0-9]*-(web|api|authority|worker)$ ]]; then
    slot_env="${OFFSCREEN_DEV_SLOT:-}"
    if [[ ! "$slot_env" =~ ^dev-[1-9][0-9]*$ ]]; then
      echo "refusing ref ${expected_ref} without valid OFFSCREEN_DEV_SLOT" >&2
      exit 1
    fi
    if [[ "${expected_ref}" =~ ^offscreen-dev-workspace: ]]; then
      echo "refusing malformed slot ref ${expected_ref}" >&2
      exit 1
    fi
    echo "refusing ref ${expected_ref}" >&2
    exit 1
  fi
  parsed="${expected_ref#offscreen-dev-workspace:}"
  ref_role="${parsed##*-}"
  ref_slot="${parsed%-${ref_role}}"
  slot_env="${OFFSCREEN_DEV_SLOT:-}"
  if [[ ! "$slot_env" =~ ^dev-[1-9][0-9]*$ ]] || [[ "$ref_slot" != "$slot_env" ]]; then
    echo "refusing slot ref ${expected_ref} for OFFSCREEN_DEV_SLOT=${slot_env:-unset}" >&2
    exit 1
  fi
  receipt_key="$ref_role"
  if [[ "$ref_role" == authority ]]; then
    receipt_key="game-authority"
  fi
  export OFFSCREEN_IMAGE_REF_FILE="$repo/.offscreen/tilt-image-refs/${ref_slot}/${receipt_key}.ref"
  rm -f "$OFFSCREEN_IMAGE_REF_FILE"
  unset OFFSCREEN_IMAGE_FINGERPRINT
  slot="$ref_slot"
  role="$ref_role"
  cluster="offscreen-dev"
else
  slot="${1:?slot}"
  role="${2:?role}"
  cluster="${3:-offscreen-dev}"
  if [[ "$cluster" == @* ]]; then cluster="${4:-offscreen-dev}"; fi
  case "$role" in
    all|web|api|authority|worker) ;;
    *)
      echo "refusing role ${role}" >&2
      exit 1
      ;;
  esac
  if [[ "$cluster" != "offscreen-dev" || ! "$slot" =~ ^dev-[1-9][0-9]*$ ]]; then
    echo "refusing image target ${cluster}/${slot}" >&2
    exit 1
  fi
fi

cd "$repo"
if [[ "$tilt_ref_mode" != true && -n "${OFFSCREEN_IMAGE_REF_FILE:-}" ]]; then
  rm -f "$OFFSCREEN_IMAGE_REF_FILE"
fi
# shellcheck source=/dev/null
source "$repo/infra/images/common/read-toolchain-pin.sh"
read_offscreen_toolchain_pin "$repo"
# shellcheck source=startup-timing.sh
source "$repo/infra/images/development/startup-timing.sh"
# shellcheck source=build.sh
source "$repo/infra/images/development/build.sh"
# Human-only progress bypasses captured machine stdout/stderr in an interactive
# launch. No arbitrary build output or secrets are sent to the terminal.
image_progress() {
  if [[ "${OFFSCREEN_DEV_PROGRESS:-}" == quiet || "$tilt_ref_mode" == true ]]; then return 0; fi
  if [[ -t 3 ]]; then
    if [[ "${OFFSCREEN_DEV_UI:-}" == plain || "${TERM:-}" == dumb ]]; then
      printf '[dev] images / %s\n' "$*" >&3 || true
    elif [[ -v NO_COLOR ]]; then
      printf '     │  %s\n' "$*" >&3 || true
    else
      printf '\033[90m     │  %s\033[0m\n' "$*" >&3 || true
    fi
  fi
}
if [[ "$tilt_ref_mode" != true && "${OFFSCREEN_DEV_PROGRESS:-}" != quiet ]]; then
  { exec 3>/dev/tty; } 2>/dev/null || true
fi
image_progress "checking fingerprint and waiting for image lock"
mkdir -p "${TMPDIR:-/tmp}/offscreen-dev-image-locks"
fingerprint_hint="${OFFSCREEN_IMAGE_FINGERPRINT:-}"
fingerprint_started="$(startup_timing_begin)"
if [[ -n "$fingerprint_hint" ]]; then
  lock="${TMPDIR:-/tmp}/offscreen-dev-image-locks/${fingerprint_hint}.lock"
  exec 9>"$lock"
  flock 9
  fingerprint="$(computeDevImageFingerprint)"
  if [[ "$fingerprint" != "$fingerprint_hint" ]]; then
    echo "refusing stale fingerprint hint: recomputed context differs (retry)" >&2
    exit 1
  fi
  fingerprint_cache="invocation"
else
  recompute_lock="${TMPDIR:-/tmp}/offscreen-dev-image-locks/.recompute.lock"
  exec 8>"$recompute_lock"
  flock 8
  fingerprint="$(computeDevImageFingerprint)"
  flock -u 8
  fingerprint_cache="miss"
  lock="${TMPDIR:-/tmp}/offscreen-dev-image-locks/${fingerprint}.lock"
  exec 9>"$lock"
  flock 9
fi
startup_timing_end fingerprint images "$fingerprint_cache" "$fingerprint_started"
image_progress "fingerprint verified; checking Docker artifact"
ensureDevArtifact "$fingerprint"
canonical="$DEV_CANONICAL_REF"
digest="$DEV_ARTIFACT_DIGEST"
builds="$DEV_ARTIFACT_BUILDS"
image_progress "artifact ready; builds=$builds; checking node images and aliases"
# Exact immutable target equality proves every alias in one inventory per node.
# Any missing/stale/unreadable identity uses the existing full reconciliation.
if [[ "$builds" == 0 ]] && node "$repo/infra/images/development/verify-warm-aliases.mjs" "$slot" "$role" "$canonical" "$digest"; then
  if [[ -n "${OFFSCREEN_IMAGE_REF_FILE:-}" ]]; then
    write_image_ref_receipt "$OFFSCREEN_IMAGE_REF_FILE" "$canonical"
  fi
  image_progress "warm image reuse verified on both nodes"
  echo "builds=0 kindLoads=0 digest=${digest} ref=${canonical} warmAliasProof=hit"
  exit 0
fi
image_progress "reconciling canonical image on Kind nodes"
kind_started="$(startup_timing_begin)"
kind_json="$(node "$repo/infra/images/distribution/kind-image-loader.mjs" dev "$canonical" "$digest")"
startup_timing_end kind-distribution images "" "$kind_started"
image_progress "canonical distribution verified; reconciling slot aliases"
kind_loads="$(node --input-type=module -e "
const receipt = JSON.parse(process.argv[1]);
process.stdout.write(String(receipt.loadedNodes.length));
" "$kind_json")"
alias_started="$(startup_timing_begin)"
node "$repo/infra/images/development/verify-warm-aliases.mjs" --reconcile "$slot" "$role" "$canonical" "$digest"
startup_timing_end alias-reconciliation images "" "$alias_started"
image_progress "all requested aliases verified"
if [[ -n "${OFFSCREEN_IMAGE_REF_FILE:-}" ]]; then
  write_image_ref_receipt "$OFFSCREEN_IMAGE_REF_FILE" "$canonical"
fi
echo "builds=${builds} kindLoads=${kind_loads} digest=${digest} ref=${canonical}"