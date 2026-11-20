#!/usr/bin/env bash
# Two isolated verification jobs share one object in the existing lab store.
# Does not delete the cluster, the store manifests, Docker volumes, or foreign kubectl contexts.
# Does not print Secret values. Does not install the Nest API or the worker.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "smoke.sh takes no arguments." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib.sh"
ACCESS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STORE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../object-storage" && pwd)"
NS=lab-document-access

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi

fail() {
  echo "$1" >&2
  "${KUBECTL[@]}" -n lab-objects get pods -o wide >&2 || true
  "${KUBECTL[@]}" -n "$NS" get pods,jobs -o wide >&2 || true
  "${KUBECTL[@]}" -n "$NS" describe pods -l offscreen.rpg/role=document-access >&2 || true
  "${KUBECTL[@]}" -n "$NS" logs job/document-writer --tail=80 >&2 || true
  "${KUBECTL[@]}" -n "$NS" logs job/document-reader --tail=80 >&2 || true
  exit 1
}

if grep -RniE 'kind:[[:space:]]*Secret|AKIA[0-9A-Z]{16}' "$ACCESS_DIR" >/dev/null; then
  echo "Refusing to apply: the document-access directory contains a Secret or an access-key literal." >&2
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

import_image "docker.io/chrislusf/seaweedfs:4.54"
import_image "public.ecr.aws/aws-cli/aws-cli:2.31.18"

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
printf '%s\n' "s3.configure -user=document-reader -actions=Read -buckets=lab-objects -access_key=${reader_access} -secret_key=${reader_secret} -apply" exit | weed shell -master=127.0.0.1:9333 >/tmp/document-reader-configure.out 2>&1
EOF
  then
    configure_ok=1
    break
  fi
  sleep 3
done
if [[ "$configure_ok" -ne 1 ]]; then
  "${KUBECTL[@]}" -n lab-objects exec deploy/object-store -- cat /tmp/document-reader-configure.out 2>/dev/null \
    | sed -e "s/${reader_access}/[redacted]/g" -e "s/${reader_secret}/[redacted]/g" -e "s/${store_access}/[redacted]/g" -e "s/${store_secret}/[redacted]/g" >&2 \
    || true
  unset store_access store_secret reader_access reader_secret
  fail "Could not add the read-only identity on the existing store."
fi

"${KUBECTL[@]}" apply -f "$ACCESS_DIR/namespace.yaml"
"${KUBECTL[@]}" -n "$NS" create secret generic document-writer-s3 \
  --from-literal="access-key-id=${store_access}" \
  --from-literal="secret-access-key=${store_secret}" \
  >/dev/null
"${KUBECTL[@]}" -n "$NS" create secret generic document-reader-s3 \
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

