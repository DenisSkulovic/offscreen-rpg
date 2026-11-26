#!/usr/bin/env bash
# Install pinned Gateway API CRDs, Traefik, and the lab-edge Gateway.
# Does not create or delete the kind cluster or foreign kubectl contexts.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "install.sh takes no arguments." >&2
  exit 2
fi

GATEWAY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

command -v node >/dev/null

node "${GATEWAY_ROOT}/install.mjs"
install_rc=$?
if [[ "${install_rc}" -ne 0 ]]; then
  echo "Gateway install failed." >&2
  exit "${install_rc}"
fi