# Resource inventory | chart 1.8.0

Status: baseline render inventory confirmed in owner WSL terminal; not live installation. Candidate tag [temporal-1.8.0](https://github.com/temporalio/helm-charts/tree/temporal-1.8.0), commit 01210ac0212049d8f66cf0c249665a031b6852b8. Published pin from [gh-pages index](https://github.com/temporalio/helm-charts/blob/gh-pages/index.yaml); archive SHA-256 verified OK. Review specimen values plus either profile.

## Rendered persistent object inventory

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

Six Deployments, six Services, two ConfigMaps, one Job and one test Pod observed in each baseline render (16 total, 1109 lines). No additional conditional resources in inventory. No admin Service required for kubectl exec. Worker headless template also declares an RPC target port even though worker deployment omits the RPC container port; do not invent a client dependency on that port. Confirm intended behavior in render; don't patch vendor templates solely for this discrepancy.

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
- Chart 1.8.0 allows per-role image override, but none is selected. Image construction still uses repository:tag, so server tag+digest render succeeded; all three index digests recorded and added to specimen. Pinned dev render confirmed ten image-only substitutions; pinned release render not run.
- Version 1.8.0 fixes helper address construction and removes Helm-only schema fields before server config; no reason to prefer earlier candidate based on inspected changes. Existing data/version compatibility remains unverified.

## Evidence needed next

See [observed terminal evidence](../FINDINGS.md). Final pinned dev rendering confirmed via equivalent overlay; pinned release render, exact final integrated regression, runtime schema/connectivity, API acceptance and migration remain unproven. No generated manifests committed as desired source.