job_image_id() {
  local job="$1"
  "${KUBECTL[@]}" -n "$NS" get pod -l "job-name=${job}" -o jsonpath='{.items[0].status.containerStatuses[0].imageID}'
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

run_writer() {
  "${KUBECTL[@]}" apply -f "$ACCESS_DIR/writer-job.yaml"
  assert_scratch_only document-writer
  local refs
  refs="$(secret_refs document-writer)"
  if [[ "$refs" != "document-writer-s3=access-key-id document-writer-s3=secret-access-key " ]]; then
    fail "Writer job secret refs are '${refs}'."
  fi
  wait_job document-writer
}

run_reader() {
  "${KUBECTL[@]}" apply -f "$ACCESS_DIR/reader-job.yaml"
  assert_scratch_only document-reader
  local refs
  refs="$(secret_refs document-reader)"
  if [[ "$refs" != "document-reader-s3=access-key-id document-reader-s3=secret-access-key " ]]; then
    fail "Reader job secret refs are '${refs}'."
  fi
  wait_job document-reader
}

delete_job() {
  local job="$1"
  "${KUBECTL[@]}" -n "$NS" delete job "$job" --wait=true --timeout=180s
}

run_writer
writer_uid="$(job_pod_uid document-writer)"
writer_image="$(job_image document-writer)"
writer_image_id="$(job_image_id document-writer)"
"${KUBECTL[@]}" -n "$NS" logs job/document-writer >"$work/writer-1.log"
echo "Writer image: ${writer_image}"
echo "Writer image ID: ${writer_image_id}"
echo "Writer pod uid: ${writer_uid}"
cat "$work/writer-1.log"

writer_line="$(grep -E '^document-access writer sha256=' "$work/writer-1.log" | tail -n 1)"
object_hash="$(printf %s "$writer_line" | sed -n 's/.*sha256=\([0-9a-f][0-9a-f]*\).*/\1/p')"
object_key="$(printf %s "$writer_line" | sed -n 's/.*key=\([^ ]*\).*/\1/p')"
if [[ ! "$object_hash" =~ ^[0-9a-f]{64}$ ]]; then
  fail "Writer did not report a 64 hex SHA-256."
fi
if [[ "$object_key" != "objects/sha256/${object_hash:0:2}/${object_hash}.json" ]]; then
  fail "Writer key does not match the content hash."
fi
if ! grep -qx 'document-access writer failed-s3=fail-closed' "$work/writer-1.log"; then
  fail "Writer did not fail closed on the dead S3 endpoint."
fi
if ! grep -qx 'document-access writer pod-local=absent' "$work/writer-1.log"; then
  fail "Writer accepted a pod-local canonical file."
fi
echo "Bucket: lab-objects"
echo "Key: ${object_key}"
echo "SHA-256: ${object_hash}"

delete_job document-writer
if "${KUBECTL[@]}" -n "$NS" get pod -l job-name=document-writer --no-headers 2>/dev/null | grep -q .; then
  fail "Writer pod was still present after the job was deleted."
fi

"${KUBECTL[@]}" -n "$NS" create configmap document-access-object \
  --from-literal="object-key=${object_key}" \
  --from-literal="sha256=${object_hash}" \
  >/dev/null

run_reader
reader_uid="$(job_pod_uid document-reader)"
reader_image="$(job_image document-reader)"
reader_image_id="$(job_image_id document-reader)"
"${KUBECTL[@]}" -n "$NS" logs job/document-reader >"$work/reader-1.log"
echo "Reader image: ${reader_image}"
echo "Reader image ID: ${reader_image_id}"
echo "Reader pod uid while writer pod was absent: ${reader_uid}"
cat "$work/reader-1.log"
if [[ "$reader_uid" == "$writer_uid" ]]; then
  fail "Reader pod uid matched the writer pod uid."
fi
if ! grep -qx "document-access reader sha256=${object_hash} key=${object_key} match=yes" "$work/reader-1.log"; then
  fail "Reader did not return the writer hash."
fi
if ! grep -qx 'document-access reader missing-key=fail-closed' "$work/reader-1.log"; then
  fail "Missing key did not fail closed."
fi
if ! grep -qx 'document-access reader denied-read=fail-closed' "$work/reader-1.log"; then
  fail "Denied read did not fail closed."
fi
if ! grep -qx 'document-access reader second-write=denied' "$work/reader-1.log"; then
  fail "Reader was able to write a different payload at the same key."
fi
if ! grep -qx 'document-access reader pod-local=rejected' "$work/reader-1.log"; then
  fail "Reader accepted a pod-local file as the canonical object."
fi

delete_job document-reader
run_writer
writer_uid_after="$(job_pod_uid document-writer)"
"${KUBECTL[@]}" -n "$NS" logs job/document-writer >"$work/writer-2.log"
echo "Writer pod uid after replacement: ${writer_uid_after}"
if [[ -z "$writer_uid_after" || "$writer_uid_after" == "$writer_uid" ]]; then
  fail "Replacement writer pod did not receive a new uid."
fi
if ! grep -q "sha256=${object_hash} key=${object_key}" "$work/writer-2.log"; then
  fail "Replacement writer did not report the same object."
fi

run_reader
reader_uid_after="$(job_pod_uid document-reader)"
"${KUBECTL[@]}" -n "$NS" logs job/document-reader >"$work/reader-2.log"
echo "Reader pod uid after writer replacement: ${reader_uid_after}"
cat "$work/reader-2.log"
if [[ "$reader_uid_after" == "$reader_uid" || "$reader_uid_after" == "$writer_uid_after" ]]; then
  fail "The second reader pod was not a different pod."
fi
if ! grep -qx "document-access reader sha256=${object_hash} key=${object_key} match=yes" "$work/reader-2.log"; then
  fail "Reader did not return the same bytes after the writer pod was replaced."
fi

assert_loopback_only
volume_guard_end "$work"

echo "Smoke passed: one writer job and a different reader job shared one object."
echo "Nest API and worker integration remains pending. No application manifest was applied."
echo "Deleting the kind cluster does not preserve local-path data and is not a backup."
