# E2 | native input closure (planner/operator evidence only)

**Status:** G1 KSM specimen passed; Redis v1.97.0 replacement native specimen PASSED with frozen coverage. G2 node-local trusted HTTPS feasibility and Collector existing scrape PASSED. Durable trust provisioning, KSM construction inputs frozen, remaining native metric contracts, CNPG monitoring CONNECT owner correction and G4 transition remain OPEN. Verified remote planning base `1fa759b980d275ef4ad9d11590cf080fc807ccd2`. [Defended dossier](../../../designs/open/observability-infrastructure-visibility/EVIDENCE.md) owns architecture and scope. This is the one bounded evidence handoff for all affected packets, not an implementation research assignment. Owner ran the read-only native probe at the committed batch SHA; planner records the observed subset below. No native commands executed by planner; no fabricated digest, cert, endpoint, family or PASS. G5 is downstream construction and qualification. Owner must explicitly authorize any live probe creating resources, executing a helper container, or mutating data. Read-only metadata/port-forwards need correct fixed dev target and must not disclose credentials. No release commands, no provider spend.

## G1 | helper image identity

**Blocks:** 02 KSM, 05 Redis, dependent 07/08. Owner/planner collect registry index and matching node platform identities, not a guessed tag digest:

```bash
docker buildx imagetools inspect registry.k8s.io/kube-state-metrics/kube-state-metrics:v2.20.0
docker buildx imagetools inspect docker.io/oliver006/redis_exporter:v1.97.0
kubectl --context kind-offscreen-dev get nodes -o custom-columns=NAME:.metadata.name,OS:.status.nodeInfo.operatingSystem,ARCH:.status.nodeInfo.architecture
```

Record exact registry repository, tag, index digest, selected platform manifest digest, architecture/OS, inspection date and command status. Verify bundled chart KSM `image.sha` renders exact tag@digest and allowed workload name/ports/SA/RBAC/collectors; actual runtime image identity remains required at G5. For Redis freeze immutable reference and version flags. No mutable fallback. KSM required families: pod/node inventory, namespaces, workload desired/ready, restarts/termination reasons, owner, resource requests/limits, PVC/PV and KSM list/watch health. Record exact observed emitted names and label allowlist with relevant list/watch degradation semantics, not merely chart existence. If a family is absent, planner records honest unsupported panel and owner approves any material coverage reduction.

## G2 | direct verified kubelet collection

**Blocks:** 03, resource panels in 07, 08 full artifact. Observe both nodes:

```bash
kubectl --context kind-offscreen-dev get nodes -o wide
kubectl --context kind-offscreen-dev get csr
docker exec offscreen-dev-control-plane openssl x509 -in /var/lib/kubelet/pki/kubelet.crt -noout -issuer -subject -dates -ext subjectAltName
docker exec offscreen-dev-worker openssl x509 -in /var/lib/kubelet/pki/kubelet.crt -noout -issuer -subject -dates -ext subjectAltName
```

If path not serving certificate, inspect kubelet config for exact serving cert path, never private key. Metadata not enough: record actual verified HTTPS to both serving addresses at 10250, certificate issuer/SAN/validity and exact public trust CA reference/path; dedicated limited SA token and positive `/metrics/cadvisor`/`/metrics/resource`, negative nodes/proxy, exec, secrets and mutation. Temporary specimen, scoped auth and cleanup require explicit owner native authorization; no admin token in Prometheus or copied tokens/CA private keys. Record exact metric names/labels for CPU, memory, network/disk only if supported, no double-counting. If trust fails, return planner with observed certificate facts; separately commission cluster-owner serving TLS remedy or owner-ratify narrower artifact. No `insecure_skip_verify`, proxy, plaintext, automatic CSR approval or recreation.

## G3 | native endpoint and metric contracts

**Blocks:** 04,05, affected 07/08 and 06 enrollment. Read-only inventories:

```bash
kubectl --context kind-offscreen-dev -n offscreen-dev-postgres get pods,svc --show-labels
kubectl --context kind-offscreen-dev -n offscreen-dev-temporal get pods,svc --show-labels
kubectl --context kind-offscreen-dev -n offscreen-dev-rabbitmq get pods,svc --show-labels
kubectl --context kind-offscreen-dev -n offscreen-dev-redis get pods,svc --show-labels
kubectl --context kind-offscreen-dev -n offscreen-dev-observability get pods,svc --show-labels
```

Use explicit dev loopback port-forward to the actual named Pod/Service and confirmed remote port, one at a time, for native endpoint inspection. For example, only if service mapping confirms it: `kubectl --context kind-offscreen-dev -n offscreen-dev-rabbitmq port-forward svc/rabbitmq 25692:15692 --address 127.0.0.1`, then `curl -fsS http://127.0.0.1:25692/metrics` locally; summarize metric family names, label **keys** and units, redact values and stop forward. No generic scrape or credentials sent to unverified endpoint. For CNPG and four Temporal roles prove exact Pod container/name/labels/port protocol (9187, 9090 selected), RabbitMQ aggregate 15692, Loki/Tempo/Grafana paths verified against actual rendered services, Prometheus/Collector existing jobs retained. Optional operator/control-plane endpoints remain inventory-only unless already safely verified. Redis v1.97.0 (active replacement; see owner replacement specimen): inspect exact tagged upstream source/flags, prove fixed target, disabled alternate scrape endpoint/config command, no key/stream/scan/script/client-list/value collection, emitted label keys and no data writes on separately authorized disposable exporter specimen; unauthenticated Redis remains local trust limitation, not ACL guarantee. No paid traffic. SeaweedFS native family proof comes with G4b.

Record **one row per endpoint**: component, exact namespace/workload selector/container, service/port/path/scheme and trust/auth mode, actual successful query/metric family/label keys/unit, allowed labels, specific dashboard query+unit and meaning, expected job, missing/unsupported rationale, command status and date. Include one proven family per required panel and health/freshness negative semantics. Planner freezes the exact per-component coverage JSON rows (including panel IDs, PromQL, units and semantics) in this register or a linked evidence file before affected dispatch; 02/03/04/05/06 materialize those rows in their owned files, 07 consumes the same frozen rows without waiting for source joins and 08 checks equality. Implementation agents must not invent native metric names or labels. No unsupported fallback presented as healthy.

## G4 | SeaweedFS owner boundary

**Blocks:** 06, affected 07/08, full E2. G4a (pre-construction): confirm exact dev chart/values and install/observe/mutation-guard callers, current Helm/data-chain identity; freeze explicit upgrade CLI/env permission, exact versioned owner pending schema and CAS conditions, existing object marker and no-active-consumer admission, exact dev predecessor/target comparison, release unchanged, postconditions and failure fixture. Selected change: existing mini process 4.54 `-metricsPort=9327`, same S3 8333, image, Service, Secret, PVC/PV, data path, no implicit observe/ensure mutation. Do not delegate unresolved G4a choices. G4b (after source construction, before enabling SeaweedFS monitoring): independently owner-authorized guarded transition with retained object marker and exact data chain, one controlled Pod restart only, successful new endpoint and native metric family/labels, exact receipt SHA. No live authority from this document. If G4b cannot be performed, 06 stays pending or planner/owner explicitly splits source construction from qualification; full enrollment remains gated. If not feasible, owner may ratify inventory-only scope and planner updates affected packets/coverage/desired artifact before activation. No silent reduction or data service restart by observability.

## Owner observation | 2026-11-28 01:17 UTC

Source: `offscreen-e2-native-evidence.txt` (owner-supplied probe output, SHA256 `cabf266e658c900f5d97854c6f27b9e3b47fa1ee28114dc27ec787b70f4f1e93`), `main` `7e67674a32406a7ad8b5748218ab465cc44475ff`, exact context `kind-offscreen-dev`. Both nodes Linux/amd64. Registry inspections and Helm history exited 0; nine fixed Pod port-forwards returned HTTP 200 and parsed 21,978 samples in total. This is one observation, not effective runtime authorization, service DNS reachability, full panel coverage, a new installation or G5 acceptance. No raw metric values or credential material imported. Previous architectural receipts remain unchanged.

### G1 resolved registry identities

| Helper/tag | Registry index digest (sha256) | Linux/amd64 manifest digest (sha256) |
| --- | --- | --- |
| `registry.k8s.io/kube-state-metrics/kube-state-metrics:v2.20.0` | `42cfe3723a5f058171c627537fb57a3ea0f26e4380fa18555a95cb1a1b4cfc5b` | `01171220c7c059afc85034ffe687bfe7249e41c0cc46fbe9a5128503ceee3016` |
| `docker.io/oliver006/redis_exporter:v1.93.0` | `6ca518a72f30f7f576ef92963de1b91d3c3f5fd3aeac949f878bfda183587820` | `eb2b1e93b654fc21bf508e45ec3d17ca55d22db66c6b826750cecc92c0c21e42` |

Planner selection: use the resolved Linux/amd64 **platform manifests** for dev helper locks, not mutable tags or attestation manifests. Exact canonical references:

- `registry.k8s.io/kube-state-metrics/kube-state-metrics@sha256:01171220c7c059afc85034ffe687bfe7249e41c0cc46fbe9a5128503ceee3016`
- `docker.io/oliver006/redis_exporter@sha256:eb2b1e93b654fc21bf508e45ec3d17ca55d22db66c6b826750cecc92c0c21e42`

KSM values tag `v2.20.0`, image.sha `sha256:01171220c7c059afc85034ffe687bfe7249e41c0cc46fbe9a5128503ceee3016` (expected tag@digest rendering). Redis uses its canonical digest reference. Pin only in E2; no E1 or release changes. Both node platforms were observed; reject incompatible platform until explicit requalification. Do not relax runtime image identity if container runtime reports unexpected repository/digest. Chart inspection confirms `updateStrategy`, `image.sha`, collectors-derived roles and `selfMonitor.telemetryPort`; actual Helm rendering and native specimen emission/effective permissions still unproven. OBS-E2-02/05 no longer need registry discovery; remaining G1/G3 gates still apply.

### G2 observed certificate constraints

| Node | Observed InternalIP | SAN in local kubelet.crt | Issuer | Validity UTC |
| --- | --- | --- | --- | --- |
| offscreen-dev-control-plane | 172.18.0.4 | DNS:offscreen-dev-control-plane | CN=offscreen-dev-control-plane-ca@1795725070 | 2026-11-26 to 2027-11-26 19:31:10 |
| offscreen-dev-worker | 172.18.0.6 | DNS:offscreen-dev-worker | CN=offscreen-dev-worker-ca@1795725083 | 2026-11-26 to 2027-11-26 19:31:23 |

No CSRs returned. Selected kubelet config output shows webhook authorization, token webhook enabled and rotateCertificates true; do not infer serving bootstrap or a trusted serving CA. Neither inspected certificate advertises an IP SAN. Do not freeze these ephemeral addresses into Prometheus manifests. First inspect actual served public certificate chain at 10250, verify DNS resolution from the scrape network, trust anchor provenance, hostname/SAN and restricted token behavior. IP verification against the inspected DNS-only certificate is not valid; ordinary Kubernetes API CA trust is not established. If actual serving trust cannot be proven under defended direct HTTPS design, return cluster-owner TLS remedy or explicit owner scope decision. No proxy, TLS bypass or implicit restart.

### G3 observed endpoint contract subset

All rows are TCP HTTP `/metrics` at the observed Pod port, no supplied credentials, via owner loopback forwarding; endpoint accessibility from the final Prometheus Pod remains G5. Names below use exact native observed labels, not inferred annotations. Use fixed namespace and exact container/declared port. Temporal role values are explicitly frontend/history/matching/worker; exclude web and admintools.

