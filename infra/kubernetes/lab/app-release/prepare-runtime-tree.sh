#!/usr/bin/env bash
# Build a self-contained runtime tree from a compiled monorepo checkout.
# Copies only the production workspace dependency closure, keeping pnpm symlinks.
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: prepare-runtime-tree.sh <app-path> <output-dir>" >&2
  exit 2
fi

APP_PATH="$1"
OUTPUT="$2"
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
APP_ROOT="$ROOT/$APP_PATH"
CLOSURE_TOOL="$ROOT/infra/kubernetes/lab/app-release/production-workspace-closure.mjs"

if [[ ! -d "$APP_ROOT/dist" ]]; then
  echo "missing dist for $APP_PATH" >&2
  exit 1
fi

mapfile -t CLOSURE < <(node "$CLOSURE_TOOL" "$APP_PATH")

rm -rf "$OUTPUT"
mkdir -p "$OUTPUT"

cp "$ROOT/package.json" "$ROOT/pnpm-workspace.yaml" "$OUTPUT/"
cp "$ROOT/infra/kubernetes/lab/app-release/release-process-env-shim.mjs" \
  "$OUTPUT/release-process-env-shim.mjs"
cp -a "$ROOT/node_modules" "$OUTPUT/node_modules"

for rel in "${CLOSURE[@]}"; do
  src="$ROOT/$rel"
  if [[ ! -d "$src/dist" ]]; then
    echo "missing dist for $rel" >&2
    exit 1
  fi
  mkdir -p "$OUTPUT/$rel"
  cp "$src/package.json" "$OUTPUT/$rel/"
  cp -a "$src/dist" "$OUTPUT/$rel/dist"
  if [[ -d "$src/migrations" ]]; then
    cp -a "$src/migrations" "$OUTPUT/$rel/migrations"
  fi
  if [[ -d "$src/node_modules" ]]; then
    cp -a "$src/node_modules" "$OUTPUT/$rel/node_modules"
  fi
done

if [[ -d "$OUTPUT/content" ]]; then
  echo "content/ must not appear in the runtime tree" >&2
  exit 1
fi

echo "runtime tree prepared at $OUTPUT for $APP_PATH"
