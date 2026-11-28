# E2 | native input closure (planner/operator evidence only)

**Status:** G1 KSM specimen passed; Redis v1.97.0 replacement native specimen PASSED with frozen coverage. G2 node-local trusted HTTPS feasibility and Collector existing scrape PASSED. 03 and 06 source construction joined. PG01 occupied repair, collector recovery and existing-tenant read-only executor admission PASS. G4b marker preparation and occupied metrics rollout PASS; retained data verified, 112 native sample names observed. All selected endpoint reads now succeeded; bounded coverage scope owner-ratified on 2026-11-28; affected packet readiness pending. G5 remains OPEN. Verified remote planning base `1fa759b980d275ef4ad9d11590cf080fc807ccd2`. [Defended dossier](../../../designs/open/observability-infrastructure-visibility/EVIDENCE.md) owns architecture and scope. This is the one bounded evidence handoff for all affected packets, not an implementation research assignment. Owner ran the read-only native probe at the committed batch SHA; planner records the observed subset below. No native commands executed by planner; no fabricated digest, cert, endpoint, family or PASS. G5 is downstream construction and qualification. Owner must explicitly authorize any live probe creating resources, executing a helper container, or mutating data. Read-only metadata/port-forwards need correct fixed dev target and must not disclose credentials. No release commands, no provider spend.

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

**Blocks:** 04,05, affected 07/08 (including SeaweedFS enrollment now owned by 04). Read-only inventories:

```bash
kubectl --context kind-offscreen-dev -n offscreen-dev-postgres get pods,svc --show-labels
kubectl --context kind-offscreen-dev -n offscreen-dev-temporal get pods,svc --show-labels
kubectl --context kind-offscreen-dev -n offscreen-dev-rabbitmq get pods,svc --show-labels
kubectl --context kind-offscreen-dev -n offscreen-dev-redis get pods,svc --show-labels
kubectl --context kind-offscreen-dev -n offscreen-dev-observability get pods,svc --show-labels
```

Use explicit dev loopback port-forward to the actual named Pod/Service and confirmed remote port, one at a time, for native endpoint inspection. For example, only if service mapping confirms it: `kubectl --context kind-offscreen-dev -n offscreen-dev-rabbitmq port-forward svc/rabbitmq 25692:15692 --address 127.0.0.1`, then `curl -fsS http://127.0.0.1:25692/metrics` locally; summarize metric family names, label **keys** and units, redact values and stop forward. No generic scrape or credentials sent to unverified endpoint. For CNPG and four Temporal roles prove exact Pod container/name/labels/port protocol (9187, 9090 selected), RabbitMQ aggregate 15692, Loki/Tempo/Grafana paths verified against actual rendered services, Prometheus/Collector existing jobs retained. Optional operator/control-plane endpoints remain inventory-only unless already safely verified. Redis v1.97.0 (active replacement; see owner replacement specimen): inspect exact tagged upstream source/flags, prove fixed target, disabled alternate scrape endpoint/config command, no key/stream/scan/script/client-list/value collection, emitted label keys and no data writes on separately authorized disposable exporter specimen; unauthenticated Redis remains local trust limitation, not ACL guarantee. No paid traffic. SeaweedFS native family proof comes with G4b.

Record **one row per endpoint**: component, exact namespace/workload selector/container, service/port/path/scheme and trust/auth mode, actual successful query/metric family/label keys/unit, allowed labels, specific dashboard query+unit and meaning, expected job, missing/unsupported rationale, command status and date. Include one proven family per required panel and health/freshness negative semantics. Planner freezes the exact per-component coverage JSON rows (including panel IDs, PromQL, units and semantics) in this register or a linked evidence file before affected dispatch; 02/03/04/05 materialize those rows in their owned files; 04 owns the SeaweedFS coverage fragment after G4b, 07 consumes the same frozen rows without waiting for source joins and 08 checks equality. Implementation agents must not invent native metric names or labels. No unsupported fallback presented as healthy.

## G4 | SeaweedFS owner boundary

**Blocks:** G4a gates 06 source construction; G4b gates 04 enrollment, affected 07/08 and full E2. G4a (pre-construction): confirm exact dev chart/values and install/observe/mutation-guard callers, current Helm/data-chain identity; freeze explicit upgrade CLI/env permission, exact versioned owner pending schema and CAS conditions, existing object marker and no-active-consumer admission, exact dev predecessor/target comparison, release unchanged, postconditions and failure fixture. Selected change: existing mini process 4.54 `-metricsPort=9327`, same S3 8333, image, Service, Secret, PVC/PV, data path, no implicit observe/ensure mutation. Do not delegate unresolved G4a choices. G4b (after source construction, before enabling SeaweedFS monitoring): independently owner-authorized guarded transition with retained object marker and exact data chain, one controlled Pod restart only, successful new endpoint and native metric family/labels, exact receipt SHA. No live authority from this document. 06 is source-construction only; its focused receipt and archive/join transfer G4b to the Design. If G4b cannot be performed, full enrollment remains gated. If not feasible, owner may ratify inventory-only scope and planner updates affected packets/coverage/desired artifact before activation. No silent reduction or data service restart by observability.

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

Retain dedicated Prometheus SA; 03 explicitly enables its token automount and adds node permissions, 04 owns narrow Pod discovery permissions (E2-IR-M04; combined exact RBAC proof 08/13). Add exactly node `get/list/watch` and `nodes/metrics` get, no `nodes/proxy`. Add jobs `kubelet-resource` and `kubelet-cadvisor`, role node discovery, keep `__meta_kubernetes_node_name` matching `^(offscreen-dev-control-plane|offscreen-dev-worker)$`, set `node` from that name, `__address__` to `$1:10250`, HTTPS, fixed paths `/metrics/resource` and `/metrics/cadvisor`, `authorization.credentials_file: /var/run/secrets/kubernetes.io/serviceaccount/token`, TLS `ca_file` above, no `insecure_skip_verify`, no generic labelmap. Stable target instance is DNS:10250, cluster/environment/component labels use shared 02 contract. Fixed 30s/10s, target_limit 4 each, sample_limit 5000 resource/20000 cAdvisor, label limits 40/128/512.

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
        "promql": "(sum (((rate(node_cpu_usage_seconds_total{job=\"kubelet-resource\"}[5m])) and (time() - timestamp(node_cpu_usage_seconds_total{job=\"kubelet-resource\"}) <= 90)) and on(job,instance) ((up{job=\"kubelet-resource\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kubelet-resource\"}) <= 90)))) and on() (count(((rate(node_cpu_usage_seconds_total{job=\"kubelet-resource\"}[5m])) and (time() - timestamp(node_cpu_usage_seconds_total{job=\"kubelet-resource\"}) <= 90)) and on(job,instance) ((up{job=\"kubelet-resource\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kubelet-resource\"}) <= 90))) == 2) and on() (count(count by (node) (((rate(node_cpu_usage_seconds_total{job=\"kubelet-resource\"}[5m])) and (time() - timestamp(node_cpu_usage_seconds_total{job=\"kubelet-resource\"}) <= 90)) and on(job,instance) ((up{job=\"kubelet-resource\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"kubelet-resource\"}) <= 90)))) == 2)",
        "unit": "none",
        "interpretation": "CPU cores across both distinct Kind nodes, only when exactly two current node series each produce a valid five-minute rate; missing or insufficient rate samples suppress the total."
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

Rechecked source at `872c39b5c6bc4ebcacca3272d1c613758fc870cd` (preceding planning delta only, no implementation-source changes). Native predecessor observation in earlier evidence remains historical. The planner selects the owner-side construction/enrollment split below for focused readiness review and owner commission. This is not permission to restart the existing store. The source can be constructed before G4b; preserve release E1 and all existing object/tenant guarantees.

### Exact variant and state selection

`providers/seaweedfs/chart/values.yaml` adds `metricsEnabled:false`; schema boolean optional with default false and reject true for release at template render. `profiles/development.yaml` sets true for fresh dev. `deployment.yaml` in dev target adds precisely `-metricsPort=9327` to `['mini','-dir=/data']` and named TCP `metrics` container port 9327; `service.yaml` adds named TCP 9327 target `metrics` (same ClusterIP, S3 8333). Release and predecessor parsed manifests byte-semantically unchanged. Keep image, Recreate, one replica, security/env/data/claim/probes/resources. Chart version 0.1.0 unchanged for exact retained predecessor identity; no fabricated image digests or new release. Render predecessor internally with fixed `{metricsEnabled:false}` stdin overlay via `renderPlatformDocuments` (actual `helmPlatformStdin` supports it); compare old installed user values exactly without newly added key. Target expected user values exactly current dev profile. History states: `dev-s3-base` rev1 deployed; `dev-s3-metrics` fresh rev1 deployed; `dev-s3-metrics` upgraded rev1 superseded + rev2 deployed; `release-s3-base` existing historical rev1. Dev native histories require exact `helm list --all`, `helm history -o json`, `helm get values -o yaml --revision N` (user values, not --all) and `helm get manifest --revision N`, using fixed release/context/namespace. Verify chart `platform-object-storage-seaweedfs-0.1.0`, complete contiguous selected rows, one deployed latest, exact normalized workload manifests (all three documents) and exact user values. Dev old profile user values omit metricsEnabled; construct old expected value by deleting that one key from current profile, never normalize away arbitrary differences. Render the old parsed manifest with the explicit false overlay. Target profile contains metricsEnabled:true. Verify exact revision storage Secret names `sh.helm.release.v1.object-store.vN`, type `helm.sh/release.v1`, UID nonempty/distinct, nonterminating, metadata labels `owner=helm`, `name=object-store`, `version=N`, `status` equal to corresponding history row, no ConfigMap or extra matching record; read metadata/type only, not decoded Helm Secret data. Release follows its unchanged current revision-1 verifier and legacy refusal. `observeObjectStorageHistory` returns additive `artifactId`, `historyId`, `metricsEnabled` only for exact native states (history IDs `dev-base-r1`, `dev-metrics-r1`, `dev-metrics-r1-r2`, `release-base-r1`); `observeObjectStorageChain` and plan/status/ensure carry matched fields on native-compatible/no-op, never substitute desired for matched. Preserve existing state vocabulary and exit codes. Native-compatible predecessor remains operational for S3, no-op ensure, metrics-not-enabled status; fresh uses target, no implicit upgrade. Exact target no-op. Do not accept old legacy history as upgrade predecessor. Ordinary observation of an upgrade pending is not operational even if final shape exists.

`observe.mjs::validateWorkloadContainer`, `validateWorkloadPodSpec`, `validateLiveStructuralChain` compare exact selected dev-native variant arguments and declared ports (TCP normalized only for the API default); require target Service both named ports/targetPorts and EndpointSlice ports `{name:s3,port:8333,protocol:TCP}` and `{name:metrics,port:9327,protocol:TCP}`, same ready Pod targetRef, addresses and S3 chain. Preserve existing legacy mode comparisons rather than retroactively requiring historical specimens to have target ports. `classifyObjectStorageObservation` selects native-base/native-metrics from matched history, not a new freeform caller argument; `validateContainerEnv` treats both native variants identically. For upgraded history allow exactly two RSs (one predecessor with exact old spec, one current with exact target spec); predecessor RS is owned and scaled to zero, no terminating/nonterminal old Pod; fresh/old/release paths retain one-RS expectation. The dedicated occupied proof requires no old Pod object at final verification. Reject extra RSs even owned in this narrow selected history. Reject extra containers, args/ports, missing EndpointSlice ownership/target, unexpected Pod identity or unknown topology. `readLiveChainObservation` currently requires exactly one RS; for upgraded target select the ready Pod's exact controlling RS UID and the sole retained predecessor RS under the same Deployment. Require zero desired/current/ready/available replicas on old RS (API omitted zero normalized), no foreign extra RS; validate old RS Pod template against exact predecessor (allow only generated pod-template-hash label). Verify same PVC/PV claim/data directory identity and mount. Existing release and legacy admission unchanged. `comparePriorReceiptIdentity` is never relaxed: old receipt mismatch stays mismatch; successful owner transition emits a new exact positive receipt linking original and successor RS/Pod identities and preserved chain. Do not claim continuity without this receipt. Existing object store observers and callers in `dev-shared-core-readiness`, `dev-slot-startup`, `infra-cli` and release credentials must retain current S3 readiness meanings. No change to tenant permissions.

