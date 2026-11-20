#!/usr/bin/env bash
# Import the pinned Seyda Neen fixture into the existing lab object store,
# then read the same hashes from a different Job. Does not delete the cluster,
# the store manifests, Docker volumes, or foreign kubectl contexts.
# Does not print Secret values. Does not install the Nest API or the worker.
# A local fixture-pin.json is not this proof.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "smoke.sh takes no arguments." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib.sh"
BOOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STORE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../object-storage" && pwd)"
NS=lab-content-bootstrap
BOOTSTRAP_IMAGE=offscreen-lab-content-bootstrap:boot02
WORLD_HASH=5b37ec632d019c983e25f5d481ed2b23c1de464e5932994be16c5befcbc75ec9
RULE_HASH=d643427fa3292ce61484deb15f2e9fc6755c613b17260db6f390ea23bd99d7ab
START_HASH=e30eaa27407abe8a015b21cad62f30b81b07ee7af3b89634501fe3787d8d2813

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi

fail() {
  echo "$1" >&2
  "${KUBECTL[@]}" -n lab-objects get pods -o wide >&2 || true
  "${KUBECTL[@]}" -n "$NS" get pods,jobs -o wide >&2 || true
  "${KUBECTL[@]}" -n "$NS" describe pods -l offscreen.rpg/role=content-bootstrap >&2 || true
  "${KUBECTL[@]}" -n "$NS" logs job/fixture-importer --tail=80 >&2 || true
  "${KUBECTL[@]}" -n "$NS" logs job/fixture-reader --tail=80 >&2 || true
  exit 1
}

if grep -RniE --exclude-dir=node_modules --exclude='package-lock.json' \
  'kind:[[:space:]]*Secret|AKIA[0-9A-Z]{16}' "$BOOT_DIR" >/dev/null; then
  echo "Refusing to apply: the content-bootstrap directory contains a Secret or an access-key literal." >&2
  exit 1
fi

require_memory

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
volume_guard_begin "$work"

import_image() {
  local image_ref="$1"
  if docker image inspect "$image_ref" >/dev/null 2>&1; then
    while read -r node; do
      [[ -z "$node" ]] && continue
      echo "Importing ${image_ref} into ${node}"
      if ! docker save "$image_ref" | docker exec -i "$node" ctr --namespace=k8s.io images import -; then
        echo "Import into ${node} failed. The kubelet may still pull ${image_ref}."
      fi
    done < <(kind get nodes --name "$CLUSTER_NAME")
  else
    echo "Local image ${image_ref} is absent. The nodes will pull it."
  fi
}

if ! docker image inspect "$BOOTSTRAP_IMAGE" >/dev/null 2>&1; then
  echo "Building ${BOOTSTRAP_IMAGE}"
  "$BOOT_DIR/build.sh"
fi

import_image "docker.io/chrislusf/seaweedfs:4.54"
import_image "$BOOTSTRAP_IMAGE"

"${KUBECTL[@]}" apply -f "$STORE_DIR/store.yaml"

store_access="$(openssl rand -hex 16)"
store_secret="$(openssl rand -hex 32)"
"${KUBECTL[@]}" -n lab-objects create secret generic object-store-s3 \
  --from-literal="access-key-id=${store_access}" \
  --from-literal="secret-access-key=${store_secret}" \
  >/dev/null

"${KUBECTL[@]}" -n lab-objects rollout status deployment/object-store --timeout=240s

reader_access="$(openssl rand -hex 16)"
reader_secret="$(openssl rand -hex 32)"
configure_ok=0
for _ in 1 2 3 4 5 6 7 8; do
  if "${KUBECTL[@]}" -n lab-objects exec -i deploy/object-store -- /bin/sh -s <<EOF
set -eu
printf '%s\n' "s3.configure -user=content-reader -actions=Read -buckets=lab-objects -access_key=${reader_access} -secret_key=${reader_secret} -apply" exit | weed shell -master=127.0.0.1:9333 >/tmp/content-reader-configure.out 2>&1
EOF
  then
    configure_ok=1
    break
  fi
  sleep 3
done
if [[ "$configure_ok" -ne 1 ]]; then
  "${KUBECTL[@]}" -n lab-objects exec deploy/object-store -- cat /tmp/content-reader-configure.out 2>/dev/null \
    | sed -e "s/${reader_access}/[redacted]/g" -e "s/${reader_secret}/[redacted]/g" -e "s/${store_access}/[redacted]/g" -e "s/${store_secret}/[redacted]/g" >&2 \
    || true
  unset store_access store_secret reader_access reader_secret
  fail "Could not add the read-only identity on the existing store."
fi

"${KUBECTL[@]}" apply -f "$BOOT_DIR/namespace.yaml"
"${KUBECTL[@]}" -n "$NS" create secret generic content-importer-s3 \
  --from-literal="access-key-id=${store_access}" \
  --from-literal="secret-access-key=${store_secret}" \
  >/dev/null
"${KUBECTL[@]}" -n "$NS" create secret generic content-reader-s3 \
  --from-literal="access-key-id=${reader_access}" \
  --from-literal="secret-access-key=${reader_secret}" \
  >/dev/null
unset store_access store_secret reader_access reader_secret

svc_type="$("${KUBECTL[@]}" -n lab-objects get svc object-store -o jsonpath='{.spec.type}')"
echo "Service type: ${svc_type}"
if [[ "$svc_type" != "ClusterIP" ]]; then
  fail "Object store Service is not ClusterIP."
