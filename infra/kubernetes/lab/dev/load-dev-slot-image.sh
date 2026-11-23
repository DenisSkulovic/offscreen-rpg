#!/bin/bash
# Build the shared dev image once per fingerprint, then alias one slot role tag.
# A second slot or role waits on the fingerprint lock and must not build again.
set -euo pipefail
slot="${1:?slot}"
role="${2:?role}"
cluster="${3:-offscreen-dev}"
if [[ "$cluster" == @* ]]; then cluster="${4:-offscreen-dev}"; fi
if [[ "$cluster" != "offscreen-dev" || ! "$slot" =~ ^dev-[1-9][0-9]*$ ]]; then
  echo "refusing image target ${cluster}/${slot}" >&2
  exit 1
fi
repo="$(cd "$(dirname "$0")/../../../.." && pwd)"
test -f "$repo/package.json"
cd "$repo"
# shellcheck source=startup-timing.sh
source "$repo/infra/kubernetes/lab/dev/startup-timing.sh"
fingerprint_started="$(startup_timing_begin)"
if [[ -n "${OFFSCREEN_IMAGE_FINGERPRINT:-}" ]]; then
  fingerprint="$OFFSCREEN_IMAGE_FINGERPRINT"
else
fingerprint="$(node --input-type=module -e "
import { fingerprintDevImageContext, UNION_ROLE_FILTER } from './scripts/repo-tools/dev-slot-image-plan.mjs';
const result = fingerprintDevImageContext(process.cwd(), { roleFilter: UNION_ROLE_FILTER });
if (!result.ok) { console.error(result.reason); process.exit(2); }
process.stdout.write(result.fingerprint);
")"
fi
startup_timing_end fingerprint images hit "$fingerprint_started"
canonical="offscreen-dev-workspace:union-${fingerprint:0:16}"
mkdir -p "${TMPDIR:-/tmp}/offscreen-dev-image-locks"
lock="${TMPDIR:-/tmp}/offscreen-dev-image-locks/${fingerprint}.lock"
exec 9>"$lock"
flock 9
recorded="$(docker image inspect "$canonical" --format '{{index .Config.Labels "offscreen.fingerprint"}}' 2>/dev/null || true)"
builds=0
kind_loads=0
docker_started="$(startup_timing_begin)"
if [[ "$recorded" != "$fingerprint" ]]; then
  echo "phase=docker-build role=union" >&2
  docker build \
    -f infra/kubernetes/lab/dev/Dockerfile \
    --label "offscreen.fingerprint=${fingerprint}" \
    -t "$canonical" \
    .
  builds=1
  startup_timing_end docker-build images miss "$docker_started"
else
  startup_timing_end docker-build images hit "$docker_started"
fi
digest="$(docker image inspect "$canonical" --format '{{.Id}}')"
# Docker image ID on this host is the OCI index digest. `ctr images ls`
# prints that same digest. CRI status.id is the unpacked platform image
# and is not comparable to either of those.
alias_index_digest() {
  local node="$1"
  local ref="$2"
  docker exec "$node" ctr -n k8s.io images ls 2>/dev/null \
    | awk -v ref="docker.io/library/${ref}" '$1 == ref { print $3; exit }' \
    || true
}
# Content tag is Deployment authority. Import it once per node when the
# immutable id is absent. Slot role names are extra containerd tags on that
# same image; they must not produce another kind archive.
for node_role in control-plane worker; do
  node="${cluster}-${node_role}"
  found="$(alias_index_digest "$node" "$canonical")"
  if [[ "$found" == "$digest" ]]; then
    echo "phase=kind-load role=content node=${node} result=hit" >&2
    continue
  fi
  echo "phase=kind-load role=content node=${node} result=miss" >&2
  kind_started="$(startup_timing_begin)"
  kind load docker-image "$canonical" --name "$cluster" --nodes "$node"
  kind_loads=$((kind_loads + 1))
  startup_timing_end "kind-load-content-${node_role}" images miss "$kind_started"
  found="$(alias_index_digest "$node" "$canonical")"
  if [[ "$found" != "$digest" ]]; then
    echo "post-load-mismatch node=${node_role} ref=${canonical}" >&2
    exit 1
  fi
done
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
import { confirmLoadedAliasIdentity } from "./scripts/repo-tools/dev-slot-image-plan.mjs";
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
  printf '%s\n' "$canonical" > "$OFFSCREEN_IMAGE_REF_FILE"
fi
echo "builds=${builds} kindLoads=${kind_loads} digest=${digest} ref=${canonical}"
