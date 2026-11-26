#!/usr/bin/env bash
set -euo pipefail
if [[ $# -ne 0 ]]; then
  echo "install.sh takes no arguments." >&2
  exit 2
fi
POSTGRES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$POSTGRES_DIR/../../.." && pwd)"
exec node "$POSTGRES_DIR/release-install.mjs" install --repo-root "$REPO_ROOT"
