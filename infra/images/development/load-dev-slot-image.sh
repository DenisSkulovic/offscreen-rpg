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
kind_node_identity() {
  local node="$1"
  local ref="$2"
  node "$repo/infra/images/distribution/kind-image-loader.mjs" inspect dev "$ref" "$node"
}
roles=(web api authority worker)
if [[ "$role" != "all" ]]; then roles=("$role"); fi
for alias_role in "${roles[@]}"; do
  image_progress "verifying aliases for $alias_role"
  ref="offscreen-dev-workspace:${slot}-${alias_role}"
  docker tag "$canonical" "$ref"
  canonical_cp="$(kind_node_identity "${cluster}-control-plane" "$canonical")"
  canonical_worker="$(kind_node_identity "${cluster}-worker" "$canonical")"
  for node_role in control-plane worker; do
    node="${cluster}-${node_role}"
  if [[ "$node_role" == control-plane ]]; then
    canonical_identity="$canonical_cp"
  else
    canonical_identity="$canonical_worker"
  fi
  alias_identity="$(kind_node_identity "$node" "$ref")"
  node_decision="$(node --input-type=module -e '
import { aliasNodeIdentityMatchesCanonical } from "./infra/images/development/image-plan.mjs";
const [expected, aliasJson, canonicalJson] = process.argv.slice(1);
const alias = aliasJson === "null" ? null : JSON.parse(aliasJson);
const canonical = canonicalJson === "null" ? null : JSON.parse(canonicalJson);
const matches = aliasNodeIdentityMatchesCanonical({
  expectedConfigId: expected,
  alias: alias
    ? {
        ...alias,
        canonicalTargetDigest: canonical?.targetDigest ?? null,
      }
    : null,
});
process.stdout.write(matches ? "hit" : "miss");
' "$digest" "$alias_identity" "$canonical_identity")"
    if [[ "$node_decision" == hit ]]; then
      echo "phase=ctr-tag role=${alias_role} node=${node} result=hit" >&2
      continue
    fi
    echo "phase=ctr-tag role=${alias_role} node=${node} result=miss" >&2
    tag_started="$(startup_timing_begin)"
    if [[ "$alias_identity" != null ]]; then
      docker exec "$node" ctr -n k8s.io images rm "docker.io/library/${ref}" 2>/dev/null || true
    fi
    docker exec "$node" ctr -n k8s.io images tag \
      "docker.io/library/${canonical}" \
      "docker.io/library/${ref}"
    startup_timing_end "ctr-tag-${alias_role}-${node_role}" images miss "$tag_started"
  done
  alias_cp="$(kind_node_identity "${cluster}-control-plane" "$ref")"
  alias_worker="$(kind_node_identity "${cluster}-worker" "$ref")"
  node --input-type=module -e '
import { confirmLoadedAliasIdentity } from "./infra/images/development/image-plan.mjs";
const [expected, aliasCp, aliasWorker, canonicalCp, canonicalWorker] = process.argv.slice(1);
const parse = (text) => (text === "null" ? null : JSON.parse(text));
const withCanonical = (alias, canonical) =>
  alias
    ? {
        ...alias,
        canonicalTargetDigest: canonical?.targetDigest ?? null,
      }
    : null;
const result = confirmLoadedAliasIdentity({
  expectedConfigId: expected,
  nodes: {
    "control-plane": withCanonical(parse(aliasCp), parse(canonicalCp)),
    worker: withCanonical(parse(aliasWorker), parse(canonicalWorker)),
  },
});
if (!result.ok) {
  console.error(`post-load-mismatch nodes=${result.nodes.join(",")}`);
  process.exit(1);
}
' "$digest" "$alias_cp" "$alias_worker" "$canonical_cp" "$canonical_worker"
done
image_progress "all requested aliases verified"
if [[ -n "${OFFSCREEN_IMAGE_REF_FILE:-}" ]]; then
  write_image_ref_receipt "$OFFSCREEN_IMAGE_REF_FILE" "$canonical"
fi
echo "builds=${builds} kindLoads=${kind_loads} digest=${digest} ref=${canonical}"