### Separately authorized occupied owner operation

Exact selected entry `OFFSCREEN_OBJECT_STORAGE_METRICS_UPGRADE=authorized OFFSCREEN_OBJECT_STORAGE_MAINTENANCE=quiesced node infra/platform/object-storage/providers/seaweedfs/install.mjs upgrade-metrics dev --confirm-context kind-offscreen-dev --marker-file <private-local-json>`; reject all other profiles, missing/extra args/vars, alternate context or release. Only exact clean joined Design SHA with passing focused receipt, separately authorized by owner. No ordinary ensure, general Helm upgrade, observability operation or automatic repair. Require operator exclusion of old clients, arbitrary external S3 writers, lifecycle/slot startup/tenant operations throughout (lock alone cannot fence those). Under existing object-store flock, read current v2 registry via `devWorktreeRegistryRoot` + `readExistingRegistryV2`, require no leases; fixed cluster namespace/Pod/controller reads: registered slot namespaces and any `offscreen-dev-<positive integer>` namespace must have no active/nonterminal/terminating Pods, active Jobs or nonzero desired Deployment/StatefulSet replicas; unreadable, missing/malformed registry or unknown state refuses. No parking/killing foreign work. Repeat immediately before dispatch. Read `/proc/meminfo` using `infra/clusters/kind/manager/host-probe.mjs::parseMeminfoMiB` and require `memAvailableMiB >= MIN_HOST_MEMORY_MIB` (4096). Check before any transition dispatch and refuse unreadable/insufficient memory. Reject a noncanonical `OFFSCREEN_DEV_WORKTREE_REGISTRY` override in the live operation; read the default validated registry only. Require every record `lease === null` and `processIdentity === null`, including reservations; repeat immediately before Helm. No force-kill, parking or registry mutation. Operator attestation is not a proof of every arbitrary external client.

Marker is an **already existing synthetic owner-selected object** (not an application document). Private JSON exact `{schema:1,bucket,key,sha256,size}`; bucket `offscreen-e2-marker-<32 lowercase hex>`, key `retained-marker.bin`, hash exact lowercase SHA-256, size integer 32..4096. Require private regular owner file (0600/no symlink, <=4096 bytes, nlink=1, `O_NOFOLLOW`, fstat/lstat same device/inode), parse once under custody, exact property set, no arbitrary keys or credentials. Marker preparation is a separate owner-authorized G4b acceptance operation if none exists; the transition never creates/deletes/overwrites objects or buckets. The acceptance lead prepares a fixed one-use marker with a separate bounded owner script (not a coding-worker task): use exact dev context, exact owned native S3 chain, existing local object-storage flock and operator quiescence, exact private admin Secret identity, loopback Service forward, random 128-bit bucket suffix and random 64 bytes (not application content); verify bucket absent, create exactly that bucket and conditional `PutObject` with `IfNoneMatch: *`, verify byte count and SHA256 by immediate GET. No bucket policy/IAM changes, no credentials in argv/stdout/files, no retry on ambiguous write; retain synthetic object and record incomplete preparation on ambiguity. Any prepare write must have its own durable intent under the same lock and must not begin while any existing pending is present. Only a separately commissioned acceptance script may implement this bounded preparation; 06 source proof needs only the descriptor contract and fixture. If a valid descriptor already exists, no new marker preparation or data write is needed. Cleanup is a separate owner decision, not the transition or an automatic delete. Extend `live-sdk.mjs` with bounded internal GET via its existing loopback `withForward`, exact admin Secret identity and credentials only in memory, cap bytes and hash while streaming (reject missing/mismatched ContentLength, abort/destroy body at >4096 bytes), `maxAttempts:1`, 10s SDK request and stream deadline with remaining custody budget, awaited forward cleanup and client destroy; no raw content/path/credentials in output. Before using credentials and immediately after the GET verify admin Secret UID and resourceVersion against captured identity; credentials stay in SDK memory only. Require same size/hash before and after; verify same admin Secret UID/resourceVersion, service UID/ClusterIP, namespace, Deployment, claim/PV/claimRef/hostPath/mount identity, image and data. Close forward before Helm dispatch. Missing or mismatch refuses. Receipt contains marker SHA/size only. If a marker cannot be prepared under separate authority, native G4b stays gated; no further source research campaign.

Use same `withObjectStorageMutation` lock path and deadline, but a narrow dedicated transition mode inside owner module: current `identityAdoptAfterWrite` refuses changes to a known Pod name/UID, so do NOT relax it for general install/provision. Only `upgrade-metrics` path permits one replacement of PodName/UID after one fixed guarded Helm invocation, while every other identity field matches; full independently verified successor chain before clear. Persist exact versioned private intent before write `{schema:2,operation:'upgrade-metrics',profileId:'dev',contextName,startedAt,operationId,identity,details:{predecessorRevision:1,targetRevision:2,predecessorManifestSha256,targetManifestSha256,namespaceUid,deploymentUid,serviceUid,serviceClusterIP,secretUid,secretResourceVersion,pvcUid,pvUid,pvHostPath,oldReplicaSetUid,oldPodUid,oldHelmStorageUid,nodeName,dataDirectoryIdentity,markerSha256,markerSize}}`. Use existing O_EXCL/private/fsync directory, compare current exact owned pending contents/inode before clear, never adopt/resume/overwrite existing record. `predecessorManifestSha256`/`targetManifestSha256` are SHA256 of UTF-8 JSON of the exact parsed workload documents sorted by documentIdentity with recursively sorted object keys (array order preserved); no raw manifests in pending. `nodeName` is the selected PV node, `dataDirectoryIdentity` is exact `stat -Lc %d:%i` result from the verified local Kind hostPath and matching `/data` stat inside old/new Pod; require same verified node and directory identity before and after even when existing mount-root check alone passes. Use the existing mount translation local-Docker verification, never an arbitrary host path. For the dedicated owner observation always collect kube-system/namespace/Deployment/RS/Pod/Service/PVC/PV/Secret metadata plus sanitized mount identity; do not overload `priorReceipt` to fabricate identity. `readLiveChainObservation` currently only reads kube-system/namespace with priorReceipt, and discards Secret data; extend owner observation to retain UID/resourceVersion metadata, never key contents. Keep old install/provision schema/path behavior. Old writers refuse any pending. New ordinary public observers refuse a recognized metrics transition, separately prepared marker intent, malformed/unknown pending; exact old unversioned schema is the only legacy observation exception, preserving existing fresh install internal read behavior. Introduce `readObjectStoragePendingState` in mutation-guard using canonical state path, bounded private no-follow read, return only absent/legacy/metrics/unknown; reject partial/oversize/malformed record. New dedicated `withObjectStorageMetricsTransition` reuses existing lock/open/read/deadline/spawn helpers, not a generic relaxation of `identityAdoptAfterWrite`. Inside it, only one hardcoded Helm invocation is available; never pass an arbitrary runWrite to the caller. Module-private WeakMap registers the opaque active session handle with exact record bytes, dev/inode and held lock, `assertOwnedMetricsIntent(handle)` rejects forged, stale, foreign or changed records. `observeOwnedMetricsTransition(handle,expectedHistoryId,...)` verifies that capability before and after internal reads; public history/chain never accepts bypass flags or a handle. Invalidate the handle on exit; old ordinary callers cannot inspect through a metrics pending. Before and after guard read, refuse changed pending. Preserve existing ordinary legacy behavior, no new public recovery route. Separate owner operation dispatches only `helm upgrade object-store <provider chart> --kube-context kind-offscreen-dev --namespace offscreen-dev-objects --reset-values -f <development profile> --wait --timeout 180s` with existing 185s command bound and 600s total (require at least 190s remaining before write, leave bounded final-verification time; per read cap 15s or remaining, marker and forward caps above); no --force, --atomic, --reuse-values, rollback or uninstall. No other write. Recheck identity before/after; successor must be exactly rev2, retained old rev1 storage UID/manifests/values; new RS/Pod owned, old Pod gone, exactly one ready target, preserved all other IDs/data, successful same marker and bounded loopback HTTP GET `service/object-store:9327/metrics` (fixed namespace, 10s body deadline, cap 2MiB, exact 200 and nonempty valid Prometheus sample set; return only family names/types/label keys and units when explicit, no values). Require no Secret/PVC/PV/Service/Deployment identity changes and stable current cluster and Pod during proof; retain old revision storage UID and new distinct UID. Return sanitized transition receipt with old/new exact history, Kubernetes identity tuple, revision manifest digests, old/new RS/Pod UIDs, retained data/marker proof, metric names/keys and source SHA. Source SHA captured by acceptance lead from clean joined checkout. Re-observe final identity and pending ownership immediately before clear. If command/identity/history/marker/endpoint/cleanup fails or unknown outcome, stop and retain pending; no automatic retry. Exact target repeat zero writes, no new intent, read-only verification; not a way to clear pending. Both fresh metrics revision 1 and upgraded metrics revision 2 may be read-only no-op, but neither reconstructs a missing occupied-transition receipt. The receipt distinguishes `native-noop` from `transition-proven`; G4b occupied acceptance requires the actual captured predecessor→successor proof, not a later repeat. Fresh metrics evidence can qualify the fresh case only. No extra revision, replacement or data mutation authorized.

### Selected construction / native proof split

06 owns object-storage source construction only (T01 variant/history, T02 structural/read/pending boundary, T03 dedicated guarded operation and focused fixtures). Upon passing its assigned source gate, archive and join 06 into the Design branch, transfer G4b to the Design. No need to run G4b to close 06 construction. G4b may run only from an exact clean joined `implementation/observability-infrastructure-visibility` SHA containing archived/qualified 06, with a passing focused receipt and separately authorized owner maintenance. This is an explicit object-storage-only exception to the intermediate activation prohibition, not authority to activate E2 or run PG01. Serialize G4b with PG01 live maintenance and other native operations. The exact old 06 enrollment task transfers to 04 T03, whose 04 T04 proof verifies the complete selected native jobs/coverage. 04 requires PG01 positive native CNPG receipt AND G4b positive endpoint receipt plus planner-frozen native coverage rows. 07 may construct after exact rows frozen; 08/13 remain gated on all selected coverage, source joins and evidence. No scope reduction, no circular source dependency. Owner approval of G4a and independent focused readiness verdict are required before 06 commission, not another architecture committee.

## Owner native qualification | 2026-11-28, joined Design revision `2a0415f05e64b950679cb247cdce42a84a66b420`

Evidence source: owner terminal receipts in the acceptance session, fixed `kind-offscreen-dev` context. Design branch `implementation/observability-infrastructure-visibility`; source Changes 01/02/03/05/06/PG01 archived and joined. The PG01 apply command checked exact branch, HEAD and clean Git status. The planner inspected the joined source and archived proof via read-only repository access; all native commands were executed by the owner, not the planner. This is an observed native evidence update, not a new architecture, complete E2 certification, or further live authorization. No release mutation, E2 activation or provider calls.

### G3 / PG01 occupied repair and collector recovery: PASS

