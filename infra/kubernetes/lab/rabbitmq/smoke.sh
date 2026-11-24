#!/usr/bin/env bash
# Publish three persistent messages, restart the broker, ack one, crash before the next ack, and observe redelivery.
# Does not delete the cluster, the broker, Docker volumes, or foreign kubectl contexts.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "smoke.sh takes no arguments." >&2
  exit 2
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$ROOT/../../../clusters/kind/release/lib.sh"
NS=messaging
POD=lab-broker-server-0

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi

cleanup() {
  local status=$?
  "${KUBECTL[@]}" -n "$NS" delete pod amqp-publish amqp-ack amqp-hold amqp-drain amqp-guest --ignore-not-found --wait=false >/dev/null 2>&1 || true
  "${KUBECTL[@]}" -n "$NS" delete configmap amqp-smoke-script --ignore-not-found >/dev/null 2>&1 || true
  exit "$status"
}
trap cleanup EXIT

work="$(mktemp -d)"
snapshot_volumes "$work/volumes-before"
snapshot_foreign_contexts "$work/contexts-before"

echo "Versions"
docker version --format 'Docker {{.Server.Version}}'
kind version
kubectl version --client=true
"${KUBECTL[@]}" version
echo "Operator image: $("${KUBECTL[@]}" -n rabbitmq-system get deployment rabbitmq-cluster-operator -o jsonpath='{.spec.template.spec.containers[0].image}')"
echo "Broker image: $("${KUBECTL[@]}" -n "$NS" get pod "$POD" -o jsonpath='{.spec.containers[?(@.name=="rabbitmq")].image}')"
echo "Broker imageID: $("${KUBECTL[@]}" -n "$NS" get pod "$POD" -o jsonpath='{.status.containerStatuses[?(@.name=="rabbitmq")].imageID}')"
echo "Replicas: $("${KUBECTL[@]}" -n "$NS" get rabbitmqcluster lab-broker -o jsonpath='{.spec.replicas}')"
echo "Service: $("${KUBECTL[@]}" -n "$NS" get svc lab-broker -o jsonpath='{.spec.type}')"
"${KUBECTL[@]}" -n "$NS" exec "$POD" -- rabbitmqctl version

replicas="$("${KUBECTL[@]}" -n "$NS" get rabbitmqcluster lab-broker -o jsonpath='{.spec.replicas}')"
if [[ "$replicas" != "1" ]]; then
  echo "Expected 1 replica, got ${replicas}." >&2
  exit 1
fi

echo "Users"
"${KUBECTL[@]}" -n "$NS" exec "$POD" -- rabbitmqctl list_users
if "${KUBECTL[@]}" -n "$NS" exec "$POD" -- rabbitmqctl list_users | awk 'NR>1 {print $1}' | grep -qx guest; then
  echo "Guest is present. The declarative user must not be guest." >&2
  exit 1
fi

echo "Queue before publish"
"${KUBECTL[@]}" -n "$NS" exec "$POD" -- rabbitmqctl list_queues name durable type messages arguments

"${KUBECTL[@]}" -n "$NS" create configmap amqp-smoke-script --from-file=amqp_smoke.py="$ROOT/amqp_smoke.py"

