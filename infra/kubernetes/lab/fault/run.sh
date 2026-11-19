#!/usr/bin/env bash
# Kill one RabbitMQ consumer before it acks, then read the same message again.
# Reuses the lab broker and infra/kubernetes/lab/rabbitmq/amqp_smoke.py.
# Does not create or delete the cluster, Docker volumes, or foreign kubectl contexts.
# A pass is at-least-once redelivery on one replica. It is not machine-level HA.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "run.sh takes no arguments." >&2
  exit 2
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$ROOT/../lib.sh"
NS=messaging
POD=lab-broker-server-0
IMAGE="docker.io/library/python:3.12-alpine@sha256:c5ba3deef00c7758561a0f03c26f44f10589263d40e732b8748e0d1f38f6dd89"

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "SUITE-NOT-RUN: cluster ${CLUSTER_NAME} is absent. This script does not create it." >&2
  exit 1
fi

cleanup() {
  local status=$?
  "${KUBECTL[@]}" -n "$NS" delete pod fault-publish fault-hold fault-drain --ignore-not-found --wait=false >/dev/null 2>&1 || true
  "${KUBECTL[@]}" -n "$NS" delete configmap fault-smoke-script --ignore-not-found >/dev/null 2>&1 || true
  exit "$status"
}
trap cleanup EXIT

work="$(mktemp -d)"
snapshot_volumes "$work/volumes-before"
snapshot_foreign_contexts "$work/contexts-before"

mem_kib() {
  awk '/MemAvailable:/ {print $2}' /proc/meminfo
}

echo "MemAvailable KiB at start: $(mem_kib)"
echo "Versions"
docker version --format 'Docker {{.Server.Version}}'
kind version
kubectl version --client=true
"${KUBECTL[@]}" version

if ! "${KUBECTL[@]}" -n "$NS" wait --for=condition=Ready "pod/${POD}" --timeout=30s; then
  echo "Broker pod ${POD} is not Ready. Run infra/kubernetes/lab/rabbitmq/install.sh first." >&2
  exit 1
fi

replicas="$("${KUBECTL[@]}" -n "$NS" get rabbitmqcluster lab-broker -o jsonpath='{.spec.replicas}')"
echo "Replicas: ${replicas}"
if [[ "$replicas" != "1" ]]; then
  echo "Expected 1 replica, got ${replicas}." >&2
  exit 1
fi
broker_uid="$("${KUBECTL[@]}" -n "$NS" get pod "$POD" -o jsonpath='{.metadata.uid}')"
echo "Broker pod uid: ${broker_uid}"

queue_line="$("${KUBECTL[@]}" -n "$NS" exec "$POD" -- rabbitmqctl list_queues name messages messages_unacknowledged --quiet)"
printf '%s\n' "$queue_line"
if ! printf '%s\n' "$queue_line" | grep -q $'^lab.durable\t0\t0$'; then
  echo "lab.durable is not empty. Refusing to mix this run with leftover messages." >&2
  exit 1
fi

run_id="fault-$(python3 -c 'import secrets; print(secrets.token_hex(8))')"
if ! [[ "$run_id" =~ ^fault-[0-9a-f]{16}$ ]]; then
  echo "Run id ${run_id} is not traceable." >&2
  exit 1
fi
echo "run-id:${run_id}"

"${KUBECTL[@]}" -n "$NS" create configmap fault-smoke-script \
  --from-file=amqp_smoke.py="$ROOT/../rabbitmq/amqp_smoke.py" \
  --from-file=worker_loss.py="$ROOT/worker_loss.py"

apply_client() {
  local name="$1"
  shift
  "${KUBECTL[@]}" -n "$NS" delete pod "$name" --ignore-not-found --wait=true >/dev/null
  local args=""
  local arg
  for arg in "$@"; do
    args+=$'\n'"        - ${arg}"
  done
  "${KUBECTL[@]}" -n "$NS" apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: ${name}
  namespace: ${NS}
  labels:
    offscreen.rpg/lab: disposable
    app: fault-smoke
spec:
  restartPolicy: Never
  automountServiceAccountToken: false
  containers:
    - name: worker
      image: ${IMAGE}
      imagePullPolicy: IfNotPresent
      command:
        - python3
        - /opt/worker_loss.py${args}
      env:
        - name: AMQP_HOST
          value: lab-broker
        - name: AMQP_USER
          valueFrom:
            secretKeyRef:
              name: lab-broker-user
              key: username
        - name: AMQP_PASS
          valueFrom:
            secretKeyRef:
              name: lab-broker-user
              key: password
      resources:
        requests:
          cpu: 50m
          memory: 64Mi
        limits:
          cpu: 200m
          memory: 128Mi
      volumeMounts:
        - name: script
          mountPath: /opt
          readOnly: true
  volumes:
    - name: script
      configMap:
        name: fault-smoke-script
EOF
}

wait_succeeded() {
  local name="$1"
  if ! "${KUBECTL[@]}" -n "$NS" wait --for=jsonpath='{.status.phase}'=Succeeded "pod/${name}" --timeout=180s; then
    "${KUBECTL[@]}" -n "$NS" logs "pod/${name}" || true
    "${KUBECTL[@]}" -n "$NS" describe "pod/${name}" || true
    return 1
  fi
  "${KUBECTL[@]}" -n "$NS" logs "pod/${name}"
}

