#!/usr/bin/env bash
# Prove one two-hop trace and one missing-hop failure signal.
# Does not delete the cluster, Docker volumes, or foreign kubectl contexts.
# Does not install the game.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "smoke.sh takes no arguments." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../../clusters/kind/release/lib.sh"
OBS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi

restore() {
  local status=$?
  "${KUBECTL[@]}" -n lab-a scale deployment/hop-b --replicas=1 >/dev/null 2>&1 || true
  exit "$status"
}
trap restore EXIT

work="$(mktemp -d)"
snapshot_volumes "$work/volumes-before"
snapshot_foreign_contexts "$work/contexts-before"

call_hop() {
  "${KUBECTL[@]}" -n lab-a exec deployment/hop-a -- python -c 'import urllib.request,urllib.error
try:
 r=urllib.request.urlopen("http://127.0.0.1:8080/call", timeout=8)
 print(r.read().decode())
except urllib.error.HTTPError as e:
 print(e.read().decode())'
}

wait_for_log() {
  local needle="$1"
  local attempt
  for attempt in $(seq 1 30); do
    "${KUBECTL[@]}" -n lab-a logs deployment/otel-collector --tail=800 >"$work/collector.log" 2>&1 || true
    if grep -q "$needle" "$work/collector.log"; then
      return 0
    fi
    sleep 1
  done
  echo "Collector log did not contain ${needle}." >&2
  tail -n 120 "$work/collector.log" >&2 || true
  return 1
}

echo "MemAvailable KiB: $(awk '/MemAvailable:/ {print $2}' /proc/meminfo)"
"${KUBECTL[@]}" -n lab-a rollout status deployment/otel-collector --timeout=60s
"${KUBECTL[@]}" -n lab-a rollout status deployment/hop-a --timeout=60s
"${KUBECTL[@]}" -n lab-a rollout status deployment/hop-b --timeout=60s

success_json="$(call_hop)"
echo "Success response: ${success_json}"
success_trace="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["trace_id"])' "$success_json")"
wait_for_log "$success_trace"
python3 "$OBS_DIR/assert_signals.py" success "$success_json" <"$work/collector.log"

endpoints_before="$("${KUBECTL[@]}" -n lab-a get endpoints hop-b -o jsonpath='{.subsets[*].addresses[*].ip}')"
echo "hop-b endpoints before scale: ${endpoints_before:-none}"
if [[ -z "$endpoints_before" ]]; then
  echo "hop-b had no endpoints before the failure proof." >&2
  exit 1
fi

"${KUBECTL[@]}" -n lab-a scale deployment/hop-b --replicas=0
pod_count=1
for _ in $(seq 1 45); do
  pod_count="$("${KUBECTL[@]}" -n lab-a get pods -l app=hop-b --no-headers 2>/dev/null | wc -l)"
  pod_count="${pod_count// /}"
  if [[ "$pod_count" -eq 0 ]]; then
    break
  fi
  sleep 1
done
echo "hop-b pods after scale: ${pod_count}"
if [[ "$pod_count" -ne 0 ]]; then
  echo "hop-b pods were still present." >&2
  "${KUBECTL[@]}" -n lab-a get pods -l app=hop-b -o wide >&2 || true
  exit 1
fi
endpoints_after="$("${KUBECTL[@]}" -n lab-a get endpoints hop-b -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null || true)"
echo "hop-b endpoints after pod delete: ${endpoints_after:-none}"
if [[ -n "$endpoints_after" ]]; then
  echo "hop-b still had endpoints after its pods were gone." >&2
  exit 1
fi

failure_json=""
missing=0
for _ in $(seq 1 8); do
  failure_json="$(call_hop)"
  echo "Failure attempt: ${failure_json}"
  if python3 -c 'import json,sys; raise SystemExit(0 if json.loads(sys.argv[1]).get("failure")=="second_hop_missing" else 1)' "$failure_json"; then
    missing=1
    break
  fi
  sleep 1
done
if [[ "$missing" -ne 1 ]]; then
  echo "hop-b still answered after its pod was deleted." >&2
  exit 1
fi
failure_trace="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["trace_id"])' "$failure_json")"
wait_for_log "$failure_trace"
wait_for_log "synthetic_second_hop_missing"
python3 "$OBS_DIR/assert_signals.py" failure "$failure_json" <"$work/collector.log"

echo "Collector log lines: $(wc -l <"$work/collector.log")"
echo "Success trace: ${success_trace}"
echo "Failure trace: ${failure_trace}"

snapshot_volumes "$work/volumes-after"
snapshot_foreign_contexts "$work/contexts-after"
assert_no_volume_loss "$work/volumes-before" "$work/volumes-after"
assert_same_file "$work/contexts-before" "$work/contexts-after" "foreign kubectl contexts"
assert_loopback_only
echo "Observability smoke passed. Context: ${CONTEXT_NAME}."