apply_client() {
  local name="$1"
  local mode="$2"
  "${KUBECTL[@]}" -n "$NS" delete pod "$name" --ignore-not-found --wait=true >/dev/null
  "${KUBECTL[@]}" -n "$NS" apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: ${name}
  namespace: ${NS}
  labels:
    offscreen.rpg/lab: disposable
    app: amqp-smoke
spec:
  restartPolicy: Never
  automountServiceAccountToken: false
  containers:
    - name: client
      image: docker.io/library/python:3.12-alpine
      imagePullPolicy: IfNotPresent
      command: ["python3", "/opt/amqp_smoke.py", "${mode}"]
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
        name: amqp-smoke-script
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

apply_client amqp-publish publish
wait_succeeded amqp-publish | tee "$work/publish.log"
grep -qx 'PUBLISHED 1' "$work/publish.log"
grep -qx 'PUBLISHED 2' "$work/publish.log"
grep -qx 'PUBLISHED 3' "$work/publish.log"

echo "Restarting the broker pod. The claim stays."
uid_before="$("${KUBECTL[@]}" -n "$NS" get pod "$POD" -o jsonpath='{.metadata.uid}')"
"${KUBECTL[@]}" -n "$NS" delete pod "$POD" --wait=true
"${KUBECTL[@]}" -n "$NS" wait --for=condition=Ready "pod/${POD}" --timeout=420s
uid_after="$("${KUBECTL[@]}" -n "$NS" get pod "$POD" -o jsonpath='{.metadata.uid}')"
if [[ "$uid_before" == "$uid_after" ]]; then
  echo "Broker pod uid did not change." >&2
  exit 1
fi

echo "Queue after broker restart"
queue_line="$("${KUBECTL[@]}" -n "$NS" exec "$POD" -- rabbitmqctl list_queues name durable type messages --quiet)"
printf '%s\n' "$queue_line"
printf '%s\n' "$queue_line" | grep -q $'^lab.durable\ttrue\tclassic\t3$'

apply_client amqp-ack ack-one
wait_succeeded amqp-ack | tee "$work/ack.log"
grep -qx 'ACK 1 redelivered=0' "$work/ack.log"

apply_client amqp-hold hold
held=0
for _ in $(seq 1 60); do
  if "${KUBECTL[@]}" -n "$NS" logs pod/amqp-hold 2>/dev/null | tee "$work/hold.log" | grep -qx 'HOLD 2 redelivered=0'; then
    held=1
    break
  fi
  phase="$("${KUBECTL[@]}" -n "$NS" get pod amqp-hold -o jsonpath='{.status.phase}' 2>/dev/null || true)"
  if [[ "$phase" == "Failed" || "$phase" == "Succeeded" ]]; then
    "${KUBECTL[@]}" -n "$NS" logs pod/amqp-hold || true
    break
  fi
  sleep 2
done
if [[ "$held" -ne 1 ]]; then
  echo "Hold consumer did not take message 2." >&2
  "${KUBECTL[@]}" -n "$NS" logs pod/amqp-hold || true
  "${KUBECTL[@]}" -n "$NS" describe pod/amqp-hold || true
  exit 1
fi
echo "Deleting the hold consumer before ack."
"${KUBECTL[@]}" -n "$NS" delete pod amqp-hold --grace-period=0 --force --wait=true

ready=0
for _ in $(seq 1 30); do
  queue_line="$("${KUBECTL[@]}" -n "$NS" exec "$POD" -- rabbitmqctl list_queues name messages messages_unacknowledged --quiet)"
  printf '%s\n' "$queue_line"
  if printf '%s\n' "$queue_line" | grep -q $'^lab.durable\t2\t0$'; then
    ready=1
    break
  fi
  sleep 2
done
if [[ "$ready" -ne 1 ]]; then
  echo "Message 2 was not requeued after the consumer crash." >&2
  exit 1
fi

apply_client amqp-drain drain
wait_succeeded amqp-drain | tee "$work/drain.log"
grep -qx 'DRAIN 2 redelivered=1' "$work/drain.log"
grep -qx 'DRAIN 3 redelivered=0' "$work/drain.log"

apply_client amqp-guest guest-denied
wait_succeeded amqp-guest | tee "$work/guest.log"
grep -q '^GUEST-DENIED ' "$work/guest.log"
if grep -qx 'GUEST-OPEN' "$work/guest.log"; then
  echo "Guest logged in from another pod." >&2
  exit 1
fi

echo "Client image: $("${KUBECTL[@]}" -n "$NS" get pod amqp-guest -o jsonpath='{.spec.containers[0].image}')"
echo "Client imageID: $("${KUBECTL[@]}" -n "$NS" get pod amqp-guest -o jsonpath='{.status.containerStatuses[0].imageID}')"

assert_loopback_only
snapshot_volumes "$work/volumes-after"
snapshot_foreign_contexts "$work/contexts-after"
assert_no_volume_loss "$work/volumes-before" "$work/volumes-after"
assert_same_file "$work/contexts-before" "$work/contexts-after" "foreign kubectl contexts"

echo "Smoke passed: durable queue kept 3 messages across a broker restart; message 2 was redelivered after the consumer was killed; guest was refused. This is at-least-once delivery on one replica, not exactly-once effects and not high availability."
