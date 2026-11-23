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
else
  load_node offscreen-lab offscreen-lab-control-plane
  load_node offscreen-lab offscreen-lab-worker
fi
