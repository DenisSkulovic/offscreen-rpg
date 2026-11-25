# Resource inventory | chart 1.8.0

Status: source-derived prediction, NOT a Helm render or live observation. Candidate tag [temporal-1.8.0](https://github.com/temporalio/helm-charts/tree/temporal-1.8.0), commit 01210ac0212049d8f66cf0c249665a031b6852b8. Published pin from [gh-pages index](https://github.com/temporalio/helm-charts/blob/gh-pages/index.yaml); archive bytes not acquired. Review specimen values plus either profile.

## Predicted persistent objects

| Kind | Name | Responsibility |
| --- | --- | --- |
| Deployment | temporal-frontend | Client RPC/HTTP and frontend membership |
| Deployment | temporal-history | History shards and workflow state |
| Deployment | temporal-matching | Task queues |
| Deployment | temporal-worker | Internal Temporal workers |
| Deployment | temporal-admintools | Operational CLI; one replica |
| Deployment | temporal-web | UI |
| Service | temporal-frontend | ClusterIP; gRPC 7233, HTTP 7243 |
| Service | temporal-frontend-headless | Membership/discovery, metrics |
| Service | temporal-history-headless | RPC 7234, membership 6934, metrics 9090 |
| Service | temporal-matching-headless | RPC 7235, membership 6935, metrics 9090 |
| Service | temporal-worker-headless | Worker membership 6939, metrics 9090 |
| Service | temporal-web | ClusterIP 8080 |
| ConfigMap | temporal-config | Server config template, per-pod environment substitution |
| ConfigMap | temporal-dynamic-config | Dynamic config mounted by server |

Six deployments and six Services predicted from inspected service/deployment templates; this is not a complete manifest count. Check whether additional conditional resources render (e.g. shims) before approval. No admin Service required for kubectl exec. Worker headless template also declares an RPC target port even though worker deployment omits the RPC container port; do not invent a client dependency on that port. Confirm intended behavior in render; don't patch vendor templates solely for this discrepancy.

## Hooks

- Job temporal-schema: pre-install/pre-upgrade. Two sequential schema init containers (default, visibility) using admin-tools 1.32.2, followed by completion container. No create-database init containers because createDatabase:false. Schema hook success deleted, failure retained subject to Job TTL. Verify exact names and env wiring in render.
- Pod temporal-test-cluster-health: Helm test hook; executes temporal operator cluster health with TEMPORAL_ADDRESS set to frontend. Not a persistent seventh workload and not executed by helm template. No helm test needed for ordinary dev startup.

## Credential and configuration wiring

server-deployment.yaml uses TEMPORAL_DEFAULT_STORE_PASSWORD and TEMPORAL_VISIBILITY_STORE_PASSWORD via temporal.password-env. _helpers.tpl replaces password values with runtime env references in the server config and strips Helm-only fields (existingSecret, secretKey, createDatabase, manageSchema, defaultDb). server-secret.yaml skips Secret creation when existingSecret is supplied. Both stores refer to temporal-db/password in the proposed values. The Secret is provisioned before the schema hook; no secret bytes in chart or Git. Schema Job uses temporal.admintools-env for each store; verify the actual rendered Secret references, SQL plugin/host/port/user/database values before approval.

## Design implications

- Native frontend gRPC readiness is exposed by the template; other RPC services default to TCP readiness and liveness. Internal worker has no default RPC readiness probe. Deployment availability plus frontend health is a basic operational signal, not proof of successful workflows. Independent fixture remains necessary.
- Upstream config template contains a publicClient hostPort value pointing to the frontend service. This is Temporal client configuration, not Kubernetes hostPort exposure. Do not confuse the two during render review.
- Upstream config uses the pod IP for membership and dynamically loads configuration every 10s. No custom service discovery code needed.
- Schema hook and health test use admin-tools image from one chart value. No separate hard-coded CLI image per slot.
- Chart 1.8.0 allows per-role image override, but none is selected. Image construction still uses repository:tag, so image immutability is a separate unresolved distribution decision.
- Version 1.8.0 fixes helper address construction and removes Helm-only schema fields before server config; no reason to prefer earlier candidate based on inspected changes. Existing data/version compatibility remains unverified.

## Evidence needed next

Run exact checksum + Helm lint/template commands in [specimen README](README.md) in a network-enabled Helm environment. Compare predicted inventory to actual output, verify Secret references and Job commands, verify no Ingress/NodePort/hostPort/DB workload/PVC/namespace hook. Do not commit generated manifests as desired configuration. Record discrepancies, then amend values or design. No live deployment, old folder inspection or implementation authorization.
