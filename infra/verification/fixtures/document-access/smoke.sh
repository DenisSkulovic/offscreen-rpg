#!/usr/bin/env bash
# Two isolated verification jobs share one object in the existing lab store.
# Requires infra/platform/object-storage/install.sh first. Does not apply the store or create admin credentials.
# Does not delete the cluster, Docker volumes, or foreign kubectl contexts.
# Does not print Secret values. Does not install the Nest API or the worker.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "smoke.sh takes no arguments." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../../clusters/kind/release/lib.sh"
ACCESS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NS=lab-document-access
CREDENTIALS_MJS="$ACCESS_DIR/credentials.mjs"
READER_IDENTITY=document-reader
READER_CONFIGURE_LOG=/tmp/document-reader-configure.out

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi
if ! "${KUBECTL[@]}" -n lab-objects get deployment object-store >/dev/null 2>&1; then
  echo "Object store is absent. Run infra/platform/object-storage/install.sh first." >&2
  exit 1
fi
if ! "${KUBECTL[@]}" -n lab-objects get secret object-store-s3 >/dev/null 2>&1; then
  echo "Secret object-store-s3 is absent. Run infra/platform/object-storage/install.sh first." >&2
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

secret_field() {
  local ns="$1" name="$2" key="$3"
  "${KUBECTL[@]}" -n "$ns" get secret "$name" -o "jsonpath={.data.${key}}"
}

decode_b64() {
  base64 -d 2>/dev/null
}

read_store_admin_secret() {
  local access_b64 secret_b64
  access_b64="$(secret_field lab-objects object-store-s3 access-key-id)"
  secret_b64="$(secret_field lab-objects object-store-s3 secret-access-key)"
  if [[ -z "$access_b64" || -z "$secret_b64" ]]; then
    fail "object-store-s3 is missing access-key-id or secret-access-key."
  fi
  STORE_ACCESS_KEY="$(printf '%s' "$access_b64" | decode_b64)"
  STORE_SECRET_KEY="$(printf '%s' "$secret_b64" | decode_b64)"
}

read_writer_secret_if_present() {
  WRITER_ACCESS_KEY=""
  WRITER_SECRET_KEY=""
  if ! "${KUBECTL[@]}" -n "$NS" get secret document-writer-s3 >/dev/null 2>&1; then
    return 1
  fi
  local access_b64 secret_b64
  access_b64="$(secret_field "$NS" document-writer-s3 access-key-id)"
  secret_b64="$(secret_field "$NS" document-writer-s3 secret-access-key)"
  if [[ -z "$access_b64" || -z "$secret_b64" ]]; then
    fail "document-writer-s3 exists but is incomplete."
  fi
  WRITER_ACCESS_KEY="$(printf '%s' "$access_b64" | decode_b64)"
  WRITER_SECRET_KEY="$(printf '%s' "$secret_b64" | decode_b64)"
  return 0
}

read_reader_secret_if_present() {
  READER_ACCESS_KEY=""
  READER_SECRET_KEY=""
  if ! "${KUBECTL[@]}" -n "$NS" get secret document-reader-s3 >/dev/null 2>&1; then
    return 1
  fi
  local access_b64 secret_b64
  access_b64="$(secret_field "$NS" document-reader-s3 access-key-id)"
  secret_b64="$(secret_field "$NS" document-reader-s3 secret-access-key)"
  if [[ -z "$access_b64" || -z "$secret_b64" ]]; then
    fail "document-reader-s3 exists but is incomplete."
  fi
  READER_ACCESS_KEY="$(printf '%s' "$access_b64" | decode_b64)"
  READER_SECRET_KEY="$(printf '%s' "$secret_b64" | decode_b64)"
  return 0
}

json_escape() {
  node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$1"
}

ensure_writer_secret() {
  read_store_admin_secret
  local existing_json='null'
  if read_writer_secret_if_present; then
    existing_json="$(printf '{"accessKeyId":%s,"secretAccessKey":%s}' \
      "$(json_escape "$WRITER_ACCESS_KEY")" "$(json_escape "$WRITER_SECRET_KEY")")"
  fi
  local desired_json
  desired_json="$(printf '{"accessKeyId":%s,"secretAccessKey":%s}' \
    "$(json_escape "$STORE_ACCESS_KEY")" "$(json_escape "$STORE_SECRET_KEY")")"
  local decision
  decision="$(printf '{"existing":%s,"desired":%s}\n' "$existing_json" "$desired_json" \
    | node "$CREDENTIALS_MJS" decide-writer)"
  local action reason
  action="$(node -e 'let d=JSON.parse(process.argv[1]);process.stdout.write(d.action)' "$decision")"
  reason="$(node -e 'let d=JSON.parse(process.argv[1]);process.stdout.write(d.reason||"")' "$decision")"
  if [[ "$action" == "refuse" ]]; then
    unset STORE_ACCESS_KEY STORE_SECRET_KEY WRITER_ACCESS_KEY WRITER_SECRET_KEY
    fail "Refusing writer credentials: ${reason}."
  fi
  if [[ "$action" == "reuse" ]]; then
    echo "Reusing existing document-writer-s3."
    unset STORE_ACCESS_KEY STORE_SECRET_KEY
    return 0
  fi
  "${KUBECTL[@]}" apply -f "$ACCESS_DIR/namespace.yaml"
  "${KUBECTL[@]}" -n "$NS" create secret generic document-writer-s3 \
    --from-literal="access-key-id=${STORE_ACCESS_KEY}" \
    --from-literal="secret-access-key=${STORE_SECRET_KEY}" \
    >/dev/null
  echo "Created document-writer-s3."
  unset STORE_ACCESS_KEY STORE_SECRET_KEY WRITER_ACCESS_KEY WRITER_SECRET_KEY
}

