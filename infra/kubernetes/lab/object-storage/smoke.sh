#!/usr/bin/env bash
# Put, get, and delete one object, then delete the store Pod and read another object back.
# Does not delete the cluster, the PVC, Docker volumes, or foreign kubectl contexts.
# Does not print Secret values. Does not install the game.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "smoke.sh takes no arguments." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib.sh"
STORE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi

fail() {
  echo "$1" >&2
  "${KUBECTL[@]}" -n lab-objects get pods -o wide >&2 || true
  "${KUBECTL[@]}" -n lab-objects describe pods -l app=object-store >&2 || true
  "${KUBECTL[@]}" -n lab-objects logs -l app=object-store --tail=80 >&2 || true
  exit 1
}

if grep -RniE 'kind:[[:space:]]*Secret|AKIA[0-9A-Z]{16}' "$STORE_DIR" >/dev/null; then
  echo "Refusing to apply: the object-store directory contains a Secret or an access-key literal." >&2
  exit 1
fi

require_memory
docker volume inspect offscreen-rpg_postgres-data >/dev/null
docker volume inspect offscreen-rpg_temporal-data >/dev/null

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
snapshot_volumes "$work/volumes-before"
snapshot_foreign_contexts "$work/contexts-before"

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

access_key="$(openssl rand -hex 16)"
secret_key="$(openssl rand -hex 32)"
"${KUBECTL[@]}" -n lab-objects create secret generic object-store-s3 \
  --from-literal="access-key-id=${access_key}" \
  --from-literal="secret-access-key=${secret_key}" \
  >/dev/null
unset access_key secret_key

"${KUBECTL[@]}" -n lab-objects rollout status deployment/object-store --timeout=240s
"${KUBECTL[@]}" apply -f "$STORE_DIR/client.yaml"
"${KUBECTL[@]}" -n lab-objects wait --for=condition=Ready pod/object-store-client --timeout=240s

svc_type="$("${KUBECTL[@]}" -n lab-objects get svc object-store -o jsonpath='{.spec.type}')"
echo "Service type: ${svc_type}"
if [[ "$svc_type" != "ClusterIP" ]]; then
  fail "Object store Service is not ClusterIP."
fi

mem_limit="$("${KUBECTL[@]}" -n lab-objects get deployment object-store -o jsonpath='{.spec.template.spec.containers[0].resources.limits.memory}')"
cpu_limit="$("${KUBECTL[@]}" -n lab-objects get deployment object-store -o jsonpath='{.spec.template.spec.containers[0].resources.limits.cpu}')"
echo "Memory limit: ${mem_limit}"
echo "CPU limit: ${cpu_limit}"
if [[ -z "$mem_limit" || -z "$cpu_limit" ]]; then
  fail "Object store is missing a cpu or memory limit."
fi

storage_class="$("${KUBECTL[@]}" -n lab-objects get pvc object-store-data -o jsonpath='{.spec.storageClassName}')"
pvc_phase="$("${KUBECTL[@]}" -n lab-objects get pvc object-store-data -o jsonpath='{.status.phase}')"
echo "PVC class: ${storage_class}"
echo "PVC phase: ${pvc_phase}"
if [[ "$storage_class" != "local-path" || "$pvc_phase" != "Bound" ]]; then
  fail "Object store claim is not a Bound local-path volume."
fi

image="$("${KUBECTL[@]}" -n lab-objects get deployment object-store -o jsonpath='{.spec.template.spec.containers[0].image}')"
image_id="$("${KUBECTL[@]}" -n lab-objects get pod -l app=object-store -o jsonpath='{.items[0].status.containerStatuses[0].imageID}')"
echo "Image: ${image}"
echo "Image ID: ${image_id}"

aws_cmd() {
  "${KUBECTL[@]}" -n lab-objects exec pod/object-store-client -- aws --endpoint-url http://object-store:8333 "$@"
}

put_object() {
  local key="$1"
  local body="$2"
  "${KUBECTL[@]}" -n lab-objects exec pod/object-store-client -- \
    sh -c 'printf %s "$1" > /tmp/object-body && aws --endpoint-url http://object-store:8333 s3api put-object --bucket lab-objects --key "$2" --body /tmp/object-body' \
    sh "$body" "$key"
}

get_object() {
  local key="$1"
  "${KUBECTL[@]}" -n lab-objects exec pod/object-store-client -- \
    sh -c 'aws --endpoint-url http://object-store:8333 s3api get-object --bucket lab-objects --key "$1" /tmp/object-out >/dev/null && cat /tmp/object-out' \
    sh "$key"
}

put_reply="$(put_object lifecycle.txt put-ok)"
echo "PUT lifecycle.txt: ${put_reply}"
if [[ "$put_reply" != *ETag* ]]; then
  fail "PUT did not return an ETag. Container start is not S3 compatibility."
