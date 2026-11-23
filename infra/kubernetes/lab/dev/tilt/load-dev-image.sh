#!/bin/bash
# Tilt's built-in kind loader talks to every node at once. On this WSL host that
# drops the worker vsock. Load the control plane, then the worker.
set -euo pipefail
filter="$1"
repo="$(cd "$(dirname "$0")/../../../../.." && pwd)"
cd "$repo"
# Docker reads <Dockerfile>.dockerignore beside -f. Do not pass a custom ignore flag.
# Patterns are relative to the repo-root context, not the Dockerfile directory.
DEV_IGNORE="${repo}/infra/kubernetes/lab/dev/Dockerfile.dockerignore"
test -f "$DEV_IGNORE"
if [[ "${EXPECTED_REF:-}" == offscreen-dev-workspace:dev-* ]]; then
  ref="${EXPECTED_REF#offscreen-dev-workspace:}"
  slot="${ref%-*}"
  role="${ref##*-}"
  exec bash "$repo/infra/kubernetes/lab/dev/load-dev-slot-image.sh" "$slot" "$role"
fi
fingerprint="$(node --input-type=module -e "
import { fingerprintDevImageContext, UNION_ROLE_FILTER } from './scripts/repo-tools/dev-slot-image-plan.mjs';
const result = fingerprintDevImageContext(process.cwd(), { roleFilter: UNION_ROLE_FILTER });
if (!result.ok) { console.error(result.reason); process.exit(2); }
process.stdout.write(result.fingerprint);
")"
canonical="offscreen-dev-workspace:union-${fingerprint:0:16}"
recorded="$(docker image inspect "$canonical" --format '{{index .Config.Labels "offscreen.fingerprint"}}' 2>/dev/null || true)"
if [[ "$recorded" == "$fingerprint" ]]; then
  echo "phase=alias-canonical ref=${EXPECTED_REF}" >&2
  docker tag "$canonical" "$EXPECTED_REF"
else
  echo "phase=docker-build ref=${EXPECTED_REF}" >&2
  docker build \
    -f infra/kubernetes/lab/dev/Dockerfile \
    --build-arg "TURBO_FILTER=${filter}" \
    --label "offscreen.fingerprint=${fingerprint}" \
    -t "$EXPECTED_REF" \
    .
fi
load_node() {
  local cluster="$1"
  local node="$2"
  local attempt=0
  while [ "$attempt" -lt 5 ]; do
    if kind load docker-image "$EXPECTED_REF" --name "$cluster" --nodes "$node"; then
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 2
  done
  echo "kind load failed for ${cluster}/${node}" >&2
  return 1
}
if [[ "${EXPECTED_REF:-}" == offscreen-dev-workspace:* ]]; then
  load_node offscreen-dev offscreen-dev-control-plane
  load_node offscreen-dev offscreen-dev-worker
  # Kind load can retarget a tag onto a new containerd import. The host image
  # id does not change, so stamp the node config id after the load. A matching
  # annotation does not roll; a different one rolls only this slot.
  if [[ -n "${OFFSCREEN_DEV_NAMESPACE:-}" ]]; then
    cri_id="$(docker exec offscreen-dev-control-plane crictl inspecti "docker.io/library/${EXPECTED_REF}" | node -e "
let text = '';
process.stdin.on('data', (chunk) => { text += chunk; });
process.stdin.on('end', () => {
  const id = JSON.parse(text)?.status?.id ?? '';
  if (!/^sha256:[a-f0-9]{64}$/.test(id)) process.exit(2);
  process.stdout.write(id);
});
")"
    for name in game-web game-api game-authority game-control game-executor game-relay; do
      current="$(kubectl --context kind-offscreen-dev -n "$OFFSCREEN_DEV_NAMESPACE" get deployment "$name" -o "jsonpath={.spec.template.metadata.annotations.offscreen\.dev/image-generation}" 2>/dev/null || true)"
      if [[ "$current" == "$cri_id" ]]; then
        continue
      fi
      kubectl --context kind-offscreen-dev -n "$OFFSCREEN_DEV_NAMESPACE" patch deployment "$name" --type merge -p "{\"spec\":{\"template\":{\"metadata\":{\"annotations\":{\"offscreen.dev/image-generation\":\"${cri_id}\"}}}}}" >/dev/null
    done
  fi
else
  load_node offscreen-lab offscreen-lab-control-plane
  load_node offscreen-lab offscreen-lab-worker
fi