| Component / namespace (offscreen-dev- prefix) | Pod selector / container | Port and planned target | Sample names / samples |
| --- | --- | --- | --- |
| CNPG / postgres | `cnpg.io/cluster=dev-pg`, `app.kubernetes.io/name=postgresql` / `postgres` | 9187 named metrics; `postgres-cnpg` pod discovery | 48 / 67 |
| Temporal frontend / temporal | `app.kubernetes.io/instance=temporal`, `app.kubernetes.io/name=temporal`, `app.kubernetes.io/component=frontend` / `temporal-frontend` | 9090 named metrics; `temporal-server` pod discovery | 91 / 1944 |
| Temporal history / temporal | same instance/name, component history / `temporal-history` | 9090 named metrics; same job | 318 / 4762 |
| Temporal matching / temporal | same instance/name, component matching / `temporal-matching` | 9090 named metrics; same job | 143 / 5458 |
| Temporal worker / temporal | same instance/name, component worker / `temporal-worker` | 9090 named metrics; same job | 107 / 1944 |
| RabbitMQ / rabbitmq | `app.kubernetes.io/name=rabbitmq`, `app.kubernetes.io/component=rabbitmq` / `rabbitmq` | 15692 named prometheus; Service `rabbitmq.offscreen-dev-rabbitmq.svc:15692` | 247 / 2219 |
| Loki / observability | `app.kubernetes.io/instance=obs-loki`, `app.kubernetes.io/name=loki`, `app.kubernetes.io/component=single-binary` / `loki` | 3100 named http-metrics; Service `obs-loki.offscreen-dev-observability.svc:3100` | 510 / 1385 |
| Tempo / observability | `app.kubernetes.io/instance=obs-tempo`, `app.kubernetes.io/name=tempo` / `tempo` | 3200 named prom-metrics; Service `obs-tempo.offscreen-dev-observability.svc:3200` | 173 / 547 |
| Grafana / observability | `app.kubernetes.io/instance=obs-grafana`, `app.kubernetes.io/name=grafana` / `grafana` | Pod 3000 named grafana; Service `obs-grafana.offscreen-dev-observability.svc:80` | 693 / 3652 |

Observed existing Redis Service `redis.offscreen-dev-redis.svc:6379`, selector `app.kubernetes.io/name=redis`, `app.kubernetes.io/instance=redis`; native Redis protocol, not HTTP metrics. Prometheus Service 9090 and Collector Service 8888 observed; preserve their existing jobs. Earlier owner query verified target identities but current probe did not collect their metric families. Need selected ingestion/drop/export/TSDB family proof. No new log/tracing enrollment.

Selected native families for further panel closure (observed sample names and types below; do not treat as final frozen coverage JSON yet):

| Source | Verified sample names / interpretation boundary |
| --- | --- |
| CNPG | `cnpg_collector_up` (cluster label), `cnpg_collector_last_collection_error`, `cnpg_last_error`, `cnpg_errors_total` (errorUserQueries), `cnpg_last_update_timestamp`, `cnpg_collector_replica_mode`. No `cnpg_pg_stat_*` transaction, connection or lock families in this sample. HTTP 200 does not establish successful DB collection. Check the scalar collector/error values and pinned operator defaults; no custom SQL, credential retrieval, silent unsupported coverage or DB configuration changes. |
| Temporal | `service_requests` counter and `service_latency_bucket` histogram observed frontend/history/matching; not observed worker. `service_error_with_type` observed those three, `service_errors` history/matching; no assumption unobserved series mean zero. `persistence_requests` counter and `persistence_sql_in_use` gauge observed across all four roles. `approximate_backlog_age_seconds`, `approximate_backlog_count` matching only with taskqueue/worker/deployment/partition labels. Verify time units for unsuffixed histogram before freezing query; do not relabel native namespace into Kubernetes namespace or collapse distinct taskqueue/partition series. Avoid taskqueue/worker identifiers until label policy and cardinality are verified. |
| RabbitMQ | `rabbitmq_queue_messages`, `rabbitmq_queue_messages_ready`, `rabbitmq_queue_messages_unacked`, `rabbitmq_connections` (aggregate, no native label keys); `rabbitmq_queue_messages_published_total`, `rabbitmq_queue_messages_delivered_total`, `rabbitmq_queue_messages_acked_total` counters. Separate aggregate queue depth and rates; no per-object endpoint. |
| Loki | `loki_ingester_memory_chunks`, `loki_ingester_flush_queue_length`, `loki_ingester_chunks_flush_failures_total`, `loki_ingester_wal_bytes_in_use`; use bounded native labels. |
| Tempo | `tempo_distributor_traces_per_batch_count` and `tempo_distributor_traces_per_batch_sum` histogram observations; request duration histogram present. No claim traces ingested successfully merely from a nonempty histogram. |
| Grafana | `grafana_http_request_in_flight`, `grafana_api_response_status_total` (code), `grafana_http_request_duration_seconds_bucket` (handler,le,method,slo_group,status_code,status_source); avoid broad handler label collection until value bounds verified. |

Matching returned 5,458 raw samples, larger than planned 5,000 per-target limit if retained unfiltered. Use explicit family allowlists before sample-limit evaluation; verify actual accepted count after metric relabeling rather than raising budget blindly. Do not drop identity labels if doing so aliases distinct source series. Metric type, unit, label values/bounds, exact panel queries and native failures still require closure where not established by this sample. Source-selected families and selectors above narrow the remaining work; no coding agent is asked to invent metric names.

### G4 observed predecessor

`object-store` Helm history shows revision 1 deployed, chart `platform-object-storage-seaweedfs-0.1.0`. Pod `object-store-96b997686-ntpzr`, container `seaweedfs`, image `docker.io/chrislusf/seaweedfs:4.54`, only S3 8333 named `s3`; Service `object-store` UID `611fcaeb-a446-4878-b0ed-b6373f383f05`, `app=object-store`, 8333; PVC `object-store-data` Bound UID `b2867752-8293-40d1-a74c-4d89217417d9`, PV name `pvc-b2867752-8293-40d1-a74c-4d89217417d9`. Observed Pod UID `9b5d6ce8-d1ef-45d4-aa10-3f5959a5ccb8`. This is historical evidence only, never a substitute for fresh identity capture under custody. Actual PV UID, Secret identity, exact Helm manifests/storage, consumer exclusion and positive object marker not established by this probe. G4a/b remain open; do not send HTTP metrics requests to S3 or mutate the existing release.

## Owner qualification | 2026-11-28 01:24 UTC

Source: `offscreen-e2-qualification.txt` (SHA256 `67657081cf03c7930b73c60f02e3c1cafdfe231d1099cd27f5652389d53ee316`), owner-run temporary dev qualification at `4d7c82ea729e657e1ef495095b45247627ab8a48`, context `kind-offscreen-dev`, kube-system UID `d3a42b05-3ef1-4008-a1de-fe689a8aa41a`. Specimen namespace `e2-proof-1b9648de91de`. All five explicitly tracked temporary namespace/cluster-RBAC deletion checks reported gone. This is evidence, not implementation or G5 acceptance.

- **KSM:** chart 9.1.0 rendered the pinned v2.20.0 tag@amd64 digest, one ready runtime container with the same digest, ten selected list/watch collectors and two service ports (8080 inventory, 8081 self metrics). Inventory emitted 118 sample names/2,460 samples, including 33 pod-info and 18 namespace-created samples; self emitted 51 names/75 samples including `kube_state_metrics_watch_total{resource,result}`. Required structural families observed include `kube_pod_info`, `kube_pod_owner`, `kube_pod_status_phase`, `kube_pod_status_ready`, `kube_pod_container_status_restarts_total`, `kube_pod_container_status_last_terminated_reason`, `kube_pod_container_resource_requests`, `kube_pod_container_resource_limits`, `kube_node_status_condition`, `kube_node_status_capacity`, `kube_node_status_allocatable`, `kube_deployment_spec_replicas`, `kube_deployment_status_replicas_ready`, `kube_replicaset_spec_replicas`, `kube_replicaset_status_ready_replicas`, `kube_statefulset_replicas`, `kube_statefulset_status_replicas_ready`, `kube_daemonset_status_desired_number_scheduled`, `kube_daemonset_status_number_ready`, `kube_persistentvolumeclaim_status_phase`, `kube_persistentvolumeclaim_resource_requests_storage_bytes`, `kube_persistentvolume_capacity_bytes`. The selected summary does not establish `kube_job_*` or `kube_state_metrics_list_total` samples or list/watch degradation and recovery. Do not infer successful inventory watches from mere metric presence; retain M01. Preserve observed family-specific identity dimensions; exclude unneeded sensitive infrastructure identifiers, arbitrary labels and annotations; freeze exact coverage/query rows before affected dispatch. Do not repeat the successful image/render/permission specimen merely to obtain the same facts.
- **Permissions:** 64/64 tested authorization predicates passed across the two temporary identities (59 negatives, five positives). This includes no Secret reads, ConfigMap list, `nodes/proxy`, pod exec, Deployment patch and Pod create/delete at tested scopes. KSM has no `nodes/metrics`; scoped Prometheus specimen has it. These are impersonation checks at recorded scopes, not exhaustive live binding audit or a successful bearer-token request to kubelet. Final identities still require G5 effective checks.
- **Redis:** exact pinned exporter image ready, 185 names/266 samples, `redis_up=1`, alternate scrape HTTP 404 and disposable marker/count unchanged. Tested args: fixed specimen address, `--disable-scrape-endpoint`, `--config-command=-`, `--disable-exporting-key-values`, `--export-client-list=false`, empty `--check-keys`, `--check-single-keys`, `--check-streams`. Observed delta: `client|setname` 1, `command|info` 1, `info` 2 (includes commandstats observation), `latency|histogram` 1, `latency|latest` 1, `slowlog|get` 1, `slowlog|len` 1. **Do not enroll this configuration against real Redis:** SLOWLOG GET can read command arguments. Candidate refinement: verify `--exclude-slowlog-metrics` in the exact pinned image and repeat only disposable Redis command/data and alternate-path negatives. If unavailable or ineffective, return planner for pinned version/authority decision. Never compensate by dropping exported labels after sensitive data has already been read. Observed panel families `redis_up`, `redis_memory_used_bytes`, `redis_memory_max_bytes`, `redis_keyspace_hits_total`, `redis_keyspace_misses_total`, `redis_evicted_keys_total`, `redis_connected_clients`, `redis_commands_processed_total` (all no native label keys); no key, value, commandlog or client payload exposure permitted.
- **Kubelet:** both actual TLS endpoints served two-certificate chains with the recorded DNS SANs; in-cluster resolution matched node IPv4 addresses. Both verified handshakes using the API service-account CA failed with self-signed certificate in chain; bearer requests were not sent. Leaf SHA256 control-plane `720e9defece67130a2bf812acfd545c7e8e6a7ce26f0b3a95231262db7c91ba2`, worker `c83494287deadc85103c9ecb226f29674b8966dfeb63b652e663bc4aabb51b10`. Scope G2 remains blocked. A bounded follow-up may test node-specific public serving CA anchors obtained only from the trusted local Docker boundary, matching the node-local certificate and recorded serving identity, with full certificate-chain and DNS SAN verification; no trust from unauthenticated remote discovery. If feasible, planner must settle durable trust provisioning, rotation/identity refusal and exact Prometheus configuration under the cluster owner's contract; no automatic adoption or insecure fallback. This experiment is not a selected production trust remedy or authority to modify Kind.
- **CNPG:** `cnpg_collector_up=0`, `cnpg_collector_last_collection_error=1`, `cnpg_last_error=1`. HTTP metrics endpoint responds but database collection is failing. Read existing CR monitoring metadata, required default ConfigMap presence/key and redacted log categories; preserve DB and credentials. Source bootstrap reference includes `cnpg-default-monitoring`, `disableDefaultQueries:false`; cause not yet established. Fix belongs to PostgreSQL owner, not a scrape workaround.
- **Prometheus:** 329 sample names/780 samples at existing self endpoint. Collector direct port-forward failed (`Remote end closed connection without response`), stopping the original combined G3 section before CNPG metadata. Query existing Prometheus collector job to distinguish port-forward failure from scrape failure; preserve current Collector config. Do not claim collector or all G3 passed. G4 not exercised.

