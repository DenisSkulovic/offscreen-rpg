#!/usr/bin/env bash
# Conservative setup: explicit system-package opt-in, no implicit downloads.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ ${1:-} == --help && $# == 1 ]]; then
  echo "Usage: bash infra/host/setup.sh [--install-system-packages]"
  echo "Default: check prerequisites and print the missing-tool preparation recipe."
  exit 0
fi
[[ $# == 0 || ( $# == 1 && "$1" == --install-system-packages ) ]] || exit 2
source "$DIR/profile.sh"
profile="$(host_profile)"
[[ "$profile" == windows-wsl ]] || { echo "NOT_IMPLEMENTED: $profile"; exit 2; }
source /etc/os-release
[[ "$ID" == ubuntu && "$VERSION_ID" == 24.04 && "$(uname -m)" == x86_64 ]] || { echo "NOT_IMPLEMENTED: unsupported WSL distribution or architecture"; exit 2; }
if [[ ${1:-} == --install-system-packages ]]; then
  sudo apt-get update
  sudo apt-get install git curl jq python3 python3-yaml util-linux coreutils ca-certificates
fi
if bash "$DIR/check.sh"; then exit 0; fi
echo "BLOCKED: follow infra/host/windows-wsl/README.md, then repeat setup."
exit 1
