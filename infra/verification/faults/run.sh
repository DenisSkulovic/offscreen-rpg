#!/usr/bin/env bash
# Legacy faults wrapper; forwards to the RabbitMQ proof supervisor or refuses.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$ROOT/../../.." && pwd)"
PROOF="$ROOT/../smoke/rabbitmq/proof.mjs"

if [[ $# -ne 0 ]]; then
  echo "run.sh takes no arguments; release legacy wrapper refuses before writes." >&2
  exit 2
fi

if [[ "${OFFSCREEN_RABBITMQ_PROOF:-}" != "authorized" ]]; then
  echo "Refusing worker-loss proof: set OFFSCREEN_RABBITMQ_PROOF=authorized." >&2
  exit 1
fi

if [[ "${OFFSCREEN_RABBITMQ_DISRUPTION:-}" != "authorized" ]]; then
  echo "Refusing worker-loss proof: set OFFSCREEN_RABBITMQ_DISRUPTION=authorized." >&2
  exit 1
fi

cd "$REPO_ROOT"
exec node "$PROOF" worker-loss dev kind-offscreen-dev