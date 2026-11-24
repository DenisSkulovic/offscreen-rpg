#!/usr/bin/env bash
# Build the lab-only importer/reader image. Does not start a cluster.
set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "build.sh takes no arguments." >&2
  exit 2
fi

BOOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$BOOT_DIR/../../../.." && pwd)"
IMAGE=offscreen-lab-content-bootstrap:boot02

if [[ ! -d "$REPO_ROOT/packages/documents/dist" ]]; then
  echo "packages/documents/dist is missing. Build @offscreen/documents first." >&2
  exit 1
fi

stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
mkdir -p \
  "$stage/infra/verification/release-acceptance/content-bootstrap" \
  "$stage/packages/documents" \
  "$stage/scripts/repo-tools" \
  "$stage/content/worlds" \
  "$stage/content/rules" \
  "$stage/content/starts"
cp "$BOOT_DIR/package.json" "$BOOT_DIR/package-lock.json" "$BOOT_DIR/Dockerfile" \
  "$stage/infra/verification/release-acceptance/content-bootstrap/"
cp -a "$REPO_ROOT/packages/documents/dist" "$stage/packages/documents/"
cp "$REPO_ROOT/scripts/repo-tools/import-pinned-fixture.mjs" \
  "$REPO_ROOT/scripts/repo-tools/read-pinned-fixture.mjs" \
  "$stage/scripts/repo-tools/"
cp -a "$REPO_ROOT/content/worlds/vvardenfell-poc" "$stage/content/worlds/"
cp -a "$REPO_ROOT/content/rules/srd-5.2.1-subset" "$stage/content/rules/"
cp -a "$REPO_ROOT/content/starts/seyda-neen-prisoner" "$stage/content/starts/"

docker build -f "$stage/infra/verification/release-acceptance/content-bootstrap/Dockerfile" -t "$IMAGE" "$stage"
echo "Built ${IMAGE}"
