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
canonical="offscreen-dev-workspace:union-${fingerprint:0:16}"
mkdir -p "${TMPDIR:-/tmp}/offscreen-dev-image-locks"
lock="${TMPDIR:-/tmp}/offscreen-dev-image-locks/${fingerprint}.lock"
exec 9>"$lock"
flock 9
recorded="$(docker image inspect "$canonical" --format '{{index .Config.Labels "offscreen.fingerprint"}}' 2>/dev/null || true)"
builds=0
if [[ "$recorded" != "$fingerprint" ]]; then
  echo "phase=docker-build role=union" >&2
  docker build \
    -f infra/kubernetes/lab/dev/Dockerfile \
    --label "offscreen.fingerprint=${fingerprint}" \
    -t "$canonical" \
    .
  builds=1
fi
digest="$(docker image inspect "$canonical" --format '{{.Id}}')"
roles=(web api authority worker)
if [[ "$role" != "all" ]]; then roles=("$role"); fi
for alias_role in "${roles[@]}"; do
  ref="offscreen-dev-workspace:${slot}-${alias_role}"
  docker tag "$canonical" "$ref"
  for node in "${cluster}-control-plane" "${cluster}-worker"; do
    if docker exec "$node" ctr -n k8s.io images ls 2>/dev/null | grep -F "$ref" >/dev/null; then
      continue
    fi
    echo "phase=kind-load role=${alias_role} node=${node}" >&2
    kind load docker-image "$ref" --name "$cluster" --nodes "$node"
  done
done
echo "builds=${builds} digest=${digest}"
