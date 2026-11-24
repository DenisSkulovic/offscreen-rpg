#!/usr/bin/env bash
# DNS, cross-namespace HTTP, and PVC probes. Removes only probe objects this run created.
# Does not delete the cluster, Docker volumes, foreign kubectl contexts, or shared PVC data.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "smoke.sh takes no arguments." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../clusters/kind/release/lib.sh"
VERIFY_FIXTURES="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../fixtures"
source "$VERIFY_FIXTURES/probes/ensure-namespaces.sh"

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi

if ! kubectl config get-contexts -o name 2>/dev/null | grep -qx "$CONTEXT_NAME"; then
  echo "Refusing smoke: kubectl context ${CONTEXT_NAME} is unreadable or absent." >&2
  exit 1
fi

ensure_probe_namespaces

CREATED_PROBE_SERVER_UID=""
CREATED_PROBE_SVC_UID=""
CREATED_DNS_PROBE_UID=""
CREATED_CROSS_NS_CLIENT_UID=""
CREATED_PVC_WRITER_UID=""
CREATED_PVC_READER_UID=""

probe_preflight_absent() {
  local -a checks=(
    "lab-b|pod|probe-server"
    "lab-b|service|probe"
    "lab-a|pod|dns-probe"
    "lab-a|pod|cross-ns-client"
    "lab-a|pod|pvc-writer"
    "lab-a|pod|pvc-reader"
    "lab-a|persistentvolumeclaim|probe-data"
  )
  local entry ns kind name found
  local -a conflicts=()
  for entry in "${checks[@]}"; do
    IFS='|' read -r ns kind name <<<"$entry"
    if ! found="$("${KUBECTL[@]}" -n "$ns" get "$kind" "$name" --ignore-not-found -o name 2>&1)"; then
      echo "Refusing smoke: unreadable ${kind}/${name} in ${ns}: ${found}" >&2
      exit 1
    fi
    if [[ -n "$found" ]]; then
      conflicts+=("${kind}/${name} in ${ns}")
    fi
  done
  if [[ ${#conflicts[@]} -gt 0 ]]; then
    echo "Refusing smoke: preflight conflict: existing ${conflicts[*]}." >&2
    exit 1
  fi
}

uid_delete() {
  local ns="$1"
  local kind="$2"
  local name="$3"
  local expected_uid="$4"
  if [[ -z "$expected_uid" ]]; then
    return 0
  fi
  local current_uid=""
  if ! current_uid="$("${KUBECTL[@]}" -n "$ns" get "$kind" "$name" -o jsonpath='{.metadata.uid}' 2>/dev/null)"; then
    echo "Skipping cleanup for unreadable ${kind}/${name} in ${ns}." >&2
    return 0
  fi
  if [[ -z "$current_uid" ]]; then
    return 0
  fi
  if [[ "$current_uid" != "$expected_uid" ]]; then
    echo "Retaining foreign ${kind}/${name} in ${ns}; uid ${current_uid} is not owned ${expected_uid}." >&2
    return 0
  fi
  case "$kind" in
    pod)
      "${KUBECTL[@]}" -n "$ns" delete pod "$name" --wait=true >/dev/null 2>&1 || true
      ;;
    service)
      "${KUBECTL[@]}" -n "$ns" delete service "$name" >/dev/null 2>&1 || true
      ;;
    *)
      echo "Skipping cleanup: no delete for ${kind}/${name} in ${ns}." >&2
      ;;
  esac
}

cleanup() {
  local status=$?
  uid_delete lab-b pod probe-server "$CREATED_PROBE_SERVER_UID"
  uid_delete lab-b service probe "$CREATED_PROBE_SVC_UID"
  uid_delete lab-a pod dns-probe "$CREATED_DNS_PROBE_UID"
  uid_delete lab-a pod cross-ns-client "$CREATED_CROSS_NS_CLIENT_UID"
  uid_delete lab-a pod pvc-writer "$CREATED_PVC_WRITER_UID"
  uid_delete lab-a pod pvc-reader "$CREATED_PVC_READER_UID"
  exit "$status"
}

probe_preflight_absent
trap cleanup EXIT

work="$(mktemp -d)"
snapshot_volumes "$work/volumes-before"
snapshot_foreign_contexts "$work/contexts-before"

if ! "${KUBECTL[@]}" create -f "$VERIFY_FIXTURES/probes/cross-namespace.yaml"; then
  echo "Probe fixture create failed; refusing to retain unknown cluster objects." >&2
  exit 1
fi
CREATED_PROBE_SERVER_UID="$("${KUBECTL[@]}" -n lab-b get pod probe-server -o jsonpath='{.metadata.uid}')"
CREATED_PROBE_SVC_UID="$("${KUBECTL[@]}" -n lab-b get service probe -o jsonpath='{.metadata.uid}')"

"${KUBECTL[@]}" -n lab-b wait --for=condition=Ready pod/probe-server --timeout=180s

if ! "${KUBECTL[@]}" create -f "$VERIFY_FIXTURES/probes/dns.yaml"; then
  echo "DNS probe create failed." >&2
  exit 1
fi
CREATED_DNS_PROBE_UID="$("${KUBECTL[@]}" -n lab-a get pod dns-probe -o jsonpath='{.metadata.uid}')"

if ! "${KUBECTL[@]}" create -f "$VERIFY_FIXTURES/probes/client.yaml"; then
  echo "Cross-namespace client create failed." >&2
  exit 1
fi
CREATED_CROSS_NS_CLIENT_UID="$("${KUBECTL[@]}" -n lab-a get pod cross-ns-client -o jsonpath='{.metadata.uid}')"

"${KUBECTL[@]}" -n lab-a wait --for=jsonpath='{.status.phase}'=Succeeded pod/dns-probe --timeout=180s
"${KUBECTL[@]}" -n lab-a wait --for=jsonpath='{.status.phase}'=Succeeded pod/cross-ns-client --timeout=180s

dns_log="$("${KUBECTL[@]}" -n lab-a logs pod/dns-probe)"
printf '%s\n' "$dns_log"
printf '%s\n' "$dns_log" | grep -q 'kubernetes.default.svc.cluster.local'
printf '%s\n' "$dns_log" | grep -q 'probe.lab-b.svc.cluster.local'

client_log="$("${KUBECTL[@]}" -n lab-a logs pod/cross-ns-client)"
printf '%s\n' "$client_log"
printf '%s\n' "$client_log" | grep -qx 'lab-b-ok'

if ! "${KUBECTL[@]}" create -f "$VERIFY_FIXTURES/probes/pvc-writer.yaml"; then
  echo "PVC writer fixture create failed." >&2
  exit 1
fi
CREATED_PVC_WRITER_UID="$("${KUBECTL[@]}" -n lab-a get pod pvc-writer -o jsonpath='{.metadata.uid}')"

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
uid_delete lab-a pod pvc-writer "$CREATED_PVC_WRITER_UID"
CREATED_PVC_WRITER_UID=""

if ! "${KUBECTL[@]}" create -f "$VERIFY_FIXTURES/probes/pvc-reader.yaml"; then
  echo "PVC reader create failed." >&2
  exit 1
fi
CREATED_PVC_READER_UID="$("${KUBECTL[@]}" -n lab-a get pod pvc-reader -o jsonpath='{.metadata.uid}')"

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