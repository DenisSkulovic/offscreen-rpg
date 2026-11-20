#!/usr/bin/env bash
# Insert a row, delete the primary Pod, and read the row back.
# Does not delete the cluster, the PVC, Docker volumes, or foreign kubectl contexts.
# Does not print Secret values.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "smoke.sh takes no arguments." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../lib.sh"

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi
if ! "${KUBECTL[@]}" -n lab-postgres get cluster lab-pg >/dev/null 2>&1; then
  echo "Cluster lab-pg is absent. Run cnpg/install.sh first." >&2
  exit 1
fi

require_memory

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
volume_guard_begin "$work"

instances="$("${KUBECTL[@]}" -n lab-postgres get cluster lab-pg -o jsonpath='{.spec.instances}')"
if [[ "$instances" != "1" ]]; then
  echo "Refusing smoke: lab-pg instances is ${instances}, expected 1." >&2
  exit 1
fi

primary="$("${KUBECTL[@]}" -n lab-postgres get cluster lab-pg -o jsonpath='{.status.currentPrimary}')"
if [[ -z "$primary" ]]; then
  echo "lab-pg has no current primary." >&2
  exit 1
fi
"${KUBECTL[@]}" -n lab-postgres wait --for=condition=Ready "pod/${primary}" --timeout=180s

psql_query() {
  "${KUBECTL[@]}" -n lab-postgres exec "$primary" -c postgres -- \
    psql -v ON_ERROR_STOP=1 -U postgres -d lab "$@"
}

"${KUBECTL[@]}" -n lab-postgres exec -i "$primary" -c postgres -- \
  psql -v ON_ERROR_STOP=1 -U postgres -d lab <<'SQL'
BEGIN;
CREATE TABLE IF NOT EXISTS lab_marker (
  id integer PRIMARY KEY,
  note text NOT NULL
);
INSERT INTO lab_marker (id, note)
VALUES (1, 'pod-replace-ok')
ON CONFLICT (id) DO UPDATE SET note = EXCLUDED.note;
COMMIT;
SQL

before="$(psql_query -Atqc "SELECT note FROM lab_marker WHERE id = 1;")"
if [[ "$before" != "pod-replace-ok" ]]; then
  echo "Committed row was not readable before the Pod was deleted." >&2
  exit 1
fi

pod_uid_before="$("${KUBECTL[@]}" -n lab-postgres get pod "$primary" -o jsonpath='{.metadata.uid}')"
claim="$("${KUBECTL[@]}" -n lab-postgres get pod "$primary" -o jsonpath='{.spec.volumes[?(@.name=="pgdata")].persistentVolumeClaim.claimName}')"
if [[ -z "$claim" ]]; then
  echo "Primary Pod has no pgdata claim." >&2
  exit 1
fi
pvc_uid_before="$("${KUBECTL[@]}" -n lab-postgres get pvc "$claim" -o jsonpath='{.metadata.uid}')"
storage_class="$("${KUBECTL[@]}" -n lab-postgres get pvc "$claim" -o jsonpath='{.spec.storageClassName}')"
if [[ "$storage_class" != "local-path" ]]; then
  echo "Primary claim uses ${storage_class}, expected local-path." >&2
  exit 1
fi

server_version="$(psql_query -Atqc "SHOW server_version;")"
echo "Marker before delete: ${before}"
echo "Primary before delete: ${primary}"
echo "Pod uid before delete: ${pod_uid_before}"
echo "PVC before delete: ${claim}"
echo "PVC uid before delete: ${pvc_uid_before}"
echo "Server version: ${server_version}"

"${KUBECTL[@]}" -n lab-postgres delete pod "$primary" --wait=true --timeout=180s

deadline=$((SECONDS + 360))
pod_uid_after=""
ready=""
while (( SECONDS < deadline )); do
  primary="$("${KUBECTL[@]}" -n lab-postgres get cluster lab-pg -o jsonpath='{.status.currentPrimary}' 2>/dev/null || true)"
  if [[ -z "$primary" ]]; then
    sleep 3
    continue
  fi
  pod_uid_after="$("${KUBECTL[@]}" -n lab-postgres get pod "$primary" -o jsonpath='{.metadata.uid}' 2>/dev/null || true)"
  ready="$("${KUBECTL[@]}" -n lab-postgres get pod "$primary" -o jsonpath='{.status.containerStatuses[0].ready}' 2>/dev/null || true)"
  if [[ -n "$pod_uid_after" && "$pod_uid_after" != "$pod_uid_before" && "$ready" == "true" ]]; then
    break
  fi
  sleep 3
done
if [[ -z "$pod_uid_after" || "$pod_uid_after" == "$pod_uid_before" || "$ready" != "true" ]]; then
  echo "Replacement primary did not become ready." >&2
  exit 1
fi

after=""
for _ in $(seq 1 30); do
  if after="$(psql_query -Atqc "SELECT note FROM lab_marker WHERE id = 1;" 2>/dev/null)"; then
    if [[ "$after" == "pod-replace-ok" ]]; then
      break
    fi
  fi
  sleep 2
done
if [[ "$after" != "pod-replace-ok" ]]; then
  echo "Deleting the primary Pod lost the committed row." >&2
  exit 1
fi

pvc_uid_after="$("${KUBECTL[@]}" -n lab-postgres get pvc "$claim" -o jsonpath='{.metadata.uid}')"
if [[ "$pvc_uid_after" != "$pvc_uid_before" ]]; then
  echo "The persistent volume claim changed across the Pod deletion." >&2
  exit 1
fi
instances_after="$("${KUBECTL[@]}" -n lab-postgres get cluster lab-pg -o jsonpath='{.spec.instances}')"
if [[ "$instances_after" != "1" ]]; then
  echo "Refusing result: lab-pg instances is ${instances_after}, expected 1." >&2
  exit 1
fi

assert_loopback_only
volume_guard_end "$work"

echo "Marker after delete: ${after}"
echo "Primary after delete: ${primary}"
echo "Pod uid after delete: ${pod_uid_after}"
echo "PVC uid after delete: ${pvc_uid_after}"
echo "Instances: ${instances_after}"
echo "Smoke passed: the committed row survived replacement of the primary Pod."
echo "The PVC was not deleted. Deleting the kind cluster still does not preserve local-path volumes."
