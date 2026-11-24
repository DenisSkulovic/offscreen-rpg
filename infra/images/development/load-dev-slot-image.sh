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
mkdir -p "${TMPDIR:-/tmp}/offscreen-dev-image-locks"
fingerprint_started="$(startup_timing_begin)"
if [[ -n "${OFFSCREEN_IMAGE_FINGERPRINT:-}" ]]; then
  fingerprint="$OFFSCREEN_IMAGE_FINGERPRINT"
  fingerprint_cache="invocation"
else
  fingerprint="$(node --input-type=module -e "
import { fingerprintDevImageContext, UNION_ROLE_FILTER } from './tools/dev-environments/src/image-cache/dev-slot-image-plan.mjs';
const result = fingerprintDevImageContext(process.cwd(), { roleFilter: UNION_ROLE_FILTER });
if (!result.ok) { console.error(result.reason); process.exit(2); }
process.stdout.write(result.fingerprint);
")"
  fingerprint_cache="miss"
fi
startup_timing_end fingerprint images "$fingerprint_cache" "$fingerprint_started"
lock="${TMPDIR:-/tmp}/offscreen-dev-image-locks/${fingerprint}.lock"
exec 9>"$lock"
flock 9
ensureDevArtifact "$fingerprint"
canonical="$DEV_CANONICAL_REF"
digest="$DEV_ARTIFACT_DIGEST"
builds="$DEV_ARTIFACT_BUILDS"
kind_json="$(node "$repo/infra/images/distribution/kind-image-loader.mjs" dev "$canonical" "$digest")"
kind_loads="$(node --input-type=module -e "
const receipt = JSON.parse(process.argv[1]);
process.stdout.write(String(receipt.loadedNodes.length));
" "$kind_json")"
alias_index_digest() {
  local node="$1"
  local ref="$2"
  docker exec "$node" ctr -n k8s.io images ls 2>/dev/null \
    | awk -v ref="docker.io/library/${ref}" '$1 == ref { print $3; exit }' \
    || true
}
roles=(web api authority worker)
if [[ "$role" != "all" ]]; then roles=("$role"); fi
for alias_role in "${roles[@]}"; do
  ref="offscreen-dev-workspace:${slot}-${alias_role}"
  docker tag "$canonical" "$ref"
  for node_role in control-plane worker; do
    node="${cluster}-${node_role}"
    current="$(alias_index_digest "$node" "$ref")"
    if [[ "$current" == "$digest" ]]; then
      echo "phase=ctr-tag role=${alias_role} node=${node} result=hit" >&2
      continue
    fi
    echo "phase=ctr-tag role=${alias_role} node=${node} result=miss" >&2
    tag_started="$(startup_timing_begin)"
    if [[ -n "$current" ]]; then
      docker exec "$node" ctr -n k8s.io images rm "docker.io/library/${ref}"
    fi
    docker exec "$node" ctr -n k8s.io images tag \
      "docker.io/library/${canonical}" \
      "docker.io/library/${ref}"
    startup_timing_end "ctr-tag-${alias_role}-${node_role}" images miss "$tag_started"
  done
  node --input-type=module -e '
import { confirmLoadedAliasIdentity } from "./tools/dev-environments/src/image-cache/dev-slot-image-plan.mjs";
const [expected, control, worker] = process.argv.slice(1);
const result = confirmLoadedAliasIdentity({
  expectedConfigId: expected,
  nodes: {
    "control-plane": { configId: control || null },
    worker: { configId: worker || null },
  },
});
if (!result.ok) {
  console.error(`post-load-mismatch nodes=${result.nodes.join(",")}`);
  process.exit(1);
}
' "$digest" \
    "$(alias_index_digest "${cluster}-control-plane" "$ref")" \
    "$(alias_index_digest "${cluster}-worker" "$ref")"
done
if [[ -n "${OFFSCREEN_IMAGE_REF_FILE:-}" ]]; then
  receipt_ref="$canonical"
  if [[ "$role" != "all" ]]; then
    receipt_ref="offscreen-dev-workspace:${slot}-${role}"
  fi
  write_image_ref_receipt "$OFFSCREEN_IMAGE_REF_FILE" "$receipt_ref"
fi
echo "builds=${builds} kindLoads=${kind_loads} digest=${digest} ref=${canonical}"