## Owner follow-up | 2026-11-28 01:30 UTC

Source: `offscreen-e2-followup.txt` (SHA256 `9ab559136a12b0f526dc54874d6b78882b4a8e0e862514c3c4e8484421a73109`), owner-run specimen at `4d7c82ea729e657e1ef495095b45247627ab8a48`, context `kind-offscreen-dev`, same kube-system UID `d3a42b05-3ef1-4008-a1de-fe689a8aa41a`. Three tracked temporary resources verified removed. Only Redis exclusion section reported error. No existing workload changes and no SeaweedFS operation. Planning reconciliation base `1cf128c151d0c7a2813e16d74c51585009a11f08`.

### G2 native feasibility PASSED; durable trust integration remains open

Both independently verified node-local public CA chains match the prior/disk leaf and the node DNS SAN. In-cluster DNS resolves both names to their observed addresses. The dedicated bearer identity successfully retrieved `/metrics/cadvisor` and `/metrics/resource` (HTTP 200 on each node); `/pods` was HTTP 403 on both. All recorded impersonation predicates passed. Ordinary API CA alone failed in the prior specimen. This is evidence for the direct verified HTTPS architecture, not a claim that a Prometheus Helm artifact or new trust lifecycle has been qualified.

| Node | Public serving root SHA256 (specimen only) | Endpoint |
| --- | --- | --- |
| offscreen-dev-control-plane | `c7fe45d470f658683a3423bd2bde162272e59d33a6a6259992188900fd91a1772` | `https://offscreen-dev-control-plane:10250` |
| offscreen-dev-worker | `ff5ea851ba5826e46b824a3f7282890f0b02e4ad844c222250b090bb4dc5099d` | `https://offscreen-dev-worker:10250` |

Both nodes emitted resource `node_cpu_usage_seconds_total`, `node_memory_working_set_bytes` (no native label keys), `pod_cpu_usage_seconds_total`, `pod_memory_working_set_bytes` (namespace,pod), `container_cpu_usage_seconds_total`, `container_memory_working_set_bytes` (namespace,pod,container). Both cAdvisor endpoints emitted `container_cpu_usage_seconds_total` (container,cpu,id,image,name,namespace,pod) and `container_memory_working_set_bytes` (container,id,image,name,namespace,pod), network receive/transmit bytes counters with interface and same identity labels. The worker also emitted throttling counters; do not assume control-plane emission. No filesystem evidence from this summary. Select resource job for node CPU rate (cores) and working set (bytes), cAdvisor for container CPU and memory (exclude empty/POD; preserve disambiguating labels or explicitly prefilter duplicate series; do not sum resource and cAdvisor copies). Retain network only after per-pod/interface deduplication evidence. Freeze exact panel rows before affected dispatch.

Do not commit these cluster-specific fingerprint values as universal desired-state inputs or automatically trust a remotely presented CA. The selected Design describes a separately approved serving-TLS owner remedy when trust is unavailable. The new specimen demonstrates an alternative trust path without restarting nodes. Planner must decide and reconcile the narrow trust provisioning/rotation contract with cluster owner and exact E2 artifact/history validation before 03/08 dispatch; compare owner-provisioned public anchor material against trusted local node identity, refuse unexpected changes or missing trust, retain full hostname verification, never persist private keys or runtime tokens. No CSR approval, node restart or additional Helm release authorized by the report. A scoped design correction may be required for this new trust input; no third comprehensive architecture defense.

### G3 Redis candidate correction

