#!/usr/bin/env bash
# Thin alias into the guarded native Redis smoke lifecycle.
# T06b client/TTL proof is not executed here.

set -euo pipefail

REDIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$REDIS_DIR/../../../.." && pwd)"
INSTALL="$REDIS_DIR/../../../platform/redis/install.mjs"

usage() {
  echo "usage: smoke.sh [dev|release]" >&2
  echo "       smoke.sh failure <dev|release>" >&2
}

if [[ $# -eq 0 ]]; then
  profile="release"
elif [[ "$1" == "failure" ]]; then
  if [[ $# -ne 2 ]]; then
    usage
    exit 2
  fi
  profile="$2"
  if [[ "$profile" != "dev" && "$profile" != "release" ]]; then
    usage
    exit 2
  fi
elif [[ $# -eq 1 ]]; then
  if [[ "$1" != "dev" && "$1" != "release" ]]; then
    usage
    exit 2
  fi
  profile="$1"
else
  usage
  exit 2
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

if [[ "${1:-}" == "failure" ]]; then
  exec node "$INSTALL" smoke-failure "$profile" "$context"
fi

exec node "$INSTALL" smoke "$profile" "$context"