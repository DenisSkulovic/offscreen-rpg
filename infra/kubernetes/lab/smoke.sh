#!/usr/bin/env bash
# DNS, cross-namespace HTTP, and PVC probes. Removes the probe objects when it exits.
# Does not delete the cluster, Docker volumes, or foreign kubectl contexts.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "smoke.sh takes no arguments." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi

cleanup() {
  local status=$?
  "${KUBECTL[@]}" -n lab-a delete pod dns-probe cross-ns-client pvc-writer pvc-reader --ignore-not-found --wait=true >/dev/null 2>&1 || true
  "${KUBECTL[@]}" -n lab-b delete pod probe-server --ignore-not-found --wait=true >/dev/null 2>&1 || true
  "${KUBECTL[@]}" -n lab-b delete svc probe --ignore-not-found >/dev/null 2>&1 || true
  "${KUBECTL[@]}" -n lab-a delete pvc probe-data --ignore-not-found --wait=true >/dev/null 2>&1 || true
  exit "$status"
}
trap cleanup EXIT

work="$(mktemp -d)"
snapshot_volumes "$work/volumes-before"
snapshot_foreign_contexts "$work/contexts-before"

"${KUBECTL[@]}" apply -f "$LAB_ROOT/probes/cross-namespace.yaml"
"${KUBECTL[@]}" -n lab-b wait --for=condition=Ready pod/probe-server --timeout=180s
"${KUBECTL[@]}" apply -f "$LAB_ROOT/probes/dns.yaml"
"${KUBECTL[@]}" apply -f "$LAB_ROOT/probes/client.yaml"
"${KUBECTL[@]}" -n lab-a wait --for=jsonpath='{.status.phase}'=Succeeded pod/dns-probe --timeout=180s
"${KUBECTL[@]}" -n lab-a wait --for=jsonpath='{.status.phase}'=Succeeded pod/cross-ns-client --timeout=180s

dns_log="$("${KUBECTL[@]}" -n lab-a logs pod/dns-probe)"
printf '%s\n' "$dns_log"
printf '%s\n' "$dns_log" | grep -q 'kubernetes.default.svc.cluster.local'
printf '%s\n' "$dns_log" | grep -q 'probe.lab-b.svc.cluster.local'

client_log="$("${KUBECTL[@]}" -n lab-a logs pod/cross-ns-client)"
printf '%s\n' "$client_log"
printf '%s\n' "$client_log" | grep -qx 'lab-b-ok'

"${KUBECTL[@]}" apply -f "$LAB_ROOT/probes/pvc-writer.yaml"
"${KUBECTL[@]}" -n lab-a wait --for=condition=Ready pod/pvc-writer --timeout=180s
marker_ok=0
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if "${KUBECTL[@]}" -n lab-a exec pod/pvc-writer -- grep -x lab-pvc-ok /data/marker; then
    marker_ok=1
    break
  fi
  sleep 1
done
if [[ "$marker_ok" -ne 1 ]]; then
  echo "PVC writer did not store the marker." >&2
  exit 1
fi
"${KUBECTL[@]}" -n lab-a delete pod pvc-writer --wait=true
"${KUBECTL[@]}" apply -f "$LAB_ROOT/probes/pvc-reader.yaml"
"${KUBECTL[@]}" -n lab-a wait --for=jsonpath='{.status.phase}'=Succeeded pod/pvc-reader --timeout=180s
reader_log="$("${KUBECTL[@]}" -n lab-a logs pod/pvc-reader)"
printf '%s\n' "$reader_log"
printf '%s\n' "$reader_log" | grep -qx 'lab-pvc-ok'

assert_loopback_only
snapshot_volumes "$work/volumes-after"
snapshot_foreign_contexts "$work/contexts-after"
assert_no_volume_loss "$work/volumes-before" "$work/volumes-after"
assert_same_file "$work/contexts-before" "$work/contexts-after" "foreign kubectl contexts"

echo "Smoke passed: DNS, cross-namespace HTTP, and PVC marker survived a new pod."
