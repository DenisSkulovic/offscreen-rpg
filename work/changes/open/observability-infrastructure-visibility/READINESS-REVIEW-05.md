# **Observability E2 | Targeted readiness re-review 05**

**Scope:** OBS-E2-07, correction of E2-IR-H03 only.\
**Repository:** [DenisSkulovic/offscreen-rpg](https://github.com/DenisSkulovic/offscreen-rpg?utm_source=chatgpt.com)\
**Review mode:** Independent, impact-based, read-only.

## **1. Candidate verification**

**Implementation branch**

Verified

implementation/observability-infrastructure-visibility

[9f66069243cdaa0a19c2bb75a1d8c9eb5a9dc22d](https://github.com/DenisSkulovic/offscreen-rpg/commit/9f66069243cdaa0a19c2bb75a1d8c9eb5a9dc22d?utm_source=chatgpt.com)

**Main**

Verified

[c8dab5c47f5a8d638122c9321230f6bb4bfd0ac6](https://github.com/DenisSkulovic/offscreen-rpg/commit/c8dab5c47f5a8d638122c9321230f6bb4bfd0ac6?utm_source=chatgpt.com)

**Previous review candidate**

Ancestor confirmed

[bb701033215718daedd344a62af52fb1eb05f8ae](https://github.com/DenisSkulovic/offscreen-rpg/commit/bb701033215718daedd344a62af52fb1eb05f8ae?utm_source=chatgpt.com)

The implementation branch is at the exact requested revision and is nine commits ahead of the previous review candidate, with no divergent commits.

The comparison confirms that OBS-E2-04 has been implemented, archived and joined. The recorded collection tests remain predecessor evidence, not tests rerun during this review.

The applicable repository policy requires an impact-based correction review, reuse of unaffected conclusions, and blocking only for unresolved Critical or High findings. No additional architecture defense or native investigation is required.

## **2. Final readiness verdict**

## **OBS-E2-07**

PLANNER-BLOCKED

**H03 is substantially corrected, but not fully closed.**

The workload identity mapping and dashboard realization contract are now sufficiently determined. One localized defect remains in the discovered-Pod scrape confidence predicates for PostgreSQL and Temporal.

Critical

# **0**

High

# **1**

New Medium

# **0**

New Low

# **0**

This is a residual part of **H03**, not a new architectural finding. It requires a narrow correction of two frozen PromQL targets.

## **3. Programmatic contract inspection**

I parsed [OVERVIEW-CONTRACT.json](https://github.com/DenisSkulovic/offscreen-rpg/blob/9f66069243cdaa0a19c2bb75a1d8c9eb5a9dc22d/work/changes/open/observability-infrastructure-visibility/OVERVIEW-CONTRACT.json?utm_source=chatgpt.com), extracted its selectors, status branches, aggregation keys and vector-matching operators, and compared them against the joined coverage fragments and Prometheus overlay.

Unique components

# **20/20**

Unique query refs

# **20/20**

Table columns

# **9**

PromQL characters

# **389,236**

Largest expression

# **99,918**

Temporal

Generic zero fallbacks

# **0**

All expressions have balanced parentheses. All referenced KSM metric families are admitted by the actual joined collection configuration. These are structural checks, not Prometheus parser or execution results.

### **Observable workload identities**

Deployment-based components

8

StatefulSet-based components

3

Fixed node-set components

2

Direct Pod-owner component

1

Namespace-only components

5

Not applicable

1

| Component                       | Frozen observable identity           | Result |
| ------------------------------- | ------------------------------------ | ------ |
| KSM and KSM self                | `obs-kube-state-metrics`             | Pass   |
| Kubelet resource and cAdvisor   | Two exact dev nodes                  | Pass   |
| PostgreSQL                      | Controller owner `Cluster/dev-pg`    | Pass   |
| Temporal                        | Four exact role Deployments          | Pass   |
| RabbitMQ                        | StatefulSet `rabbitmq-server`        | Pass   |
| Redis                           | Deployment `redis`                   | Pass   |
| SeaweedFS                       | Deployment `object-store`            | Pass   |
| Loki and Tempo                  | `obs-loki`, `obs-tempo` StatefulSets | Pass   |
| Grafana, Prometheus, Collector  | Three exact Deployments              | Pass   |
| Five optional system components | Exact namespaces only                | Pass   |
| Traefik                         | Not applicable to dev                | Pass   |

The correction successfully removes the original reliance on unavailable Service identities and arbitrary Kubernetes application labels.

The source anchors inspected include the [expected observability inventory](https://github.com/DenisSkulovic/offscreen-rpg/blob/9f66069243cdaa0a19c2bb75a1d8c9eb5a9dc22d/infra/platform/observability/expected-inventory.json?utm_source=chatgpt.com), Redis and SeaweedFS Deployment templates, Temporal `observeDeployment`, RabbitMQ readiness fixtures and PostgreSQL `ownerMatches`.

The component identity set, job assignments and coverage classifications match the combined joined coverage declarations. The KSM inventory row intentionally distinguishes its cluster-wide collection scope from its own namespaced Deployment identity.

## **4. Predicate verification**

| Required behavior                                    | Assessment                |
| ---------------------------------------------------- | ------------------------- |
| Exact namespace and workload selection               | PASS                      |
| Fresh KSM inventory and self-scrapes                 | PASS                      |
| Resource-specific list/watch confidence              | PASS                      |
| Recent collection error detection                    | PASS                      |
| Global family evidence before inventory absence      | PASS                      |
| Stale matching identity suppression for inventory    | PASS                      |
| Existing zero-desired workload means parked          | PASS                      |
| Missing readiness data means unknown                 | PASS                      |
| Partial Temporal Deployment presence                 | PASS                      |
| UID-aware CNPG Pod readiness                         | PASS                      |
| Scrape failure distinguished from workload readiness | PASS                      |
| Two-direction discovered Pod-set comparison          | PASS                      |
| Confidence of the compared Pod sets                  | FAIL                      |
| Explicit unknown and unsupported states              | PASS, except residual H03 |
| Table realization and downstream equality            | PASS                      |

The inventory predicates are materially stronger than the original packet. They distinguish positive observations, observed absence, incomplete identities and unavailable evidence without claiming strong consistency from KSM.

## **5. Residual H03 finding**

**E2-IR-H03: discovered Pod-set comparison bypasses inventory confidence**

HIGH

**Affected:** `OVERVIEW-CONTRACT.json`, PostgreSQL target `E` and Temporal target `F`.

### **Evidence**

The PostgreSQL inventory expression correctly requires:

- Fresh KSM scrape and self-scrape.
- Positive current Pod list/watch evidence.
- No known recent collection degradation.
- Positive evidence that the Pod-owner metric family is available.
- No stale matching CNPG owner identity.

However, its scrape-state expression uses the list/watch confidence predicates and fresh selected owner samples **without the last two inventory safeguards**.

The Temporal scrape-state expression has the equivalent omission for its Pod-to-ReplicaSet-to-Deployment ownership chain.

Programmatic extraction confirms:

| Guard in the scrape-state expression | PostgreSQL | Temporal         |
| ------------------------------------ | ---------- | ---------------- |
| Pod list/watch confidence            | Present    | Present          |
| ReplicaSet list/watch confidence     | N/A        | Present          |
| Two-direction Pod-set difference     | Present    | Present          |
| Duplicate target refusal             | Present    | Present per role |
| Global owner-family availability     | Missing    | Missing          |
| Stale matching owner suppression     | Missing    | Missing          |

### **Concrete counterexample**

### **PostgreSQL: partially stale inventory**

**KSM Pod-owner observations**

dev-pg-1

Fresh

dev-pg-2

120s old

**Prometheus targets**

dev-pg-1

Up

dev-pg-2

Missing

Freshness filter removes dev-pg-2 from the expected set

Result under frozen expression, by static derivation

Inventory

**Unknown**

Scrape state

Current up; observed Pod set matches

Required result

Inventory

**Unknown**

Scrape state

**Observed up; Pod coverage unknown**

Assuming the remaining list/watch predicates pass, the stale owner is excluded before set comparison. Both remaining sets contain `dev-pg-1`, so the expression can report a match despite known incomplete inventory.

A related case occurs when the required ownership metric family is entirely unavailable: the scrape expression can report a coverage mismatch rather than unknown inventory confidence.

This contradicts the frozen [NATIVE-INPUTS H03 contract](https://github.com/DenisSkulovic/offscreen-rpg/blob/9f66069243cdaa0a19c2bb75a1d8c9eb5a9dc22d/work/changes/open/observability-infrastructure-visibility/NATIVE-INPUTS.md?utm_source=chatgpt.com#h03-correction--exact-overview-identity-and-status-contract), which requires unknown inventory to qualify successful scrapes rather than imply complete coverage.

### **Required correction**

Regenerate only targets `E` and `F`:

1. Include the relevant global ownership-family availability predicates in the discovered-Pod comparison confidence gate.
2. Suppress both the match and mismatch classifications when a relevant ownership sample is known stale. For Temporal, cover both sides of the Pod-to-ReplicaSet ownership chain.
3. Preserve `Current target down` precedence and the existing explicit `Observed up; Pod coverage unknown` fallback.
4. Add the stale-owner partial-set counterexample and unavailable owner-family case to the existing assigned synthetic fixtures.

Do not introduce new metrics, permissions, Pod UID scrape labels, discovery mechanisms or recording-rule infrastructure.

**Severity justification:** the generated contract can produce a positive completeness indication under known inventory uncertainty. Because 07 must copy the expressions exactly, its executor cannot correct this without violating the frozen contract.

## **6. Table realization and proof ownership**

### **Planner-owned overview contract**

Panel 108 · 20 exact targets · 9 fields · 3 transformations

**OBS-E2-07**

Copy frozen targets and transformations. Validate exact JSON equality.

**OBS-E2-08**

Compare independent frozen inputs with canonical JSON and rendered ConfigMap.

**OBS-E2-13**

Execute pinned PromQL fixtures, then verify actual Grafana output and native evidence.

**PASS.** The table mechanism and division of proof responsibilities are sufficiently determined.

The singleton `vector(1)` serves as a labelled row anchor, not a fabricated metric or healthy zero. The ordered filter, merge and organize transformations preserve the component identity and remove the synthetic value and time fields.

The expression size is substantial but does not independently block construction. The contract already assigns ConfigMap size verification to 08 and actual POST query transport and Grafana presentation verification to 13. Preserve these obligations.

Relevant task contracts:

- [07 TASKS.md](https://github.com/DenisSkulovic/offscreen-rpg/blob/9f66069243cdaa0a19c2bb75a1d8c9eb5a9dc22d/work/changes/open/observability-infrastructure-visibility/2026-11-28--obs-e2-07-grafana-dashboards/TASKS.md?utm_source=chatgpt.com)
- [08 TASKS.md](https://github.com/DenisSkulovic/offscreen-rpg/blob/9f66069243cdaa0a19c2bb75a1d8c9eb5a9dc22d/work/changes/open/observability-infrastructure-visibility/2026-11-28--obs-e2-08-exact-e2-artifacts/TASKS.md?utm_source=chatgpt.com)
- [13 TASKS.md](https://github.com/DenisSkulovic/offscreen-rpg/blob/9f66069243cdaa0a19c2bb75a1d8c9eb5a9dc22d/work/changes/open/observability-infrastructure-visibility/2026-11-28--obs-e2-13-joint-qualification/TASKS.md?utm_source=chatgpt.com)

## **7. Preserved findings and readiness gates**

| Previous finding | Disposition                                                                        |
| ---------------- | ---------------------------------------------------------------------------------- |
| M03              | Preserved. Narrow panel 104 correction remains assigned to 07 T01.                 |
| M05              | Reuse accepted disposition and archived 04 construction receipt. Do not reopen 04. |
| M06              | Explicit inventory panel reading route now present in 07 T02 and T03. Nonblocking. |

| Review gate                        | Result                              |
| ---------------------------------- | ----------------------------------- |
| G0 Repository and authority        | PASS                                |
| G1 Source truth                    | PASS                                |
| G2 Decisions and semantic contract | FAIL: residual H03                  |
| G3 Bounded task context            | PASS, pending corrected expressions |
| G4 Parent dispatch                 | Blocked by H03                      |
| G5 Dependencies and concurrency    | PASS                                |
| G6 Assigned proof ownership        | PASS                                |
| G7 Execution cost and closure      | PASS                                |

Unaffected conclusions are inherited from review 04 rather than comprehensively re-investigated.

## **8. Release disposition**

**01–06 and PG01**

Joined. Preserve existing receipts.

**07**

Correct only PostgreSQL and Temporal scrape confidence.

**08–12**

Existing dependency schedule unchanged.

**13 / joint G5**

Final qualification remains assigned and NOT RUN.

## **9. Evidence limits and receipt**

The PromQL inspection was programmatic and structural, with static evaluation of the identified counterexample. Pinned `promtool`, Helm rendering and Grafana runtime verification were not executed.

The RabbitMQ workload name was confirmed through its readiness fixture; the direct profile path attempted during inspection returned 404. Local worktree cleanliness cannot be established through remote GitHub inspection.

No repository mutation, implementation, live operation or additional native experiment was performed.

**Recommended receipt destination:**

`work/changes/open/observability-infrastructure-visibility/READINESS-REVIEW-05.md`

**Final verdict bound to&#x20;**`9f66069243cdaa0a19c2bb75a1d8c9eb5a9dc22d`**: PLANNER-BLOCKED.**

The identity-mapping portion of H03 is resolved. The remaining correction should be surgical: regenerate the two affected targets with the already-selected inventory confidence safeguards, verify those changed predicates, and release 07. No further comprehensive readiness review is warranted.
