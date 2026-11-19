#!/usr/bin/env bash
# TTL expiry, flush, and connection-loss smoke for one disposable lab Redis.
# Does not delete the cluster, Docker volumes, or foreign kubectl contexts.
# Does not install the game, PostgreSQL, Temporal, or a worker.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "smoke.sh takes no arguments." >&2
  exit 2
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/lib.sh"
REDIS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi

cleanup() {
  local status=$?
  "${KUBECTL[@]}" -n lab-a delete pod redis-client --ignore-not-found --wait=true >/dev/null 2>&1 || true
  "${KUBECTL[@]}" -n lab-a delete deployment redis --ignore-not-found --wait=true >/dev/null 2>&1 || true
  "${KUBECTL[@]}" -n lab-a delete svc redis --ignore-not-found >/dev/null 2>&1 || true
  "${KUBECTL[@]}" -n lab-a delete configmap redis-config --ignore-not-found >/dev/null 2>&1 || true
  exit "$status"
}
trap cleanup EXIT

if grep -Ei 'requirepass|REDIS_PASSWORD|password:' "$REDIS_DIR/redis.yaml" >/dev/null; then
  echo "Refusing to apply Redis: the manifest contains authentication material." >&2
  exit 1
fi

work="$(mktemp -d)"
snapshot_volumes "$work/volumes-before"
snapshot_foreign_contexts "$work/contexts-before"

# kind load docker-image uses ctr import --all-platforms, which rejects this
# single-platform image with "content digest ... not found". Import the saved
# image without that flag. If import fails, the kubelet can still pull the pin.
image_ref="docker.io/library/redis:8.2.1-alpine"
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

"${KUBECTL[@]}" apply -f "$REDIS_DIR/redis.yaml"
"${KUBECTL[@]}" apply -f "$REDIS_DIR/client.yaml"
"${KUBECTL[@]}" -n lab-a rollout status deployment/redis --timeout=180s
"${KUBECTL[@]}" -n lab-a wait --for=condition=Ready pod/redis-client --timeout=180s

svc_type="$("${KUBECTL[@]}" -n lab-a get svc redis -o jsonpath='{.spec.type}')"
echo "Service type: ${svc_type}"
if [[ "$svc_type" != "ClusterIP" ]]; then
  echo "Redis Service is not ClusterIP." >&2
  exit 1
fi

mem_limit="$("${KUBECTL[@]}" -n lab-a get deployment redis -o jsonpath='{.spec.template.spec.containers[0].resources.limits.memory}')"
cpu_limit="$("${KUBECTL[@]}" -n lab-a get deployment redis -o jsonpath='{.spec.template.spec.containers[0].resources.limits.cpu}')"
echo "Memory limit: ${mem_limit}"
echo "CPU limit: ${cpu_limit}"
if [[ -z "$mem_limit" || -z "$cpu_limit" ]]; then
  echo "Redis is missing a cpu or memory limit." >&2
  exit 1
fi

probe="$("${KUBECTL[@]}" -n lab-a get deployment redis -o jsonpath='{.spec.template.spec.containers[0].livenessProbe.exec.command}')"
echo "Liveness probe: ${probe}"
case "$probe" in
  *ping*) ;;
  *)
    echo "Redis liveness probe does not ping." >&2
    exit 1
    ;;
esac

image="$("${KUBECTL[@]}" -n lab-a get deployment redis -o jsonpath='{.spec.template.spec.containers[0].image}')"
image_id="$("${KUBECTL[@]}" -n lab-a get pod -l app=redis -o jsonpath='{.items[0].status.containerStatuses[0].imageID}')"
version="$("${KUBECTL[@]}" -n lab-a exec deployment/redis -- redis-server --version)"
echo "Image: ${image}"
echo "Image ID: ${image_id}"
echo "Version: ${version}"