`monitoring-access.mjs status` initially refused target verification while Docker Desktop was offline; `kind get clusters` and Docker API reads failed. After the owner started Docker, Docker server 29.9.3 and both existing dev nodes Ready were observed; no cluster recreation. The guarded status succeeded with exactly five missing monitoring grants. Independent SQL confirmed five non-template connectable databases, exact owners, and collector CONNECT false before mutation. Owner commissioned and executed the narrow PG01 maintenance command with both authorization variables and the exact clean Design revision. Output:

```json
{"ok":true,"command":"apply","outcome":"applied","databases":[{"name":"postgres","state":"granted-now"},{"name":"dev","state":"granted-now"},{"name":"dev_1","state":"granted-now"},{"name":"temporal","state":"granted-now"},{"name":"temporal_visibility","state":"granted-now"}],"changed":5}
```

Native apply returned in approximately 5 seconds; the implemented guarded transaction, exact expected post-commit fingerprint comparison and Temporal persistence verification passed. Independent post-operation SQL returned the same five owners, collector effective CONNECT true and PUBLIC CONNECT false for all five; `aclexplode` returned exactly five exporter ACL entries, each CONNECT only, grantor the respective database owner, `is_grantable=false`. No broad PUBLIC grant or owner/role change. The observed effective application CONNECT matrix (25 predicates, all match intended isolation):

| Role | postgres | dev | dev_1 | temporal | temporal_visibility |
| --- | --- | --- | --- | --- | --- |
| dev | false | true | false | false | false |
| dev_1_mig | false | false | true | false | false |
| dev_1_run | false | false | true | false | false |
| temporal | false | false | false | true | true |
| cnpg_metrics_exporter | true | true | true | true | true |

Owners in the same order: `postgres`, `dev`, `dev_1_mig`, `temporal`, `temporal`. Owner roles and exporter admission/fingerprint were checked by the implemented command. Preserve the distinction: independent SQL proves the actual selected role isolation matrix, and the guarded command proves its captured projection; the full existing-tenant executor admission path (including resource/credential identity) was not independently invoked after repair. Only one occupied slot database exists; no additional peer tenant was created for proof. Do not claim a fresh tenant lifecycle or multi-tenant activation was exercised. At this earlier checkpoint the existing admission check was outstanding; the subsequent read-only receipt below closes it for the actual occupied inventory. Never grant/retry or create a new tenant just to manufacture a positive. The occupied repair itself must not be repeated.

Primary's existing port 9187 `/metrics` over a temporary loopback forward returned `cnpg_collector_up{cluster="dev-pg"} 1`, `cnpg_collector_last_collection_error 0`, `cnpg_last_error 0` and `cnpg_last_update_timestamp 1.795867075e+09`. Earlier collector up=0/error=1 state is superseded by this positive observation. Missing CONNECT was the demonstrated actionable failure; correcting it restored default query collection in this specimen. HTTP 200 is not the acceptance predicate. No claim of final Prometheus scrape health, historical rates, every instance, or long-term freshness based on one direct sample.

### CNPG native family inventory (74 observed sample names)

All names below are observed from the repaired primary. Table rows group names by the exact observed native label keys; prefix `cnpg_` applies to every comma-separated suffix. Labels are keys only, not values. This is evidence inventory, **not** a wildcard scrape allowlist or the complete frozen 04/07 JSON contract.

| Native label keys | Observed suffixes after `cnpg_` |
| --- | --- |
| `application_name, datname, state, usename` | `backends_max_tx_duration_seconds`, `backends_total` |
| none | `backends_waiting_total`, `cache_hits`, `cache_miss`, `collector_collections_total`, `collector_fencing_on`, `collector_first_recoverability_point`, `collector_last_available_backup_timestamp`, `collector_last_collection_error`, `collector_last_failed_backup_timestamp`, `collector_manual_switchover_required`, `collector_nodes_used`, `collector_replica_mode`, `last_error`, `last_update_timestamp`, `pg_postmaster_start_time`, `pg_replication_in_recovery`, `pg_replication_is_wal_receiver_up`, `pg_replication_lag`, `pg_replication_streaming_replicas`, `pg_stat_archiver_archived_count`, `pg_stat_archiver_failed_count`, `pg_stat_archiver_last_archived_time`, `pg_stat_archiver_last_archived_wal_start_lsn`, `pg_stat_archiver_last_failed_time`, `pg_stat_archiver_last_failed_wal_start_lsn`, `pg_stat_archiver_seconds_since_last_archival`, `pg_stat_archiver_seconds_since_last_failure`, `pg_stat_archiver_stats_reset_time`, `pg_stat_bgwriter_buffers_alloc`, `pg_stat_bgwriter_buffers_clean`, `pg_stat_bgwriter_maxwritten_clean`, `pg_stat_bgwriter_stats_reset_time`, `pg_stat_checkpointer_buffers_written`, `pg_stat_checkpointer_checkpoints_req`, `pg_stat_checkpointer_checkpoints_timed`, `pg_stat_checkpointer_restartpoints_done`, `pg_stat_checkpointer_restartpoints_req`, `pg_stat_checkpointer_restartpoints_timed`, `pg_stat_checkpointer_stats_reset_time`, `pg_stat_checkpointer_sync_time`, `pg_stat_checkpointer_write_time` |
| `collector` | `collector_collection_duration_seconds` |
| `datname` | `collector_lo_pages`, `pg_database_mxid_age`, `pg_database_size_bytes`, `pg_database_xid_age`, `pg_stat_database_blk_read_time`, `pg_stat_database_blk_write_time`, `pg_stat_database_blks_hit`, `pg_stat_database_blks_read`, `pg_stat_database_conflicts`, `pg_stat_database_deadlocks`, `pg_stat_database_temp_bytes`, `pg_stat_database_temp_files`, `pg_stat_database_tup_deleted`, `pg_stat_database_tup_fetched`, `pg_stat_database_tup_inserted`, `pg_stat_database_tup_returned`, `pg_stat_database_tup_updated`, `pg_stat_database_xact_commit`, `pg_stat_database_xact_rollback` |
| `value` | `collector_pg_wal`, `collector_pg_wal_archive_status`, `collector_sync_replicas` |
| `cluster, full` | `collector_postgres_version` |
| `cluster` | `collector_up` |
| `stats_reset` | `collector_wal_buffers_full`, `collector_wal_bytes`, `collector_wal_fpi`, `collector_wal_records` |
| `datname, default_version, extname, installed_version` | `pg_extensions_update_available` |
| `name` | `pg_settings_setting` |

### CNPG panel decisions and remaining bounded freeze

Pinned default query definitions (`infra/platform/postgres/vendor/cnpg-1.30.2.yaml`, `backends`, `backends_waiting`, `pg_database`, `pg_stat_database`, `pg_settings`) corroborate the observed families. Keep the previously selected discovery (`postgres-cnpg`, fixed namespace/labels/container/metrics port) and fixed limits. Health: distinguish Prometheus `up`, native collector up, collection error and last-update freshness; no missing-to-zero conversion. Use per-instance identity, never sum primary and standby database statistics as a cluster total. Per-database transaction commits/rollbacks, deadlocks, cache hits/reads and temp files/bytes use observed counters and reset-aware `rate`/`increase` as appropriate, with current healthy source, same-series identity and positive denominator for ratios. Database size is bytes gauge; use actual observed per-database samples. Read/write block-time counters are milliseconds, not seconds. Do not infer query throughput or latency from these cumulative I/O times. `backends_max_tx_duration_seconds` and `backends_waiting_total` are gauges, not counters despite `_total`. Vendor waiting query joins blocked and blocking locks and counts matches; do not promise a distinct waiting-session count or per-lock-type inventory. Use waiting-lock contention indicator and deadlock rate/count as the supported contention panels, no custom SQL or manufactured contention. Replication applicability must be explicit; direct primary specimen does not establish a standby/replication-lag proof.

**Label-identity safeguard:** vendor `backends` groups by database, state, user and application. Dropping `usename`/`application_name` in metric relabeling can merge distinct series with identical remaining labels; do not do it. Nor silently store arbitrary freeform client/application identifiers. The planner must resolve a bounded, privacy-compatible connection-family admission (retaining an approved identity tuple if justified) or explicitly obtain owner scope disposition; do not fake complete connection saturation from waiting matches. For saturation, `cnpg_pg_settings_setting` was observed with `name` key, but the subsequent selected probe observed exactly one `max_connections` sample of 100; restrict to that selected setting, not all settings. Exclude extension metadata from the selected scrape unless explicitly needed; avoid collapsing any other native label dimensions. No blanket family regex. This records concrete semantic decisions for the final CNPG row, not a complete freeze of exact panel IDs, PromQL, labels and coverage JSON. Finish those alongside the remaining service rows; the existing 04/07 readiness fences remain.

### G4b owner preflight and registry cutover: PASS

The joined `install.mjs status dev` returned `state=native-noop`, `artifactId=dev-s3-base`, `historyId=dev-base-r1`, `metricsEnabled=false`, `actions=[]`; Helm independently showed exactly revision 1 deployed, chart `platform-object-storage-seaweedfs-0.1.0`. Host `MemAvailable` 12407800 kB (approximately 11.8 GiB), above the 4096 MiB floor. The first exact `assertMetricsQuiescence` refused because the actual canonical machine-local dev registry was still version 1, not because SeaweedFS was unhealthy. Direct `readExistingRegistryV2` exposed `registry-version` (unsupported version 1); configured and canonical roots matched. V1 validation showed one retained reservation, no lease or process identity, next allocation sequence 2; all six actual application Deployments had desired replicas zero.

The owner separately authorized the existing registry-only live cutover, using `preflightLiveCutover` with fixed dev namespace/Deployment observations and `cutoverAuthorizedLiveRegistry` (not manual JSON rewriting). Native preflight reported `ok=true`, `sessionsVerified=true`, the sole environment `parked_verified`, no recorded process/lease, verified namespace and six Deployment identities, zero preflight registry writes, signals or scales. Guarded cutover returned version 2, nextSequence 2 and the same sole slot. Existing function preserves reservations/ports/UIDs, writes the original v1 backup and hash-bound cutover receipt under the registry lock; no cluster scaling/deletion or tenant mutation. Machine-local registry contents, checkout paths and resource UIDs are intentionally not committed. This is a host operational migration, not new source construction or certification of slot activation. The exact G4b `assertMetricsQuiescence` was rerun against the live v2 registry and printed `G4b quiescence: PASS`. Do not repeat cutover or reset registry. Repeat quiescence/capacity/identity under storage custody at live preparation and rollout; present evidence does not fence arbitrary external S3 writers.

### G4b occupied transition: PASS (2026-11-28)

Acceptance-lead source work was separately commissioned under the existing G4a contract (not a new Design or numbered Change). Marker preparation source `ccb1e02e94e7b1857f67a5daa4bfe6bf699595f8`, joined `0ba56ad34aeb3a67ce26c8a71adcf7f4a8424e0e`: owner-reported 34 focused tests and 207/207 joined object-storage suite, no live operation by the implementation agent. The owner then executed `prepare-marker.mjs dev --confirm-context kind-offscreen-dev --descriptor-file <private-local-json>` with both selected authorizations; result `ok=true`, `mutated=true`, `intentRetained=false`, `state=marker-prepared`, exactly 64 bytes and SHA-256 `2f804c33d7b8382f9996a925a480f30c929c4b7f7b74f4ccbd784ac0599ef252`. Remote documentation commit `ea8928f33aa25fdf14d033ba6d5e48817fb3a0a4` was present when the receipt was reported, but the marker command did not explicitly print/check HEAD; do not claim a stronger exact-source binding for marker preparation. The private descriptor and object remain retained; no credential, descriptor path or bucket name needs to be tracked.

