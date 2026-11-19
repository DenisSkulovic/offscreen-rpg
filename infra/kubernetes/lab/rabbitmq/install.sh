#!/usr/bin/env bash
# Install pinned cert-manager, the RabbitMQ cluster operator, and one broker.
# Does not create or delete the kind cluster, Docker volumes, or foreign kubectl contexts.

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "install.sh takes no arguments." >&2
  exit 2
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$ROOT/../lib.sh"

CERT_MANAGER_SHA256="c04a51295adda2b1a775146751f973e787190778c7f35180861d9678876e5c74"
CLUSTER_OPERATOR_SHA256="3ccd8a7c8a7f319ff21c444f3599829242f3cc1c18ae2dedea170cfcefeb8681"
OPERATOR_MANIFEST="$ROOT/vendor/cluster-operator-v2.23.3.yml"
CERT_MANAGER_MANIFEST="$ROOT/vendor/cert-manager-v1.21.3.yaml"

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  echo "Cluster ${CLUSTER_NAME} is not running. Run up.sh first." >&2
  exit 1
fi

echo "${CERT_MANAGER_SHA256}  ${CERT_MANAGER_MANIFEST}" | sha256sum -c -
echo "${CLUSTER_OPERATOR_SHA256}  ${OPERATOR_MANIFEST}" | sha256sum -c -
require_memory

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
snapshot_volumes "$work/volumes-before"
snapshot_foreign_contexts "$work/contexts-before"

echo "Applying cert-manager v1.21.3 for the operator webhook certificates."
"${KUBECTL[@]}" apply --server-side --field-manager=k8s03-rabbitmq -f "$CERT_MANAGER_MANIFEST"
"${KUBECTL[@]}" -n cert-manager rollout status deployment/cert-manager --timeout=240s
"${KUBECTL[@]}" -n cert-manager rollout status deployment/cert-manager-webhook --timeout=240s
"${KUBECTL[@]}" -n cert-manager rollout status deployment/cert-manager-cainjector --timeout=240s

echo "Applying RabbitMQ cluster operator v2.23.3."
applied_operator=0
operator_err="$work/operator-apply.err"
for _ in $(seq 1 24); do
  if "${KUBECTL[@]}" apply --server-side --field-manager=k8s03-rabbitmq -f "$OPERATOR_MANIFEST" 2>"$operator_err"; then
    applied_operator=1
    break
  fi
  cat "$operator_err" >&2
  if ! grep -q 'failed calling webhook\|certificate signed by unknown authority\|connection refused' "$operator_err"; then
    exit 1
  fi
  echo "cert-manager webhook is not ready for the operator certificates. Retrying."
  sleep 5
done
if [[ "$applied_operator" -ne 1 ]]; then
  echo "RabbitMQ cluster operator manifest was not accepted." >&2
  exit 1
fi
"${KUBECTL[@]}" -n rabbitmq-system rollout status deployment/rabbitmq-cluster-operator --timeout=240s

echo "Waiting for the operator webhook CA."
ca_ready=0
for _ in $(seq 1 60); do
  ca="$("${KUBECTL[@]}" get validatingwebhookconfiguration cluster-operator-validating-webhook-configuration -o jsonpath='{.webhooks[0].clientConfig.caBundle}' 2>/dev/null || true)"
  if [[ -n "$ca" ]]; then
    ca_ready=1
    break
  fi
  sleep 2
done
if [[ "$ca_ready" -ne 1 ]]; then
  echo "Operator webhook CA was not injected." >&2
  exit 1
fi

echo "Creating namespace messaging and the durable classic queue definition."
"${KUBECTL[@]}" apply -f "$ROOT/namespace.yaml"
"${KUBECTL[@]}" -n messaging create configmap lab-broker-definitions \
  --from-file=definitions.json="$ROOT/definitions.json" \
  --dry-run=client -o yaml | "${KUBECTL[@]}" apply -f -

if "${KUBECTL[@]}" -n messaging get secret lab-broker-user >/dev/null 2>&1; then
  echo "Secret lab-broker-user already exists. Leaving the generated password in place."
else
  umask 077
  password="$(openssl rand -hex 16)"
  conf="$work/default_user.conf"
  printf 'default_user = lab-client\ndefault_pass = %s\n' "$password" >"$conf"
  "${KUBECTL[@]}" -n messaging create secret generic lab-broker-user \
    --from-file=default_user.conf="$conf" \
    --from-literal=username=lab-client \
    --from-literal=password="$password" \
    --from-literal=provider=rabbitmq \
    --from-literal=type=rabbitmq \
    --from-literal=host=lab-broker.messaging.svc \
    --from-literal=port=5672
  rm -f "$conf"
  unset password
fi

echo "Waiting for the operator webhook endpoint."
"${KUBECTL[@]}" -n rabbitmq-system wait --for=jsonpath='{.subsets[0].addresses[0].ip}' endpoints/cluster-operator-webhook-service --timeout=120s

