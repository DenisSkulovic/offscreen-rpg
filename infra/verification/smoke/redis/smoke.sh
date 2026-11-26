#!/usr/bin/env bash
# Thin alias into the guarded native Redis smoke lifecycle.
# T06b client/TTL proof is not executed here.

set -euo pipefail

REDIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$REDIS_DIR/../../../.." && pwd)"
INSTALL="$REDIS_DIR/../../../platform/redis/install.mjs"

if [[ $# -gt 1 ]]; then
  echo "usage: smoke.sh [dev|release]" >&2
  exit 2
fi

profile="release"
if [[ $# -eq 1 ]]; then
  if [[ "$1" != "dev" && "$1" != "release" ]]; then
    echo "usage: smoke.sh [dev|release]" >&2
    exit 2
  fi
  profile="$1"
fi

if [[ "${OFFSCREEN_REDIS_SMOKE_DISPOSABLE:-}" != "confirmed" ]]; then
  echo "Refusing Redis smoke: set OFFSCREEN_REDIS_SMOKE_DISPOSABLE=confirmed." >&2
  exit 1
fi

cd "$REPO_ROOT"

context="$(
  node --input-type=module -e "
import { readPlatformProfile } from './infra/platform/common/profile.mjs';
console.log(readPlatformProfile('${profile}').contextName);
" 2>/dev/null
)"
context="${context//$'\r'/}"
context="${context//$'\n'/}"
if [[ -z "$context" ]]; then
  echo "Refusing Redis smoke: unreadable profile context." >&2
  exit 1
fi

exec node "$INSTALL" smoke "$profile" "$context"