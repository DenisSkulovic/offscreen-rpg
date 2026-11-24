#!/usr/bin/env bash
# Build only the content package's actual lockfile-backed workspace closure.
set -euo pipefail
if [[ $# -ne 0 ]]; then
  echo "build.sh takes no arguments." >&2
  exit 2
fi
BOOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$BOOT_DIR/../../../.." && pwd)"
source "$REPO_ROOT/infra/images/common/toolchain.pin"
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
(cd "$REPO_ROOT" && pnpm exec turbo prune @offscreen/content-packages --docker --out-dir "$stage/prune")
context="$stage/prune"
mkdir -p "$context/infra/images/common" "$context/infra/images/release" "$context/scripts/repo-tools" "$context/content/"{worlds,rules,starts}
cp "$REPO_ROOT/infra/images/common/"{docker.npmrc,workspace-graph.mjs} "$context/infra/images/common/"
cp "$REPO_ROOT/infra/images/release/"{prepare-runtime-tree.sh,production-workspace-closure.mjs,release-process-env-shim.mjs} "$context/infra/images/release/"
cp "$REPO_ROOT/scripts/repo-tools/"{import-pinned-fixture.mjs,read-pinned-fixture.mjs} "$context/scripts/repo-tools/"
cp -a "$REPO_ROOT/content/worlds/vvardenfell-poc" "$context/content/worlds/"
cp -a "$REPO_ROOT/content/rules/srd-5.2.1-subset" "$context/content/rules/"
cp -a "$REPO_ROOT/content/starts/seyda-neen-prisoner" "$context/content/starts/"
docker build -f "$BOOT_DIR/Dockerfile" \
  --build-arg "NODE_IMAGE=${NODE_IMAGE}@${NODE_DIGEST}" \
  --build-arg "PNPM_VERSION=${PNPM_VERSION}" \
  -t offscreen-lab-content-bootstrap:boot02 "$context"