probe_reader_identity_state() {
  local probe_out=""
  if ! probe_out="$("${KUBECTL[@]}" -n lab-objects exec deploy/object-store -- /bin/sh -s <<EOF
set -eu
printf '%s\n' "s3.configure -user=${READER_IDENTITY}" exit | weed shell -master=127.0.0.1:9333 2>&1 | tr '\n' ' '
EOF
  )"; then
    echo "unknown"
    return
  fi
  if [[ "$probe_out" == *"already exists"* ]]; then
    echo "present"
    return
  fi
  if [[ "$probe_out" == *"NoSuchUser"* || "$probe_out" == *"no user"* || "$probe_out" == *"not found"* ]]; then
    echo "absent"
    return
  fi
  echo "unknown"
}

partial_reader_repair_required() {
  if read_reader_secret_if_present; then
    unset READER_ACCESS_KEY READER_SECRET_KEY
    return 1
  fi
  local log_size=""
  log_size="$("${KUBECTL[@]}" -n lab-objects exec deploy/object-store -- \
    sh -c "wc -c < '${READER_CONFIGURE_LOG}' 2>/dev/null || echo 0" 2>/dev/null || echo 0)"
  if [[ "${log_size:-0}" -gt 0 ]]; then
    return 0
  fi
  return 1
}

ensure_reader_credentials() {
  local identity_state partial
  local reader_json='null'
  if read_reader_secret_if_present; then
    reader_json="$(printf '{"accessKeyId":%s,"secretAccessKey":%s}' \
      "$(json_escape "$READER_ACCESS_KEY")" "$(json_escape "$READER_SECRET_KEY")")"
    unset READER_ACCESS_KEY READER_SECRET_KEY
  fi
  partial=0
  if partial_reader_repair_required; then
    partial=1
  fi
  identity_state="absent"
  if [[ "$reader_json" == "null" ]]; then
    identity_state="$(probe_reader_identity_state)"
  fi
  local decision_body
  decision_body="$(node -e '
    const readerSecret = process.argv[1] === "null" ? null : JSON.parse(process.argv[1]);
    process.stdout.write(JSON.stringify({
      readerSecret,
      identityState: process.argv[2],
      partialRepairRequired: process.argv[3] === "1",
    }));
  ' "$reader_json" "$identity_state" "$partial")"
  local decision action reason
  decision="$(printf '%s\n' "$decision_body" | node "$CREDENTIALS_MJS" decide-reader)"
  action="$(node -e 'let d=JSON.parse(process.argv[1]);process.stdout.write(d.action)' "$decision")"
  reason="$(node -e 'let d=JSON.parse(process.argv[1]);process.stdout.write(d.reason||"")' "$decision")"
  if [[ "$action" == "refuse" ]]; then
    fail "Refusing reader credentials: ${reason}. Repair the partial reader state explicitly; this smoke does not rotate credentials."
  fi
  if [[ "$action" == "reuse" ]]; then
    echo "Reusing existing document-reader-s3."
    return 0
  fi

  local reader_access reader_secret configure_ok
  reader_access="$(openssl rand -hex 16)"
  reader_secret="$(openssl rand -hex 32)"
  configure_ok=0
  for _ in 1 2 3 4 5 6 7 8; do
    if "${KUBECTL[@]}" -n lab-objects exec -i deploy/object-store -- /bin/sh -s <<EOF
set -eu
printf '%s\n' "s3.configure -user=${READER_IDENTITY} -actions=Read -buckets=lab-objects -access_key=${reader_access} -secret_key=${reader_secret} -apply" exit | weed shell -master=127.0.0.1:9333 >${READER_CONFIGURE_LOG} 2>&1
EOF
    then
      configure_ok=1
      break
    fi
    sleep 3
  done
  if [[ "$configure_ok" -ne 1 ]]; then
    "${KUBECTL[@]}" -n lab-objects exec deploy/object-store -- cat "${READER_CONFIGURE_LOG}" 2>/dev/null \
      | sed -e "s/${reader_access}/[redacted]/g" -e "s/${reader_secret}/[redacted]/g" >&2 \
      || true
    unset reader_access reader_secret
    fail "Could not add the read-only identity on the existing store. Partial state may remain; repair explicitly before retrying."
  fi
  if ! "${KUBECTL[@]}" -n "$NS" get namespace "$NS" >/dev/null 2>&1; then
    "${KUBECTL[@]}" apply -f "$ACCESS_DIR/namespace.yaml"
  fi
  "${KUBECTL[@]}" -n "$NS" create secret generic document-reader-s3 \
    --from-literal="access-key-id=${reader_access}" \
    --from-literal="secret-access-key=${reader_secret}" \
    >/dev/null
  unset reader_access reader_secret
  echo "Created document-reader-s3."
}

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

"${KUBECTL[@]}" -n lab-objects rollout status deployment/object-store --timeout=240s

ensure_writer_secret
ensure_reader_credentials

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
