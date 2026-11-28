# E2 | native input closure (planner/operator evidence only)

**Status:** G1 registry identities resolved; G1 specimens, G2 trust/authorization, G3 complete panel contracts and G4 owner transition remain OPEN. Verified remote planning base `1fa759b980d275ef4ad9d11590cf080fc807ccd2`. [Defended dossier](../../../designs/open/observability-infrastructure-visibility/EVIDENCE.md) owns architecture and scope. This is the one bounded evidence handoff for all affected packets, not an implementation research assignment. Owner ran the read-only native probe at the committed batch SHA; planner records the observed subset below. No native commands executed by planner; no fabricated digest, cert, endpoint, family or PASS. G5 is downstream construction and qualification. Owner must explicitly authorize any live probe creating resources, executing a helper container, or mutating data. Read-only metadata/port-forwards need correct fixed dev target and must not disclose credentials. No release commands, no provider spend.

## G1 | helper image identity

**Blocks:** 02 KSM, 05 Redis, dependent 07/08. Owner/planner collect registry index and matching node platform identities, not a guessed tag digest:

```bash
docker buildx imagetools inspect registry.k8s.io/kube-state-metrics/kube-state-metrics:v2.20.0
docker buildx imagetools inspect docker.io/oliver006/redis_exporter:v1.93.0
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

Use explicit dev loopback port-forward to the actual named Pod/Service and confirmed remote port, one at a time, for native endpoint inspection. For example, only if service mapping confirms it: `kubectl --context kind-offscreen-dev -n offscreen-dev-rabbitmq port-forward svc/rabbitmq 25692:15692 --address 127.0.0.1`, then `curl -fsS http://127.0.0.1:25692/metrics` locally; summarize metric family names, label **keys** and units, redact values and stop forward. No generic scrape or credentials sent to unverified endpoint. For CNPG and four Temporal roles prove exact Pod container/name/labels/port protocol (9187, 9090 selected), RabbitMQ aggregate 15692, Loki/Tempo/Grafana paths verified against actual rendered services, Prometheus/Collector existing jobs retained. Optional operator/control-plane endpoints remain inventory-only unless already safely verified. Redis v1.93.0: inspect exact tagged upstream source/flags, prove fixed target, disabled alternate scrape endpoint/config command, no key/stream/scan/script/client-list/value collection, emitted label keys and no data writes on separately authorized disposable exporter specimen; unauthenticated Redis remains local trust limitation, not ACL guarantee. No paid traffic. SeaweedFS native family proof comes with G4b.

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

## Freeze record (current)

| Gate | Current result | Closure owner | Affected |
| --- | --- | --- | --- |
| G1 KSM | Registry pin RESOLVED; chart render/specimen family and permissions OPEN | planner + owner | 02,07,08 |
| G1 Redis | Registry pin RESOLVED; tagged behavior/specimen OPEN | planner + owner | 05,07,08 |
| G2 | Certificate metadata observed; actual trust/authorization OPEN | owner/cluster owner + planner | 03,07,08 |
| G3 | Nine endpoints observed; full panel/label/unit contracts and Redis proof OPEN | service owner + planner | 04,05,06,07,08 |
| G4a/b | Revision-1 predecessor metadata observed; owner contract/transition OPEN | object-store owner + planner/acceptance lead | 06,07,08 |
| G5 | NOT RUN | acceptance lead + owner | 13 |

Append only actual evidence references and current resolved input values here or in existing evidence owner; update corresponding affected cards in place. No third comprehensive architecture review for ordinary facts. No implementation-ready claim for dependent scope until material facts resolved and reviewed. Keep raw secret data outside Git. The owner can send one consolidated nonsecret terminal summary for G1–G3; G4 owner transition requires separate bounded closure, not an arbitrary live patch.
