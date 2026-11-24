#!/usr/bin/env bash
# Import the pinned Seyda Neen fixture into the existing lab object store,
# then read the same hashes from a different Job. Requires object storage install first.
# Does not delete the cluster, Docker volumes, or foreign kubectl contexts.
# Does not print Secret values. Does not install the Nest API or the worker.
# A local fixture-pin.json is not this proof.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "smoke.sh takes no arguments." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../../../clusters/kind/release/lib.sh"
BOOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NS=lab-content-bootstrap
BOOTSTRAP_IMAGE=offscreen-lab-content-bootstrap:boot02
WORLD_HASH=5b37ec632d019c983e25f5d481ed2b23c1de464e5932994be16c5befcbc75ec9
RULE_HASH=d643427fa3292ce61484deb15f2e9fc6755c613b17260db6f390ea23bd99d7ab
START_HASH=e30eaa27407abe8a015b21cad62f30b81b07ee7af3b89634501fe3787d8d2813
READER_IDENTITY=content-reader
READER_CONFIGURE_LOG=/tmp/content-reader-configure.out
CREDENTIALS_MJS="$BOOT_DIR/credentials.mjs"

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
    echo "Loading ${image_ref} into ${CLUSTER_NAME}"
    if ! kind load docker-image "$image_ref" --name "$CLUSTER_NAME"; then
      echo "Refusing to continue: ${image_ref} did not load into ${CLUSTER_NAME}." >&2
      exit 1
    fi
  else
    echo "Local image ${image_ref} is absent. The nodes will pull it."
  fi
}

if ! docker image inspect "$BOOTSTRAP_IMAGE" >/dev/null 2>&1; then
  echo "Building ${BOOTSTRAP_IMAGE}"
  "$BOOT_DIR/build.sh"
fi

import_image "$BOOTSTRAP_IMAGE"

"${KUBECTL[@]}" -n lab-objects rollout status deployment/object-store --timeout=240s

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

read_importer_secret_if_present() {
  IMPORTER_ACCESS_KEY=""
  IMPORTER_SECRET_KEY=""
  if ! "${KUBECTL[@]}" -n "$NS" get secret content-importer-s3 >/dev/null 2>&1; then
    return 1
  fi
  local access_b64 secret_b64
  access_b64="$(secret_field "$NS" content-importer-s3 access-key-id)"
  secret_b64="$(secret_field "$NS" content-importer-s3 secret-access-key)"
  if [[ -z "$access_b64" || -z "$secret_b64" ]]; then
    fail "content-importer-s3 exists but is incomplete."
  fi
  IMPORTER_ACCESS_KEY="$(printf '%s' "$access_b64" | decode_b64)"
  IMPORTER_SECRET_KEY="$(printf '%s' "$secret_b64" | decode_b64)"
  return 0
}

read_reader_secret_if_present() {
  READER_ACCESS_KEY=""
  READER_SECRET_KEY=""
  if ! "${KUBECTL[@]}" -n "$NS" get secret content-reader-s3 >/dev/null 2>&1; then
    return 1
  fi
  local access_b64 secret_b64
  access_b64="$(secret_field "$NS" content-reader-s3 access-key-id)"
  secret_b64="$(secret_field "$NS" content-reader-s3 secret-access-key)"
  if [[ -z "$access_b64" || -z "$secret_b64" ]]; then
    fail "content-reader-s3 exists but is incomplete."
  fi
  READER_ACCESS_KEY="$(printf '%s' "$access_b64" | decode_b64)"
  READER_SECRET_KEY="$(printf '%s' "$secret_b64" | decode_b64)"
  return 0
}

json_escape() {
  node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$1"
}

ensure_importer_secret() {
  read_store_admin_secret
  local existing_json='null'
  if read_importer_secret_if_present; then
    existing_json="$(printf '{"accessKeyId":%s,"secretAccessKey":%s}' \
      "$(json_escape "$IMPORTER_ACCESS_KEY")" "$(json_escape "$IMPORTER_SECRET_KEY")")"
  fi
  local desired_json
  desired_json="$(printf '{"accessKeyId":%s,"secretAccessKey":%s}' \
    "$(json_escape "$STORE_ACCESS_KEY")" "$(json_escape "$STORE_SECRET_KEY")")"
  local decision
  decision="$(printf '{"existing":%s,"desired":%s}\n' "$existing_json" "$desired_json" \
    | node "$CREDENTIALS_MJS" decide-importer)"
  local action reason
  action="$(node -e 'let d=JSON.parse(process.argv[1]);process.stdout.write(d.action)' "$decision")"
  reason="$(node -e 'let d=JSON.parse(process.argv[1]);process.stdout.write(d.reason||"")' "$decision")"
  if [[ "$action" == "refuse" ]]; then
    unset STORE_ACCESS_KEY STORE_SECRET_KEY IMPORTER_ACCESS_KEY IMPORTER_SECRET_KEY
    fail "Refusing importer credentials: ${reason}."
  fi
  if [[ "$action" == "reuse" ]]; then
    echo "Reusing existing content-importer-s3."
    unset STORE_ACCESS_KEY STORE_SECRET_KEY
    return 0
  fi
  "${KUBECTL[@]}" apply -f "$BOOT_DIR/namespace.yaml"
  "${KUBECTL[@]}" -n "$NS" create secret generic content-importer-s3 \
    --from-literal="access-key-id=${STORE_ACCESS_KEY}" \
    --from-literal="secret-access-key=${STORE_SECRET_KEY}" \
    >/dev/null
  echo "Created content-importer-s3."
  unset STORE_ACCESS_KEY STORE_SECRET_KEY IMPORTER_ACCESS_KEY IMPORTER_SECRET_KEY
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
    echo "Reusing existing content-reader-s3."
    return 0
  fi

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
  "${KUBECTL[@]}" apply -f "$BOOT_DIR/namespace.yaml"
  "${KUBECTL[@]}" -n "$NS" create secret generic content-reader-s3 \
    --from-literal="access-key-id=${reader_access}" \
    --from-literal="secret-access-key=${reader_secret}" \
    >/dev/null
  unset reader_access reader_secret
  echo "Created content-reader-s3."
}

if [[ "${OFFSCREEN_CONTENT_BOOTSTRAP_FAULT_INJECTION:-}" != "" ]]; then
  fail "Refusing fault injection: unset OFFSCREEN_CONTENT_BOOTSTRAP_FAULT_INJECTION or set explicit repair authorization elsewhere."
fi

ensure_importer_secret
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