# E2 | Evidence, feasibility and design self-defense

This is the author's investigation at `c3900da1e15bba456c71dcb799698fe2a0f7db5f`, not an independent verdict or implementation receipt. The lean snapshot includes the five observability archives and code, but not the live Docker/Kind state or all historical run receipts. Helm, native render, registry manifest resolution and live endpoint probes were not executed in this investigation. Owner observations are in README. No evidence is inferred from a chart being installed.

## Source specimens and decisions

| Decision | Inspected evidence / discriminating fact | Disposition |
| --- | --- | --- |
| Native Prometheus + KSM rather than Prometheus Operator, metrics-server or custom polling | Vendored `prometheus-31.0.0.tgz` contains KSM 9.1.0 / 2.20.0. `templates/role.yaml` in KSM derives list/watch rights from collectors; default collectors include Secrets/ConfigMaps. `service.yaml` exposes 8080, `selfMonitor.enabled` adds 8081; `_helpers.tpl` renders `registry/repository:tag@digest` with `image.sha`. Parent chart `scrapeConfigs` permits explicit new jobs and `extraManifests` permits owned RBAC/exporter. Existing values disable default discovery and sidecars. | Enable bounded KSM collector set; fixed named service and release-owned RBAC. Separate E2 helper pins. No automatic discovery of arbitrary annotated apps. |
| Direct kubelet metrics | `infra/clusters/kind/dev/kind.yaml` defines two v1.37.0 nodes but no serving TLS bootstrap override. API TLS does not prove kubelet TLS. [Kubernetes kubelet auth](https://kubernetes.io/docs/reference/access-authn-authz/kubelet-authn-authz/) documents `nodes/metrics` and dangerous GET `nodes/proxy`; [kubeadm certificate management](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/) describes serving bootstrap and explicit approval. | Select verified direct access, no proxy/insecure TLS. E2-R trust gate below. If unavailable, only an explicitly approved cluster-owner transition may enable trustworthy certificates. |
| Temporal | Repo `infra/platform/temporal/chart.pin` fixes chart 1.8.0; repo values enable annotations. [Exact 1.8.0 server Deployment template](https://github.com/temporalio/helm-charts/blob/temporal-1.8.0/charts/temporal/templates/server-deployment.yaml) sets instance/name/component selectors and HTTP port 9090. | Fixed per-Pod `/metrics` for four server roles, no use of arbitrary annotations. Native metric families still need observed evidence. |
| PostgreSQL | `infra/platform/postgres/chart/templates/_helpers.tpl` renders CNPG Cluster; vendored operator v1.30.2; [CNPG 1.30 security port reference](https://cloudnative-pg.io/docs/1.30/security/) and [monitoring](https://cloudnative-pg.io/docs/1.30/monitoring/) describe instance port 9187. | Fixed Pod discovery for `dev-pg`, named metrics port, verify actual protocol and labels. No PostgreSQL credential, custom SQL or query text. |
| RabbitMQ | `infra/platform/rabbitmq/readiness.mjs` named port `prometheus` 15692; broker template is operator-owned `RabbitmqCluster`, single replica. | Existing aggregate `/metrics` endpoint on internal Service; no per-queue series explosion or broker mutation. |
| Redis | `infra/platform/redis/chart/templates/_helpers.tpl` config binds all interfaces, protected-mode no, no persistence/ACL credentials. Service 6379. [Redis exporter release v1.93.0](https://github.com/oliver006/redis_exporter/releases/tag/v1.93.0) and [tagged documentation](https://github.com/oliver006/redis_exporter/tree/v1.93.0) identify native exporter choice. | Dedicated single-target exporter, disable arbitrary scrape endpoint/config/key collection; digest and exact tagged flag/metric proof still gated. Do not claim hard Redis read-only access enforced by existing Redis. No new auth model in E2. |
| SeaweedFS | Dev `object-storage/providers/seaweedfs/chart/templates/deployment.yaml` uses `mini -dir=/data`, only port 8333 exposed, image 4.54. [Exact 4.54 mini source](https://github.com/seaweedfs/seaweedfs/blob/4.54/weed/command/mini.go) defines `metricsPort` default 0 and `metricsIp`. Owner observer validates workload/container spec precisely. | Native metrics listener selected, no new exporter. Requires independent safe owner transition before scrape is enabled; no unsupported implicit Helm upgrade. |
| Grafana | Vendored 14.6.1 `dashboards-json-configmap.yaml`, `_pod.tpl`, `deployment.yaml` and values show `dashboards.<provider>.<name>.json` native ConfigMap, file mount and checksum rollout. Default Service port 80. | `--set-file` on shared descriptor; stable provider and UIDs, no new sidecar or download. |
| Occupied transition | `artifacts.mjs` currently allows only five roles, primary workload and namespace-only kinds; `loadObservabilityVariants` derives old Collector predecessor by base values. `upgrade.mjs` rejects nonempty argv and supports Collector-only preservation; `custody.mjs` validates operation kinds; `readiness.mjs` has exact direct inventory/Helm revision and image checks. Prometheus chart default Deployment strategy Recreate. | Explicit E1/E2 descriptors, bounded external RBAC ownership, distinct E2 guarded operation, no auto-recovery or broad shape acceptance. Keep E1/release behavior. |

## Concrete query and configuration specimens

Specimens establish design contracts, not a deployable manifest or test receipt. Freeze exact labels/metric families against the actual pinned render and native source before dispatch. No placeholder job/metric is treated as success.

```yaml
# E2-I values specimen, not an implementation file; digest supplied by verified lock.
kube-state-metrics:
  enabled: true
  fullnameOverride: obs-kube-state-metrics
  replicas: 1
  updateStrategy: Recreate
  prometheusScrape: false
  selfMonitor: {enabled: true}
  service: {type: ClusterIP, port: 8080}
  collectors: [nodes, namespaces, pods, deployments, replicasets, statefulsets, daemonsets, jobs, persistentvolumeclaims, persistentvolumes]
  metricLabelsAllowlist: []
  metricAnnotationsAllowList: []
  serviceAccount: {create: true, name: obs-kube-state-metrics}
  rbac: {create: true, useClusterRole: true}
  image: {tag: v2.20.0} # sha supplied from immutable helper lock, never render/install this specimen alone
  resources:
    requests: {cpu: 50m, memory: 64Mi}
    limits: {memory: 128Mi}
scrapeConfigs:
  kube-state-metrics:
    enabled: true
    static_configs:
      - targets: [obs-kube-state-metrics:8080]
  kube-state-metrics-self:
    enabled: true
    static_configs:
      - targets: [obs-kube-state-metrics:8081]
```

KSM metric families for initial dashboards: `kube_node_info`, `kube_node_status_condition`, `kube_node_status_capacity`, `kube_node_status_allocatable`; `kube_namespace_status_phase`; `kube_pod_info`, `kube_pod_status_phase`, `kube_pod_status_ready`, `kube_pod_status_scheduled`, `kube_pod_owner`, `kube_pod_container_status_running`, `kube_pod_container_status_restarts_total`, `kube_pod_container_status_last_terminated_reason`, resource requests/limits; Deployment/ReplicaSet/StatefulSet/DaemonSet desired and available counts, Job completion/failure, PVC status/request and PV capacity/status. Freeze precise family/label list, including `uid` where present; drop entire unneeded info/label/annotation metrics rather than collapsing distinct series by indiscriminate label dropping. Inspect KSM self `kube_state_metrics_list_total` / `kube_state_metrics_watch_total` resource and result labels: require initial successful list per selected resource, current scrape, and surface recent list/watch errors as degraded (not historical error forever). For a detected watch interruption, show inventory uncertainty rather than authoritative absence. Even a fresh KSM scrape and successful earlier list/watch counters do not prove current API state; qualify observed absence accordingly and compare with native kubectl in joint qualification. Require no missing collector silently treated as zero.

```promql
# Target freshness; instant query, no or-vector zero substitution.
(up == 1) and (time() - timestamp(up) <= 90)
# Pod phase: include only true phase gauge; no absent-series fallback.
count by (namespace, phase) (kube_pod_status_phase == 1)
# E2-R only after authenticated collection is proven.
sum by (namespace) (rate(container_cpu_usage_seconds_total{job="kubelet-cadvisor",pod!="",container!="",container!="POD"}[5m]))
sum by (namespace) (container_memory_working_set_bytes{job="kubelet-cadvisor",pod!="",container!="",container!="POD"})
```

For CPU/memory above verify one series per running regular container (counter reset, Pod UID churn, duplicate scrape and ended container negative). Do not add node totals to container totals. For freshness use exact job/instance expectation and healthy KSM guard; the sample-age query does not discover missing targets. The dashboard coverage table includes every declared component even if its series are absent; inspect actual variables and drill-downs using live panels. Domain metrics are allowlisted by exact meaningful families after endpoint evidence; candidate families (not guaranteed): `cnpg_*` transaction/connection/replication; Temporal service and persistence request/error/latency; `rabbitmq_queue_messages`, `rabbitmq_connections`; `redis_up`, `redis_memory_used_bytes`, `redis_keyspace_hits_total`, `redis_keyspace_misses_total`. Verify exact names, histogram units/buckets and labels; no broad `.*` collection or labels carrying paths, queries, bucket/key names, tenant/workflow IDs, user input or credentials.

## Bounded evidence gates before affected packet readiness

These are factual checks, not delegated architecture investigations. Designer/owner collects output and freezes pins and metrics contract once. Gate closure may be attached to the candidate for targeted review; no new design per gate. Do not claim the full E2 scope is defended if indispensable evidence remains missing. E2-I architecture/transition can be reviewed independently; no live joined mutation until the selected complete artifact is reviewed and explicitly commissioned.

| Gate | Needed / precise stop |
| --- | --- |
| G1 helper pins | Resolve `registry.k8s.io/kube-state-metrics/kube-state-metrics:v2.20.0` and `docker.io/oliver006/redis_exporter:v1.93.0` using registry manifest inspection for the actual Kind node platform, record immutable canonical digests and index-to-platform identity, verify tag/digest render behavior. No guessed digest, no mutable tag fallback. KSM pin affects E2-I, Redis pin affects Redis only. |
| G2 kubelet trust | On both fixed dev nodes, observe actual serving certificate issuer/SAN/validity and node address; verify direct HTTPS and scoped bearer auth with a temporary least-privilege specimen under separately authorized native proof. Test `nodes/metrics` allowed and `nodes/proxy`, secrets, exec, mutation denied. If trust does not pass, explicitly defer E2-R or commission cluster-owner remedy. Owner raw API proxy metrics can demonstrate emission, not runtime authorization. |
| G3 existing endpoints | Collect actual Pod labels, named ports, Service mappings and sampled metric names via read-only port-forward/query, for CNPG, four Temporal roles, RabbitMQ, Loki, Tempo, Grafana. Verify native scheme/no credentials and one family per required panel. For Redis, exact tagged flag support and disposable exporter proof, no key data, no arbitrary scrape, no config/SQL/script traffic. If absent or unsafe, do not enroll. |
| G4 SeaweedFS transition | Exact upstream flag is source-supported; require owner scope decision, exact dev-only predecessor/target chart/verifier mapping and safe occupied transition proof including object marker, data/claim identity, no active consumers. No implicit platform writes. Otherwise leave inventory-only explicitly and E2-S incomplete for this component. |
| G5 render/preservation | Actual Helm render with pins and profile variants, pinned promtool syntax, exact changed RBAC and workload inventory, source tests and owner-authorized upgrade specimen. Existing Prometheus Recreate prevents competing TSDB writers. No source-only claim of native success. Construction evidence belongs to the affected Changes and joint gate, not a prerequisite to write a Design. |

Owner read-only starting commands (no secret values, no new Pods, no mutation, WSL):

```bash
kubectl --context kind-offscreen-dev get nodes -o wide
kubectl --context kind-offscreen-dev get csr
kubectl --context kind-offscreen-dev -n offscreen-dev-postgres get pods,svc --show-labels
kubectl --context kind-offscreen-dev -n offscreen-dev-temporal get pods,svc --show-labels
kubectl --context kind-offscreen-dev -n offscreen-dev-rabbitmq get svc
kubectl --context kind-offscreen-dev -n offscreen-dev-observability get svc

docker buildx imagetools inspect registry.k8s.io/kube-state-metrics/kube-state-metrics:v2.20.0
docker buildx imagetools inspect docker.io/oliver006/redis_exporter:v1.93.0
```

For node serving cert metadata only, if the node has OpenSSL and default kubelet cert path, run on each of `offscreen-dev-control-plane`, `offscreen-dev-worker`:

```bash
docker exec offscreen-dev-control-plane openssl x509 -in /var/lib/kubelet/pki/kubelet.crt -noout -issuer -subject -dates -ext subjectAltName
```

Repeat for worker. If the file is absent or wrong, inspect kubelet configuration for its serving certificate path, not its private key. Do not send kubeconfig/token/Secret contents. Cert metadata is not a verified live TLS handshake. Owner-run `kubectl get --raw /api/v1/nodes/offscreen-dev-worker/proxy/metrics/resource` can confirm endpoint emission with owner credentials; never use that access path for Prometheus. Do not need to paste raw high-cardinality payload; summarize series names/count and errors locally. Native scoped proof and any CSR approval need separate authorization.

## Self-defense and review scope

- Alternative rejected: scraping every annotated Pod or using the default chart RBAC. It violates bounded authority, privacy and cost. Selected explicit service jobs plus KSM provide universal inventory without universal payload collection. KSM and the Prometheus Pod discovery identity can read Pod specs including literal env values via API; trust both as pinned local components, export only selected operational families, never imply that RBAC hides Pod contents. Namespace-scoped discovery limits actual queries but is not an authorization fence. Cluster-scoped Pod read is selected over Roles in optional namespaces to avoid requiring namespace existence or taking ownership of platform installation. Existing cluster is trusted local, not hostile tenant isolation.
- Alternative rejected: replace five releases, delete/reinstall Grafana/Prometheus, or adopt arbitrary preexisting resources. Existing PVCs, Helm history, identity and telemetry must survive. Existing upgrade and custody code are the proper boundary; E2 adds a versioned intent rather than loosening the classifier. No automatic resume or rollback reduces the number of unsafe recovery paths. Failed/ambiguous upgrade can require owner-directed recovery and remains fenced.
- Alternative rejected: create all dashboards first with empty metrics or scrape every endpoint and infer health from `up`. Stable coverage declarations, live query evidence and explicit missing-data semantics make this falsifiable. Dashboard provisioning stays Git-owned, not an external plugin or UI click procedure.
- Selected construction can proceed in independent source lanes after their gates, but no partially integrated live artifact is automatically installed. Preserve exact E1 release render and separate historical Collector transition. No changes to application instrumentation, log policy, release stack or CLI ownership. Any missing service domain coverage is a visible limit, not an E2-wide success.

**Author disposition:** first committee returned REVISE AND RE-DEFEND on candidate `7451b840978b7cf11926ff4d7252d193b43459c8`; H01 is addressed in the current integration contract, pending independent impact-based verification. Unaffected architecture conclusions remain reusable. Not a full DEFENDED claim. G1/G2/G3/G4 are explicit open evidence gates; G5 is construction/native qualification. Committee should review exact committed dossier, selected E2-I/R/S scope, changed RBAC and trust, occupied transition, service-owner boundaries, and acceptance/evidence separation. It may return EVIDENCE-GATED for affected scope and allow unaffected coherent scope under AGENTS.md severity policy. Owner ratification of any narrower scope is explicit. No Changes released, runtime proof or live authorization by this artifact. Record durable findings in existing technical owners at integration.


## Pass 01 finding dispositions and durable transfer

Historical receipt: [committee/pass-01.md](committee/pass-01.md). The author reconstructed the reviewed dossier by applying the previous design patch to frozen `c3900da1e15bba456c71dcb799698fe2a0f7db5f`; the committee reports exactly that four-file delta at `7451b840978b7cf11926ff4d7252d193b43459c8`. Local patch applicability is checked against that reconstructed content, not an independently fetched current remote HEAD. Custodian must verify affected-file identity, current branch and receipt absence before applying; second committee binds the actual new SHA. Source reviewed includes `artifacts.loadObservabilityVariants`, `install.runObservabilityPlan/Ensure`, `readiness.observeObservability/verifyHelmRevisionMatrix/verifyHelmStorageBijection`, `inventory.collectInventory`, `connect.runObservabilityConnect`, `proof.runLiveProof`, `proof-host.runProofOperationSession`, `disruptions.runPersistenceProof/runOutageProof`, `partial-install.resolvePartialInstallPlans`, public render/lint and diagnostics. Current `inventory` fetches retained manifest for Collector only; proof-host early gate dispatch bypasses generic health observation. These facts support the revised routing/history and refusal contract. No code or live proof run.

| Finding | Current disposition | Durable destination at implementation/integration (not promoted before acceptance) |
| --- | --- | --- |
| E2-AR-H01 (High) | Author correction in INTEGRATION: named operation selectors, exact final and pending history rows, retained-manifest/storage evidence, positive and negative routing/refusal predicates. Independent closure pending. | `docs/technical/platform/observability-native-infrastructure.md`, `infra/platform/observability/` and proof owners |
| E2-AR-M01 (Medium) | Nonblocking limitation incorporated in TARGET and qualification: KSM cache freshness not strong consistency; validate list/watch degradation. | Native observability technical contract and `docs/runbooks/kubernetes-observability.md` |
| E2-AR-M02 (Medium) | Nonblocking refinement incorporated in joint acceptance: effective authorization negatives for both identities where feasible, not merely rendered rules. | Native observability permission contract and native acceptance fixtures |
| E2-AR-M03 (Medium) | Nonblocking refinement incorporated in upgrade sequence: unique positive markers within existing exclusive session, no second top-level custody acquisition. | `infra/platform/observability/upgrade.mjs` and observability runbook |
| E2-AR-M04 (Medium) | Nonblocking limitation incorporated in retention contract and joint measurement: size cap may shorten effective history; no premature allocation change. | Native observability technical resource/retention contract |

Preserve these destinations before Design retirement. Medium findings do not require another correction/re-review gate. No new gate closure or owner ratification is asserted. For pass 02 review only H01, changed integration/acceptance and affected callers, plus any genuinely new material risks; do not repeat unaffected architecture review or require G5 implementation evidence for architecture acceptance.