lab_pods="$("${KUBECTL[@]}" -n lab-a get pods --no-headers -o custom-columns=NAME:.metadata.name)"
echo "lab-a pods:"
printf '%s\n' "$lab_pods"
extra="$(printf '%s\n' "$lab_pods" | grep -v -E '^redis-[a-z0-9]+-[a-z0-9]+$' | grep -vx 'redis-client' || true)"
if [[ -n "$extra" ]]; then
  echo "lab-a has a pod this smoke did not create." >&2
  printf '%s\n' "$extra" >&2
  exit 1
fi

cli() {
  "${KUBECTL[@]}" -n lab-a exec pod/redis-client -- redis-cli --raw -h redis "$@"
}

set_reply="$(cli SET lab:ttl hello EX 4)"
echo "SET TTL reply: ${set_reply}"
[[ "$set_reply" == "OK" ]]
hit="$(cli GET lab:ttl)"
echo "GET before expiry: ${hit}"
[[ "$hit" == "hello" ]]
ttl="$(cli TTL lab:ttl)"
echo "TTL seconds: ${ttl}"
if [[ "$ttl" -le 0 || "$ttl" -gt 4 ]]; then
  echo "TTL was not a short positive expiry." >&2
  exit 1
fi
sleep 5
miss="$(cli GET lab:ttl || true)"
echo "GET after expiry: [${miss}]"
if [[ -n "$miss" ]]; then
  echo "Key survived its TTL." >&2
  exit 1
fi

flush_set="$(cli SET lab:flush present)"
echo "SET flush reply: ${flush_set}"
[[ "$flush_set" == "OK" ]]
flush_reply="$(cli FLUSHALL)"
echo "FLUSHALL reply: ${flush_reply}"
[[ "$flush_reply" == "OK" ]]
flushed="$(cli GET lab:flush || true)"
echo "GET after flush: [${flushed}]"
if [[ -n "$flushed" ]]; then
  echo "Key survived FLUSHALL." >&2
  exit 1
fi

restart_set="$(cli SET lab:restart present)"
echo "SET restart reply: ${restart_set}"
[[ "$restart_set" == "OK" ]]

"${KUBECTL[@]}" -n lab-a scale deployment/redis --replicas=0
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do
  if ! "${KUBECTL[@]}" -n lab-a get pod -l app=redis --no-headers 2>/dev/null | grep -q .; then
    break
  fi
  sleep 1
done
if "${KUBECTL[@]}" -n lab-a get pod -l app=redis --no-headers 2>/dev/null | grep -q .; then
  echo "Redis pod was still present after scale to zero." >&2
  exit 1
fi

loss_status=0
loss_out="$("${KUBECTL[@]}" -n lab-a exec pod/redis-client -- redis-cli -h redis ping 2>&1)" || loss_status=$?
echo "Ping during outage exit ${loss_status}: ${loss_out}"
if [[ "$loss_status" -eq 0 ]]; then
  echo "Redis still answered while the only instance was scaled to zero." >&2
  exit 1
fi

"${KUBECTL[@]}" -n lab-a scale deployment/redis --replicas=1
"${KUBECTL[@]}" -n lab-a rollout status deployment/redis --timeout=180s
pong="$(cli PING)"
echo "PING after recovery: ${pong}"
[[ "$pong" == "PONG" ]]
after="$(cli GET lab:restart || true)"
echo "GET after restart: [${after}]"
if [[ -n "$after" ]]; then
  echo "Key survived a Redis restart." >&2
  exit 1
fi

echo "Authoritative game state was not stored in Redis. The missing key is a cache miss, not a lost story record."

assert_loopback_only
snapshot_volumes "$work/volumes-after"
snapshot_foreign_contexts "$work/contexts-after"
assert_no_volume_loss "$work/volumes-before" "$work/volumes-after"
assert_same_file "$work/contexts-before" "$work/contexts-after" "foreign kubectl contexts"

echo "Smoke passed: TTL expiry, flush, and connection loss. Redis came back empty."