Pinned v1.93.0 `--help` specimen succeeded but `--exclude-slowlog-metrics` is absent. The prior observed `SLOWLOG GET` remains an actual privacy blocker; v1.93.0 is rejected for enrollment. Upstream v1.97.0 release notes (2026-11-04, PR #1210, https://github.com/oliver006/redis_exporter/releases/tag/v1.97.0) explicitly introduce slowlog and commandlog exclusions. Select v1.97.0 as a replacement **candidate**, not yet an accepted immutable pin. Resolve Linux/amd64 manifest digest from registry, verify both flags on that exact image, use both exclusions with the prior fixed-target/no-key/no-client/no-config flags, verify allowed command deltas, `/scrape` denial, `redis_up=1`, no data changes, bounded metric families and exact runtime digest on disposable Redis only. No live Redis enrollment until proof passes. Existing older digest and failed evidence retained as history; update active Design/05/08 lock inputs only with verified replacement and review.

### G3 CNPG and Collector

CNPG Cluster reports healthy state; default queries enabled and ConfigMap `cnpg-default-monitoring` with `queries` present in both `cnpg-system` and `offscreen-dev-postgres`; no custom Secret query entries. Log category counts include permission denied 56, monitoring collector 24, query execution 24; no authentication, missing database/relation, timeout or TLS category observed. Collector still reports up=0 and last_collection_error=1. Source `infra/platform/postgres/chart/profiles/development.yaml` revokes PUBLIC CONNECT/TEMPORARY on postgres and dev; `infra/platform/postgres/temporal-persistence/prepare.mjs` also revokes PUBLIC access on Temporal databases before enabling connections. CNPG 1.30 monitoring uses dedicated `cnpg_metrics_exporter`/pg_monitor instead of postgres superuser (upstream https://github.com/cloudnative-pg/cloudnative-pg/blob/main/docs/src/installation_upgrade.md; verify exact 1.30.2 role/catalog state before correction). Missing explicit CONNECT for the monitoring role is a plausible hypothesis, not confirmed by these log categories. PostgreSQL owner should verify role existence, pg_monitor membership and effective CONNECT on exact monitored databases, identify specific failing query/database and only then select a least-privilege correction preserving all application/Temporal isolation. No broad PUBLIC grant, superuser exporter, speculative SQL mutation or scrape-based concealment. E2 may report existing unhealthy collector accurately, but selected DB statistics remain gated until proven or owner-ratified scope change.

Collector existing Prometheus query `up{job="collector"}` returned 1; `count by (__name__) ({job="collector"})` showed `otelcol_exporter_queue_capacity`, `otelcol_exporter_queue_size` (three series each), `otelcol_process_cpu_seconds`, `otelcol_process_memory_rss`, `otelcol_process_uptime`, `otelcol_processor_batch_metadata_cardinality`, `promhttp_metric_handler_errors_total`, `target_info`, and scrape metadata. This resolves the previous port-forward failure as not establishing a scrape outage. No ingestion/drop/export counters in this query result: preserve existing pipeline and obtain actual positive families via authorized E1 synthetic signal path or mark absent honestly; no automatic zero or new pipeline. G5 not run.

## Owner replacement specimen | 2026-11-28 01:34 UTC

Source: `offscreen-e2-redis-cnpg.txt`, SHA256 `0542f164cf2d50299b2e9c19eb10d8401049cdd75b40d69753a122260c7c230d`, owner run at `1cf128c151d0c7a2813e16d74c51585009a11f08`, same dev kube-system UID `d3a42b05-3ef1-4008-a1de-fe689a8aa41a`. Both sections completed, no section errors; temporary namespace verified gone. No existing database grants or SeaweedFS changes. Reconciliation base `54f4244d6a6371e5189a5f78450736a0041a3858`.

### Redis: replacement selected, native specimen PASS

Select v1.97.0 in place of rejected v1.93.0. Registry index `sha256:f5f903fbe77571d455ede0453b084d6840bc62fc105efac001034421cab83b99`; Linux/amd64 manifest `sha256:d16780dcfefc6e42f48682ecc5fbd6dd3207938b1ee88f766b838436a4e27e6e`; canonical runtime image `docker.io/oliver006/redis_exporter@sha256:d16780dcfefc6e42f48682ecc5fbd6dd3207938b1ee88f766b838436a4e27e6e`. Both exclusion flags supported on exact image, runtime digest matched, `redis_up=1`, 185 families/266 samples, alternate `/scrape` HTTP 404, disposable key data unchanged. Command delta only `client|setname` 1, `info` 2, `latency|histogram` 1, `latency|latest` 1. No observed key/value reads, slowlog/commandlog, config changes, scans or writes. This is a bounded specimen, not server-enforced authorization or proof of every future command path. Existing Redis remains trusted-local unauthenticated. Preserve earlier negative v1.93.0 evidence as historical; never deploy that pin.

Frozen OBS-E2-05 arguments: `--redis.addr=redis://redis.offscreen-dev-redis.svc:6379` plus `--disable-scrape-endpoint`, `--config-command=-`, `--disable-exporting-key-values`, `--export-client-list=false`, `--check-keys=`, `--check-single-keys=`, `--check-streams=`, `--exclude-slowlog-metrics`, `--exclude-commandlog-metrics`. Exporter HTTP port 9121 `/metrics` (specimen forward); static job `redis-exporter` to `obs-redis-exporter:9121` in `offscreen-dev-observability`. Exact selected native families below each have no native label keys; preserve fixed target labels and Prometheus-generated `up`/scrape metadata. Metric relabel keep anchored exact family names, not all `redis_.*`. No broad copying of `err`, `cmd`, client/instance metadata, process or key identifiers. The exporter may expose other metrics locally but the selected Prometheus collection stores only these families. Preserve configured sample/target limits. Scope and native endpoint behavior confirmed on disposable Redis; service DNS and actual owned backend qualification remain G5. Source readiness review and 02 join still required, not live enrollment permission.

Frozen `coverage/redis.json` declaration (copy the JSON array verbatim; 07 reserves panel IDs 701–709 in the shared messaging dashboard, 08 verifies equality). Units are Grafana `bytes`, `ops`, `percentunit`, `none`; dashboard no-data must not render as healthy or zero. Overview status consumes the same freshness and health predicates, not a second Redis metric contract.

```json
[
  {
    "component": "redis",
    "namespace": "offscreen-dev-redis",
    "workloadSelector": {
      "app.kubernetes.io/name": "redis",
      "app.kubernetes.io/instance": "redis"
    },
    "jobs": [
      "redis-exporter"
    ],
    "requiredFamilies": [
      "redis_up",
      "redis_memory_used_bytes",
      "redis_keyspace_hits_total",
      "redis_keyspace_misses_total",
      "redis_evicted_keys_total",
      "redis_connected_clients",
      "redis_commands_processed_total"
    ],
    "panels": {
      "offscreen-messaging-cache/701": {
        "promql": "up{job=\"redis-exporter\"} and on(job,instance) (time() - timestamp(up{job=\"redis-exporter\"}) <= 90)",
        "unit": "none",
        "interpretation": "Scrape state 1/0 only for a current target; missing or stale unknown."
      },
      "offscreen-messaging-cache/702": {
        "promql": "redis_up{job=\"redis-exporter\"} and on(job,instance) (((up{job=\"redis-exporter\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"redis-exporter\"}) <= 90))) and on(job,instance) (time() - timestamp(redis_up{job=\"redis-exporter\"}) <= 90)",
        "unit": "none",
        "interpretation": "Backend 1/0 distinct from scrape state; missing or stale unknown."
      },
      "offscreen-messaging-cache/703": {
        "promql": "((redis_memory_used_bytes{job=\"redis-exporter\"}) and on(job,instance) (time() - timestamp(redis_memory_used_bytes{job=\"redis-exporter\"}) <= 90)) and on(job,instance) (((up{job=\"redis-exporter\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"redis-exporter\"}) <= 90)) and on(job,instance) ((redis_up{job=\"redis-exporter\"} == 1) and on(job,instance) (time() - timestamp(redis_up{job=\"redis-exporter\"}) <= 90)))",
        "unit": "bytes",
        "interpretation": "Backend used memory; current healthy scrape and backend required."
      },
      "offscreen-messaging-cache/704": {
        "promql": "((rate(redis_keyspace_hits_total{job=\"redis-exporter\"}[5m])) and on(job,instance) (time() - timestamp(redis_keyspace_hits_total{job=\"redis-exporter\"}) <= 90)) and on(job,instance) (((up{job=\"redis-exporter\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"redis-exporter\"}) <= 90)) and on(job,instance) ((redis_up{job=\"redis-exporter\"} == 1) and on(job,instance) (time() - timestamp(redis_up{job=\"redis-exporter\"}) <= 90)))",
        "unit": "ops",
        "interpretation": "Keyspace hits per second over 5m; no data if absent."
      },
      "offscreen-messaging-cache/705": {
        "promql": "((rate(redis_keyspace_misses_total{job=\"redis-exporter\"}[5m])) and on(job,instance) (time() - timestamp(redis_keyspace_misses_total{job=\"redis-exporter\"}) <= 90)) and on(job,instance) (((up{job=\"redis-exporter\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"redis-exporter\"}) <= 90)) and on(job,instance) ((redis_up{job=\"redis-exporter\"} == 1) and on(job,instance) (time() - timestamp(redis_up{job=\"redis-exporter\"}) <= 90)))",
        "unit": "ops",
        "interpretation": "Keyspace misses per second over 5m; no data if absent."
      },
      "offscreen-messaging-cache/706": {
        "promql": "((((rate(redis_keyspace_hits_total{job=\"redis-exporter\"}[5m])) and on(job,instance) (time() - timestamp(redis_keyspace_hits_total{job=\"redis-exporter\"}) <= 90)) and on(job,instance) (((up{job=\"redis-exporter\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"redis-exporter\"}) <= 90)) and on(job,instance) ((redis_up{job=\"redis-exporter\"} == 1) and on(job,instance) (time() - timestamp(redis_up{job=\"redis-exporter\"}) <= 90)))) / ((((rate(redis_keyspace_hits_total{job=\"redis-exporter\"}[5m])) and on(job,instance) (time() - timestamp(redis_keyspace_hits_total{job=\"redis-exporter\"}) <= 90)) and on(job,instance) (((up{job=\"redis-exporter\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"redis-exporter\"}) <= 90)) and on(job,instance) ((redis_up{job=\"redis-exporter\"} == 1) and on(job,instance) (time() - timestamp(redis_up{job=\"redis-exporter\"}) <= 90)))) + (((rate(redis_keyspace_misses_total{job=\"redis-exporter\"}[5m])) and on(job,instance) (time() - timestamp(redis_keyspace_misses_total{job=\"redis-exporter\"}) <= 90)) and on(job,instance) (((up{job=\"redis-exporter\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"redis-exporter\"}) <= 90)) and on(job,instance) ((redis_up{job=\"redis-exporter\"} == 1) and on(job,instance) (time() - timestamp(redis_up{job=\"redis-exporter\"}) <= 90)))))) and on(job,instance) (((((rate(redis_keyspace_hits_total{job=\"redis-exporter\"}[5m])) and on(job,instance) (time() - timestamp(redis_keyspace_hits_total{job=\"redis-exporter\"}) <= 90)) and on(job,instance) (((up{job=\"redis-exporter\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"redis-exporter\"}) <= 90)) and on(job,instance) ((redis_up{job=\"redis-exporter\"} == 1) and on(job,instance) (time() - timestamp(redis_up{job=\"redis-exporter\"}) <= 90)))) + (((rate(redis_keyspace_misses_total{job=\"redis-exporter\"}[5m])) and on(job,instance) (time() - timestamp(redis_keyspace_misses_total{job=\"redis-exporter\"}) <= 90)) and on(job,instance) (((up{job=\"redis-exporter\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"redis-exporter\"}) <= 90)) and on(job,instance) ((redis_up{job=\"redis-exporter\"} == 1) and on(job,instance) (time() - timestamp(redis_up{job=\"redis-exporter\"}) <= 90))))) > 0)",
        "unit": "percentunit",
        "interpretation": "Hit fraction only for a positive denominator; zero traffic is undefined, not zero percent."
      },
      "offscreen-messaging-cache/707": {
        "promql": "((rate(redis_evicted_keys_total{job=\"redis-exporter\"}[5m])) and on(job,instance) (time() - timestamp(redis_evicted_keys_total{job=\"redis-exporter\"}) <= 90)) and on(job,instance) (((up{job=\"redis-exporter\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"redis-exporter\"}) <= 90)) and on(job,instance) ((redis_up{job=\"redis-exporter\"} == 1) and on(job,instance) (time() - timestamp(redis_up{job=\"redis-exporter\"}) <= 90)))",
        "unit": "ops",
        "interpretation": "Evictions per second over 5m; zero valid only with current positive observation."
      },
      "offscreen-messaging-cache/708": {
        "promql": "((redis_connected_clients{job=\"redis-exporter\"}) and on(job,instance) (time() - timestamp(redis_connected_clients{job=\"redis-exporter\"}) <= 90)) and on(job,instance) (((up{job=\"redis-exporter\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"redis-exporter\"}) <= 90)) and on(job,instance) ((redis_up{job=\"redis-exporter\"} == 1) and on(job,instance) (time() - timestamp(redis_up{job=\"redis-exporter\"}) <= 90)))",
        "unit": "none",
        "interpretation": "Connected clients; no client identifiers."
      },
      "offscreen-messaging-cache/709": {
        "promql": "((rate(redis_commands_processed_total{job=\"redis-exporter\"}[5m])) and on(job,instance) (time() - timestamp(redis_commands_processed_total{job=\"redis-exporter\"}) <= 90)) and on(job,instance) (((up{job=\"redis-exporter\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"redis-exporter\"}) <= 90)) and on(job,instance) ((redis_up{job=\"redis-exporter\"} == 1) and on(job,instance) (time() - timestamp(redis_up{job=\"redis-exporter\"}) <= 90)))",
        "unit": "ops",
        "interpretation": "Redis commands processed per second over 5m, including exporter traffic; not application-only."
      }
    },
    "coverage": "enabled",
    "reason": ""
  }
]
```

### CNPG: missing CONNECT confirmed; owner correction needed

Catalog proves `cnpg_metrics_exporter` exists with LOGIN, non-superuser and `pg_monitor` membership; effective CONNECT false for all five connectable observed databases (`postgres`, `dev`, `dev_1`, `temporal`, `temporal_visibility`). Together with prior `cnpg_collector_up=0`, collection error and permission-denied categories, this confirms a necessary missing privilege, not proof that granting it alone resolves every query. The pinned vendor default ConfigMap in `infra/platform/postgres/vendor/cnpg-1.30.2.yaml` includes `pg_extensions` targeting `'*'`; do not assume a grant on postgres alone restores all default queries.

Source contradiction requiring PostgreSQL-owner decision: `chart/profiles/development.yaml` and `bootstrap/compatibility.mjs` intentionally revoke PUBLIC CONNECT/TEMPORARY; `temporal-persistence/prepare.mjs::verifyDatabase` rejects every explicit non-owner ACL grant, called from both `prepareFreshTemporalPersistence` and `verifyExistingTemporalPersistence`. Direct GRANT on the Temporal pair would make existing admission fail. Do not execute broad GRANT, restore PUBLIC CONNECT, switch to superuser exporter, alter `pg_monitor`, or bypass owner ACL verification. Recommended separately commissioned repair is explicit CONNECT only (no grant option or TEMPORARY) for the exact dedicated CNPG role on the approved monitored dev DBs, coupled to PostgreSQL baseline/tenant/Temporal creation and existing-admission contracts; verify no unrelated role access, no application data access/write grant or new memberships, preserve database owners and current PUBLIC isolation, and prove successful native stats. `dev_1` must be verified against its actual tenant database owner before selecting it. Preserve release behavior and coordinate a separate owner-authorized occupied repair under maintenance custody. Owner approved the narrow monitoring CONNECT evolution after the preceding evidence record. See OBS-E2-PG01 for the owner-side construction/qualification contract; 04 remains gated for selected full DB statistics until that repair is qualified. No live SQL authorization.


## G1 KSM construction freeze (2026-11-28)

Owner specimen at `4d7c82ea729e657e1ef495095b45247627ab8a48` established exact chart, runtime pin and scoped RBAC. Freeze the following observed family/label keys and panel rows for 02; 07 consumes them without waiting for source joins. Static targets `obs-kube-state-metrics:8080` and `obs-kube-state-metrics:8081`, HTTP `/metrics`, job names below, exact one target each. Ten collector resources and 50m/64Mi/128Mi remain as selected. Keep the existing Prometheus and Collector jobs unchanged at this stage. Do not store `kube_pod_info`, `kube_node_info`, `kube_persistentvolume_info`, container/image IDs, IPs or arbitrary object metadata. Retain only native identity keys shown below and the selected fixed scrape identity. The only conditional self family is `kube_state_metrics_list_total{resource,result}` (documented by upstream, not emitted in this specimen; allow in scrape configuration, do not assert present). Completed Jobs are visible via Pod phase and owner, with the selected Job collector retained. Direct Job-family and list-health evidence, degradation/recovery and actual cached inventory reconciliation are G5 obligations, not claimed PASS. No requirement to manufacture traffic for these in a construction packet. G5 must prove selected coverage or explicitly return a scope correction; missing list/watch health cannot support positive absence/healthy claims. Cached counts are labeled observed; if known degradation or unavailable/stale scrape, operator confidence is unknown and native kubectl is the cross-check (M01). Do not invent zero for missing families.

| Family | Observed native label keys |
| --- | --- |
| `kube_namespace_status_phase` | `namespace`, `phase` |
| `kube_node_status_condition` | `condition`, `node`, `status` |
| `kube_node_status_capacity` | `node`, `resource`, `unit` |
| `kube_node_status_allocatable` | `node`, `resource`, `unit` |
| `kube_pod_status_phase` | `namespace`, `phase`, `pod`, `uid` |
| `kube_pod_status_ready` | `condition`, `namespace`, `pod`, `uid` |
| `kube_pod_status_scheduled` | `condition`, `namespace`, `pod`, `uid` |
| `kube_pod_owner` | `namespace`, `owner_is_controller`, `owner_kind`, `owner_name`, `pod`, `uid` |
| `kube_pod_container_status_ready` | `container`, `namespace`, `pod`, `uid` |
| `kube_pod_container_status_restarts_total` | `container`, `namespace`, `pod`, `uid` |
| `kube_pod_container_status_last_terminated_reason` | `container`, `namespace`, `pod`, `reason`, `uid` |
| `kube_pod_container_resource_requests` | `container`, `namespace`, `node`, `pod`, `resource`, `uid`, `unit` |
| `kube_pod_container_resource_limits` | `container`, `namespace`, `node`, `pod`, `resource`, `uid`, `unit` |
| `kube_deployment_spec_replicas` | `deployment`, `namespace` |
| `kube_deployment_status_replicas_ready` | `deployment`, `namespace` |
| `kube_deployment_status_replicas_available` | `deployment`, `namespace` |
| `kube_replicaset_spec_replicas` | `namespace`, `replicaset` |
| `kube_replicaset_status_ready_replicas` | `namespace`, `replicaset` |
| `kube_replicaset_owner` | `namespace`, `owner_is_controller`, `owner_kind`, `owner_name`, `replicaset` |
| `kube_statefulset_replicas` | `namespace`, `statefulset` |
| `kube_statefulset_status_replicas_ready` | `namespace`, `statefulset` |
| `kube_daemonset_status_desired_number_scheduled` | `daemonset`, `namespace` |
| `kube_daemonset_status_number_ready` | `daemonset`, `namespace` |
| `kube_persistentvolumeclaim_status_phase` | `namespace`, `persistentvolumeclaim`, `phase` |
| `kube_persistentvolumeclaim_resource_requests_storage_bytes` | `namespace`, `persistentvolumeclaim` |
| `kube_persistentvolumeclaim_info` | `namespace`, `persistentvolumeclaim`, `storageclass`, `volumemode`, `volumename` |
| `kube_persistentvolume_status_phase` | `persistentvolume`, `phase` |
| `kube_persistentvolume_capacity_bytes` | `persistentvolume` |
| `kube_persistentvolume_claim_ref` | `claim_namespace`, `name`, `persistentvolume` |
| `kube_state_metrics_watch_total` | `resource`, `result` |

Frozen `coverage/inventory.json` initial rows (03 extends; 07 uses distinct panel IDs):

```json
[
  {
    "component": "kubernetes-inventory",
    "namespace": null,
    "workloadSelector": {
      "service": "obs-kube-state-metrics"
    },
    "jobs": [
      "kube-state-metrics"
    ],
    "requiredFamilies": [
      "kube_namespace_status_phase",
      "kube_node_status_condition",
      "kube_node_status_capacity",
      "kube_node_status_allocatable",
      "kube_pod_status_phase",
      "kube_pod_status_ready",
      "kube_pod_status_scheduled",
      "kube_pod_owner",
      "kube_pod_container_status_ready",
      "kube_pod_container_status_restarts_total",
      "kube_pod_container_status_last_terminated_reason",
      "kube_pod_container_resource_requests",
      "kube_pod_container_resource_limits",
      "kube_deployment_spec_replicas",
      "kube_deployment_status_replicas_ready",
      "kube_deployment_status_replicas_available",
      "kube_replicaset_spec_replicas",
      "kube_replicaset_status_ready_replicas",
      "kube_replicaset_owner",
      "kube_statefulset_replicas",
      "kube_statefulset_status_replicas_ready",
      "kube_daemonset_status_desired_number_scheduled",
      "kube_daemonset_status_number_ready",
      "kube_persistentvolumeclaim_status_phase",
      "kube_persistentvolumeclaim_resource_requests_storage_bytes",
      "kube_persistentvolumeclaim_info",
      "kube_persistentvolume_status_phase",
      "kube_persistentvolume_capacity_bytes",
      "kube_persistentvolume_claim_ref"
    ],
    "panels": {
      "offscreen-overview/101": {
        "promql": "sum(((kube_node_status_condition{job=\"kube-state-metrics\",condition=\"Ready\",status=\"true\"}) and (time() - timestamp(kube_node_status_condition{job=\"kube-state-metrics\",condition=\"Ready\",status=\"true\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90)))",
        "unit": "none",
        "interpretation": "Ready nodes, current cache. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-overview/102": {
        "promql": "count(((kube_node_status_condition{job=\"kube-state-metrics\",condition=\"Ready\",status=\"true\"}) and (time() - timestamp(kube_node_status_condition{job=\"kube-state-metrics\",condition=\"Ready\",status=\"true\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90)))",
        "unit": "none",
        "interpretation": "Observed nodes. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-overview/103": {
        "promql": "sum by (phase) (((kube_pod_status_phase{job=\"kube-state-metrics\"}) and (time() - timestamp(kube_pod_status_phase{job=\"kube-state-metrics\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90)))",
        "unit": "none",
        "interpretation": "Observed pods by phase, including Succeeded. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-kubernetes/201": {
        "promql": "(((kube_namespace_status_phase{job=\"kube-state-metrics\"}) and (time() - timestamp(kube_namespace_status_phase{job=\"kube-state-metrics\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))) == 1",
        "unit": "none",
        "interpretation": "Observed namespaces and phase. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-kubernetes/202": {
        "promql": "(((kube_pod_status_phase{job=\"kube-state-metrics\"}) and (time() - timestamp(kube_pod_status_phase{job=\"kube-state-metrics\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))) == 1",
        "unit": "none",
        "interpretation": "Pod phase table. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-kubernetes/203": {
        "promql": "((kube_pod_status_ready{job=\"kube-state-metrics\",condition=\"true\"}) and (time() - timestamp(kube_pod_status_ready{job=\"kube-state-metrics\",condition=\"true\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))",
        "unit": "none",
        "interpretation": "Pod readiness 1 or 0. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-kubernetes/204": {
        "promql": "((kube_pod_status_scheduled{job=\"kube-state-metrics\",condition=\"true\"}) and (time() - timestamp(kube_pod_status_scheduled{job=\"kube-state-metrics\",condition=\"true\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))",
        "unit": "none",
        "interpretation": "Scheduling status. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-kubernetes/205": {
        "promql": "((kube_deployment_spec_replicas{job=\"kube-state-metrics\"}) and (time() - timestamp(kube_deployment_spec_replicas{job=\"kube-state-metrics\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))",
        "unit": "none",
        "interpretation": "Deployment desired replicas. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-kubernetes/206": {
        "promql": "((kube_deployment_status_replicas_available{job=\"kube-state-metrics\"}) and (time() - timestamp(kube_deployment_status_replicas_available{job=\"kube-state-metrics\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))",
        "unit": "none",
        "interpretation": "Deployment available replicas. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-kubernetes/207": {
        "promql": "((kube_replicaset_spec_replicas{job=\"kube-state-metrics\"}) and (time() - timestamp(kube_replicaset_spec_replicas{job=\"kube-state-metrics\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))",
        "unit": "none",
        "interpretation": "ReplicaSet desired replicas. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-kubernetes/208": {
        "promql": "((kube_replicaset_status_ready_replicas{job=\"kube-state-metrics\"}) and (time() - timestamp(kube_replicaset_status_ready_replicas{job=\"kube-state-metrics\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))",
        "unit": "none",
        "interpretation": "ReplicaSet ready replicas. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-kubernetes/209": {
        "promql": "((kube_statefulset_replicas{job=\"kube-state-metrics\"}) and (time() - timestamp(kube_statefulset_replicas{job=\"kube-state-metrics\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))",
        "unit": "none",
        "interpretation": "StatefulSet desired replicas. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-kubernetes/210": {
        "promql": "((kube_statefulset_status_replicas_ready{job=\"kube-state-metrics\"}) and (time() - timestamp(kube_statefulset_status_replicas_ready{job=\"kube-state-metrics\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))",
        "unit": "none",
        "interpretation": "StatefulSet ready replicas. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-kubernetes/211": {
        "promql": "((kube_daemonset_status_desired_number_scheduled{job=\"kube-state-metrics\"}) and (time() - timestamp(kube_daemonset_status_desired_number_scheduled{job=\"kube-state-metrics\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))",
        "unit": "none",
        "interpretation": "DaemonSet desired scheduled. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-kubernetes/212": {
        "promql": "((kube_daemonset_status_number_ready{job=\"kube-state-metrics\"}) and (time() - timestamp(kube_daemonset_status_number_ready{job=\"kube-state-metrics\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))",
        "unit": "none",
        "interpretation": "DaemonSet ready. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-kubernetes/213": {
        "promql": "((kube_pod_container_status_restarts_total{job=\"kube-state-metrics\"}) and (time() - timestamp(kube_pod_container_status_restarts_total{job=\"kube-state-metrics\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))",
        "unit": "none",
        "interpretation": "Container cumulative restarts. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-kubernetes/214": {
        "promql": "((kube_pod_container_status_last_terminated_reason{job=\"kube-state-metrics\"}) and (time() - timestamp(kube_pod_container_status_last_terminated_reason{job=\"kube-state-metrics\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))",
        "unit": "none",
        "interpretation": "Last termination reason (1 indicates reason). Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-kubernetes/215": {
        "promql": "((kube_pod_owner{job=\"kube-state-metrics\"}) and (time() - timestamp(kube_pod_owner{job=\"kube-state-metrics\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))",
        "unit": "none",
        "interpretation": "Pod owner relationship. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-kubernetes/216": {
        "promql": "((kube_replicaset_owner{job=\"kube-state-metrics\"}) and (time() - timestamp(kube_replicaset_owner{job=\"kube-state-metrics\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))",
        "unit": "none",
        "interpretation": "ReplicaSet owner relationship. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-kubernetes/217": {
        "promql": "((kube_pod_container_resource_requests{job=\"kube-state-metrics\",resource=\"cpu\"}) and (time() - timestamp(kube_pod_container_resource_requests{job=\"kube-state-metrics\",resource=\"cpu\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))",
        "unit": "none",
        "interpretation": "Declared container requests; CPU cores or memory bytes, not usage. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-kubernetes/218": {
        "promql": "((kube_pod_container_resource_limits{job=\"kube-state-metrics\",resource=\"cpu\"}) and (time() - timestamp(kube_pod_container_resource_limits{job=\"kube-state-metrics\",resource=\"cpu\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))",
        "unit": "none",
        "interpretation": "Declared container limits; CPU cores or memory bytes, not usage. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-kubernetes/219": {
        "promql": "((kube_pod_container_resource_requests{job=\"kube-state-metrics\",resource=\"memory\"}) and (time() - timestamp(kube_pod_container_resource_requests{job=\"kube-state-metrics\",resource=\"memory\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))",
        "unit": "bytes",
        "interpretation": "Declared container requests; CPU cores or memory bytes, not usage. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-kubernetes/220": {
        "promql": "((kube_pod_container_resource_limits{job=\"kube-state-metrics\",resource=\"memory\"}) and (time() - timestamp(kube_pod_container_resource_limits{job=\"kube-state-metrics\",resource=\"memory\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))",
        "unit": "bytes",
        "interpretation": "Declared container limits; CPU cores or memory bytes, not usage. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-storage/601": {
        "promql": "(((kube_persistentvolumeclaim_status_phase{job=\"kube-state-metrics\"}) and (time() - timestamp(kube_persistentvolumeclaim_status_phase{job=\"kube-state-metrics\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))) == 1",
        "unit": "none",
        "interpretation": "Claim phase. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-storage/602": {
        "promql": "((kube_persistentvolumeclaim_resource_requests_storage_bytes{job=\"kube-state-metrics\"}) and (time() - timestamp(kube_persistentvolumeclaim_resource_requests_storage_bytes{job=\"kube-state-metrics\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))",
        "unit": "bytes",
        "interpretation": "Requested claim bytes. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-storage/603": {
        "promql": "((kube_persistentvolume_capacity_bytes{job=\"kube-state-metrics\"}) and (time() - timestamp(kube_persistentvolume_capacity_bytes{job=\"kube-state-metrics\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))",
        "unit": "bytes",
        "interpretation": "PV capacity bytes, not actual usage. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-storage/604": {
        "promql": "(((kube_persistentvolume_status_phase{job=\"kube-state-metrics\"}) and (time() - timestamp(kube_persistentvolume_status_phase{job=\"kube-state-metrics\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))) == 1",
        "unit": "none",
        "interpretation": "PV phase. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-nodes/301": {
        "promql": "((kube_node_status_capacity{job=\"kube-state-metrics\",resource=\"cpu\"}) and (time() - timestamp(kube_node_status_capacity{job=\"kube-state-metrics\",resource=\"cpu\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))",
        "unit": "none",
        "interpretation": "Node capacity or allocatable; CPU cores or memory bytes. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-nodes/302": {
        "promql": "((kube_node_status_allocatable{job=\"kube-state-metrics\",resource=\"cpu\"}) and (time() - timestamp(kube_node_status_allocatable{job=\"kube-state-metrics\",resource=\"cpu\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))",
        "unit": "none",
        "interpretation": "Node capacity or allocatable; CPU cores or memory bytes. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-nodes/303": {
        "promql": "((kube_node_status_capacity{job=\"kube-state-metrics\",resource=\"memory\"}) and (time() - timestamp(kube_node_status_capacity{job=\"kube-state-metrics\",resource=\"memory\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))",
        "unit": "bytes",
        "interpretation": "Node capacity or allocatable; CPU cores or memory bytes. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-nodes/304": {
        "promql": "((kube_node_status_allocatable{job=\"kube-state-metrics\",resource=\"memory\"}) and (time() - timestamp(kube_node_status_allocatable{job=\"kube-state-metrics\",resource=\"memory\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))",
        "unit": "bytes",
        "interpretation": "Node capacity or allocatable; CPU cores or memory bytes. Cached observation, not definitive API absence; missing/stale unknown."
      },
      "offscreen-nodes/305": {
        "promql": "(((kube_node_status_condition{job=\"kube-state-metrics\"}) and (time() - timestamp(kube_node_status_condition{job=\"kube-state-metrics\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))) == 1",
        "unit": "none",
        "interpretation": "Node condition table. Cached observation, not definitive API absence; missing/stale unknown."
      }
    },
    "coverage": "enabled",
    "reason": ""
  },
  {
    "component": "kubernetes-inventory-health",
    "namespace": "offscreen-dev-observability",
    "workloadSelector": {
      "service": "obs-kube-state-metrics"
    },
    "jobs": [
      "kube-state-metrics-self"
    ],
    "requiredFamilies": [
      "kube_state_metrics_watch_total"
    ],
    "panels": {
      "offscreen-observability/801": {
        "promql": "up{job=\"kube-state-metrics-self\"} and (time() - timestamp(up{job=\"kube-state-metrics-self\"}) <= 90)",
        "unit": "none",
        "interpretation": "Current self-scrape state, not cache consistency."
      },
      "offscreen-observability/802": {
        "promql": "sum by (resource,result) ((increase(kube_state_metrics_watch_total{job=\"kube-state-metrics-self\"}[5m]) and (time() - timestamp(kube_state_metrics_watch_total{job=\"kube-state-metrics-self\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics-self\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics-self\"}) <= 90)))",
        "unit": "none",
        "interpretation": "Observed watch results over five minutes. Missing error series is not proof of absence of errors."
      },
      "offscreen-observability/803": {
        "promql": "sum by (resource,result) ((increase(kube_state_metrics_list_total{job=\"kube-state-metrics-self\"}[5m]) and (time() - timestamp(kube_state_metrics_list_total{job=\"kube-state-metrics-self\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics-self\"} == 1) and (time() - timestamp(up{job=\"kube-state-metrics-self\"}) <= 90)))",
        "unit": "none",
        "interpretation": "Conditional list results; not observed in initial specimen. No data remains unknown, validate native list/watch semantics at G5."
      }
    },
    "coverage": "enabled",
    "reason": ""
  }
]
```

## G2 construction freeze candidate | direct HTTPS and cluster-bound trust

Native specimen PASSED, recorded above (both nodes and both paths, direct `/pods` negative). Source mapping rechecked at `main` `8cb05ff2841d548e52c75cd6dae0e666081f810b`. This is a scoped refinement of the defended collection mechanism, not acceptance of implementation or authorization to run cluster operations. Before 03 commission, review this exact trust/render interface and the resource-path refinement; do not repeat the native specimen or unrelated architecture defense. No live E2 activation before 08–13.

### Trust capture and immutable binding

Use the verified local Kind/Docker boundary, not an untrusted remote presented certificate and not the API CA. No node config changes, extra Helm release, host mount, CSR approval, broad RBAC, or private material. New source `infra/platform/observability/kubelet-trust.mjs` owns read-only `readDevKubeletTrust(identity,{run,now,deadline}) -> {schema:1,contextName,kubeSystemUid,baselineUid,nodes:[{name,nodeUid,dockerId,caSha256,caPem}],bindingSha256}` or throws a bounded sanitized `kubelet-trust-unavailable`. Exact two node names in lexical order; exact own properties and nonempty identities; canonical PEM is one public certificate per node, normalized LF and terminal newline, bounded to 16 KiB each. `bindingSha256` is SHA-256 of UTF-8 JSON of those fields excluding itself in the displayed key order, including normalized PEM. Leaf fingerprints are not in the binding, so ordinary leaf renewal under the same roots does not create an artifact revision. No IP, leaf fingerprint, private key, token or arbitrary Docker inspection output in receipts. Receipt can contain only binding/root SHA-256 and state.

1. Require actual frozen dev identity from `identity.mjs::captureIdentity` and its bounded runner; reject remote Docker/environment overrides as that module already does. `recheckIdentity` before/after capture. Read exact two Node objects using the frozen kubeconfig/context; require distinct UIDs, Running owned Kind Docker containers with exact `io.x-k8s.kind.cluster=offscreen-dev`, roles `control-plane`/`worker`, fixed names, distinct full Docker IDs, control-plane ID equal to frozen tuple, and Node InternalIP equal to that container's `kind` network IPv4. Read-only Docker inspect through the same local endpoint; execute by full verified container ID, not a mutable name. Refuse missing/extra nodes or mismatch. Neither IP nor certificate content from external discovery is an input to trust.
2. Per node, bounded local `docker exec <id> openssl s_client -connect 127.0.0.1:10250 -servername <exact-node-name> -showcerts` (closed stdin), extract exactly two PEM cert blocks, no untrusted text or private key; read the public disk leaf using `docker exec <id> openssl x509 -in /var/lib/kubelet/pki/kubelet.crt -outform PEM`. Require equal DER fingerprints. Verify self-signed root CA basic constraints, valid time, self-signature, and server-purpose chain + DNS SAN of leaf against only that root; reject CN-only, expired, wrong SAN, non-CA, wrong chain, unexpected cert count, unsupported OpenSSL or missing disk file. Use bounded private temporary directory for public PEM only, `openssl verify -no-CApath -no-CAstore -check_ss_sig -CAfile root.pem root.pem` and `openssl verify -no-CApath -no-CAstore -purpose sslserver -verify_hostname <node> -CAfile root.pem leaf.pem`; also explicitly check DNS SAN contains exact node (no wildcard), DER fingerprints, CA and leaf dates. Use Node `X509Certificate` for parse/fingerprints/date/SAN checks. Never send a bearer token here. In-cluster DNS and actual bearer behavior are already evidenced and repeated only in joint proof. Read node/container identity again and compare before accepting output; repeat frozen identity check. No environment-driven CA path or arbitrary Docker target.
3. Freeze immutable binding for each operation. Under existing observation/operation custody acquire and recheck the binding before mutation and final verification, never re-render a different target mid-operation. Initial trust for a newly created dev cluster is derived only from this verified local owner boundary during the separately authorized E2 ensure/upgrade. Existing E2 is admitted only when current binding and exact installed Helm artifact match. On root, cluster, node or Docker identity change, missing/expired/unreadable anchor or failed verification, refuse E2 convergence/forward/operation; do not update a live CA, approve CSR, rotate credentials, add revisions or repair automatically. Same-root valid leaf renewal is allowed. Root replacement needs a future explicitly authorized owner-side repair with a new reviewed history row; cluster recreation has no occupied history and obtains a new binding on fresh E2 installation. E1 operation admission is unaffected by inability to derive E2 trust.

### Helm integration and operation routing

The vendored Prometheus 31.0.0 chart `templates/extra-manifests.yaml` runs `tpl` on strings in `extraManifests`; `templates/deploy.yaml` supports `server.extraConfigmapMounts`. Use one new dev-E2 Helm-owned ConfigMap `obs-kubelet-trust`, namespace `offscreen-dev-observability`, exact `offscreen.dev/owner: offscreen-dev` label, annotation `offscreen.dev/kubelet-trust-binding-sha256`, `immutable: true`, single data key `ca.pem`: concatenate normalized root PEMs in node order. The only dynamic values are supplied by 08 from the validated binding as one literal `--set-json offscreenKubeletTrust=<JSON>` argument with exactly `{bindingSha256,caPem}`; no shell expansion. Template uses `required` and `quote` on those two scalar values, not `tpl` on input; roots are parsed canonical certificate PEM, hashes exact 64 lowercase hex. `server.extraConfigmapMounts` adds `{name:kubelet-trust,configMap:obs-kubelet-trust,mountPath:/etc/offscreen/kubelet-trust,readOnly:true}`. TLS file `/etc/offscreen/kubelet-trust/ca.pem`. Do not commit this cluster's CA or introduce another mutable ConfigMap writer. Combined roots are trusted only within this fixed two-node local cluster and normal hostname verification remains required. Do not use this as a general-purpose trust store.

08 owns `loadArtifacts('dev',{variant:'dev-e2',kubeletTrust,...})`, exact validated binding required; `helmValuesArgv` supplies the same explicit JSON to render/install/upgrade. E1 and release ignore no E2 input: reject a supplied E2 trust override for historical variants; historical resolver unchanged. Bundle adds `kubeletTrustBindingSha256` and retains actual immutable input internally; exact render and Helm revision manifests include CA bytes/digest, not a wildcard in comparisons. The inventory includes the new ConfigMap and validates its exact data key, annotation, immutability, release owner and UID. Test fixture roots must be generated/loaded from explicitly test-only public certificates and passed via injected fixture binding; no production default, no fake runtime CA. Public dev render/lint requires real verified local trust (unavailable fails with actionable reason); historical/release renders and offline source fixture tests remain usable without a live cluster. This trade-off is selected to avoid an apparently deployable placeholder artifact. No public flag to supply arbitrary trust.

`loadOperationalArtifactSet(profileId,deps)` adds `desiredArtifactId` and `desiredUnavailableReason` (null when available). If read-only dev trust capture fails, normal selector can still return exact historical E1 descriptors, `desired:null`, `desiredArtifactId:'dev-e2'`, `desiredUnavailableReason:'kubelet-trust-unavailable'`; no substitute desired E1, no partial E2. Static named E2 inventory identities from 08 are still observed, so an unavailable binding never hides an occupied E2 or foreign RBAC/ConfigMap collision. Explicit E2 requests fail without a binding. 09 matches existing E1 normally (desiredConverged=false), but refuses unknown E2 rather than admitting its shape by trusting Helm's own CA content; exact E2 needs independent current binding. 10/11 capture binding under the existing custody before E2 activation, pass the one bound descriptor throughout, and compare digest on pre-write and final readback. 11 records binding digest in E2 pending details, refuses root drift and preserves fence. E1 historical proofs retain E1 resolution and permissions even if current kubelet trust is unavailable. 12 normal proofs use same matched descriptor and recheck. 13 proves trust from actual Prometheus network, bad CA/SAN/changed node identity refusal, root drift no write and same-root leaf renewal fixture, both actual endpoint `up`, exact live mount and RBAC, no unexpected Helm revision/history. Historical revision rows unchanged; P2 content is exact per validated cluster binding. Never reconstruct a desired trust binding from an installed release.

### Exact scrape and resource metrics

Retain dedicated Prometheus SA and existing narrow Pod discovery; add exactly node `get/list/watch` and `nodes/metrics` get, no `nodes/proxy`. Add jobs `kubelet-resource` and `kubelet-cadvisor`, role node discovery, keep `__meta_kubernetes_node_name` matching `^(offscreen-dev-control-plane|offscreen-dev-worker)$`, set `node` from that name, `__address__` to `$1:10250`, HTTPS, fixed paths `/metrics/resource` and `/metrics/cadvisor`, `authorization.credentials_file: /var/run/secrets/kubernetes.io/serviceaccount/token`, TLS `ca_file` above, no `insecure_skip_verify`, no generic labelmap. Stable target instance is DNS:10250, cluster/environment/component labels use shared 02 contract. Fixed 30s/10s, target_limit 4 each, sample_limit 5000 resource/20000 cAdvisor, label limits 40/128/512.

**Resource source refinement:** native `/metrics/resource` returned node, Pod and container CPU/working-set families on both nodes with clean namespace/pod/container labels and no container IDs. Use it as the canonical source for *all* CPU/RAM totals; this preserves required E2-R coverage while avoiding cAdvisor raw container IDs and CPU per-core/aggregate overlap. Do not sum both jobs. Keep exactly six resource families in table below, require nonempty namespace/pod for Pod series and namespace/pod/container for container series, exclude `POD` for container series, no arbitrary labels. cAdvisor remains authenticated, independently scraped; keep only conditional network receive/transmit bytes counters with `container="POD"`, nonempty namespace/pod/interface, exclude `lo`; preserve namespace/pod/interface plus fixed identity, drop image/name/id and all other raw labels. The specimen proves family names/keys, not actual sandbox label values or uniqueness. Therefore no network panel/positive domain coverage in this first frozen contract; G5 must check actual retained series uniqueness, sandbox attribution and label values, or explicitly report network unsupported (no zero). If filtering aliases series or causes rejected scrape, do not accept; return precise evidence for planner. Disk/throttling unsupported as selected; no fake samples. Both node resource sources must be current for cluster-wide totals; group aggregates suppressed on missing/stale node targets. Node/pod/container series remain distinct. Grafana panel rows below are exact source declarations for 03/07/08; all rates use 5m and freshness <=90s.

| Resource sample | Native keys retained (in addition to fixed scrape identity) |
| --- | --- |
| `node_cpu_usage_seconds_total`, `node_memory_working_set_bytes` | none |
| `pod_cpu_usage_seconds_total`, `pod_memory_working_set_bytes` | namespace, pod |
| `container_cpu_usage_seconds_total`, `container_memory_working_set_bytes` | namespace, pod, container |
| Conditional cAdvisor `container_network_receive_bytes_total`, `container_network_transmit_bytes_total` | namespace, pod, interface; only qualifying sandbox, no raw id/name/image |

Append the following rows to 02's `coverage/inventory.json` without changing its existing rows. Panel queries gate metric freshness before aggregation and require both current node targets for cluster/namespace totals; no absent-to-zero fallback. CPU cores, not percent of physical host; memory working set, not allocation. Per-container views remain absent when no resource series (e.g. completed Pod).

```json
[
  {
    "component": "kubelet-resource",
    "namespace": null,
    "workloadSelector": {
      "nodeNames": [
        "offscreen-dev-control-plane",
        "offscreen-dev-worker"
      ]
    },
    "jobs": [
      "kubelet-resource"
    ],
    "requiredFamilies": [
      "node_cpu_usage_seconds_total",
      "node_memory_working_set_bytes",
      "pod_cpu_usage_seconds_total",
      "pod_memory_working_set_bytes",
      "container_cpu_usage_seconds_total",
      "container_memory_working_set_bytes"
    ],
    "panels": {
      "offscreen-overview/104": {
        "promql": "((sum (((rate(node_cpu_usage_seconds_total{job=\"kubelet-resource\"}[5m])) and (time() - timestamp(node_cpu_usage_seconds_total{job=\"kubelet-resource\"}) <= 90)) and on(job,instance) ((up{job=\"kubelet-resource\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kubelet-resource\"}) <= 90)))) and on() ((count(((up{job=\"kubelet-resource\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kubelet-resource\"}) <= 90))) == 2))) and on() (count(((node_cpu_usage_seconds_total{job=\"kubelet-resource\"}) and (time() - timestamp(node_cpu_usage_seconds_total{job=\"kubelet-resource\"}) <= 90)) and on(job,instance) ((up{job=\"kubelet-resource\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kubelet-resource\"}) <= 90))) == 2)",
        "unit": "none",
        "interpretation": "CPU cores across both Kind nodes, only when both resource scrapes current. Require current node family on both nodes; suppress incomplete totals."
      },
      "offscreen-nodes/306": {
        "promql": "sum by (node) (((rate(node_cpu_usage_seconds_total{job=\"kubelet-resource\"}[5m])) and (time() - timestamp(node_cpu_usage_seconds_total{job=\"kubelet-resource\"}) <= 90)) and on(job,instance) ((up{job=\"kubelet-resource\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kubelet-resource\"}) <= 90)))",
        "unit": "none",
        "interpretation": "CPU cores per Kind node, missing/stale unknown."
      },
      "offscreen-nodes/308": {
        "promql": "(sum by (node) (((rate(node_cpu_usage_seconds_total{job=\"kubelet-resource\"}[5m])) and (time() - timestamp(node_cpu_usage_seconds_total{job=\"kubelet-resource\"}) <= 90)) and on(job,instance) ((up{job=\"kubelet-resource\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kubelet-resource\"}) <= 90)))) / on(node) (((kube_node_status_allocatable{job=\"kube-state-metrics\",resource=\"cpu\"} and (time() - timestamp(kube_node_status_allocatable{job=\"kube-state-metrics\",resource=\"cpu\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))) > 0)",
        "unit": "percentunit",
        "interpretation": "CPU cores divided by current positive allocatable; may exceed 100%, not physical host usage."
      },
      "offscreen-overview/105": {
        "promql": "((sum (((node_memory_working_set_bytes{job=\"kubelet-resource\"}) and (time() - timestamp(node_memory_working_set_bytes{job=\"kubelet-resource\"}) <= 90)) and on(job,instance) ((up{job=\"kubelet-resource\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kubelet-resource\"}) <= 90)))) and on() ((count(((up{job=\"kubelet-resource\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kubelet-resource\"}) <= 90))) == 2))) and on() (count(((node_memory_working_set_bytes{job=\"kubelet-resource\"}) and (time() - timestamp(node_memory_working_set_bytes{job=\"kubelet-resource\"}) <= 90)) and on(job,instance) ((up{job=\"kubelet-resource\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kubelet-resource\"}) <= 90))) == 2)",
        "unit": "bytes",
        "interpretation": "Working-set bytes across both Kind nodes, only when both resource scrapes current. Require current node family on both nodes; suppress incomplete totals."
      },
      "offscreen-nodes/307": {
        "promql": "sum by (node) (((node_memory_working_set_bytes{job=\"kubelet-resource\"}) and (time() - timestamp(node_memory_working_set_bytes{job=\"kubelet-resource\"}) <= 90)) and on(job,instance) ((up{job=\"kubelet-resource\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kubelet-resource\"}) <= 90)))",
        "unit": "bytes",
        "interpretation": "Working-set bytes per Kind node, missing/stale unknown."
      },
      "offscreen-nodes/309": {
        "promql": "(sum by (node) (((node_memory_working_set_bytes{job=\"kubelet-resource\"}) and (time() - timestamp(node_memory_working_set_bytes{job=\"kubelet-resource\"}) <= 90)) and on(job,instance) ((up{job=\"kubelet-resource\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kubelet-resource\"}) <= 90)))) / on(node) (((kube_node_status_allocatable{job=\"kube-state-metrics\",resource=\"memory\"} and (time() - timestamp(kube_node_status_allocatable{job=\"kube-state-metrics\",resource=\"memory\"}) <= 90)) and on(job,instance) ((up{job=\"kube-state-metrics\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kube-state-metrics\"}) <= 90))) > 0)",
        "unit": "percentunit",
        "interpretation": "Working-set bytes divided by current positive allocatable; may exceed 100%, not physical host usage."
      },
      "offscreen-overview/106": {
        "promql": "((sum by (namespace) (((rate(pod_cpu_usage_seconds_total{job=\"kubelet-resource\"}[5m])) and (time() - timestamp(pod_cpu_usage_seconds_total{job=\"kubelet-resource\"}) <= 90)) and on(job,instance) ((up{job=\"kubelet-resource\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kubelet-resource\"}) <= 90)))) and on() ((count(((up{job=\"kubelet-resource\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kubelet-resource\"}) <= 90))) == 2))) and on() (count(((node_cpu_usage_seconds_total{job=\"kubelet-resource\"}) and (time() - timestamp(node_cpu_usage_seconds_total{job=\"kubelet-resource\"}) <= 90)) and on(job,instance) ((up{job=\"kubelet-resource\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kubelet-resource\"}) <= 90))) == 2)",
        "unit": "none",
        "interpretation": "Pod CPU cores by namespace across both current nodes; no absent-to-zero. Require current node family on both nodes; suppress incomplete totals."
      },
      "offscreen-nodes/310": {
        "promql": "sum by (node,namespace) (((rate(pod_cpu_usage_seconds_total{job=\"kubelet-resource\"}[5m])) and (time() - timestamp(pod_cpu_usage_seconds_total{job=\"kubelet-resource\"}) <= 90)) and on(job,instance) ((up{job=\"kubelet-resource\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kubelet-resource\"}) <= 90)))",
        "unit": "none",
        "interpretation": "Pod CPU cores by node and namespace; do not add container copies."
      },
      "offscreen-overview/107": {
        "promql": "((sum by (namespace) (((pod_memory_working_set_bytes{job=\"kubelet-resource\"}) and (time() - timestamp(pod_memory_working_set_bytes{job=\"kubelet-resource\"}) <= 90)) and on(job,instance) ((up{job=\"kubelet-resource\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kubelet-resource\"}) <= 90)))) and on() ((count(((up{job=\"kubelet-resource\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kubelet-resource\"}) <= 90))) == 2))) and on() (count(((node_memory_working_set_bytes{job=\"kubelet-resource\"}) and (time() - timestamp(node_memory_working_set_bytes{job=\"kubelet-resource\"}) <= 90)) and on(job,instance) ((up{job=\"kubelet-resource\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kubelet-resource\"}) <= 90))) == 2)",
        "unit": "bytes",
        "interpretation": "Pod working-set bytes by namespace across both current nodes; no absent-to-zero. Require current node family on both nodes; suppress incomplete totals."
      },
      "offscreen-nodes/311": {
        "promql": "sum by (node,namespace) (((pod_memory_working_set_bytes{job=\"kubelet-resource\"}) and (time() - timestamp(pod_memory_working_set_bytes{job=\"kubelet-resource\"}) <= 90)) and on(job,instance) ((up{job=\"kubelet-resource\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kubelet-resource\"}) <= 90)))",
        "unit": "bytes",
        "interpretation": "Pod working-set bytes by node and namespace; do not add container copies."
      },
      "offscreen-kubernetes/221": {
        "promql": "sum by (node,namespace,pod,container) (((rate(container_cpu_usage_seconds_total{job=\"kubelet-resource\"}[5m])) and (time() - timestamp(container_cpu_usage_seconds_total{job=\"kubelet-resource\"}) <= 90)) and on(job,instance) ((up{job=\"kubelet-resource\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kubelet-resource\"}) <= 90)))",
        "unit": "none",
        "interpretation": "Container CPU cores by running workload container; excludes infrastructure; no samples for completed/pending containers."
      },
      "offscreen-kubernetes/222": {
        "promql": "sum by (node,namespace,pod,container) (((container_memory_working_set_bytes{job=\"kubelet-resource\"}) and (time() - timestamp(container_memory_working_set_bytes{job=\"kubelet-resource\"}) <= 90)) and on(job,instance) ((up{job=\"kubelet-resource\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kubelet-resource\"}) <= 90)))",
        "unit": "bytes",
        "interpretation": "Container working-set bytes by running workload container; excludes infrastructure; no samples for completed/pending containers."
      }
    },
    "coverage": "enabled",
    "reason": ""
  },
  {
    "component": "kubelet-cadvisor-network",
    "namespace": null,
    "workloadSelector": {
      "nodeNames": [
        "offscreen-dev-control-plane",
        "offscreen-dev-worker"
      ]
    },
    "jobs": [
      "kubelet-cadvisor"
    ],
    "requiredFamilies": [],
    "panels": {},
    "coverage": "inventory-only",
    "reason": "Authenticated scrape selected; network family/label keys observed but sandbox values and uniqueness unqualified; no network or disk domain panel. G5 records actual supported coverage."
  }
]
```

## G4a owner transition candidate | bounded SeaweedFS metrics enablement

Rechecked source at `8cb05ff2841d548e52c75cd6dae0e666081f810b`. Native predecessor observation in earlier evidence remains historical. This is an owner-side candidate requiring selection and affected review, not permission to restart the existing store. The source can be constructed before G4b; preserve release E1 and all existing object/tenant guarantees.

### Exact variant and state selection

`providers/seaweedfs/chart/values.yaml` adds `metricsEnabled:false`; schema boolean optional with default false and reject true for release at template render. `profiles/development.yaml` sets true for fresh dev. `deployment.yaml` in dev target adds precisely `-metricsPort=9327` to `['mini','-dir=/data']` and named TCP `metrics` container port 9327; `service.yaml` adds named TCP 9327 target `metrics` (same ClusterIP, S3 8333). Release and predecessor parsed manifests byte-semantically unchanged. Keep image, Recreate, one replica, security/env/data/claim/probes/resources. Chart version 0.1.0 unchanged for exact retained predecessor identity; no fabricated image digests or new release. Render predecessor internally with fixed `{metricsEnabled:false}` stdin overlay via `renderPlatformDocuments` (actual `helmPlatformStdin` supports it); compare old installed user values exactly without newly added key. Target expected user values exactly current dev profile. History states: dev old rev1 deployed, dev metrics fresh rev1 deployed, dev metrics upgraded rev1 superseded + rev2 deployed; release only historical rev1. Verify exact list, history, chart/version, `helm get values` and manifest for each retained revision and corresponding Helm storage Secret metadata/UID bijection, reject extra or unknown. Native-compatible predecessor remains operational for S3, no-op ensure, metrics-not-enabled status; fresh uses target, no implicit upgrade. Exact target no-op. Do not accept old legacy history as upgrade predecessor. Ordinary observation of an upgrade pending is not operational even if final shape exists.

`observe.mjs::validateWorkloadContainer`, `validateWorkloadPodSpec`, `validateLiveStructuralChain` compare exact variant arguments and ports; require target Service both ports and matching endpoint ports/targetRef, same S3 chain. `readLiveChainObservation` currently requires exactly one RS; for upgraded target select the ready Pod's exact controlling RS under the same Deployment, allow only additional retained RS owned by that Deployment and all zero desired/current/ready/available replicas with no live/terminating Pod; no foreign extra RS. Verify same PVC/PV claim/data directory identity and mount. Existing release and legacy admission unchanged. `comparePriorReceiptIdentity` is never relaxed: old receipt mismatch stays mismatch; successful owner transition emits a new exact positive receipt linking original and successor RS/Pod identities and preserved chain. Do not claim continuity without this receipt. Existing object store observers and callers in `dev-shared-core-readiness`, `dev-slot-startup`, `infra-cli` and release credentials must retain current S3 readiness meanings. No change to tenant permissions.

### Separately authorized occupied owner operation

Proposed exact entry `OFFSCREEN_OBJECT_STORAGE_METRICS_UPGRADE=authorized OFFSCREEN_OBJECT_STORAGE_MAINTENANCE=quiesced node infra/platform/object-storage/providers/seaweedfs/install.mjs upgrade-metrics dev --confirm-context kind-offscreen-dev --marker-file <private-local-json>`; reject all other profiles, missing/extra args/vars, alternate context or release. Only exact clean joined Design SHA with passing focused receipt, separately authorized by owner. No ordinary ensure, general Helm upgrade, observability operation or automatic repair. Require operator exclusion of old clients, arbitrary external S3 writers, lifecycle/slot startup/tenant operations throughout (lock alone cannot fence those). Under existing object-store flock, read current v2 registry via `devWorktreeRegistryRoot` + `readExistingRegistryV2`, require no leases; fixed cluster namespace/Pod/controller reads: registered slot namespaces and any `offscreen-dev-<positive integer>` namespace must have no active/nonterminal/terminating Pods, active Jobs or nonzero desired Deployment/StatefulSet replicas; unreadable, missing/malformed registry or unknown state refuses. No parking/killing foreign work. Repeat immediately before dispatch. Check actual memory admission as existing dev install. Operator attestation is not a proof of every arbitrary external client.

Marker is an **already existing synthetic owner-selected object** (not an application document). Private JSON exact `{schema:1,bucket,key,sha256,size}`; bucket `offscreen-e2-marker-<32 lowercase hex>`, key `retained-marker.bin`, hash exact lowercase SHA-256, size integer 32..4096. Require private regular owner file (0600/no symlink, <=4096 bytes), no arbitrary keys or credentials. Marker preparation is a separate owner-authorized S3 operation if none exists; the transition never creates/deletes/overwrites objects or buckets. Extend `live-sdk.mjs` with bounded internal GET via its existing loopback `withForward`, exact admin Secret identity and credentials only in memory, cap bytes and hash while reading; no raw content/path/credentials in output. Require same size/hash before and after; verify same admin Secret UID/resourceVersion, service UID/ClusterIP, namespace, Deployment, claim/PV/claimRef/hostPath/mount identity, image and data. Close forward before Helm dispatch. Missing or mismatch refuses. Receipt contains marker SHA/size only. If a marker cannot be prepared under separate authority, native G4b stays gated; no further source research campaign.

Use same `withObjectStorageMutation` lock path and deadline, but a narrow dedicated transition mode inside owner module: current `identityAdoptAfterWrite` refuses changes to a known Pod name/UID, so do NOT relax it for general install/provision. Only `upgrade-metrics` path permits one replacement of PodName/UID after one fixed guarded Helm invocation, while every other identity field matches; full independently verified successor chain before clear. Persist exact versioned private intent before write `{schema:2,operation:'upgrade-metrics',profileId:'dev',contextName,startedAt,operationId,identity,details:{predecessorRevision:1,targetRevision:2,predecessorManifestSha256,targetManifestSha256,namespaceUid,deploymentUid,serviceUid,serviceClusterIP,secretUid,secretResourceVersion,pvcUid,pvUid,pvHostPath,oldReplicaSetUid,oldPodUid,oldHelmStorageUid,markerSha256,markerSize}}`. Use existing O_EXCL/private/fsync directory, compare current exact owned pending contents/inode before clear, never adopt/resume/overwrite existing record. Keep old install/provision schema/path behavior. Old writers refuse any pending. New ordinary public observers refuse any recognized metrics transition or malformed pending; under own active guard only dedicated internal verification of expected predecessor/target may inspect through the owned intent (do not expose a boolean bypass). Existing fresh install's own internal reads preserve old semantics. Separate owner operation dispatches only `helm upgrade object-store <provider chart> --kube-context kind-offscreen-dev --namespace offscreen-dev-objects --reset-values -f <development profile> --wait --timeout 180s` with existing 185s command bound and 600s total; no --force, --atomic, --reuse-values, rollback or uninstall. No other write. Recheck identity before/after; successor must be exactly rev2, retained old rev1 storage UID/manifests/values; new RS/Pod owned, old Pod gone, exactly one ready target, preserved all other IDs/data, successful marker and `/metrics` on 9327. If command/identity/history/marker/endpoint/cleanup fails or unknown outcome, stop and retain pending; no automatic retry. Exact target repeat zero writes, no new intent, read-only verification; not a way to clear pending. No extra revision, replacement or data mutation authorized.

### Dependency correction candidate

06 T01/T02 owner construction should join and archive on its focused source gate, transferring G4b to Design, analogous to PG01. No incomplete observability activation. Move old 06 T03 enrollment to 04 as a separate bounded task after separately authorized occupied transition proves exact target and returns metric names/keys/units (no guessed panels). This removes a source/native cycle and allows independent owner construction. Candidate must be ratified and reflected in 06/04 proof/standing and group before release; owner marker preparation still needs separate permission and a real descriptor. G4b required before 04 SeaweedFS enrollment, 07 complete dashboards, 08 full artifact and 13. No automatic reduced artifact. Current 06 packet remains planner-blocked until split and exact pending/read-only observer boundary are reviewed/ratified; this text freezes the candidate, not a Ready verdict.

## Freeze record (current)

| Gate | Current result | Closure owner | Affected |
| --- | --- | --- | --- |
| G1 KSM | Registry/runtime pin, render and specimen permissions PASS; observed construction rows frozen; list/Job/degradation proof remains G5 | planner + owner | 02,07,08 |
| G1 Redis | v1.93.0 rejected; v1.97.0 pin, exclusion flags, disposable command/negative evidence and selected coverage RESOLVED | planner + owner | 05,07,08 |
| G2 | Native feasibility PASSED; scoped trust/render and resource coverage candidate frozen above, pending affected readiness/owner selection; integrated G5 NOT RUN | owner/cluster owner + planner | 03,07,08 |
| G3 | Collector existing scrape PASS; Redis replacement specimen PASS; CNPG missing CONNECT confirmed; owner ACL correction and remaining non-Redis panel contracts OPEN | service owner + planner | 04,05,06,07,08 |
| G4a/b | Revision-1 predecessor metadata observed; owner contract/transition OPEN | object-store owner + planner/acceptance lead | 06,07,08 |
| G5 | NOT RUN | acceptance lead + owner | 13 |

Append only actual evidence references and current resolved input values here or in existing evidence owner; update corresponding affected cards in place. No third comprehensive architecture review for ordinary facts. No implementation-ready claim for dependent scope until material facts resolved and reviewed. Keep raw secret data outside Git. The owner can send one consolidated nonsecret terminal summary for G1–G3; G4 owner transition requires separate bounded closure, not an arbitrary live patch.
