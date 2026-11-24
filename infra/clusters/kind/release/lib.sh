# Shared guards for the disposable offscreen-lab cluster.
# A script that sources this file must not delete Docker volumes or foreign kubectl contexts.

set -euo pipefail

LAB_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLUSTER_NAME="offscreen-lab"
CONTEXT_NAME="kind-offscreen-lab"
KUBECTL=(kubectl --context "$CONTEXT_NAME")

snapshot_file() {
  local path="$1"
  mkdir -p "$(dirname "$path")"
  : >"$path"
}

snapshot_volumes() {
  local path="$1"
  snapshot_file "$path"
  docker volume ls -q | sort >"$path"
}

snapshot_foreign_contexts() {
  local path="$1"
  snapshot_file "$path"
  kubectl config get-contexts -o name 2>/dev/null | grep -vx "$CONTEXT_NAME" | sort >"$path" || true
}

assert_same_file() {
  local before="$1"
  local after="$2"
  local label="$3"
  if ! cmp -s "$before" "$after"; then
    echo "Refusing to continue: ${label} changed." >&2
    echo "before:" >&2
    cat "$before" >&2
    echo "after:" >&2
    cat "$after" >&2
    exit 1
  fi
}

assert_no_volume_loss() {
  local before="$1"
  local after="$2"
  local missing
  missing="$(comm -23 "$before" "$after")"
  if [[ -n "$missing" ]]; then
    echo "Refusing to continue: existing Docker volumes disappeared." >&2
    echo "$missing" >&2
    exit 1
  fi
}

cluster_volume_names() {
  local path="$1"
  snapshot_file "$path"
  local all_vols vol label
  all_vols="$(mktemp)"
  if ! docker volume ls -q | sort >"$all_vols"; then
    echo "Refusing to continue: docker volume inventory failed." >&2
    rm -f "$all_vols"
    exit 1
  fi
  : >"$path"
  while IFS= read -r vol; do
    [[ -z "$vol" ]] && continue
    if ! label="$(docker volume inspect -f '{{ index .Labels "io.x-k8s.kind.cluster" }}' "$vol" 2>&1)"; then
      echo "Refusing to continue: docker volume inspect failed for ${vol}: ${label}" >&2
      rm -f "$all_vols"
      exit 1
    fi
    if [[ "$label" == "$CLUSTER_NAME" ]]; then
      printf '%s\n' "$vol" >>"$path"
    fi
  done <"$all_vols"
  rm -f "$all_vols"
  sort -u -o "$path" "$path"
}

assert_volumes_outside_cluster_remain() {
  local before_all="$1"
  local cluster_vols="$2"
  local after_all="$3"
  local protected missing
  protected="$(mktemp)"
  comm -23 "$before_all" "$cluster_vols" >"$protected"
  missing="$(comm -23 "$protected" "$after_all")"
  rm -f "$protected"
  if [[ -n "$missing" ]]; then
    echo "Refusing to continue: a Docker volume outside this cluster disappeared." >&2
    echo "$missing" >&2
    exit 1
  fi
}

# Snapshot pre-existing Docker volumes and foreign kubectl contexts before lab work.
# Legacy Compose volume names are not required; a cold clone may have zero volumes.
volume_guard_begin() {
  local work="$1"
  snapshot_volumes "$work/volumes-before"
  snapshot_foreign_contexts "$work/contexts-before"
}

# Assert no unrelated Docker volume or foreign kubectl context was lost.
volume_guard_end() {
  local work="$1"
  snapshot_volumes "$work/volumes-after"
  snapshot_foreign_contexts "$work/contexts-after"
  assert_no_volume_loss "$work/volumes-before" "$work/volumes-after"
  assert_same_file "$work/contexts-before" "$work/contexts-after" "foreign kubectl contexts"
}

require_memory() {
  local available_kib
  available_kib="$(awk '/MemAvailable:/ {print $2}' /proc/meminfo)"
  if [[ -z "$available_kib" || "$available_kib" -lt 4194304 ]]; then
    echo "Refusing to create a cluster: MemAvailable is ${available_kib:-unknown} KiB, below 4 GiB." >&2
    exit 1
  fi
  echo "MemAvailable KiB: ${available_kib}"
}

assert_loopback_only() {
  local ports
  ports="$(docker ps --filter "name=${CLUSTER_NAME}" --format '{{.Names}} {{.Ports}}')"
  echo "$ports"
  if echo "$ports" | grep -E '0\.0\.0\.0:|\[::\]:' >/dev/null; then
    echo "Refusing to continue: a cluster container publishes a non-loopback port." >&2
    exit 1
  fi
  local exposed
  exposed="$("${KUBECTL[@]}" get svc -A --no-headers 2>/dev/null | awk '$3=="NodePort" || $3=="LoadBalancer" {print}')"
  if [[ -n "$exposed" ]]; then
    echo "Refusing to continue: a Service is NodePort or LoadBalancer." >&2
    echo "$exposed" >&2
    exit 1
  fi
}