fi

store_image="$("${KUBECTL[@]}" -n lab-objects get deployment object-store -o jsonpath='{.spec.template.spec.containers[0].image}')"
store_image_id="$("${KUBECTL[@]}" -n lab-objects get pod -l app=object-store -o jsonpath='{.items[0].status.containerStatuses[0].imageID}')"
echo "Store image: ${store_image}"
echo "Store image ID: ${store_image_id}"

assert_scratch_only() {
  local job="$1"
  local names pvc host
  names="$("${KUBECTL[@]}" -n "$NS" get job "$job" -o jsonpath='{range .spec.template.spec.volumes[*]}{.name}{" "}{end}')"
  if [[ "$names" != "scratch " ]]; then
    fail "${job} volumes are '${names}', not scratch only."
  fi
  pvc="$("${KUBECTL[@]}" -n "$NS" get job "$job" -o jsonpath='{range .spec.template.spec.volumes[*]}{.persistentVolumeClaim.claimName}{end}')"
  host="$("${KUBECTL[@]}" -n "$NS" get job "$job" -o jsonpath='{range .spec.template.spec.volumes[*]}{.hostPath.path}{end}')"
  if [[ -n "$pvc" || -n "$host" ]]; then
    fail "${job} has a persistent claim or a host path."
  fi
}

job_pod_uid() {
  local job="$1"
  "${KUBECTL[@]}" -n "$NS" get pod -l "job-name=${job}" -o jsonpath='{.items[0].metadata.uid}'
}

job_image() {
  local job="$1"
  "${KUBECTL[@]}" -n "$NS" get job "$job" -o jsonpath='{.spec.template.spec.containers[0].image}'
}

wait_job() {
  local job="$1"
  if ! "${KUBECTL[@]}" -n "$NS" wait --for=condition=complete "job/${job}" --timeout=300s; then
    fail "Job ${job} did not complete."
  fi
}

secret_refs() {
  local job="$1"
  "${KUBECTL[@]}" -n "$NS" get job "$job" -o jsonpath='{range .spec.template.spec.containers[0].env[*]}{.valueFrom.secretKeyRef.name}={.valueFrom.secretKeyRef.key}{"\n"}{end}' \
    | sed '/=$/d' | sort | tr '\n' ' '
}

run_importer() {
  "${KUBECTL[@]}" apply -f "$BOOT_DIR/importer-job.yaml"
  assert_scratch_only fixture-importer
  local refs
  refs="$(secret_refs fixture-importer)"
  if [[ "$refs" != "content-importer-s3=access-key-id content-importer-s3=secret-access-key " ]]; then
    fail "Importer job secret refs are '${refs}'."
  fi
  wait_job fixture-importer
}

run_reader() {
  "${KUBECTL[@]}" apply -f "$BOOT_DIR/reader-job.yaml"
  assert_scratch_only fixture-reader
  local refs
  refs="$(secret_refs fixture-reader)"
  if [[ "$refs" != "content-reader-s3=access-key-id content-reader-s3=secret-access-key " ]]; then
    fail "Reader job secret refs are '${refs}'."
  fi
  wait_job fixture-reader
}

delete_job() {
  local job="$1"
  "${KUBECTL[@]}" -n "$NS" delete job "$job" --wait=true --timeout=180s
}

run_importer
importer_uid="$(job_pod_uid fixture-importer)"
importer_image="$(job_image fixture-importer)"
"${KUBECTL[@]}" -n "$NS" logs job/fixture-importer >"$work/importer-1.log"
echo "Importer image: ${importer_image}"
echo "Importer pod uid: ${importer_uid}"
cat "$work/importer-1.log"

importer_line="$(grep -E '^content-bootstrap importer world=' "$work/importer-1.log" | tail -n 1)"
if [[ "$importer_line" != "content-bootstrap importer world=${WORLD_HASH} rule=${RULE_HASH} start=${START_HASH} pinPath=null campaignCreated=false" ]]; then
  fail "Importer did not report the pinned hashes without a local pin."
fi

delete_job fixture-importer
if "${KUBECTL[@]}" -n "$NS" get pod -l job-name=fixture-importer --no-headers 2>/dev/null | grep -q .; then
  fail "Importer pod was still present after the job was deleted."
fi

run_reader
reader_uid="$(job_pod_uid fixture-reader)"
reader_image="$(job_image fixture-reader)"
"${KUBECTL[@]}" -n "$NS" logs job/fixture-reader >"$work/reader-1.log"
echo "Reader image: ${reader_image}"
echo "Reader pod uid while importer pod was absent: ${reader_uid}"
cat "$work/reader-1.log"
if [[ "$reader_uid" == "$importer_uid" ]]; then
  fail "Reader pod uid matched the importer pod uid."
fi
if ! grep -qx "content-bootstrap reader world=${WORLD_HASH} rule=${RULE_HASH} start=${START_HASH} match=yes campaignCreated=false" "$work/reader-1.log"; then
  fail "Reader did not return the importer hashes."
fi

assert_loopback_only
volume_guard_end "$work"

echo "Smoke passed: importer Job and a different reader Job shared the pinned fixture hashes."
echo "A local fixture-pin.json is not this proof. Nest API and worker were not applied."
echo "Deleting the kind cluster does not preserve local-path data and is not a backup."
