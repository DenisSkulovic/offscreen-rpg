#!/usr/bin/env bash
# Thin wrapper into the guarded RabbitMQ proof supervisor.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$ROOT/../../../.." && pwd)"
PROOF="$ROOT/proof.mjs"

usage() {
  echo "usage: smoke.sh [dev|release]" >&2
}

profile="${1:-dev}"
if [[ "$profile" != "dev" && "$profile" != "release" ]]; then
  usage
  exit 2
fi

if [[ "${OFFSCREEN_RABBITMQ_PROOF:-}" != "authorized" ]]; then
  echo "Refusing RabbitMQ smoke: set OFFSCREEN_RABBITMQ_PROOF=authorized." >&2
  exit 1
fi

if [[ "$profile" == "release" ]]; then
  echo "Refusing RabbitMQ smoke on release profile." >&2
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
  echo "Refusing RabbitMQ smoke: unreadable profile context." >&2
  exit 1
fi

exec node "$PROOF" smoke "$profile" "$context"