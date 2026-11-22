#!/bin/bash
# Build one slot role image and load it only into kind-offscreen-dev.
set -euo pipefail
slot="${1:?slot}"
role="${2:?role}"
filter="${3:?filter}"
cluster="${4:-offscreen-dev}"
if [[ "$cluster" != "offscreen-dev" || ! "$slot" =~ ^dev-[1-9][0-9]*$ ]]; then
  echo "refusing image target ${cluster}/${slot}" >&2
  exit 1
fi
repo="$(cd "$(dirname "$0")/../../../.." && pwd)"
test -f "$repo/package.json"
cd "$repo"
ref="offscreen-dev-workspace:${slot}-${role}"
docker build \
  -f infra/kubernetes/lab/dev/Dockerfile \
  --build-arg "TURBO_FILTER=${filter}" \
  -t "$ref" \
  .
kind load docker-image "$ref" --name "$cluster" --nodes "${cluster}-control-plane"
kind load docker-image "$ref" --name "$cluster" --nodes "${cluster}-worker"
docker image inspect --format '{{.Id}}' "$ref"
