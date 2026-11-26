# R1 target criteria (proposed)
 
R1-1 Optionality: explicit rabbitmq selection in dev/release; core and normal dev startup unchanged. all means all supported optional services. One broker per selected cluster, no automatic install or delete on slot activation/park. Profile target assertion before all operations, explicit context on every kubectl command. 
R1-2 Native reconciliation: upstream cert-manager and Cluster Operator manifests, exact checksums and image identities verified before mutation; namespace and RabbitmqCluster are declarative. Never write operator-owned StatefulSet, Service, Secret or configuration directly. Separate cert-manager prerequisite from broker ownership; no adoption, upgrade, deletion or downgrade of foreign cert-manager. Prefer exact known matching installation, otherwise refuse until separately admitted. Operator v2.23.3 requires cert-manager. No topology operator.
R1-3 Proposed specimen (NOT validated): 
```yaml
apiVersion: rabbitmq.com/v1beta1
kind: RabbitmqCluster
metadata:
  name: rabbitmq
  namespace: offscreen-rabbitmq
spec:
  replicas: 1
  image: docker.io/library/rabbitmq:4.3.4-management
  service:
    type: ClusterIP
  persistence:
    storageClassName: local-path
    storage: 5Gi
  resources:
    requests: {cpu: 200m, memory: 1Gi}
    limits: {cpu: 500m, memory: 1Gi}
```
Dev namespace offscreen-dev-rabbitmq, storage class standard. Retain historically exercised CPU and memory envelope rather than arbitrary increase; 5Gi provisional storage, to validate against disk alarms and host budget. Image tag specimen only; resolve digest before commission. No externalSecret, definitions import, default queue type override or operator-owned resource overrides. Management/Prometheus plugins enabled by operator defaults; no ingress/NodePort/LoadBalancer; operator port-forward only, loopback. AMQP plaintext is local-only and not a production security claim. No assumption of NetworkPolicy enforcement; no app credentials distributed.
R1-4 State: durable broker PVC and generated administrator Secret persist across repeat ensure and Pod replacement. Missing secret with retained data refuses; do not reconstruct credentials or claim that operator will restore lost credentials. Never change broker identity or claim size on repeat. Legacy messaging/lab-broker, lab-broker-user and legacy PVC/definitions imply separate occupied admission even when new namespace absent. No destructive migration, upgrade, adoption, namespace/PVC deletion, or reset in this scope.
R1-5 Lifecycle: plan/read status no writes; install preflight classifies full dependency and broker inventory before first write. Fresh eligible only when all relevant resources absent, or independently exact admitted dependencies ready. Matching complete is read-only; drift, foreign, unreadable, partial, not-ready refuse. Distinguish ABSENT from API discovery failure, RBAC denial, timeout. Installation uses ordered bounded stages cert-manager readiness -> operator CRD/webhook readiness -> namespace/broker create -> status. Failure preserves created resources and reports phase; recovery separately reviewed rather than blindly applying. Exact complete inventory/projection and race policy pending R2. Existing host serialization and resource guards retained, no nested lock deadlock.
R1-6 Readiness: current CR observed generation/conditions where actually supported by pinned API; corroborate current StatefulSet rollout, Pod readiness, PVC bound and expected Service ports/endpoints, broker diagnostics for running and local alarms; status never compares queues, users or message counts against fixed inventory. Missing/unreadable/stale evidence is not READY. No secrets in output. Credential authentication separate protocol proof. Distinguish structural readiness and data-plane availability. 
R1-7 General purpose: no permanent application queues, exchanges, bindings, users, vhosts or policies; default upstream broker objects permitted. Future applications own least-privilege users/vhosts and topology. Application integration including outbox/inbox, retries, DLX, ordering and idempotency explicitly deferred. Local singleton cannot tolerate node loss and redelivery is not exactly-once effects.
 
Alternatives: handwritten StatefulSet duplicates operator controller behavior; third-party Helm chart adds lifecycle authority; topology operator adds unused controllers; retain local chart only if common render contract makes that simpler than native manifests. Hosted and multi-node designs deferred until requirements. Never claim production sizing or availability.