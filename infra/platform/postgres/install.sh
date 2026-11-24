#!/usr/bin/env bash
# Install pinned CloudNativePG 1.30.2 and one primary in lab-postgres.
# Does not delete the cluster, Docker volumes, or foreign kubectl contexts.
# Does not print Secret values.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "install.sh takes no arguments." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../clusters/kind/release/lib.sh"
POSTGRES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$POSTGRES_DIR/../../.." && pwd)"

command -v curl >/dev/null
command -v sha256sum >/dev/null
command -v node >/dev/null

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi

pin="$POSTGRES_DIR/operator.pin"
read_pin() {
  local key="$1"
  local value
  value="$(awk -F= -v key="$key" '$1 == key { print substr($0, index($0, "=") + 1) }' "$pin")"
  if [[ -z "$value" ]]; then
    echo "operator.pin is missing ${key}." >&2
    exit 1
  fi
  printf '%s' "$value"
}

CNPG_VERSION="$(read_pin CNPG_VERSION)"
CNPG_URL="$(read_pin CNPG_URL)"
CNPG_SHA256="$(read_pin CNPG_SHA256)"
CNPG_IMAGE="$(read_pin CNPG_IMAGE)"
POSTGRES_IMAGE="$(read_pin POSTGRES_IMAGE)"

if [[ ! "$CNPG_SHA256" =~ ^[0-9a-f]{64}$ ]]; then
  echo "operator.pin sha256 is not 64 hex characters." >&2
  exit 1
fi

rendered_cluster="$(node "$REPO_ROOT/infra/platform/common/cli.mjs" render postgres release cluster)"
if ! grep -q "imageName: ${POSTGRES_IMAGE}" <<<"$rendered_cluster"; then
  echo "rendered cluster imageName does not match operator.pin." >&2
  exit 1
fi
if ! grep -q 'instances: 1' <<<"$rendered_cluster"; then
  echo "rendered cluster must request one instance." >&2
  exit 1
fi

require_memory

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
volume_guard_begin "$work"

if ! node "$REPO_ROOT/infra/platform/common/cli.mjs" target release >/dev/null; then
  echo "release target verification failed." >&2
  exit 1
fi

prepare="$(node "$POSTGRES_DIR/release-install.mjs" prepare)"
if [[ "$prepare" == "fetch" ]]; then
  curl -fsSL --retry 3 --retry-delay 2 -o "$work/cnpg.yaml" "$CNPG_URL"
  echo "${CNPG_SHA256}  $work/cnpg.yaml" | sha256sum -c -
  if ! grep -q "image: ${CNPG_IMAGE}" "$work/cnpg.yaml"; then
    echo "Downloaded operator manifest does not contain ${CNPG_IMAGE}." >&2
    exit 1
  fi
  node "$POSTGRES_DIR/release-install.mjs" install \
    --operator-manifest "$work/cnpg.yaml" \
    --repo-root "$REPO_ROOT"
elif [[ "$prepare" == "skip" ]]; then
  node "$POSTGRES_DIR/release-install.mjs" install \
    --repo-root "$REPO_ROOT"
else
  echo "release prepare returned ${prepare}." >&2
  exit 1
fi

assert_loopback_only
volume_guard_end "$work"

echo "Install completed for CloudNativePG ${CNPG_VERSION}."