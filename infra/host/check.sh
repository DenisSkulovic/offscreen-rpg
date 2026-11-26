#!/usr/bin/env bash
# Read-only, Bash-first workstation check.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [[ ${1:-} == --help && $# == 1 ]]; then
  echo "Usage: bash infra/host/check.sh (read-only supported-host prerequisites)"
  exit 0
fi
[[ $# == 0 ]] || { echo "Unexpected arguments" >&2; exit 2; }
source "$ROOT/infra/host/profile.sh"
profile="$(host_profile)"
echo "Host: $profile ($(uname -m))"
[[ "$profile" == windows-wsl ]] || { echo "NOT_IMPLEMENTED: $profile"; exit 2; }
source /etc/os-release
[[ "$ID" == ubuntu && "$VERSION_ID" == 24.04 && "$(uname -m)" == x86_64 ]] || {
  echo "NOT_IMPLEMENTED: only Ubuntu 24.04 WSL2 x86-64 is supported"; exit 2;
}
failed=0
for tool in git curl bash timeout node npm pnpm docker kind kubectl helm tilt python3 flock jq; do
  if command -v "$tool" >/dev/null; then
    printf '%-12s PRESENT\n' "$tool"
  else
    printf '%-12s MISSING\n' "$tool"
    failed=1
  fi
done
(( failed == 0 )) || exit 1
expected_node="$(cat "$ROOT/.node-version")"
expected_pnpm="$(node -p 'require(process.argv[1]).packageManager.split("@")[1]' "$ROOT/package.json")"
[[ "$(node --version)" == "v$expected_node" ]] || { echo "Node: expected $expected_node"; failed=1; }
[[ "$(pnpm --version)" == "$expected_pnpm" ]] || { echo "pnpm: expected $expected_pnpm"; failed=1; }
if [[ -n "${DOCKER_HOST:-}${DOCKER_CONTEXT:-}${DOCKER_TLS_VERIFY:-}" ]]; then
  echo "Docker endpoint overrides are unsupported"; exit 1
fi
if ! context="$(timeout 10 docker context show)" ||
   ! endpoint="$(timeout 10 docker context inspect "$context" --format '{{.Endpoints.docker.Host}}')" ||
   [[ "$endpoint" != unix:///* ]] ||
   ! os="$(timeout 10 docker info --format '{{.OperatingSystem}}')"; then
  echo "Docker: local engine unavailable"; exit 1
fi
[[ "$os" == "Docker Desktop" ]] || { echo "Docker: expected Docker Desktop"; exit 1; }
for tool in kind kubectl helm tilt; do
  case "$tool" in
    kubectl) args=(version --client);;
    helm) args=(version --short);;
    *) args=(version);;
  esac
  if ! version="$(timeout 10 "$tool" "${args[@]}")"; then
    echo "$tool: version probe failed"; failed=1; continue
  fi
  printf '%s: %s\n' "$tool" "$version"
  if [[ "$tool" == helm && ! "$version" =~ ^v[34]\. ]]; then failed=1; fi
done
python3 -c 'import yaml' || { echo "PyYAML missing"; failed=1; }
awk '/^MemAvailable:/ { print "Available RAM: " int($2/1024) " MiB"; found=1; if ($2 < 4194304) exit 1 } END { if (!found) exit 1 }' /proc/meminfo || { echo "Insufficient available memory (minimum 4096 MiB)"; failed=1; }
df -h "$ROOT"
(( failed == 0 )) || exit 1
echo "READY: host prerequisites (not cluster or platform acceptance)"