fi
got="$(get_object lifecycle.txt)"
echo "GET lifecycle.txt: ${got}"
if [[ "$got" != "put-ok" ]]; then
  fail "GET did not return the object that was put."
fi

delete_reply="$(aws_cmd s3api delete-object --bucket lab-objects --key lifecycle.txt)"
echo "DELETE lifecycle.txt: ${delete_reply}"

miss_status=0
miss_err=""
if miss_err="$(aws_cmd s3api head-object --bucket lab-objects --key lifecycle.txt 2>&1)"; then
  miss_status=0
else
  miss_status=$?
fi
echo "HEAD after delete exit ${miss_status}"
if [[ "$miss_status" -eq 0 ]]; then
  fail "Deleted object was still readable. Delete was not proven."
fi
if [[ "$miss_err" != *404* && "$miss_err" != *Not\ Found* && "$miss_err" != *NoSuchKey* ]]; then
  echo "$miss_err" >&2
  fail "HEAD after delete did not report a missing object."
fi

put_reply="$(put_object restart.txt pod-replace-ok)"
echo "PUT restart.txt: ${put_reply}"
if [[ "$put_reply" != *ETag* ]]; then
  fail "PUT of the restart object did not return an ETag."
fi
got="$(get_object restart.txt)"
echo "GET restart.txt before delete: ${got}"
if [[ "$got" != "pod-replace-ok" ]]; then
  fail "Restart object was not readable before the Pod was deleted."
fi

pod_name="$("${KUBECTL[@]}" -n lab-objects get pod -l app=object-store -o jsonpath='{.items[0].metadata.name}')"
pod_uid_before="$("${KUBECTL[@]}" -n lab-objects get pod "$pod_name" -o jsonpath='{.metadata.uid}')"
pvc_uid_before="$("${KUBECTL[@]}" -n lab-objects get pvc object-store-data -o jsonpath='{.metadata.uid}')"
echo "Pod before delete: ${pod_name}"
echo "Pod uid before delete: ${pod_uid_before}"
echo "PVC uid before delete: ${pvc_uid_before}"

"${KUBECTL[@]}" -n lab-objects delete pod "$pod_name" --wait=true --timeout=180s

deadline=$((SECONDS + 240))
pod_uid_after=""
ready=""
while (( SECONDS < deadline )); do
  pod_uid_after="$("${KUBECTL[@]}" -n lab-objects get pod -l app=object-store -o jsonpath='{.items[0].metadata.uid}' 2>/dev/null || true)"
  ready="$("${KUBECTL[@]}" -n lab-objects get pod -l app=object-store -o jsonpath='{.items[0].status.containerStatuses[0].ready}' 2>/dev/null || true)"
  if [[ -n "$pod_uid_after" && "$pod_uid_after" != "$pod_uid_before" && "$ready" == "true" ]]; then
    break
  fi
  sleep 3
done
if [[ -z "$pod_uid_after" || "$pod_uid_after" == "$pod_uid_before" || "$ready" != "true" ]]; then
  fail "Replacement store Pod did not become ready."
fi

after=""
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  if after="$(get_object restart.txt 2>/dev/null)"; then
    if [[ "$after" == "pod-replace-ok" ]]; then
      break
    fi
  fi
  sleep 3
done
echo "GET restart.txt after Pod delete: ${after}"
if [[ "$after" != "pod-replace-ok" ]]; then
  fail "Deleting the store Pod lost the object. The PVC did not keep it."
fi

still_missing=0
if aws_cmd s3api head-object --bucket lab-objects --key lifecycle.txt >/dev/null 2>&1; then
  still_missing=0
else
  still_missing=$?
fi
echo "HEAD deleted key after Pod replacement exit ${still_missing}"
if [[ "$still_missing" -eq 0 ]]; then
  fail "The deleted object reappeared after the Pod was replaced."
fi

pvc_uid_after="$("${KUBECTL[@]}" -n lab-objects get pvc object-store-data -o jsonpath='{.metadata.uid}')"
if [[ "$pvc_uid_after" != "$pvc_uid_before" ]]; then
  fail "The persistent volume claim changed across the Pod deletion."
fi
echo "Pod uid after delete: ${pod_uid_after}"
echo "PVC uid after delete: ${pvc_uid_after}"

assert_loopback_only
snapshot_volumes "$work/volumes-after"
snapshot_foreign_contexts "$work/contexts-after"
assert_no_volume_loss "$work/volumes-before" "$work/volumes-after"
assert_same_file "$work/contexts-before" "$work/contexts-after" "foreign kubectl contexts"
docker volume inspect offscreen-rpg_postgres-data >/dev/null
docker volume inspect offscreen-rpg_temporal-data >/dev/null

echo "Smoke passed: put, get, and delete, then the object survived store Pod deletion."
echo "Deleting the kind cluster does not preserve local-path data and is not a backup."