The focused deadline correction source `36b9965581bc1d96984c849b7511f1deb590a550`, joined `f5a229c52008bbe6927539e8f9b4458db925c3a1`: owner-reported object-storage tests 220/220 (13 new), explicit bounded marker streaming and remaining custody-budget propagation through both owner operations, no live operation by implementation agent. Planner inspected corrected source and verified remote Design HEAD. Owner verified exact branch, HEAD, clean status and existing descriptor, authorized the distinct storage-only operation and ran the frozen `upgrade-metrics dev` command once. Terminal elapsed time 14 seconds. Actual sanitized receipt (metric names follow separately):

```json
{
  "mode": "upgrade-metrics",
  "profileId": "dev",
  "context": "kind-offscreen-dev",
  "namespace": "offscreen-dev-objects",
  "ok": true,
  "mutated": true,
  "intentRetained": false,
  "state": "transition-proven",
  "predecessorHistoryId": "dev-base-r1",
  "historyId": "dev-metrics-r1-r2",
  "manifestDigests": {
    "predecessorManifestSha256": "1ba8635d88d2d56d3ea0c286c1e35312c58f1551fdb7bd67514ff20e57296f64",
    "targetManifestSha256": "b7f1da0720d1a3d6c591555c1318188d442fc5d57cd82da621eaca8afec3c17e"
  },
  "replicaSets": {
    "old": "438e7094-764f-4fcb-befa-98d992d868e1",
    "new": "a918628d-b954-4f38-bb3a-ae1bd67474ae"
  },
  "pods": {
    "old": "9b5d6ce8-d1ef-45d4-aa10-3f5959a5ccb8",
    "new": "1784ca2e-299b-497e-b6ad-ca3dcf54b410"
  },
  "retainedMarker": {
    "sha256": "2f804c33d7b8382f9996a925a480f30c929c4b7f7b74f4ccbd784ac0599ef252",
    "size": 64
  }
}
```

The guarded operation verified the exact old/new history, unchanged stable owner-chain fields (cluster, namespace, Deployment, Service UID/ClusterIP, admin Secret UID/resourceVersion, PVC/PV/hostPath/node/data-directory identity), preserved revision-1 Helm storage UID, distinct new revision-2 record, exact predecessor/current RS and replacement Pod, matching marker bytes/hash, native metrics and final identity before clearing the owned pending record. This is source-enforced proof reported by the actual operation, not independent observation of every raw UID. No general E2 activation, release mutation, or fresh-install qualification implied. Do not rerun the transition, prepare another marker, delete the marker, or repeat host registry migration. G4b occupied transition native proof is satisfied; 04/07 still need the exact selected coverage contract and 13 owns integrated Prometheus health and joint G5.

### SeaweedFS native metric inventory (observed, not scrape allowlist)

112 distinct sample names: 72 `SeaweedFS_`, 31 `go_`, 9 `process_`. The runtime parser maps `# TYPE` by literal sample name, so histogram/summary component samples can be reported `untyped` even when the base family is typed; do not infer missing histogram metadata or use a quantile solely from this projection. Preserve exact case of names.

| Sample name | Reported type | Label keys |
| --- | --- | --- |
| `SeaweedFS_admin_maintenance_last_scan_timestamp_seconds` | gauge | none |
| `SeaweedFS_admin_maintenance_next_scan_timestamp_seconds` | gauge | none |
| `SeaweedFS_admin_worker_events_total` | counter | `event` |
| `SeaweedFS_admin_workers_connected` | gauge | none |
| `SeaweedFS_build_info` | gauge | `commit`, `goarch`, `goos`, `sizelimit`, `version` |
| `SeaweedFS_filerStore_request_seconds_bucket` | untyped | `le`, `store`, `type` |
| `SeaweedFS_filerStore_request_seconds_count` | untyped | `store`, `type` |
| `SeaweedFS_filerStore_request_seconds_sum` | untyped | `store`, `type` |
| `SeaweedFS_filerStore_request_total` | counter | `store`, `type` |
| `SeaweedFS_filer_handler_total` | counter | `type` |
| `SeaweedFS_filer_in_flight_requests` | gauge | `type` |
| `SeaweedFS_filer_in_flight_upload_bytes` | gauge | none |
| `SeaweedFS_filer_in_flight_upload_count` | gauge | none |
| `SeaweedFS_filer_last_send_timestamp_of_subscribe` | gauge | `clientName`, `path`, `sourceFiler` |
| `SeaweedFS_filer_object_size_bytes_bucket` | untyped | `le` |
| `SeaweedFS_filer_object_size_bytes_count` | untyped | none |
| `SeaweedFS_filer_object_size_bytes_sum` | untyped | none |
| `SeaweedFS_filer_remote_deletion_tombstones` | gauge | none |
| `SeaweedFS_filer_remote_deletion_tombstones_full` | gauge | none |
| `SeaweedFS_filer_request_seconds_bucket` | untyped | `le`, `type` |
| `SeaweedFS_filer_request_seconds_count` | untyped | `type` |
| `SeaweedFS_filer_request_seconds_sum` | untyped | `type` |
| `SeaweedFS_filer_request_total` | counter | `code`, `type` |
| `SeaweedFS_master_admin_lock` | gauge | `client` |
| `SeaweedFS_master_broadcast_to_full` | counter | none |
| `SeaweedFS_master_is_leader` | gauge | none |
| `SeaweedFS_master_leader_changes` | counter | `type` |
| `SeaweedFS_master_pick_for_write_error` | counter | none |
| `SeaweedFS_master_received_heartbeats` | counter | `type` |
| `SeaweedFS_master_start_time_seconds` | gauge | none |
| `SeaweedFS_master_volume_growth_frozen` | gauge | none |
| `SeaweedFS_remote_cache_evicted_total` | counter | none |
| `SeaweedFS_s3_bucket_traffic_sent_bytes_total` | counter | `bucket` |
| `SeaweedFS_s3_in_flight_requests` | gauge | `type` |
| `SeaweedFS_s3_in_flight_upload_bytes` | gauge | none |
| `SeaweedFS_s3_in_flight_upload_count` | gauge | none |
| `SeaweedFS_s3_lifecycle_daily_run_last_full_pass_timestamp_seconds` | gauge | none |
| `SeaweedFS_s3_lifecycle_dispatch_limiter_wait_seconds_bucket` | untyped | `le` |
| `SeaweedFS_s3_lifecycle_dispatch_limiter_wait_seconds_count` | untyped | none |
| `SeaweedFS_s3_lifecycle_dispatch_limiter_wait_seconds_sum` | untyped | none |
| `SeaweedFS_s3_request_seconds_bucket` | untyped | `bucket`, `le`, `type` |
| `SeaweedFS_s3_request_seconds_count` | untyped | `bucket`, `type` |
| `SeaweedFS_s3_request_seconds_sum` | untyped | `bucket`, `type` |
| `SeaweedFS_s3_request_total` | counter | `bucket`, `code`, `type` |
| `SeaweedFS_s3_time_to_first_byte_millisecond_bucket` | untyped | `bucket`, `le`, `type` |
| `SeaweedFS_s3_time_to_first_byte_millisecond_count` | untyped | `bucket`, `type` |
| `SeaweedFS_s3_time_to_first_byte_millisecond_sum` | untyped | `bucket`, `type` |
| `SeaweedFS_volumeServer_concurrent_download_limit` | gauge | none |
| `SeaweedFS_volumeServer_concurrent_upload_limit` | gauge | none |
| `SeaweedFS_volumeServer_disk_error_status` | gauge | `name`, `type` |
| `SeaweedFS_volumeServer_file_read_failures` | counter | none |
| `SeaweedFS_volumeServer_file_read_invalid_needles` | counter | none |
| `SeaweedFS_volumeServer_file_write_failures` | counter | none |
| `SeaweedFS_volumeServer_in_flight_download_size` | gauge | none |
| `SeaweedFS_volumeServer_in_flight_requests` | gauge | `type` |
| `SeaweedFS_volumeServer_in_flight_upload_size` | gauge | none |
| `SeaweedFS_volumeServer_io_quarantine` | gauge | `kind` |
| `SeaweedFS_volumeServer_max_volumes` | gauge | none |
| `SeaweedFS_volumeServer_read_only_volumes` | gauge | `collection`, `type` |
| `SeaweedFS_volumeServer_replication_targets_bucket` | untyped | `le` |
| `SeaweedFS_volumeServer_replication_targets_count` | untyped | none |
| `SeaweedFS_volumeServer_replication_targets_sum` | untyped | none |
| `SeaweedFS_volumeServer_request_seconds_bucket` | untyped | `le`, `type` |
| `SeaweedFS_volumeServer_request_seconds_count` | untyped | `type` |
| `SeaweedFS_volumeServer_request_seconds_sum` | untyped | `type` |
| `SeaweedFS_volumeServer_request_total` | counter | `code`, `type` |
| `SeaweedFS_volumeServer_resource` | gauge | `name`, `type` |
| `SeaweedFS_volumeServer_start_time_seconds` | gauge | none |
| `SeaweedFS_volumeServer_storage_io_error_total` | counter | none |
| `SeaweedFS_volumeServer_total_disk_size` | gauge | `collection`, `type` |
| `SeaweedFS_volumeServer_volumes` | gauge | `collection`, `type` |
| `SeaweedFS_wdclient_connect_updates` | counter | `type` |
| `go_gc_duration_seconds` | summary | `quantile` |
| `go_gc_duration_seconds_count` | untyped | none |
| `go_gc_duration_seconds_sum` | untyped | none |
| `go_gc_gogc_percent` | gauge | none |
| `go_gc_gomemlimit_bytes` | gauge | none |
| `go_goroutines` | gauge | none |
| `go_info` | gauge | `version` |
| `go_memstats_alloc_bytes` | gauge | none |
| `go_memstats_alloc_bytes_total` | counter | none |
| `go_memstats_buck_hash_sys_bytes` | gauge | none |
| `go_memstats_frees_total` | counter | none |
| `go_memstats_gc_sys_bytes` | gauge | none |
| `go_memstats_heap_alloc_bytes` | gauge | none |
| `go_memstats_heap_idle_bytes` | gauge | none |
| `go_memstats_heap_inuse_bytes` | gauge | none |
| `go_memstats_heap_objects` | gauge | none |
| `go_memstats_heap_released_bytes` | gauge | none |
| `go_memstats_heap_sys_bytes` | gauge | none |
| `go_memstats_last_gc_time_seconds` | gauge | none |
| `go_memstats_mallocs_total` | counter | none |
| `go_memstats_mcache_inuse_bytes` | gauge | none |
| `go_memstats_mcache_sys_bytes` | gauge | none |
| `go_memstats_mspan_inuse_bytes` | gauge | none |
| `go_memstats_mspan_sys_bytes` | gauge | none |
| `go_memstats_next_gc_bytes` | gauge | none |
| `go_memstats_other_sys_bytes` | gauge | none |
| `go_memstats_stack_inuse_bytes` | gauge | none |
| `go_memstats_stack_sys_bytes` | gauge | none |
| `go_memstats_sys_bytes` | gauge | none |
| `go_sched_gomaxprocs_threads` | gauge | none |
| `go_threads` | gauge | none |
| `process_cpu_seconds_total` | counter | none |
| `process_max_fds` | gauge | none |
| `process_network_receive_bytes_total` | counter | none |
| `process_network_transmit_bytes_total` | counter | none |
| `process_open_fds` | gauge | none |
| `process_resident_memory_bytes` | gauge | none |
| `process_start_time_seconds` | gauge | none |
| `process_virtual_memory_bytes` | gauge | none |
| `process_virtual_memory_max_bytes` | gauge | none |

