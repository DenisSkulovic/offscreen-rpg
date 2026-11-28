# **Observability E2: implementation-readiness review 04**

**Repository:** `DenisSkulovic/offscreen-rpg`\
**Scope:** OBS-E2-04 and OBS-E2-07\
**Review mode:** Independent, targeted, read-only.

## **1. Candidate identity**

Both branch heads have been independently verified against GitHub.

| Branch                                                   | Verified HEAD                                                                                                                            |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `implementation/observability-infrastructure-visibility` | [`bb7010332157`](https://github.com/DenisSkulovic/offscreen-rpg/commit/bb701033215718daedd344a62af52fb1eb05f8ae?utm_source=chatgpt.com)  |
| `main`                                                   | [`c8dab5c47f5a8`](https://github.com/DenisSkulovic/offscreen-rpg/commit/c8dab5c47f5a8d638122c9321230f6bb4bfd0ac6?utm_source=chatgpt.com) |

The reviewed candidate is `bb701033215718daedd344a62af52fb1eb05f8ae`. Its HEAD commit records closure of the occupied PG01 tenant admission proof.

All subsequent source inspection is pinned to this implementation commit, not `main`.

## **2. Consolidated verdict**

## **OBS-E2-04**

READY

Native service discovery, metric filtering and coverage declarations are sufficiently determined for independent source construction.

## **OBS-E2-07**

PLANNER-BLOCKED

Dashboard provisioning and the 139 frozen metric panels are sufficiently determined. One localized deficiency remains in the required overview component inventory contract.

Critical

# **0**

High

# **1**

Medium

# **2**

Low

# **0**

**04 can proceed without waiting for the 07 correction.** The remaining deficiency is a source-level planning issue, not an architectural problem or a missing native experiment.

## **3. Repository authority and evidence**

Reviewed the applicable repository instructions, including:

- `AGENTS.md`, `CHATGPT.md`, `CLAUDE.md`, `WORKFLOW.md`, `REPOSITORY-STRUCTURE.md`.
- Planner investigation, packet-readiness and planning-artifact standards.
- Target-driven renewal and staged verification rules.
- The current Change group register, selected technical contract, TARGET and relevant recorded evidence.

The construction-first verification boundary applies. Neither Change requires G5 qualification before source construction.

The recorded PG01 occupied admission, PostgreSQL collector recovery, G4b SeaweedFS transition and owner-ratified bounded metric coverage are sufficient predecessor evidence for this review. Their accepted scope has not been reopened.

## **4. OBS-E2-04: native service collection**

READY

### **Frozen contract integrity**

I programmatically parsed the [native service candidate](https://github.com/DenisSkulovic/offscreen-rpg/blob/bb701033215718daedd344a62af52fb1eb05f8ae/work/changes/open/observability-infrastructure-visibility/NATIVE-SERVICE-CANDIDATE.json?utm_source=chatgpt.com) and the joined inventory and Redis coverage fragments.

New scrape jobs

# **7**

Combined coverage rows

# **20**

Unique frozen panels

# **139**

### **Scrape topology after 04**

Selected topology, not deployed or independently runtime-tested.

All seven new job family allowlists match their corresponding coverage declarations exactly. Combined coverage component identities and panel IDs contain no duplicates. The previously frozen RabbitMQ and Redis rows compare equal to their current respective representations.

### **Discovery and RBAC**

**PASS.** The actual joined [Prometheus overlay](https://github.com/DenisSkulovic/offscreen-rpg/blob/bb701033215718daedd344a62af52fb1eb05f8ae/infra/platform/observability/values/profiles/dev/prometheus.yaml?utm_source=chatgpt.com) provides the exact extension points required by 04.

| Boundary                | Assessment                                                  |
| ----------------------- | ----------------------------------------------------------- |
| CNPG discovery          | Exact namespace, cluster labels, container and metrics port |
| Temporal discovery      | Four fixed roles with role-to-container matching            |
| Static endpoints        | Exact internal addresses and metrics paths                  |
| Prometheus identity     | Existing dedicated ServiceAccount reused                    |
| RBAC                    | Extend existing ClusterRole with Pod get/list/watch only    |
| Existing kubelet trust  | Preserved                                                   |
| Broad discovery         | Remains disabled                                            |
| Readiness filtering     | Broken targets must remain observable                       |
| Service-owner mutations | Excluded                                                    |

The selected cluster-wide Pod metadata/spec read permission is intentional, previously defended and accurately distinguished from namespace-restricted discovery. It does not authorize Secret access, mutation, proxying or execution.

No additional RBAC owner, namespace lifecycle dependency or monitoring credential is necessary.

### **Metric filtering and privacy**

The ordered realization algorithm is sufficiently precise:

**Native metric samples**

**Exact family allowlist**

Reject unselected metric families

**Family-specific value filters**

Reject unapproved identities before label projection

**Exact retained-label union**

Preserve admitted series identities

**Bounded Prometheus ingestion**

Sample, target and label limits remain enforced

| Service    | Selected families | Assessment |
| ---------- | ----------------- | ---------- |
| PostgreSQL | 21                | PASS       |
| Temporal   | 10                | PASS       |
| RabbitMQ   | 12                | PASS       |
| SeaweedFS  | 19                | PASS       |
| Loki       | 4                 | PASS       |
| Tempo      | 2                 | PASS       |
| Grafana    | 2                 | PASS       |

The important ordering decision is correct: private series are rejected before their identifying labels could be removed and their metrics accidentally collapsed into apparent aggregates.

Specifically:

- CNPG retains admitted database, username, application and backend-state dimensions.
- Temporal preserves `exported_namespace` separately from the Kubernetes target namespace.
- SeaweedFS rejects nonempty bucket and collection values rather than erasing their identity.
- RabbitMQ uses aggregate families, not per-object endpoints.
- Grafana restricts response codes and excludes unqualified route-labelled histograms.

Future label-shape drift and representative projection collisions remain qualification refusal conditions. The source filter is not a general-purpose sanitization guarantee for arbitrary future exporter behavior.

### **Actual test integration**

The joined [`e2-collection.test.mjs`](https://github.com/DenisSkulovic/offscreen-rpg/blob/bb701033215718daedd344a62af52fb1eb05f8ae/infra/platform/observability/tests/e2-collection.test.mjs?utm_source=chatgpt.com) contains deliberately restrictive predecessor validators.

04 T04 has the necessary ownership to extend these validators without weakening their existing assertions. In particular:

| Existing validator                         | Required 04 adaptation                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| `validateOverlay`                          | Admit exactly seven additional jobs and two selected Pod-discovery configurations |
| `validateKubeletManifests`                 | Extend exact RBAC expectation with Pod permissions                                |
| `validateCoverage`                         | Support explicit inventory-only and not-applicable rows                           |
| Existing KSM, Redis and kubelet validators | Retain their previous guarantees                                                  |

These are mechanical adaptations under the frozen contract, not unresolved architectural decisions.

### **Task simulation**

| Task | Outcome                                | Readiness |
| ---- | -------------------------------------- | --------- |
| T01  | CNPG/Temporal discovery and RBAC       | PASS      |
| T02  | Fixed service jobs and native coverage | PASS      |
| T03  | SeaweedFS enrollment and coverage      | PASS      |
| T04  | Extend focused collection validators   | PASS      |

The four-task construction boundary is coherent. No live operation or additional native specimen is necessary.

## **5. OBS-E2-07: Grafana dashboards**

PLANNER-BLOCKED

The principal dashboard architecture and exact frozen metric queries are ready. The remaining issue concerns the required component-level overview, not the eight-dashboard provisioning mechanism.

### **Dashboard provisioning**

**Overview**

**Kubernetes**

**Nodes**

**PostgreSQL**

**Temporal**

**Storage**

**Messaging & cache**

**Observability**

All eight dashboard identities and their provisioning mechanism are sufficiently determined.

The joined [`values/grafana.yaml`](https://github.com/DenisSkulovic/offscreen-rpg/blob/bb701033215718daedd344a62af52fb1eb05f8ae/infra/platform/observability/values/grafana.yaml?utm_source=chatgpt.com), chart lock and recorded pinned-chart inspection support the selected arrangement.

| Provisioning contract                       | Result         |
| ------------------------------------------- | -------------- |
| Native provider `offscreen`                 | PASS           |
| Repository-owned JSON                       | PASS           |
| Stable datasource UIDs                      | PASS           |
| Read-only canonical dashboard configuration | PASS           |
| Home dashboard path                         | PASS           |
| Stateless Grafana                           | Preserved      |
| Admin Secret ownership                      | Preserved      |
| Deterministic Helm `--set-file` arguments   | Assigned to 08 |
| Provider mount and checksum rollout         | Assigned to 08 |

No provisioning sidecar, additional ServiceAccount permission, plugin download or UI-only persistence is required.

### **PromQL semantics**

The frozen service expressions correctly implement the important distinctions required by the bounded evolution.

| Query behavior                                  | Result |
| ----------------------------------------------- | ------ |
| Counter rates over five minutes                 | PASS   |
| Current sample-age guards                       | PASS   |
| Scrape availability distinct from domain health | PASS   |
| CNPG collector/error/update-time gating         | PASS   |
| Positive ratio denominators                     | PASS   |
| Per-instance PostgreSQL statistics              | PASS   |
| Recovery-only replication lag/receiver          | PASS   |
| Temporal histogram seconds                      | PASS   |
| Positive histogram observation counts           | PASS   |
| SeaweedFS partial aggregation                   | PASS   |
| Collector queue identity matching               | PASS   |
| No generic synthetic zero substitution          | PASS   |

This is a static semantic assessment of the frozen expressions, not a claim that every query has been executed by Prometheus.

### **Partial coverage presentation**

The owner-ratified scope is sufficiently explicit for the service drilldowns.

**PostgreSQL**

Admitted backend groups and selected databases. Connection occupancy is a lower-bound view, not total saturation.

**Temporal**

System and unknown platform namespaces only. No private taskqueue coverage or inferred zero backlog.

**SeaweedFS**

Bucketless requests and empty-collection volume observations. No claim of global traffic or physical disk occupancy.

**Observability**

Observed backend signals only. Missing Collector delivery counters do not establish zero signal loss.

No additional vendor exploration is warranted for these selected views.

### **M03 correction**

**PASS: fully specified and correctly owned.**

Compared the joined [`coverage/inventory.json`](https://github.com/DenisSkulovic/offscreen-rpg/blob/bb701033215718daedd344a62af52fb1eb05f8ae/infra/platform/observability/coverage/inventory.json?utm_source=chatgpt.com) with the revised panel 104 expression in [NATIVE-INPUTS.md](https://github.com/DenisSkulovic/offscreen-rpg/blob/bb701033215718daedd344a62af52fb1eb05f8ae/work/changes/open/observability-infrastructure-visibility/NATIVE-INPUTS.md?utm_source=chatgpt.com#L582-L586).

The corrected expression requires both the number of current rate-producing series and the number of distinct node identities to equal two.

| Fixture                                  | Required panel result   |
| ---------------------------------------- | ----------------------- |
| Two distinct nodes with valid rates      | Display total CPU cores |
| Two nodes, one insufficient rate history | Unknown                 |
| One node only                            | Unknown                 |
| Duplicate node identity                  | Unknown                 |
| Two valid zero CPU rates                 | Measured zero           |

The correction is not yet realized in the joined inventory fragment. That is expected: 07 T01 explicitly owns this narrow reconciliation.

There is no conflicting 03 writer, and no need to reopen 03.

## **6. Findings**

### **E2-IR-H03: component overview lacks a realizable inventory identity mapping**



HIGH

&#x20;Affects OBS-E2-07 T01 only, with downstream 08/13 implications.



**Evidence**

The selected TARGET requires each fixed component overview row to distinguish inventory presence, readiness, expected and observed scrape state, freshness and coverage limitations.

However, `NATIVE-SERVICE-CANDIDATE.json` and the existing coverage fragments predominantly express component identities using Kubernetes resource selectors such as:

| Component  | Frozen selector form                            |
| ---------- | ----------------------------------------------- |
| PostgreSQL | `cnpg.io/cluster`, application label            |
| Temporal   | Application instance, name and component labels |
| Loki       | Application instance and component labels       |
| Redis      | Application name and instance labels            |
| Prometheus | Service name                                    |
| Collector  | Service name                                    |

The joined KSM configuration deliberately does not export arbitrary Kubernetes object labels. It also does not collect Services.

Consequently, these selectors cannot directly serve as PromQL inventory selectors.

The dashboard task requires real KSM joins, but it does not freeze the translation from these component identities into observable KSM workload identities and the required per-component presence/readiness expressions.

**Frozen component selector**

Application labels or Service identity

Missing explicit mapping

Component → observable workload identity → inventory predicate

**Available KSM series**

Namespaces, workload names, Pod owners, replica counts, phases and readiness

The existing [`expected-inventory.json`](https://github.com/DenisSkulovic/offscreen-rpg/blob/bb701033215718daedd344a62af52fb1eb05f8ae/infra/platform/observability/expected-inventory.json?utm_source=chatgpt.com) demonstrates that exact workload identities are available for the observability components. The remaining identities can be established through the existing platform source and recorded evidence.

**Material consequence**

An executor could correctly construct all frozen metric panels and still produce an incorrect required overview, for example:

- Reporting Loki present because Grafana exists in the same namespace.
- Treating a missing Service-derived KSM series as component absence.
- Treating missing Pod data as evidence that a workload is parked.
- Reporting a healthy scrape as healthy workload readiness.

This is a missing mapping for a selected functional requirement, not a request to expand E2.

**Required correction**

The planner should freeze a compact overview-specific mapping in the existing native input contract:

1. Each fixed component's observable namespace, workload kind/name or exact Pod-owner identity.
2. Namespace-level observation semantics for explicitly inventory-only components.
3. Exact component presence, readiness and parked predicates using admitted KSM families.
4. Unknown/absence handling under unavailable or degraded inventory collection.
5. The overview table's panel identity and query construction contract, with corresponding focused negatives.

Update 07 T01's reading route and 08's equality expectations accordingly.

Do not add KSM label collectors, Service discovery, new exporters, RBAC permissions or another coverage architecture.

This is a bounded source-only correction. No additional native experiments are necessary.

### **E2-IR-M05: predecessor collection-validator adaptations should be explicit**



MEDIUM

&#x20;OBS-E2-04



The existing collection validators assume predecessor job counts, node-only Prometheus RBAC and coverage rows with nonempty selectors/jobs. T04 correctly owns the necessary changes, but its reading route could identify the specific validator functions more directly.

The intended behavior is already sufficiently determined. This does not block construction.

**Disposition:** absorb into normal T04 implementation. Preserve the exact combined validation contract in `infra/platform/observability/tests/e2-collection.test.mjs`.

### **E2-IR-M06: cross-dashboard inventory panel reading route**



MEDIUM

&#x20;OBS-E2-07



T02 constructs storage and observability dashboards that also contain existing inventory panels, including storage panels 601–604 and KSM health panels 801–803.

Its reading route emphasizes service candidate arrays and Redis. The requirement to preserve all existing frozen panels is established elsewhere, particularly T03 and NATIVE-INPUTS.

**Disposition:** retain those inventory mappings during construction. The durable owner is the corresponding dashboard JSON and `e2-dashboards.test.mjs`.

This is not an independent blocking issue.

## **7. Parallel write ownership**

PASS

The two Changes are properly isolated for parallel construction once H03 is resolved.

| Owned path, relative to observability root | 04 | 07 |
| ------------------------------------------ | -- | -- |
| `values/profiles/dev/prometheus.yaml`      |    |    |
| `tests/e2-collection.test.mjs`             |    |    |
| `coverage/native-services.json`            |    |    |
| `coverage/seaweedfs.json`                  |    |    |
| `values/profiles/dev/grafana.yaml`         |    |    |
| Eight dashboard JSON files                 |    |    |
| `tests/e2-dashboards.test.mjs`             |    |    |
| `coverage/inventory.json`, panel 104 only  |    |    |
| `artifacts.mjs`                            |    |    |
| `expected-inventory.json`                  |    |    |

Both Changes consume the immutable planner declarations. 07 does not need to wait for 04 to materialize the coverage files.

04's tests and 07's narrow M03 edit touch a shared logical contract but not the same source file. The inspected kubelet coverage validator also accommodates the corrected panel 104 expression.

Shared register and archive reconciliation remains serialized under the existing join lock.

## **8. Eligible dispatch and critical path**

| Wave                             | Change         | Eligibility                                   |
| -------------------------------- | -------------- | --------------------------------------------- |
| Now                              | OBS-E2-04      | Ready for owner commission                    |
| Concurrent planner work          | H03 correction | Source-only planning                          |
| After targeted correction review | OBS-E2-07      | Independent of 04 completion                  |
| After both source joins          | OBS-E2-08      | Dependency-gated; separate readiness boundary |

04's first commissioned implementation action is its branch guard followed by T01, using a dedicated linked worktree from the verified Design integration branch.

07 requires no further comprehensive review. Re-review H03 and its affected task, equality and proof contracts only.

## **9. Construction and qualification boundaries**

| Proof                                          | Owner                | Current status       |
| ---------------------------------------------- | -------------------- | -------------------- |
| Exact native enrollment and rejection fixtures | 04                   | Pending construction |
| Dashboard JSON and frozen query equality       | 07                   | Pending construction |
| Grafana provider, mount and home render        | 08                   | Pending              |
| Exact rendered RBAC and artifacts              | 08                   | Pending              |
| Pinned promtool configuration check            | 13 joint source gate | NOT RUN              |
| Native query correctness and label containment | 13                   | NOT RUN              |
| Operator dashboard walkthrough                 | 13                   | NOT RUN              |
| Occupied observability E2 transition           | 13                   | NOT RUN              |

No additional native gate should be inserted ahead of 04 or the corrected 07.

08 must consume the exact frozen coverage contract and reject drift, rather than regenerate an expected artifact around whatever source happens to render. The existing downstream ownership is sufficient for that purpose.

## **10. Required G0–G7 review receipt**

| Dimension                              | 04   | 07        |
| -------------------------------------- | ---- | --------- |
| G0: Repository and authority           | PASS | PASS      |
| G1: Actual source and test truth       | PASS | PASS      |
| G2: Frozen decisions and compatibility | PASS | FAIL: H03 |
| G3: Bounded task simulation            | PASS | FAIL: T01 |
| G4: Parent dispatch                    | PASS | FAIL: H03 |
| G5: Dependency and concurrency         | PASS | PASS      |
| G6: Assigned proof boundary            | PASS | PASS      |
| G7: Execution cost and closure         | PASS | PASS      |

Both packets have one coherent outcome. Their four-task and three-task structures are proportionate. No subdivision or additional committee is justified.

## **11. Final disposition**

**Architecture**

DEFENDED preserved

**OBS-E2-04**

READY

**OBS-E2-07**

PLANNER-BLOCKED

**Parallel ownership**

VERIFIED

**G1–G4 selected native evidence**

Sufficient

**G5 qualification**

NOT RUN

**Exact reviewed SHA:** `bb701033215718daedd344a62af52fb1eb05f8ae`.

**Evidence limitations:** This was a remote, read-only repository inspection with programmatic coverage-contract comparisons and static query analysis. I reused the recorded pinned-chart specimen evidence rather than independently extracting and rendering the vendored charts. Local worktree cleanliness and uncommitted changes cannot be verified remotely. No tests, cluster operations, implementation or repository mutations were performed.

**Reviewer judgment:** H03 is classified High because it affects a mandatory overview function and would otherwise delegate its unresolved identity and status mapping to the implementation agent. The accepted bounded service metric coverage itself is not challenged.

**Persistence:** Analysis completed. Verdict delivered. Repository persistence, owner ratification and implementation commission remain separate.

Recommended receipt destination:

`work/changes/open/observability-infrastructure-visibility/READINESS-REVIEW-04.md`

**Release 04 for construction. Correct H03 concurrently, then release 07 after its narrow re-review. Preserve the remaining development momentum without another architecture review or native investigation campaign.**
