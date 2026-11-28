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

## Freeze record (current)

| Gate | Current result | Closure owner | Affected |
| --- | --- | --- | --- |
| G1 KSM | Registry/runtime pin, render and specimen permissions PASS; observed construction rows frozen; list/Job/degradation proof remains G5 | planner + owner | 02,07,08 |
| G1 Redis | v1.93.0 rejected; v1.97.0 pin, exclusion flags, disposable command/negative evidence and selected coverage RESOLVED | planner + owner | 05,07,08 |
| G2 | Direct verified HTTPS + scoped bearer access PASSED on both nodes with node-local roots; durable trust contract and exact panel rows OPEN | owner/cluster owner + planner | 03,07,08 |
| G3 | Collector existing scrape PASS; Redis replacement specimen PASS; CNPG missing CONNECT confirmed; owner ACL correction and remaining non-Redis panel contracts OPEN | service owner + planner | 04,05,06,07,08 |
| G4a/b | Revision-1 predecessor metadata observed; owner contract/transition OPEN | object-store owner + planner/acceptance lead | 06,07,08 |
| G5 | NOT RUN | acceptance lead + owner | 13 |

Append only actual evidence references and current resolved input values here or in existing evidence owner; update corresponding affected cards in place. No third comprehensive architecture review for ordinary facts. No implementation-ready claim for dependent scope until material facts resolved and reviewed. Keep raw secret data outside Git. The owner can send one consolidated nonsecret terminal summary for G1–G3; G4 owner transition requires separate bounded closure, not an arbitrary live patch.