**Planner constraints for final 04/07 freeze:** enroll only the fixed `seaweedfs` job at `object-store.offscreen-dev-objects.svc:9327/metrics`, never port 8333; retain selected 30s/10s, 5000 samples and 100 target ceiling. Select meaningful bounded families, not all 112. Candidate aggregate signals include S3 in-flight upload count/bytes, filer requests, volume-server file read/write failures and storage I/O errors, volume count/capacity, process memory and CPU. Confirm actual HELP/TYPE and semantics before final exact panel/coverage freeze; request counts and time-to-first-byte/latency grouped by `bucket` cannot simply drop that label (series collision) or retain arbitrary tenant/marker bucket names without a reviewed bounded privacy-compatible selection. Prefer safe aggregate native signals; no fabricated aggregate S3 request rate or capacity utilization, no raw paths/clientName/sourceFiler or arbitrary collection/bucket identities. Filer and volume-server request families are not equivalent to S3 requests; label each panel honestly. Histogram component names and units need base TYPE/HELP confirmation; `_seconds` versus `_millisecond` are different. Counters use reset-aware rates, gauges use current values, distinguish absent/stale/up vs healthy; KSM PVC binding is not proof of byte utilization. No workload or additional storage writes to manufacture evidence. Record final exact rows, panel IDs, units and selectors in this register before dispatch.

## G3/G4 selected metric observation and partial contract freeze | 2026-11-28

Owner read-only probe output SHA256 `b59de0f71762d627527b9499aad520acd6ce5d6a55c07b0f3e8a0aaafa865900`; remote joined planning HEAD `eb1e71a4ebe74fc2cf88359b62b2b6c6cda4b141` verified when received (the diagnostic did not bind its own HEAD). Fixed dev context. Nine of twelve endpoint observations succeeded; failures Loki `ValueError`, Grafana `RuntimeError`, Collector `RemoteDisconnected` are probe failures, not backend health findings. No new native mutation. Counts below are selected sample series, not whole endpoint cardinality. Do not repeat the successful storage or SQL owner operations.

| Endpoint | Selected series | Result |
| --- | ---: | --- |
| `postgres-cnpg` | 362 | Observed |
| `temporal-frontend` | 762 | Observed |
| `temporal-history` | 739 | Observed |
| `temporal-matching` | 1059 | Observed |
| `temporal-worker` | 324 | Observed |
| `rabbitmq` | 12 | Observed |
| `loki` | — | ValueError |
| `tempo` | 36 | Observed |
| `grafana` | — | RuntimeError |
| `seaweedfs` | 110 | Observed |
| `prometheus` | 8 | Observed |
| `collector` | — | RemoteDisconnected |

### Observed selected families, types and dimension cardinality

Each line below records an actual observed sample name, Prometheus family type and series count, and observed distinct values **per label key**, never actual private label values. These are evidence, not a blanket allowlist. Histogram suffix samples inherit the declared parent family type. Empty label sets shown as `none`.

#### postgres-cnpg

| Sample name | Type | Series | Label cardinalities |
| --- | --- | ---: | --- |
| `cnpg_backends_max_tx_duration_seconds` | gauge | 3 | application_name=2, datname=3, state=2, usename=2 |
| `cnpg_backends_total` | gauge | 3 | application_name=2, datname=3, state=2, usename=2 |
| `cnpg_backends_waiting_total` | gauge | 1 | none |
| `cnpg_collector_last_collection_error` | gauge | 1 | none |
| `cnpg_collector_replica_mode` | gauge | 1 | none |
| `cnpg_collector_up` | gauge | 1 | cluster=1 |
| `cnpg_last_error` | gauge | 1 | none |
| `cnpg_last_update_timestamp` | gauge | 1 | none |
| `cnpg_pg_database_size_bytes` | gauge | 6 | datname=6 |
| `cnpg_pg_replication_in_recovery` | gauge | 1 | none |
| `cnpg_pg_replication_is_wal_receiver_up` | gauge | 1 | none |
| `cnpg_pg_replication_lag` | gauge | 1 | none |
| `cnpg_pg_replication_streaming_replicas` | gauge | 1 | none |
| `cnpg_pg_settings_setting` | gauge | 284 | name=284 |
| `cnpg_pg_stat_database_blks_hit` | counter | 8 | datname=8 |
| `cnpg_pg_stat_database_blks_read` | counter | 8 | datname=8 |
| `cnpg_pg_stat_database_deadlocks` | counter | 8 | datname=8 |
| `cnpg_pg_stat_database_temp_bytes` | counter | 8 | datname=8 |
| `cnpg_pg_stat_database_temp_files` | counter | 8 | datname=8 |
| `cnpg_pg_stat_database_xact_commit` | counter | 8 | datname=8 |
| `cnpg_pg_stat_database_xact_rollback` | counter | 8 | datname=8 |

#### temporal-frontend

| Sample name | Type | Series | Label cardinalities |
| --- | --- | ---: | --- |
| `persistence_latency_bucket` | histogram | 300 | le=20, namespace=4, operation=12, service_name=2, type=1 |
| `persistence_latency_count` | histogram | 15 | namespace=4, operation=12, service_name=2, type=1 |
| `persistence_latency_sum` | histogram | 15 | namespace=4, operation=12, service_name=2, type=1 |
| `persistence_requests` | counter | 15 | namespace=4, operation=12, service_name=2, type=1 |
| `persistence_sql_in_use` | gauge | 2 | db_kind=2, service_name=1, type=1 |
| `service_error_with_type` | counter | 1 | error_type=1, namespace=1, operation=1, service_name=1, type=1 |
| `service_latency_bucket` | histogram | 360 | le=20, namespace=4, operation=10, service_name=1, type=1 |
| `service_latency_count` | histogram | 18 | namespace=4, operation=10, service_name=1, type=1 |
| `service_latency_sum` | histogram | 18 | namespace=4, operation=10, service_name=1, type=1 |
| `service_requests` | counter | 18 | namespace=4, operation=10, service_name=1, type=1 |

#### temporal-history

| Sample name | Type | Series | Label cardinalities |
| --- | --- | ---: | --- |
| `persistence_latency_bucket` | histogram | 540 | le=20, namespace=2, operation=26, service_name=2, type=1 |
| `persistence_latency_count` | histogram | 27 | namespace=2, operation=26, service_name=2, type=1 |
| `persistence_latency_sum` | histogram | 27 | namespace=2, operation=26, service_name=2, type=1 |
| `persistence_requests` | counter | 27 | namespace=2, operation=26, service_name=2, type=1 |
| `persistence_sql_in_use` | gauge | 2 | db_kind=2, service_name=1, type=1 |
| `service_error_with_type` | counter | 1 | error_type=1, namespace=1, operation=1, service_name=1, type=1 |
| `service_latency_bucket` | histogram | 100 | le=20, namespace=1, operation=5, service_name=1, type=1 |
| `service_latency_count` | histogram | 5 | namespace=1, operation=5, service_name=1, type=1 |
| `service_latency_sum` | histogram | 5 | namespace=1, operation=5, service_name=1, type=1 |
| `service_requests` | counter | 5 | namespace=1, operation=5, service_name=1, type=1 |

#### temporal-matching

| Sample name | Type | Series | Label cardinalities |
| --- | --- | ---: | --- |
| `approximate_backlog_age_seconds` | gauge | 57 | namespace=3, namespace_state=1, operation=1, partition=5, service_name=1, task_type=2, taskqueue=8, type=1, worker_build_id=1, worker_deployment_name=1, worker_version=1 |
| `approximate_backlog_count` | gauge | 57 | namespace=3, namespace_state=1, operation=1, partition=5, service_name=1, task_priority=1, task_type=2, taskqueue=8, type=1, worker_build_id=1, worker_deployment_name=1, worker_version=1 |
| `persistence_latency_bucket` | histogram | 520 | le=20, namespace=4, operation=15, service_name=2, type=1 |
| `persistence_latency_count` | histogram | 26 | namespace=4, operation=15, service_name=2, type=1 |
| `persistence_latency_sum` | histogram | 26 | namespace=4, operation=15, service_name=2, type=1 |
| `persistence_requests` | counter | 26 | namespace=4, operation=15, service_name=2, type=1 |
| `persistence_sql_in_use` | gauge | 2 | db_kind=2, service_name=1, type=1 |
| `service_latency_bucket` | histogram | 300 | le=20, namespace=4, operation=7, service_name=1, type=1 |
| `service_latency_count` | histogram | 15 | namespace=4, operation=7, service_name=1, type=1 |
| `service_latency_sum` | histogram | 15 | namespace=4, operation=7, service_name=1, type=1 |
| `service_requests` | counter | 15 | namespace=4, operation=7, service_name=1, type=1 |

#### temporal-worker

| Sample name | Type | Series | Label cardinalities |
| --- | --- | ---: | --- |
| `persistence_latency_bucket` | histogram | 280 | le=20, namespace=2, operation=13, service_name=2, type=1 |
| `persistence_latency_count` | histogram | 14 | namespace=2, operation=13, service_name=2, type=1 |
| `persistence_latency_sum` | histogram | 14 | namespace=2, operation=13, service_name=2, type=1 |
| `persistence_requests` | counter | 14 | namespace=2, operation=13, service_name=2, type=1 |
| `persistence_sql_in_use` | gauge | 2 | db_kind=2, service_name=1, type=1 |

#### rabbitmq

| Sample name | Type | Series | Label cardinalities |
| --- | --- | ---: | --- |
| `rabbitmq_alarms_free_disk_space_watermark` | untyped | 1 | none |
| `rabbitmq_alarms_memory_used_watermark` | untyped | 1 | none |
| `rabbitmq_connections` | gauge | 1 | none |
| `rabbitmq_process_max_fds` | gauge | 1 | none |
| `rabbitmq_process_open_fds` | gauge | 1 | none |
| `rabbitmq_process_resident_memory_bytes` | gauge | 1 | none |
| `rabbitmq_queue_messages` | gauge | 1 | none |
| `rabbitmq_queue_messages_acked_total` | counter | 1 | none |
| `rabbitmq_queue_messages_delivered_total` | counter | 1 | none |
| `rabbitmq_queue_messages_published_total` | counter | 1 | none |
| `rabbitmq_queue_messages_ready` | gauge | 1 | none |
| `rabbitmq_queue_messages_unacked` | gauge | 1 | none |

#### tempo

| Sample name | Type | Series | Label cardinalities |
| --- | --- | ---: | --- |
| `tempo_distributor_traces_per_batch_count` | histogram | 1 | none |
| `tempo_distributor_traces_per_batch_sum` | histogram | 1 | none |
| `tempo_request_duration_seconds_bucket` | histogram | 30 | le=15, method=2, route=2, status_code=2, ws=1 |
| `tempo_request_duration_seconds_count` | histogram | 2 | method=2, route=2, status_code=2, ws=1 |
| `tempo_request_duration_seconds_sum` | histogram | 2 | method=2, route=2, status_code=2, ws=1 |

#### seaweedfs

