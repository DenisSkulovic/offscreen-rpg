# E2 | native input closure (planner/operator evidence only)

**Status:** OPEN G1–G4. Verified remote planning base `1fa759b980d275ef4ad9d11590cf080fc807ccd2`. [Defended dossier](../../../designs/open/observability-infrastructure-visibility/EVIDENCE.md) owns architecture and scope. This is the one bounded evidence handoff for all affected packets, not an implementation research assignment. No native commands executed by planner; no fabricated digest, cert, endpoint, family or PASS. G5 is downstream construction and qualification. Owner must explicitly authorize any live probe creating resources, executing a helper container, or mutating data. Read-only metadata/port-forwards need correct fixed dev target and must not disclose credentials. No release commands, no provider spend.

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

## Freeze record (current)

| Gate | Current result | Closure owner | Affected |
| --- | --- | --- | --- |
| G1 KSM | OPEN; no verified registry digest/live family record | planner + owner | 02,07,08 |
| G1 Redis | OPEN | planner + owner | 05,07,08 |
| G2 | OPEN | owner/cluster owner + planner | 03,07,08 |
| G3 | OPEN | service owner + planner | 04,05,06,07,08 |
| G4a/b | OPEN | object-store owner + planner/acceptance lead | 06,07,08 |
| G5 | NOT RUN | acceptance lead + owner | 13 |

Append only actual evidence references and current resolved input values here or in existing evidence owner; update corresponding affected cards in place. No third comprehensive architecture review for ordinary facts. No implementation-ready claim for dependent scope until material facts resolved and reviewed. Keep raw secret data outside Git. The owner can send one consolidated nonsecret terminal summary for G1–G3; G4 owner transition requires separate bounded closure, not an arbitrary live patch.
