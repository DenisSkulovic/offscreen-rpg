#!/usr/bin/env bash
# Build a self-contained runtime tree from a compiled monorepo checkout.
# Keeps pnpm symlink layout intact by copying compiled packages and node_modules as-is.
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: prepare-runtime-tree.sh <app-path> <output-dir>" >&2
  exit 2
fi

APP_PATH="$1"
OUTPUT="$2"
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
APP_ROOT="$ROOT/$APP_PATH"

if [[ ! -d "$APP_ROOT/dist" ]]; then
  echo "missing dist for $APP_PATH" >&2
  exit 1
fi

rm -rf "$OUTPUT"
mkdir -p "$OUTPUT/$APP_PATH" "$OUTPUT/packages"

cp "$ROOT/package.json" "$ROOT/pnpm-workspace.yaml" "$OUTPUT/"
cp "$ROOT/infra/kubernetes/lab/app-release/release-process-env-shim.mjs" \
  "$OUTPUT/release-process-env-shim.mjs"
cp -a "$ROOT/node_modules" "$OUTPUT/node_modules"
cp "$APP_ROOT/package.json" "$OUTPUT/$APP_PATH/"
cp -a "$APP_ROOT/dist" "$OUTPUT/$APP_PATH/dist"
if [[ -d "$APP_ROOT/node_modules" ]]; then
  cp -a "$APP_ROOT/node_modules" "$OUTPUT/$APP_PATH/node_modules"
fi

for pkg in "$ROOT/packages"/*; do
  name="$(basename "$pkg")"
  [[ -d "$pkg/dist" ]] || continue
  mkdir -p "$OUTPUT/packages/$name"
  cp "$pkg/package.json" "$OUTPUT/packages/$name/"
  cp -a "$pkg/dist" "$OUTPUT/packages/$name/dist"
  if [[ -d "$pkg/migrations" ]]; then
    cp -a "$pkg/migrations" "$OUTPUT/packages/$name/migrations"
  fi
  if [[ -d "$pkg/node_modules" ]]; then
    cp -a "$pkg/node_modules" "$OUTPUT/packages/$name/node_modules"
  fi
done

if [[ -d "$OUTPUT/content" ]]; then
  echo "content/ must not appear in the runtime tree" >&2
  exit 1
fi

echo "runtime tree prepared at $OUTPUT for $APP_PATH"