| Sample name | Type | Series | Label cardinalities |
| --- | --- | ---: | --- |
| `SeaweedFS_filer_request_total` | counter | 1 | code=1, type=1 |
| `SeaweedFS_master_is_leader` | gauge | 1 | none |
| `SeaweedFS_s3_in_flight_requests` | gauge | 2 | type=2 |
| `SeaweedFS_s3_in_flight_upload_bytes` | gauge | 1 | none |
| `SeaweedFS_s3_in_flight_upload_count` | gauge | 1 | none |
| `SeaweedFS_s3_request_seconds_bucket` | histogram | 50 | bucket=2, le=25, type=2 |
| `SeaweedFS_s3_request_seconds_count` | histogram | 2 | bucket=2, type=2 |
| `SeaweedFS_s3_request_seconds_sum` | histogram | 2 | bucket=2, type=2 |
| `SeaweedFS_s3_request_total` | counter | 2 | bucket=2, code=2, type=2 |
| `SeaweedFS_volumeServer_disk_error_status` | gauge | 1 | name=1, type=1 |
| `SeaweedFS_volumeServer_file_read_failures` | counter | 1 | none |
| `SeaweedFS_volumeServer_file_write_failures` | counter | 1 | none |
| `SeaweedFS_volumeServer_max_volumes` | gauge | 1 | none |
| `SeaweedFS_volumeServer_read_only_volumes` | gauge | 8 | collection=2, type=4 |
| `SeaweedFS_volumeServer_request_seconds_bucket` | histogram | 25 | le=25, type=1 |
| `SeaweedFS_volumeServer_request_seconds_count` | histogram | 1 | type=1 |
| `SeaweedFS_volumeServer_request_seconds_sum` | histogram | 1 | type=1 |
| `SeaweedFS_volumeServer_request_total` | counter | 2 | code=2, type=1 |
| `SeaweedFS_volumeServer_storage_io_error_total` | counter | 1 | none |
| `SeaweedFS_volumeServer_total_disk_size` | gauge | 4 | collection=2, type=2 |
| `SeaweedFS_volumeServer_volumes` | gauge | 2 | collection=2, type=1 |

#### prometheus

| Sample name | Type | Series | Label cardinalities |
| --- | --- | ---: | --- |
| `prometheus_target_scrapes_exceeded_sample_limit_total` | counter | 1 | none |
| `prometheus_target_scrapes_sample_duplicate_timestamp_total` | counter | 1 | none |
| `prometheus_target_scrapes_sample_out_of_bounds_total` | counter | 1 | none |
| `prometheus_target_scrapes_sample_out_of_order_total` | counter | 1 | none |
| `prometheus_tsdb_head_samples_appended_total` | counter | 2 | type=2 |
| `prometheus_tsdb_head_series` | gauge | 1 | none |
| `prometheus_tsdb_storage_blocks_bytes` | gauge | 1 | none |

`cnpg_pg_settings_setting{name="max_connections"}` yielded exactly one selected value `100`; do not hardcode the limit in dashboards. Select the setting sample only, not the other 283 exported settings. The previous CNPG family inventory and occupied recovery remain valid. `cnpg_backends_total` is a gauge and the two backends families have the same four native dimensions; do not remove any dimension to create an aggregate. `cnpg_backends_waiting_total` is a gauge of matching lock contention, not an exact blocked-session inventory. Transaction, deadlock, temp and buffer counters have reset-aware rates; database size is bytes. The observed 8 `datname` values include dimensions outside the five connectable owner-approved databases; keep only known platform/owned slot DB names for database panels (not an alleged whole-cluster total). No custom SQL enrollment or collector ACL expansion.

### Frozen RabbitMQ row (04 and 07; independent of remaining native facts)

Fixed static `rabbitmq.offscreen-dev-rabbitmq.svc:15692/metrics`, HTTP, job `rabbitmq`, fixed component and namespace, 30s/10s; 5000 sample / 100 target / 40 label / 128 name-length / 512 value-length limits. Exact selected families below; all twelve observed with **no native labels**. Keep only target identity labels, do not scrape per-object endpoint. Existing owner workloads unchanged. `up` is scrape health, not broker health. Alarm samples are untyped on wire but HELP explicitly defines 1 when the alarm is active; treat as binary gauges, never rate them. Delivery counter means automatic acknowledgement delivery only, not all consumer deliveries; label panel accordingly.

```json
{
  "component": "rabbitmq",
  "namespace": "offscreen-dev-rabbitmq",
  "workloadSelector": {
    "app.kubernetes.io/name": "rabbitmq",
    "app.kubernetes.io/component": "rabbitmq"
  },
  "jobs": [
    "rabbitmq"
  ],
  "requiredFamilies": [
    "rabbitmq_queue_messages",
    "rabbitmq_queue_messages_ready",
    "rabbitmq_queue_messages_unacked",
    "rabbitmq_connections",
    "rabbitmq_queue_messages_published_total",
    "rabbitmq_queue_messages_delivered_total",
    "rabbitmq_queue_messages_acked_total",
    "rabbitmq_alarms_free_disk_space_watermark",
    "rabbitmq_alarms_memory_used_watermark",
    "rabbitmq_process_resident_memory_bytes",
    "rabbitmq_process_open_fds",
    "rabbitmq_process_max_fds"
  ],
  "panels": {
    "offscreen-messaging-cache/710": {
      "promql": "up{job=\"rabbitmq\"} and on(job,instance) (time() - timestamp(up{job=\"rabbitmq\"}) <= 90)",
      "unit": "none",
      "interpretation": "Current scrape state only; missing or stale unknown."
    },
    "offscreen-messaging-cache/711": {
      "promql": "((rabbitmq_queue_messages{job=\"rabbitmq\"}) and on(job,instance) (time() - timestamp(rabbitmq_queue_messages{job=\"rabbitmq\"}) <= 90)) and on(job,instance) ((up{job=\"rabbitmq\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"rabbitmq\"}) <= 90))",
      "unit": "none",
      "interpretation": "Total queue depth (ready plus unacknowledged); current scrape and metric required; missing/stale unknown."
    },
    "offscreen-messaging-cache/712": {
      "promql": "((rabbitmq_queue_messages_ready{job=\"rabbitmq\"}) and on(job,instance) (time() - timestamp(rabbitmq_queue_messages_ready{job=\"rabbitmq\"}) <= 90)) and on(job,instance) ((up{job=\"rabbitmq\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"rabbitmq\"}) <= 90))",
      "unit": "none",
      "interpretation": "Ready messages; current scrape and metric required; missing/stale unknown."
    },
    "offscreen-messaging-cache/713": {
      "promql": "((rabbitmq_queue_messages_unacked{job=\"rabbitmq\"}) and on(job,instance) (time() - timestamp(rabbitmq_queue_messages_unacked{job=\"rabbitmq\"}) <= 90)) and on(job,instance) ((up{job=\"rabbitmq\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"rabbitmq\"}) <= 90))",
      "unit": "none",
      "interpretation": "Unacknowledged messages; current scrape and metric required; missing/stale unknown."
    },
    "offscreen-messaging-cache/714": {
      "promql": "((rabbitmq_connections{job=\"rabbitmq\"}) and on(job,instance) (time() - timestamp(rabbitmq_connections{job=\"rabbitmq\"}) <= 90)) and on(job,instance) ((up{job=\"rabbitmq\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"rabbitmq\"}) <= 90))",
      "unit": "none",
      "interpretation": "Open connections; current scrape and metric required; missing/stale unknown."
    },
    "offscreen-messaging-cache/715": {
      "promql": "((rate(rabbitmq_queue_messages_published_total{job=\"rabbitmq\"}[5m])) and on(job,instance) (time() - timestamp(rabbitmq_queue_messages_published_total{job=\"rabbitmq\"}) <= 90)) and on(job,instance) ((up{job=\"rabbitmq\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"rabbitmq\"}) <= 90))",
      "unit": "ops",
      "interpretation": "Published messages per second; current scrape and metric required; missing/stale unknown."
    },
    "offscreen-messaging-cache/716": {
      "promql": "((rate(rabbitmq_queue_messages_delivered_total{job=\"rabbitmq\"}[5m])) and on(job,instance) (time() - timestamp(rabbitmq_queue_messages_delivered_total{job=\"rabbitmq\"}) <= 90)) and on(job,instance) ((up{job=\"rabbitmq\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"rabbitmq\"}) <= 90))",
      "unit": "ops",
      "interpretation": "Automatic-ack deliveries per second; current scrape and metric required; missing/stale unknown."
    },
    "offscreen-messaging-cache/717": {
      "promql": "((rate(rabbitmq_queue_messages_acked_total{job=\"rabbitmq\"}[5m])) and on(job,instance) (time() - timestamp(rabbitmq_queue_messages_acked_total{job=\"rabbitmq\"}) <= 90)) and on(job,instance) ((up{job=\"rabbitmq\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"rabbitmq\"}) <= 90))",
      "unit": "ops",
      "interpretation": "Acknowledged messages per second; current scrape and metric required; missing/stale unknown."
    },
    "offscreen-messaging-cache/718": {
      "promql": "((rabbitmq_alarms_free_disk_space_watermark{job=\"rabbitmq\"}) and on(job,instance) (time() - timestamp(rabbitmq_alarms_free_disk_space_watermark{job=\"rabbitmq\"}) <= 90)) and on(job,instance) ((up{job=\"rabbitmq\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"rabbitmq\"}) <= 90))",
      "unit": "none",
      "interpretation": "Free-disk-space alarm 1 active / 0 inactive; current scrape and metric required; missing/stale unknown."
    },
    "offscreen-messaging-cache/719": {
      "promql": "((rabbitmq_alarms_memory_used_watermark{job=\"rabbitmq\"}) and on(job,instance) (time() - timestamp(rabbitmq_alarms_memory_used_watermark{job=\"rabbitmq\"}) <= 90)) and on(job,instance) ((up{job=\"rabbitmq\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"rabbitmq\"}) <= 90))",
      "unit": "none",
      "interpretation": "Memory alarm 1 active / 0 inactive; current scrape and metric required; missing/stale unknown."
    },
    "offscreen-messaging-cache/720": {
      "promql": "((rabbitmq_process_resident_memory_bytes{job=\"rabbitmq\"}) and on(job,instance) (time() - timestamp(rabbitmq_process_resident_memory_bytes{job=\"rabbitmq\"}) <= 90)) and on(job,instance) ((up{job=\"rabbitmq\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"rabbitmq\"}) <= 90))",
      "unit": "bytes",
      "interpretation": "Resident memory; current scrape and metric required; missing/stale unknown."
    },
    "offscreen-messaging-cache/721": {
      "promql": "((rabbitmq_process_open_fds{job=\"rabbitmq\"}) and on(job,instance) (time() - timestamp(rabbitmq_process_open_fds{job=\"rabbitmq\"}) <= 90)) and on(job,instance) ((up{job=\"rabbitmq\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"rabbitmq\"}) <= 90))",
      "unit": "none",
      "interpretation": "Open file descriptors; current scrape and metric required; missing/stale unknown."
    },
    "offscreen-messaging-cache/722": {
      "promql": "((rabbitmq_process_max_fds{job=\"rabbitmq\"}) and on(job,instance) (time() - timestamp(rabbitmq_process_max_fds{job=\"rabbitmq\"}) <= 90)) and on(job,instance) ((up{job=\"rabbitmq\"} == 1) and on(job,instance) (time() - timestamp(up{job=\"rabbitmq\"}) <= 90))",
      "unit": "none",
      "interpretation": "File descriptor limit; current scrape and metric required; missing/stale unknown."
    }
  },
  "coverage": "enabled",
  "reason": ""
}
```

Materialize this exact row in the eventual `coverage/native-services.json` array and mirror its reserved IDs 710–722; the full array and final 04/07 dispatch remain gated. No new source edits are commissioned by this partial freeze.

### Remaining narrow decisions (not a complete coverage freeze)

