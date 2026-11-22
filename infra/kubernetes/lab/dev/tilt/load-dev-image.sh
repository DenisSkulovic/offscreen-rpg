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
docker build \
  -f infra/kubernetes/lab/dev/Dockerfile \
  --build-arg "TURBO_FILTER=${filter}" \
  -t "$EXPECTED_REF" \
  .
load_node() {
  local node="$1"
  local attempt=0
  while [ "$attempt" -lt 5 ]; do
    if kind load docker-image "$EXPECTED_REF" --name offscreen-lab --nodes "$node"; then
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 2
  done
  echo "kind load failed for ${node}" >&2
  return 1
}
load_node offscreen-lab-control-plane
load_node offscreen-lab-worker
