#!/usr/bin/env bash
# Thin compatibility wrapper for authorized release ensure only.
# Does not manufacture authorization or select a cluster context.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ $# -ne 0 ]]; then
  echo "install.sh takes no arguments; use node install.mjs with explicit context." >&2
  exit 2
fi

exec node "$ROOT/install.mjs" ensure release kind-offscreen-release