- **SeaweedFS:** 110 selected series, S3 request histogram verified as seconds, volume-server request histogram seconds. Existing evidence policy prohibits bucket/key names and arbitrary collection/path identifiers. Do not scrape `SeaweedFS_s3_request_total`, `SeaweedFS_s3_request_seconds_{bucket,count,sum}` or bucket-labelled traffic by dropping `bucket`; that aliases distinct source series. The same holds for collection-labelled volume metrics and disk name/path dimensions. Selected safe native gauges/counters with no native labels: `SeaweedFS_master_is_leader`, `SeaweedFS_s3_in_flight_upload_bytes`, `SeaweedFS_s3_in_flight_upload_count`, `SeaweedFS_volumeServer_max_volumes`, `SeaweedFS_volumeServer_storage_io_error_total`, `SeaweedFS_volumeServer_file_read_failures`, `SeaweedFS_volumeServer_file_write_failures`. The in-flight request type and volume/filer request type/code dimensions are vendor operation/status dimensions; retain them if enrolled, never drop an identity dimension. Verify whether vendor exposes a true global (non-bucket) aggregate before selecting S3 request/latency coverage; otherwise report those panels as unavailable with owner disposition. Existing PVC capacity and Pod health panels remain. Do not treat max-volume count as used byte capacity. No further storage operation.
- **Temporal:** service and persistence histogram labels include native `namespace`; do not collide with the Kubernetes `namespace` target label, and do not store private tenant/workflow/taskqueue/worker identifiers or collapse distinct source series. Native persistence `db_kind`/`service_name`/`type` are observed on all four roles; select them as a bounded pool-use candidate. Worker lacks observed service request/latency, matching lacks observed error series in this sample; no zeros fabricated. Matching backlog has namespace, taskqueue, partition, task type, worker/deployment/version dimensions; defer per-queue enrollment absent privacy-safe aggregate. Pinned Temporal 1.32.2 upstream `common/metrics/config.go` (https://github.com/temporalio/temporal/blob/v1.32.2/common/metrics/config.go) uses seconds for Tally timer bucket conversion and OpenTelemetry uses milliseconds unless `recordTimerInSeconds`; see https://github.com/temporalio/temporal/blob/v1.32.2/common/metrics/otel_metrics_handler.go. Determine actual configured reporter/unit from selected native bucket boundaries and config before latency panel freeze. Do not infer units merely from `_bucket`.
- **Tempo:** `tempo_distributor_traces_per_batch_{count,sum}` are histogram components with no native labels; count is batches, sum is traces observed in batches, not successful durable ingestion. HTTP `tempo_request_duration_seconds_{bucket,count,sum}` has native method/route/status_code/ws; preserve identity and verify route policy, no arbitrary paths.
- **Prometheus/Collector:** preserve existing jobs and their existing scrape semantics; do not apply new filtering to legacy self metrics without review. Prometheus head-series gauge, storage bytes gauge, append and rejection counters verified; sum append rates only over actual observed type dimension if appropriate. Collector existing Prometheus `up=1` from prior specimen; query existing job instead of repeating direct-forward failures.
- **Loki/Grafana:** earlier endpoint specimen established actual families; new probe failures may reflect empty HELP parser assumption and Service-to-container port mismatch respectively. Correct only these diagnostic paths and existing Collector query; no service restart, reinstall or workload changes.
- **PG01:** remaining existing-slot executor admission is separate from the already-passed repair and metrics observation; do not repeat SQL grants.

The complete final metric contract requires explicit disposition of CNPG freeform client dimensions, Temporal namespace/taskqueue dimensions and SeaweedFS bucket/collection dimensions. Keep the accepted no-private-label guarantee. A source-owned aggregate metric can be a later focused owner evolution, not an implicit change by 04. Do not silently reduce required coverage; seek owner ratification if a complete privacy-safe aggregate is unavailable. The remaining read-only diagnostic should return only bounded classifications, actual bucket bounds and selected family keys, never raw arbitrary values. No new committee for ordinary evidence completion.


## Final native readback and bounded coverage candidate | 2026-11-28

Owner read-only follow-up in `kind-offscreen-dev`, observed remote Design HEAD `eb1e71a4ebe74fc2cf88359b62b2b6c6cda4b141` (probe did not bind its own HEAD). The previous metric-evidence patch is applied locally but not committed at this observation. All previously failed endpoint reads now succeeded; no additional owner mutation. Preserve earlier receipts; do not repeat G4b, marker preparation, PG01 repair or registry migration.

| Endpoint | Actual selected observation |
| --- | --- |
| Loki | Service 3100 → `http-metrics`; four scalar families, one series each: `loki_ingester_chunks_flush_failures_total` counter; `loki_ingester_flush_queue_length`, `loki_ingester_memory_chunks`, `loki_ingester_wal_bytes_in_use` gauges. |
| Grafana | Service 80 → `grafana`; API response status counter 4 series/4 code values; HTTP duration seconds histogram bucket/count/sum 26/2/2 with handler, method, slo_group, status_code, status_source and le on buckets; inflight gauge one unlabeled series. |
| Collector | Existing Prometheus `up{job="collector"}=1`; `otelcol_exporter_queue_capacity` and `otelcol_exporter_queue_size` each three series keyed by exporter,data_type plus target labels; `otelcol_process_memory_rss` one; `promhttp_metric_handler_errors_total` two cause series. Also observed CPU, uptime, three runtime memory families and batch metadata cardinality. No accepted/sent/refused/drop counters observed; cannot infer end-to-end delivery or zero loss. Preserve existing scrape configuration. |
| CNPG | Backend dimensions: application_name 2 distinct, both empty or cnpg_metrics_exporter; datname 3 distinct, all approved dev/temporal/temporal_visibility; usename 2, both cnpg_metrics_exporter or temporal; no other values in this snapshot. Prior max_connections=100 is measured, not a constant. |
| SeaweedFS | S3 counter bucket and histogram bucket each two distinct values: one empty, one unapproved; volume collection two distinct: one empty, one unapproved. Empty label is not evidence of a global aggregate. |
| Temporal frontend/history/matching/worker | Native namespace classifications: distinct 5/2/5/2, approved system/_unknown_ as observed (history system only), unapproved 3/1/3/0. Both service and persistence latency bucket boundaries are 0.001,0.002,0.005,0.01,0.02,0.05,0.1,0.2,0.5,1,2,5,10,20,50,100,200,500,1000,+Inf (worker persistence only). These match Temporal 1.32.2 default timer seconds boundaries (pinned `common/metrics/config.go::buildTallyTimerHistogramBuckets` converts milliseconds to seconds; source inspected; observed bounds confirm seconds rather than millisecond-scale buckets). Do not divide by 1000. Worker service latency is not observed. |

### Selected bounded coverage (owner ratified 2026-11-28)

[Exact service coverage and scrape-policy candidate](NATIVE-SERVICE-CANDIDATE.json) supplies the concrete JSON rows and PromQL for 04/07, including the previously frozen RabbitMQ row unchanged. It is a planner input, not runtime configuration. Do not dispatch on its presence alone. The owner explicitly accepted the bounded views below on 2026-11-28, with later expansion as needed. Exact selected arrays and policies are frozen in the linked JSON; verify exact row equality at 08. No further vendor endpoint discovery is required for this bounded candidate. Do not add an exporter, custom SQL, owner-side restart or scrape private identifiers to make the panels more complete.

- CNPG: retain all four approved backend identity dimensions (do not drop them to aggregate). Restrict application_name to empty or cnpg_metrics_exporter, usename to known infrastructure/derived slot role vocabulary, datname to the selected platform and derived dev slot database vocabulary, and state to fixed pg_stat_activity states. Connection count and occupancy explicitly lower-bound admitted client groups, not global saturation. Database statistics per instance and selected datname; no primary/standby double-count. Keep max_connections only from settings. Native collector health, error flags and last-update freshness gate DB statistics. Replication lag/receiver only in recovery. No arbitrary SQL or labels.
- Temporal: keep all observed identity dimensions on selected service/persistence families but admit namespace-labelled samples only for system and _unknown_. Native namespace collides with target namespace under honor_labels=false, hence explicitly retain exported_namespace; namespace target remains Kubernetes namespace. Operation/service_name/type/error_type/db_kind are native server instrumentation dimensions, not workflow/taskqueue identifiers. Do not admit matching backlog labels in E2; no backlog aggregate proved. Never label partial system request/latency panels as all-tenant service metrics. Missing worker service series or typed error series is unknown, not zero. Histograms use seconds and positive rate-count gates. No application or SDK enrollment.
- SeaweedFS: keep empty bucket and empty collection samples only, with bucketless S3 request rate/p95 and default-collection counts explicitly partial; never strip a nonempty bucket/collection to fake totals. Preserve native type/code/le. Exclude disk name/path and arbitrary collection/bucket traffic labels; retain volume error counters and upload gauges, plus existing KSM PVC capacity/binding. No exact global S3 request/latency or physical disk occupancy proof. `max_volumes` is a count, not capacity bytes.
- Grafana/Tempo: admit fixed selected scalar/counter signals. Do not enroll handler/route-labelled latency histograms absent a bounded route classification. Tempo batch sum means traces observed in batches, not durable ingestion. Loki exact four verified signals. Prometheus and Collector legacy jobs unchanged; selected dashboard queries only. Collector queue ratio is per exporter/data_type with positive denominator; missing loss counters explicitly unsupported, not healthy.
- Optional richer operator/control-plane metrics stay inventory-only; Traefik not applicable. Retain universal KSM inventory and resource coverage. The inventory-only rows use namespace inventory, not new endpoint or deployment selection. No new privileges beyond the previously selected Pod discovery. Keep M03 both-node rate correction and existing conditional list/network proof; no claim of native dashboard/Prometheus/G5 success.

### Exact candidate realization rules

`nativeServices` and `seaweedfs` arrays in the linked candidate are the intended contents of the corresponding `coverage/*.json` files under the owner-ratified scope. `newScrapePolicies` gives exact job family allowlists, ordered value filters, retained label union and target selector. Build metric relabel sequence: exact family keep (join family names with `|`, no broad wildcard), then given `valueFilters` in listed order, then one labelkeep of exactly `retainedLabels` (join with `|`). Preserve full admitted identity; tests reject duplicate projected label sets in representative native samples; any new identity dimension or unapproved native value refuses affected qualification rather than broadening collection. For `postgres-cnpg` native cluster label is `exported_cluster` because the target supplies cluster=offscreen-dev; restrict to dev-pg, retain the distinct label. For Temporal keep native `exported_namespace`, target namespace is actual Kubernetes namespace. Use `honor_labels:false` explicitly. Job labels cluster=offscreen-dev, env=dev, component from coverage row (postgres/temporal/etc), namespace fixed target namespace, pod discovered name for both Pod jobs, role from exact Temporal component. Instance remains actual target address; no ready-only filter. Pod discovery restricted to listed namespace and exact Pod labels, exact container/port pairs (role/container must match), not annotations. Use fixed HTTP /metrics, existing 30s/10s, sample_limit 5000, target_limit 100, label_limit 40, label_name_length_limit 128, label_value_length_limit 512. Static job addresses from policy, no service-owner edits. 04 extends the existing exact `obs-prometheus-kubelet` ClusterRole with pods get/list/watch (no pods/exec, Secrets, proxy or mutation), no duplicate new RBAC owner; 08/13 verify combined role/SA/render/effective negatives against the selected contract. Preserve original 02/03/05 jobs and legacy Prometheus/Collector jobs. Existing `scrapeConfigs` and `extraManifests` are the exact current source anchors.

07 mirrors every candidate panel ID, PromQL, unit and interpretation exactly, including partial-scope labels. Add explicit text limitation annotations for each omitted domain above, never render no-data as zero/healthy. Existing frozen inventory/Redis/resource rows remain authoritative, including M03's required correction. Overview consumes fixed component inventory, current up and domain signals separately, with a visible coverage status and no false absence; do not rely solely on scrape success. 08 compares source arrays to the owner-ratified contract, validates exact rendered jobs/labels, PromQL syntax and provider mounts. 13 native query acceptance compares actual series and bounded labels, current health and no-data, no scrape rejects/collisions. Scope ratification is recorded; affected readiness and live proof are distinct. No new architecture committee.

### PG01 occupied tenant admission | 2026-11-28: PASS

Owner ran the actual `executeDevSqlTenants` at clean joined Design revision `42223ddd86ff5206ba91b63a7b3dcc52bb0850ed`, using the canonical validated v2 registry (sole retained slot `dev-1`), actual `createLiveDevSqlAdapter` identity/catalog/Temporal persistence/resource observations, and an adapter exposing only these read methods. Every mutation method (`execSql`, `grantMonitoringConnect`, `createSecrets`, `applyClosedDatabase`, `permitConnections`) and the unused reconciliation wait were replaced with a throwing refusal before invoking the executor with the fixed dev authorization token. No mutation method ran. Returned `ok:true`, `mutated:false`, `refusals:[]`, `devLogin:true`, `ambientContext:"kind-offscreen-dev"`, and retained both existing `dev-1-mig-auth` and `dev-1-run-auth` Secret resource identities (UIDs observed, not credentials). The native selected-tenant admission, including platform Temporal and existing resource admission, therefore passed. This closes the remaining occupied PG01 admission obligation in addition to the previously recorded 25/25 isolation predicates and recovered collector. The registry has only one slot, so no distinct occupied peer or fresh-tenant activation was exercised; retain their source/fixture proof boundary, not a fabricated native PASS. No additional SQL grant, tenant creation, storage operation or E2 activation is required for this receipt. G5 remains NOT RUN.

## H03 correction | exact overview identity and status contract

Independent [review 04](READINESS-REVIEW-04.md) at `bb701033215718daedd344a62af52fb1eb05f8ae` cleared 04 and found H03 in 07 T01. The [overview contract](OVERVIEW-CONTRACT.json) is the planner-frozen correction candidate: 20 rows, one per existing combined coverage component (15 service/unsupported rows + four inventory/resource rows + Redis), one new table panel `offscreen-overview/108`, independent of the unchanged 139 metric panel mappings and M03. No new metric family, collector, permissions, exporter, scope or live operation. 07 remains blocked until impact-based review of this correction; 04 can proceed.

**Identity source:** `infra/platform/observability/expected-inventory.json` maps the five E1 observability workloads to exact Deployment/StatefulSet names; joined `values/profiles/dev/prometheus.yaml` and pinned KSM chart `templates/{deployment.yaml,_helpers.tpl}` select Deployment/obs-kube-state-metrics. `infra/platform/redis/chart/templates/deployment.yaml` and `infra/platform/object-storage/providers/seaweedfs/chart/templates/deployment.yaml` own exact names. Temporal `readiness.mjs::observeDeployment` maps four server roles to `temporal-<role>`; web/admintools remain ordinary Kubernetes inventory. RabbitMQ dev chart `profiles/development.yaml` sets broker name rabbitmq; its pinned operator-generated `rabbitmq-server` StatefulSet identity is recorded in `tests/readiness.test.mjs` and owner observation resolves its StatefulSet owner. PostgreSQL dev profile fixes `dev-pg`; `bootstrap/observation.mjs::ownerMatches` verifies actual instance Pods directly controlled by Cluster/dev-pg. KSM has no CNPG CR or Service collector, so CNPG row means observed owned Pods only, not cluster existence/CR readiness or desired replicas. Optional control-plane/operator rows mean only the exact namespace is observed, not that each controller exists or is ready. Traefik is not applicable to dev. Fixed nodes come from 03's exact node set. Never translate application labels to unexported KSM labels, infer presence from another workload in the namespace, or introduce a name-prefix guess.

**Predicates:** Every KSM series is current (age <=90s) and matched to current `up==1` by job/instance. Every inventory/readiness claim also requires both KSM targets current, and exactly one positive current list and watch success counter for each resource used by that predicate. Pinned KSM v2.20.0 `internal/store/builder.go::startReflector` uses `reflect.TypeOf(expectedType).String()` as resource label (e.g. `*v1.Pod`, `*v1.Deployment`); its README telemetry examples establish `result=success/error`. A present error counter must itself be current and produce a zero 5m increase; an increment (even if the error series subsequently disappears), stale counter or insufficient history suppresses confidence. A stale matching inventory identity also suppresses absence/parked/ready rather than being treated as missing. Absence of an error series is not proof of no errors; label results cached observations only. The relevant inventory family must have at least one fresh sample in the observed cache before absence can be inferred; a globally missing family is Unknown. Missing list/watch successes (including conditional list family), stale/unavailable inventory or known degradation => Unknown, never absence/parked/ready. G5 must demonstrate actual list/watch evidence or return explicit scope correction; do not fabricate it. Successful cached observations are not strongly consistent API absence; native kubectl remains the decisive cross-check.

Deployments/StatefulSets: exact name and namespace, desired/ready families; all expected identities must have exactly one current desired sample for present, all zero desired for parked, all positive desired and matching current ready replicas for ready; missing ready sample unknown. Partial/duplicate presence is incomplete/ambiguous, never ready. Zero desired is a desired-state observation, not proof all Pods stopped. CNPG uses exact controller owner and UID-aware Pod readiness joins, no parked claim. Node rows require both distinct exact node identities; namespace rows observe the Active phase only, explicitly not workload readiness. Distinguish actual current zero from missing. No workload status derived from scrape success.

**Scrape columns:** Expected scrape is fixed metadata. Static jobs require one current target, node jobs both exact nodes. CNPG and Temporal require current selected target groups; for discovered Pods compare both directions of observed `(namespace,pod)` sets, CNPG via direct owner and Temporal via Pod→ReplicaSet→exact Deployment controller (role-by-role), with fresh Pod/ReplicaSet list/watch health and duplicate refusal. Current down takes precedence; observed up with unknown or mismatching inventory is explicitly qualified, not complete coverage. Residual H03 correction after [review 05](READINESS-REVIEW-05.md) at `9f66069243cdaa0a19c2bb75a1d8c9eb5a9dc22d`: both match and mismatch branches in targets E/F additionally require a fresh global Pod-owner family (and ReplicaSet-owner family for Temporal) and no stale matching owner observation. PostgreSQL selects only `Cluster/dev-pg` controller owner samples. Temporal conservatively refuses comparison confidence if any ReplicaSet-controller Pod owner in its namespace is stale (a stale or incomplete ownership chain cannot safely classify the Pod by role), or any ReplicaSet owner pointing to the four selected Deployment names is stale. No inventory or freshness column query changes; no other targets changed. Observed current up without these guards falls through to `Observed up; Pod coverage unknown`; current down remains first. Freshness means current expected groups, not domain health or exhaustive discovery. Optional unenrolled rows display Not enrolled / Not applicable; cAdvisor has expected scrape despite inventory-only network coverage. Preserve E1 self jobs and all native scope limits.

**Exact realization (07 T01):** one table panel id 108, title/type/datasource, 20 instant Prometheus table-format targets in JSON row order, exact refIds and expressions from `OVERVIEW-CONTRACT.json.rows[].target`. The expressions produce exactly one labelled row per fixed component: static `vector(1)` supplies the row identity/metadata only, and `or on()` chooses a known labelled status or explicit Unknown; no sample value is replaced by zero or claimed healthy by this anchor. Multiply singleton label states using `on() group_left(field)` to append each state. Copy transformations in order (filter exact fields, merge frames with disjoint component identities, organize/rename columns). Pinned Grafana 13.3.2 `packages/grafana-data/src/transformations/transformers/{filterByName,merge,organize}.ts` supports these native transformations. Do not display the synthetic numeric value or Time field. No dashboard variable filters this fixed overview. A datasource error is a visible panel error/no-data, never a healthy placeholder. Table query evaluation and actual Grafana layout are assigned to joint acceptance, not claimed proven here. Copy the generated targets programmatically; do not spend agent context reprinting the full repeated query strings. The pinned Grafana datasource must use POST for these queries and the rendered dashboard ConfigMap must fit Kubernetes size limits; 08 verifies actual artifact size, 13 confirms the actual query transport before acceptance. No E1 datasource changes are selected.

**Proof:** 07 T03 asserts exact panel 108 target/transform arrays, exact 20-component equality against the immutable combined coverage declarations (read planner arrays for 04's rows; no dependency on 04 join), no unknown component or duplicate key, no arbitrary KSM label, no synthetic zero, no incorrect optional target, and fixture predicates: absent exact workload with unrelated Pod in namespace; missing/stale/degraded KSM; absent list/watch; all desired zero vs missing Pods; partial Temporal roles; absent/duplicate/wrong-role target; residual H03 fixtures on exact targets E/F: current up for one owned Pod with a second matching owner sample 120s old and its target missing must produce `Observed up; Pod coverage unknown` (not match or mismatch); Temporal tests independently stale Pod-owner and stale selected ReplicaSet-owner sides; missing global Pod-owner family, or missing global ReplicaSet-owner family for Temporal, must produce coverage unknown despite positive list/watch; confident complete sets match, confident unequal sets mismatch, current down wins even when owner-family confidence is absent or stale; current target down with healthy workload; same-named Pod with wrong owner/UID; CNPG no owned Pods not CR absence; namespace-only row not controller-ready; two distinct node identities; real measured zero. 08 validates the joined exact contract equality for panel 108 alongside all 139 metric panels and M03, not recomputing expected queries from rendered output. 13 uses pinned query checks and operator walkthrough for actual table output, missing/degraded KSM, current scrape down, absent optional and observed parked states; retain existing safety/permission bounds and G5 gate. No independent live operation required in 07 or 08.

## Freeze record (current)

| Gate | Current result | Closure owner | Affected |
| --- | --- | --- | --- |
| G1 KSM | Registry/runtime pin, render and specimen permissions PASS; observed construction rows frozen; list/Job/degradation proof remains G5 | planner + owner | 02,07,08 |
| G1 Redis | v1.93.0 rejected; v1.97.0 pin, exclusion flags, disposable command/negative evidence and selected coverage RESOLVED | planner + owner | 05,07,08 |
| G2 | Native feasibility PASSED; scoped trust/render and resource coverage frozen; 03 source archived/joined; integrated render/trust and G5 NOT RUN | owner/cluster owner + planner | 03,07,08 |
| G3 | Collector existing scrape PASS; Redis replacement specimen PASS; PG01 occupied repair and CNPG collector recovery PASS (74 observed names, exact isolation); all selected endpoint reads PASS; bounded coverage ratified and frozen; affected packet readiness pending; existing-tenant executor admission PASS | service owner + planner | 04,05,07,08 |
| G4a/b | 06 source archived/joined; guarded registry cutover, marker preparation and occupied transition PASS; 112 observed sample names; bounded SeaweedFS row ratified and frozen | object-store owner + planner/acceptance lead | 06 source; 04/07/08/13 native |
| G5 | NOT RUN | acceptance lead + owner | 13 |

Append only actual evidence references and current resolved input values here or in existing evidence owner; update corresponding affected cards in place. No third comprehensive architecture review for ordinary facts. No implementation-ready claim for dependent scope until material facts resolved and reviewed. Keep raw secret data outside Git. The owner can send one consolidated nonsecret terminal summary for G1–G3; G4 owner transition requires separate bounded closure, not an arbitrary live patch.

**Review 03 disposition:** [receipt](READINESS-REVIEW-03.md) establishes 03/06 construction readiness at the reviewed SHA. M03 is a nonblocking resource-query refinement owned by 07: the exact revised offscreen-overview/104 query and interpretation above require two distinct current node rate series; synchronize inventory coverage and dashboard query to that frozen row before 08 (explicitly authorize the narrow inventory coverage reconciliation at 07; no duplicate owner or concurrent 03 writer). Do not substitute zero for an insufficient-sample rate. M04 clarifies 03 T02 realizes node permissions and token mount, 04 realizes selected Pod discovery; 08/13 verify combined exact RBAC. No new gate or committee for these Medium dispositions.