apply_client fault-publish publish "$run_id"
wait_succeeded fault-publish | tee "$work/publish.log"
grep -qx "PUBLISHED ${run_id}" "$work/publish.log"

apply_client fault-hold hold
held=0
for _ in $(seq 1 60); do
  if "${KUBECTL[@]}" -n "$NS" logs pod/fault-hold 2>/dev/null | tee "$work/hold.log" | grep -qx "APPLY ${run_id} redelivered=0"; then
    held=1
    break
  fi
  phase="$("${KUBECTL[@]}" -n "$NS" get pod fault-hold -o jsonpath='{.status.phase}' 2>/dev/null || true)"
  if [[ "$phase" == "Failed" || "$phase" == "Succeeded" ]]; then
    "${KUBECTL[@]}" -n "$NS" logs pod/fault-hold || true
    break
  fi
  sleep 2
done
if [[ "$held" -ne 1 ]]; then
  echo "Hold worker did not apply ${run_id} before ack." >&2
  exit 1
fi
grep -qx "APPLY ${run_id} redelivered=0" "$work/hold.log"
echo "APPLY ${run_id} redelivered=0"

worker_uid="$("${KUBECTL[@]}" -n "$NS" get pod fault-hold -o jsonpath='{.metadata.uid}')"
echo "Worker pod uid before delete: ${worker_uid}"
echo "Deleting the hold worker before ack. The broker pod stays."
"${KUBECTL[@]}" -n "$NS" delete pod fault-hold --grace-period=0 --force --wait=true
echo "MemAvailable KiB after worker loss: $(mem_kib)"

ready=0
for _ in $(seq 1 30); do
  queue_line="$("${KUBECTL[@]}" -n "$NS" exec "$POD" -- rabbitmqctl list_queues name messages messages_unacknowledged --quiet)"
  printf '%s\n' "$queue_line" | tee -a "$work/queue-after-loss.log"
  if printf '%s\n' "$queue_line" | grep -q $'^lab.durable\t1\t0$'; then
    ready=1
    break
  fi
  sleep 2
done
if [[ "$ready" -ne 1 ]]; then
  echo "Message ${run_id} was not ready after the worker pod was deleted." >&2
  exit 1
fi
echo "UNAVAILABLE worker pod ${worker_uid} is gone."
echo "NOT-LOST ${run_id} is ready on lab.durable."

broker_uid_after="$("${KUBECTL[@]}" -n "$NS" get pod "$POD" -o jsonpath='{.metadata.uid}')"
if [[ "$broker_uid" != "$broker_uid_after" ]]; then
  echo "Broker pod uid changed during a worker-loss case." >&2
  exit 1
fi

apply_client fault-drain drain
wait_succeeded fault-drain | tee "$work/drain.log"
grep -qx "APPLY ${run_id} redelivered=1" "$work/drain.log"
grep -qx "DRAIN ${run_id} redelivered=1" "$work/drain.log"
echo "REPLAYED ${run_id} redelivered=1"

{
  grep -h '^APPLY ' "$work/hold.log" "$work/drain.log"
} >"$work/applies.log"
set +e
python3 "$ROOT/assert_exactly_once.py" "$work/applies.log" >"$work/negative.log"
negative_status=$?
set -e
cat "$work/negative.log"
if [[ "$negative_status" -eq 0 ]]; then
  echo "The exactly-once assertion passed. Two APPLY lines must fail it." >&2
  exit 1
fi
if [[ "$negative_status" -ne 1 ]]; then
  echo "The exactly-once assertion exited ${negative_status}." >&2
  exit 1
fi
grep -qx "ASSERTION-FAILED duplicated side effect: expected 1 APPLY, saw 2 for ${run_id}" "$work/negative.log"
echo "NEGATIVE-FAILED-AS-REQUIRED duplicated side effect for ${run_id}"

queue_line="$("${KUBECTL[@]}" -n "$NS" exec "$POD" -- rabbitmqctl list_queues name messages messages_unacknowledged --quiet)"
printf '%s\n' "$queue_line"
if ! printf '%s\n' "$queue_line" | grep -q $'^lab.durable\t0\t0$'; then
  echo "Queue was not empty after the replayed ack." >&2
  exit 1
fi

echo "Client image: $("${KUBECTL[@]}" -n "$NS" get pod fault-drain -o jsonpath='{.spec.containers[0].image}')"
echo "Client imageID: $("${KUBECTL[@]}" -n "$NS" get pod fault-drain -o jsonpath='{.status.containerStatuses[0].imageID}')"
echo "MemAvailable KiB after drain: $(mem_kib)"

assert_loopback_only
snapshot_volumes "$work/volumes-after"
snapshot_foreign_contexts "$work/contexts-after"
assert_no_volume_loss "$work/volumes-before" "$work/volumes-after"
assert_same_file "$work/contexts-before" "$work/contexts-after" "foreign kubectl contexts"

echo "Worker-loss smoke passed for ${run_id}: the consumer was deleted before ack; the message stayed on the durable queue; the next delivery was redelivered=1; the exactly-once assertion failed on two APPLY lines. One replica is not machine-level high availability."
