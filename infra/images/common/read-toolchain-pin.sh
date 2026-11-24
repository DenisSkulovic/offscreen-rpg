#!/usr/bin/env bash
# Sources infra/images/common/toolchain.pin and sets TOOLCHAIN_NODE_IMAGE / PNPM_VERSION.
# Refuses missing or malformed pins before Docker.
set -euo pipefail

read_offscreen_toolchain_pin() {
  local root="${1:?repo root}"
  local pin_file="$root/infra/images/common/toolchain.pin"
  if [[ ! -f "$pin_file" ]]; then
    echo "missing toolchain.pin" >&2
    return 2
  fi
  # shellcheck source=/dev/null
  source "$pin_file"
  if [[ -z "${NODE_IMAGE:-}" || -z "${NODE_DIGEST:-}" || -z "${PNPM_VERSION:-}" ]]; then
    echo "malformed toolchain.pin" >&2
    return 2
  fi
  if [[ ! "$NODE_DIGEST" =~ ^sha256:[a-f0-9]{64}$ ]]; then
    echo "malformed NODE_DIGEST in toolchain.pin" >&2
    return 2
  fi
  TOOLCHAIN_NODE_IMAGE="${NODE_IMAGE}@${NODE_DIGEST}"
}