echo "Nodes pull the pinned broker and client images. kind load rejects these multi-arch indexes."

echo "Applying one-replica broker lab-broker."
applied=0
apply_err="$work/broker-apply.err"
for _ in $(seq 1 24); do
  if "${KUBECTL[@]}" apply -f "$ROOT/broker.yaml" 2>"$apply_err"; then
    applied=1
    break
  fi
  cat "$apply_err" >&2
  if ! grep -q 'failed calling webhook\|connection refused' "$apply_err"; then
    exit 1
  fi
  echo "Webhook is not accepting calls yet. Retrying."
  sleep 5
done
if [[ "$applied" -ne 1 ]]; then
  echo "Broker was not accepted by the operator webhook." >&2
  exit 1
fi
if "${KUBECTL[@]}" -n messaging get pod lab-broker-server-0 >/dev/null 2>&1; then
  echo "Restarting lab-broker-server-0 so it reloads the definitions file."
  "${KUBECTL[@]}" -n messaging delete pod lab-broker-server-0 --wait=true
fi
ready=0
import_errors=0
for _ in $(seq 1 40); do
  state="$("${KUBECTL[@]}" -n messaging get rabbitmqcluster lab-broker -o jsonpath='{.status.conditions[?(@.type=="AllReplicasReady")].status}' 2>/dev/null || true)"
  if [[ "$state" == "True" ]]; then
    ready=1
    break
  fi
  echo "Broker AllReplicasReady=${state:-absent}"
  "${KUBECTL[@]}" -n messaging get pods -o wide || true
  boot_log="$("${KUBECTL[@]}" -n messaging logs pod/lab-broker-server-0 -c rabbitmq --tail=40 2>/dev/null || true)"
  printf '%s\n' "$boot_log" | grep -E 'BOOT FAILED|prior to importing|no such|Error' | tail -5 || true
  if printf '%s\n' "$boot_log" | grep -q 'prior to importing definitions'; then
    import_errors=$((import_errors + 1))
    echo "Definitions import still cannot see virtual host /."
    if [[ "$import_errors" -ge 2 ]]; then
      printf '%s\n' "$boot_log" | grep -F 'prior to importing definitions' | tail -5 >&2
      exit 1
    fi
  fi
  sleep 10
done
if [[ "$ready" -ne 1 ]]; then
  echo "Broker did not become ready." >&2
  "${KUBECTL[@]}" -n messaging describe rabbitmqcluster lab-broker || true
  "${KUBECTL[@]}" -n messaging describe pod lab-broker-server-0 || true
  "${KUBECTL[@]}" -n messaging logs pod/lab-broker-server-0 --all-containers --tail=120 || true
  exit 1
fi
"${KUBECTL[@]}" -n messaging wait --for=condition=Ready pod/lab-broker-server-0 --timeout=60s
echo "Users"
"${KUBECTL[@]}" -n messaging exec pod/lab-broker-server-0 -- rabbitmqctl list_users
if ! "${KUBECTL[@]}" -n messaging exec pod/lab-broker-server-0 -- rabbitmqctl list_users --quiet | awk '{print $1}' | grep -qx lab-client; then
  echo "lab-client was not created from the external secret." >&2
  "${KUBECTL[@]}" -n messaging exec pod/lab-broker-server-0 -- sh -c 'test -f /etc/rabbitmq/conf.d/11-default_user.conf && echo default-user-conf-present || echo default-user-conf-missing'
  "${KUBECTL[@]}" -n messaging logs pod/lab-broker-server-0 -c rabbitmq --tail=40 || true
  exit 1
fi
echo "Importing the durable queue after lab-client exists."
"${KUBECTL[@]}" -n messaging exec pod/lab-broker-server-0 -- sh -c '
set -eu
conf=/etc/rabbitmq/conf.d/11-default_user.conf
user=$(sed -n "s/^default_user = //p" "$conf")
pass=$(sed -n "s/^default_pass = //p" "$conf")
test "$user" = "lab-client"
rabbitmqadmin --non-interactive --host 127.0.0.1 --port 15672 --username "$user" --password "$pass" definitions import --file /etc/rabbitmq/definitions.json
'
echo "Queues"
"${KUBECTL[@]}" -n messaging exec pod/lab-broker-server-0 -- rabbitmqctl list_queues name durable type --quiet

assert_loopback_only
snapshot_volumes "$work/volumes-after"
snapshot_foreign_contexts "$work/contexts-after"
assert_no_volume_loss "$work/volumes-before" "$work/volumes-after"
assert_same_file "$work/contexts-before" "$work/contexts-after" "foreign kubectl contexts"
awk '/MemAvailable:/ {print}' /proc/meminfo
echo "Broker lab-broker is ready in namespace messaging. Replicas: 1. User: lab-client."
