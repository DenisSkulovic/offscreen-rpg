# OBS-E2-04 | task queue
Base: `1fa759b980d275ef4ad9d11590cf080fc807ccd2`; refresh against recorded Design integration branch. State: PROPOSED (targeted readiness pending). Shared contracts: [group](../README.md#frozen-packet-interfaces).
Tasks: T01 → T02 → T03 → T04; selected: none.

## T01 | Add per-instance native discovery | PROPOSED (targeted readiness pending)
DEPTH=PATCH
Requires: 02 joined; PG01 positive native receipt; 06 joined and G4b positive owner receipt; planner-frozen G3/G4 exact endpoints, families, labels and queries for full selected scope; exclusive overlay ownership.
May write: infra/platform/observability/values/profiles/dev/prometheus.yaml
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/values/profiles/dev/prometheus.yaml; [selected JSON](../NATIVE-SERVICE-CANDIDATE.json) newScrapePolicies.postgres-cnpg and temporal-server; [exact realization rules](../NATIVE-INPUTS.md#exact-candidate-realization-rules)
Algorithm: Use dedicated Prometheus identity Pod list/watch/get only, explicit namespaces, exact labels, container names and port selectors from G3. Jobs `postgres-cnpg`, `temporal-server` retain namespace/component/instance and proven role labels. Filter only fixed metrics paths, no readiness filter that hides a broken target. Extend the existing obs-prometheus-kubelet ClusterRole with exactly pods get/list/watch, preserve node rules and binding. Apply exact ordered family keep, value filters and retained-label union from selected JSON; preserve exported_cluster and exported_namespace with honor_labels:false. No query text, SDK inference, arbitrary annotation/port/target. Use per-target 5k samples, 100 target cap, fixed 30s/10s and bounded labels.
Test: Source gate; 08 exact render and config check.
Negative: Unrelated namespace, wrong instance/port, arbitrary annotation, credentials or unexpected family rejected by declared rules.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.

## T02 | Add fixed native jobs and coverage | PROPOSED (targeted readiness pending)
DEPTH=PATCH
Requires: T01 postcondition and packet prerequisites.
May write: infra/platform/observability/values/profiles/dev/prometheus.yaml; infra/platform/observability/coverage/native-services.json (new)
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: dev Prometheus overlay; [selected JSON](../NATIVE-SERVICE-CANDIDATE.json) nativeServices and newScrapePolicies.rabbitmq/loki/tempo/grafana
Algorithm: Jobs `rabbitmq`, `loki`, `tempo`, `grafana` on G3-verified internal Service paths and ports; preserve existing `prometheus` and `collector`. Write nativeServices array exactly as coverage/native-services.json, including optional/unsupported rows. Apply exact ordered family keep, value filters and retained-label union from selected JSON. Use aggregate RabbitMQ families only. Add no service-owner writes, new credentials or host exposure.
Test: Source gate; 08 validates config, 07 consumes exact rows.
Negative: Exporter up is not backend healthy; absent service does not create healthy status, no per-object RabbitMQ blow-up.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.

## T03 | Enroll proven SeaweedFS endpoint | PROPOSED (targeted readiness pending)
DEPTH=PATCH
Requires: T02 postcondition, joined 06 source, positive G4b owner receipt and frozen exact metric/label/panel rows; exclusive overlay ownership.
May write: infra/platform/observability/values/profiles/dev/prometheus.yaml; infra/platform/observability/coverage/seaweedfs.json
Must not write: object-store workloads, chart, data, other Change owners, live resources.
Read: G4b positive owner receipt and exact realization rules in NATIVE-INPUTS; [selected JSON](../NATIVE-SERVICE-CANDIDATE.json) seaweedfs and newScrapePolicies.seaweedfs; dev Prometheus overlay.
Algorithm: fixed `seaweedfs` job `object-store.offscreen-dev-objects.svc:9327/metrics`, explicit bounded family/label filters, 30s/10s, 5000 samples and target limit 100 per existing selected budgets. Match exact G4b Service/port; materialize the selected seaweedfs array exactly. Reject nonempty bucket/collection before labelkeep. Never scrape S3, enable arbitrary labels, modify data services or silently omit required coverage. Do not invent metrics or authorize G4b.
Test: source gate; T04 checks exact enrollment and 08 renders/promtool; 13 live proof.
Negative: Missing owner receipt, wrong port, absent/unsupported family never treated as healthy or enabled.
Stop: missing frozen rows or owner receipt, unexpected service/source identity, permission/coverage drift.
Receipt: exact source postcondition and downstream proof obligations.

## T04 | Test enrollment boundaries | PROPOSED (targeted readiness pending)
DEPTH=PATCH
Requires: T03 postcondition and packet prerequisites.
May write: infra/platform/observability/tests/e2-collection.test.mjs
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/tests/e2-collection.test.mjs; coverage/native-services.json; coverage/seaweedfs.json
Algorithm: Assert exact job set, fixed namespaces/labels, ports/families and no wildcard metadata copy, explicit optional/unsupported rows, positive exact SeaweedFS endpoint/receipt and no S3 endpoint, no service-owner changes. Compare arrays to the selected JSON; test both admitted and rejected CNPG identity groups, Temporal namespaces and role/container mismatch, SeaweedFS bucket/collection, Grafana status and label projection collision examples; exact RBAC rules.
Test: node --test infra/platform/observability/tests/e2-collection.test.mjs
Negative: Wrong selectors, duplicate job, unapproved endpoint or missing coverage disposition fails.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.
