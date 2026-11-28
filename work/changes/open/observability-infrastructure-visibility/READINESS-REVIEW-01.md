# **Independent implementation-readiness review | Observability E2**

**Repository:** [DenisSkulovic/offscreen-rpg](https://github.com/DenisSkulovic/offscreen-rpg?utm_source=chatgpt.com)\
**Branch:** `main`\
**Verified candidate:** [`9b113bd8e877a6c957750b9ece606223dd15e5a6`](https://github.com/DenisSkulovic/offscreen-rpg/commit/9b113bd8e877a6c957750b9ece606223dd15e5a6?utm_source=chatgpt.com)\
**Review date:** 28 November 2026\
**Authority:** Read-only independent review

The current HEAD includes the latest PostgreSQL monitoring-access contract corrections.

The persisted architecture committee pass 02 establishes that E2-AR-H01 is closed and the E2 architecture is **DEFENDED**. I carry that verdict forward rather than reopening the architecture review.

The acceptance boundary here is construction readiness of OBS-E2-01, OBS-E2-02, OBS-E2-05 and OBS-E2-PG01, including their individual prerequisites and safeguards. Outstanding qualification of unrelated E2 capabilities is not a blocker for these Changes.

## **1. Consolidated verdict**

Ready

# **3/4**

Critical findings

# **0**

High findings

# **2**

Three Changes can be commissioned now. PG01 requires a targeted packet correction.

**OBS-E2-01**

Historical artifacts

READY

**OBS-E2-02**

KSM foundation

READY · after 01

**OBS-E2-05**

Redis exporter

READY · after 02

**OBS-E2-PG01**

PostgreSQL monitoring access

PLANNER-BLOCKED

**Do not hold OBS-E2-01, 02 or 05 while correcting PG01.** Their source ownership, construction inputs and assigned proof boundaries are independent of the PostgreSQL correction.

PG01's selected least-privilege architecture is sound. The remaining problems concern enforcing that contract against the actual tenant catalog representation and providing an unambiguous, authorized route to its occupied native qualification.

## **2. Repository and baseline verification**

| Item                                          | Result                                  |
| --------------------------------------------- | --------------------------------------- |
| Current remote main                           | Verified                                |
| Original E2 planning baseline                 | `1fa759b`                               |
| PG01 planning baseline                        | `497176b`                               |
| Current candidate                             | `9b113bd`                               |
| Source drift since original planning baseline | None affecting implementation source    |
| Architecture authority                        | Defended and owner-accepted progression |
| Implementation commission                     | Not granted by this review              |
| Live-operation authority                      | Not granted                             |

Git comparison confirms that the current candidate is six commits ahead of the original E2 packet baseline and one commit ahead of the PG01 baseline. The intervening changes are documentation, design and packet changes, not implementation-source changes.

The review applies the current [AGENTS.md](https://github.com/DenisSkulovic/offscreen-rpg/blob/9b113bd8e877a6c957750b9ece606223dd15e5a6/AGENTS.md?utm_source=chatgpt.com), client instructions, workflow, planner investigation and [packet-readiness review standard](https://github.com/DenisSkulovic/offscreen-rpg/blob/9b113bd8e877a6c957750b9ece606223dd15e5a6/.agents/references/packet-readiness-review.md?utm_source=chatgpt.com).

## **3. OBS-E2-01 | Historical artifacts**

READY

Independent initial dispatch · 2 tasks

The packet correctly separates naming and freezing historical artifact identities from activating E2.

### **Actual source verification**

| Source anchor           | Verified relationship                                              |
| ----------------------- | ------------------------------------------------------------------ |
| `artifacts.mjs:509`     | Existing variant admission accepts desired/predecessor             |
| `artifacts.mjs:526`     | Collector overlay selection controls historical difference         |
| `artifacts.mjs:678`     | Final bundle construction provides the artifact ID insertion point |
| `artifacts.mjs:715`     | Single-artifact resolver                                           |
| `artifacts.mjs:767`     | Separate historical variant resolver                               |
| `readiness.mjs:398,467` | Existing storage and revision verification consumers               |
| `tests/render.test.mjs` | Existing historical render and negative fixtures                   |

[Inspected artifact source](https://github.com/DenisSkulovic/offscreen-rpg/blob/9b113bd8e877a6c957750b9ece606223dd15e5a6/infra/platform/observability/artifacts.mjs?utm_source=chatgpt.com)

The critical detail is that `loadObservabilityVariants()` constructs its bundles separately from `loadArtifacts()`. The packet identifies both paths and requires the same artifact identity contract on both. Merely changing the single-artifact resolver would have been insufficient.

The seven final history rows and intermediate E2 histories are settled by the defended integration contract. The executor does not need to invent revision semantics.

Task execution simulation

**T01 — Named historical bundles**

Preserve historical aliases, default behavior, exact E1 manifests, and release isolation. Reject unavailable E2 and cross-profile variants.

**T02 — Pure history table**

Introduce immutable final and intermediate history rows without modifying operational inventory admission.

**Assigned construction proof:** Existing render tests, new history-table fixtures, unchanged parsed E1 manifests and negative variant selection.

**Downstream proof:** 08/09 consume the frozen identities; 13 owns joint qualification.

No blocking findings. No native gate prevents implementation.

## **4. OBS-E2-02 | Kubernetes inventory foundation**

READY

Dependency-gated on 01 · 2 tasks

The packet provides enough frozen native inputs to implement the selected KSM foundation without sending the coding agent back into Kubernetes or upstream research.

### **Native specimen evidence**

Selected KSM version

# **2.20.0**

Bundled chart

# **9.1.0**

Inventory samples observed

# **2,460**

Self-metric samples observed

# **75**

Recorded owner specimen results, not tests rerun by this committee.

Pinned image and runtime identity

Ten selected collectors and scoped permissions

Inventory and self-metrics endpoints

Conditional list/Job evidence and degradation recovery remain G5

The immutable KSM digest is frozen in [NATIVE-INPUTS.md](https://github.com/DenisSkulovic/offscreen-rpg/blob/9b113bd8e877a6c957750b9ece606223dd15e5a6/work/changes/open/observability-infrastructure-visibility/NATIVE-INPUTS.md?utm_source=chatgpt.com#G1-ksm-construction-freeze-2026-11-28).

### **Permission boundary**

The existing `values/prometheus.yaml` explicitly disables KSM, parent RBAC, node exporter and broad Kubernetes discovery jobs. OBS-E2-02 adds a separate dev overlay and helper lock, leaving these historical base inputs intact.

The frozen family/label table prevents arbitrary object metadata, IP addresses, image identifiers and annotation-derived labels from entering the selected metric store.

### **Task execution simulation**

| Task                                                  | Determination           |
| ----------------------------------------------------- | ----------------------- |
| T01: KSM overlay and helper pin                       | Sufficiently determined |
| T02: Scrape configuration and coverage declarations   | Sufficiently determined |
| Shared file ownership                                 | Explicitly serialized   |
| Focused construction proof                            | Assigned                |
| Exact render, effective RBAC and native qualification | Assigned downstream     |

The conditional `kube_state_metrics_list_total` family is correctly distinguished from observed families. Allowing that family in the configuration is not a claim that it was emitted.

**No blocking findings.** Do not require another KSM specimen before source construction.

## **5. OBS-E2-05 | Redis exporter**

READY

Dependency-gated on 02 · 2 tasks

The replacement Redis specimen resolves the earlier privacy concern associated with exporter v1.93.0.

Rejected candidate

# **v1.93.0**

Rejected

Slowlog collection could not be disabled with the required flag.

Selected candidate

# **v1.97.0**

Specimen passed

Slowlog and commandlog exclusions verified.

Backend availability

## **redis_up = 1**

Alternate scrape endpoint

## **HTTP 404**

Observed Redis command deltas during the replacement specimen

INFO

2

CLIENT SETNAME

1

LATENCY HISTOGRAM

1

LATENCY LATEST

1

Observed data writes

0

The frozen image is:

`docker.io/oliver006/redis_exporter@sha256:d16780dcfefc6e42f48682ecc5fbd6dd3207938b1ee88f766b838436a4e27e6e`

The actual Redis Service template confirms the internal Service name and port 6379. The packet selects a fixed service address, separate exporter Deployment and internal port 9121. It does not change Redis itself.

The packet also preserves the important distinction between:

- Exporter HTTP scrape success.
- Actual Redis backend availability.
- Freshness and presence of domain metrics.

The unauthenticated local Redis service is explicitly acknowledged as a trusted-local limitation. The observed command behavior is not misrepresented as server-enforced read-only authorization.

**Construction proof:** Fixed arguments, immutable image pin, selected metric allowlist, no API token, no arbitrary scrape destination, and backend-unhealthy negative.

**Downstream proof:** Actual owned Redis backend, exact render and dashboard semantics remain with 08/13.

No blocking findings.

## **6. OBS-E2-PG01 | PostgreSQL monitoring access**

PLANNER-BLOCKED

Two localized High findings · 3 tasks

The proposed correction addresses a genuine native problem. CNPG's monitoring role exists, but PostgreSQL's existing isolation controls prevent it from connecting to the monitored databases.

### **Selected permission evolution**

| Database                   | Current exporter CONNECT | Selected change  |
| -------------------------- | ------------------------ | ---------------- |
| `postgres`                 | Denied                   | Explicit CONNECT |
| `dev`                      | Denied                   | Explicit CONNECT |
| `dev_1`                    | Denied                   | Explicit CONNECT |
| `temporal`                 | Denied                   | Explicit CONNECT |
| `temporal_visibility`      | Denied                   | Explicit CONNECT |
| Other unapproved databases | Not authorized           | Unchanged        |

I agree with the selected owner-side correction rather than weakening monitoring health checks, changing CNPG bootstrap identity or restoring PUBLIC connectivity.

However, adding a new cross-database monitoring principal requires more precise admission than the existing tenant adapter provides.

### **E2-IR-H01 | Incomplete tenant ACL and effective-role verification**

HIGH · PG01 T01/T02 · Blocks PG01

**Actual source evidence:**

| Source                               | Existing behavior                                                                   |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| `dev-sql-tenant-live-adapter.mjs:42` | `parseAcl()` reduces ACLs to PUBLIC flags and CONNECT role names                    |
| `dev-sql-tenant-live-adapter.mjs:60` | `catalogFromRows()` substitutes the database name for its OID                       |
| `dev-sql-tenant-live-adapter.mjs:94` | Role catalog records names with synthetic `login: true`                             |
| `dev-sql-tenant-executor.mjs:106`    | `aclsMatch()` checks required connectivity, not exact monitoring ACL semantics      |
| `dev-sql-tenant-reconciler.mjs`      | `canConnect()` checks direct connectivity, not effective role-membership privileges |

[Live adapter source](https://github.com/DenisSkulovic/offscreen-rpg/blob/9b113bd8e877a6c957750b9ece606223dd15e5a6/tools/dev-environments/src/adapters/dev-sql-tenant-live-adapter.mjs?utm_source=chatgpt.com) · [Executor source](https://github.com/DenisSkulovic/offscreen-rpg/blob/9b113bd8e877a6c957750b9ece606223dd15e5a6/tools/dev-environments/src/adapters/dev-sql-tenant-executor.mjs?utm_source=chatgpt.com)

The existing representation loses precisely the information required to distinguish an approved monitoring exception from an unsafe one.

| Monitoring ACL property                | Current catalog retains it? |
| -------------------------------------- | --------------------------- |
| Grantee name                           | Yes                         |
| CONNECT presence                       | Yes                         |
| Actual role OID                        | No                          |
| Grantor identity                       | No                          |
| Grant option                           | No                          |
| Additional privileges for the exporter | Not adequately              |
| Effective role membership              | No                          |

The packet correctly specifies exact ACL semantics for Temporal and the occupied transaction, but it does not adequately carry that precision into existing and freshly provisioned tenant admission.

Furthermore, the selected role-property predicate establishes direct role attributes and `pg_monitor` membership. It does not sufficiently establish that application principals cannot assume or inherit the newly cross-database monitoring identity.

**Consequence:** A tenant admission check could accept an invalid monitoring ACL or fail to detect an effective cross-database permission path.

**Required correction:**

- Specify a bounded catalog projection using actual database and role OIDs and `aclexplode()` for the monitoring ACL.
- Retain grantor, privilege type and grant-option information.
- Validate the monitoring exception on both existing and fresh tenant admission paths, preserving existing predecessor compatibility.
- Verify effective membership isolation from application and Temporal roles, including role assumption paths.
- Add discriminating fixtures for unexpected monitoring privileges, grant options, role membership and unsafe monitoring identities.

Do not redesign the entire tenant authorization system. This correction concerns the exact new permission exception and the existing guarantees affected by introducing it.

### **E2-IR-H02 | Occupied qualification source-admission contradiction**

HIGH · PG01 PROOF.md and group sequencing · Blocks PG01

PG01 establishes the following dependency:

**PG01 source construction and join**

Focused fixture gate

**Occupied PostgreSQL owner qualification**

Required before full CNPG metric contract

**04 native services**

**13 joint qualification**

**Final main integration**

This ordering is appropriate. However, PG01 `PROOF.md` also prohibits invocation on an intermediate branch.

Under a literal reading, the occupied correction cannot execute from the joined Design branch, while the Design cannot reach main without the resulting native evidence.

The existing prohibition against intermediate **observability activation** must not accidentally prohibit the separately authorized PostgreSQL owner operation required to establish native feasibility.

**Required correction:** Explicitly identify an eligible, exact, clean, source-qualified PG01 revision on the Design implementation branch as the permitted execution source for the separately authorized owner repair.

Preserve all of the following:

- Separate live permission and both maintenance authorization variables.
- Fixed development context.
- Maintenance quiescence and PostgreSQL custody.
- No ordinary observability ensure invocation.
- No activation of incomplete E2 observability.
- Exact tested-SHA receipt and unknown-outcome refusal.

This is a localized execution-authority correction, not a new architectural decision.

### **PG01 safeguards that pass review**

| Safeguard                                      | Assessment              |
| ---------------------------------------------- | ----------------------- |
| PostgreSQL remains the mutation owner          | Pass                    |
| Release excluded                               | Pass                    |
| Bootstrap identity preserved                   | Pass                    |
| Temporal role and database ownership preserved | Pass                    |
| Owner-only ACL predecessor remains admissible  | Pass                    |
| Explicit occupied database selection           | Pass                    |
| Database CR and tenant identity verification   | Pass                    |
| Maintenance custody and quiescence             | Pass                    |
| Single bounded SQL transaction                 | Pass                    |
| Pre-commit ACL delta verification              | Pass                    |
| Independent post-commit readback               | Pass                    |
| Unknown outcome stops without automatic retry  | Pass                    |
| Monitoring role and tenant ACL admission       | **Correction required** |
| Occupied qualification execution source        | **Correction required** |

The actual `createBaselineCustody()` implementation provides a suitable existing lock and bounded subprocess mechanism. There is no reason to introduce another lock system.

### **Assigned task disposition**

| Task                                      | Verdict                         |
| ----------------------------------------- | ------------------------------- |
| T01: Fresh and existing ACL admission     | Blocked by H01                  |
| T02: Explicit occupied maintenance        | Blocked by H01/H02              |
| T03: Focused checks and native obligation | Dependency-gated on corrections |

Both findings can be resolved within the current packet. **PG01 does not need to be split into additional Changes or returned to an architecture committee.**

## **7. Consolidated G0–G7 readiness matrix**

These are the repository's packet-review dimensions, distinct from the Design's native evidence gates.

| Review dimension                    | 01 | 02 | 05 | PG01 |
| ----------------------------------- | -- | -- | -- | ---- |
| **G0** Repository and authority     |    |    |    |      |
| **G1** Source truth                 |    |    |    |      |
| **G2** Decisions closed             |    |    |    |      |
| **G3** Bounded task context         |    |    |    |      |
| **G4** Parent dispatch              |    |    |    |      |
| **G5** Dependencies and concurrency |    |    |    |      |
| **G6** Assigned proof boundary      |    |    |    |      |
| **G7** Cost and closure             |    |    |    |      |

PassAffected by blocking finding

The failed PG01 dimensions are consequences of the same two High findings, not six separate defects.

### **Nonblocking findings**

| ID        | Severity | Finding and disposition                                                                                                                                                                                                                                                                                             |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E2-IR-M01 | Medium   | The Design's joint inventory predicate still references `kube_pod_info` and `kube_node_info`, while the frozen construction input deliberately excludes them. Reconcile the joint proof with admitted Pod phase/UID and node state/capacity families. Owner: OBS-E2-13 and native observability technical contract. |
| E2-IR-M02 | Medium   | Align the occupied SQL transaction's total subprocess deadline with its SQL-level timeouts. The custody runner's default 15-second timeout is shorter than the proposed 20-second per-statement timeout. Unknown-outcome refusal already protects safety. Owner: PostgreSQL maintenance implementation.             |

Neither finding blocks the three ready Changes. Preserve their dispositions in the appropriate permanent owners.

The original architecture findings E2-AR-M01–M04 also retain their existing downstream dispositions.

## **8. Exact eligible dispatch order**

Independent workstreams. No dependency from the KSM/Redis chain to PG01.

| Dispatch                     | Change      | Prerequisite                                                 |
| ---------------------------- | ----------- | ------------------------------------------------------------ |
| Immediately after commission | OBS-E2-01   | Verified Design branch and branch guard                      |
| Next                         | OBS-E2-02   | 01 joined and artifact contracts verified                    |
| Next                         | OBS-E2-05   | 02 joined and shared overlay ownership available             |
| Independent parallel lane    | OBS-E2-PG01 | Both High findings closed, targeted re-review and commission |

The three ready Changes can be commissioned as one batch. The coordinator can execute their dependency schedule without returning to the owner after every Change.

### **Branch and worktree guard**

The designated remote implementation branch was not returned by branch search. Upon commission, use the repository's existing lifecycle to establish or verify:

`implementation/observability-infrastructure-visibility`

Every constituent Change uses a dedicated linked worktree and its own Change branch.

For the first Change, the actual guard is:

```
node scripts/repo-tools/change-branch-guard.mjs \
  --change OBS-E2-01 \
  --target implementation/observability-infrastructure-visibility \
  --design observability-infrastructure-visibility
```

Substitute the respective Change ID for subsequent dispatches.

Archive each completed packet before its Change-level join when its assigned construction gate passes. Serialize joins and shared-register reconciliation. No constituent Change merges directly to main.

## **9. Final release disposition**

| Scope                          | Disposition                   |
| ------------------------------ | ----------------------------- |
| OBS-E2-01                      | **READY**                     |
| OBS-E2-02                      | **READY (dependency-gated)**  |
| OBS-E2-05                      | **READY (dependency-gated)**  |
| OBS-E2-PG01                    | **PLANNER-BLOCKED**           |
| Remaining E2 Changes           | Outside this readiness review |
| Full E2 operational acceptance | Pending                       |
| Live PostgreSQL repair         | Not authorized by this review |

**Evidence limitations:** I inspected the committed packets, relevant source functions, representative test anchors, repository instructions, Git comparisons and recorded native specimens through read-only GitHub access. The bundled Helm archive was not independently extracted, the native specimens were not rerun, and local uncommitted worktrees are not visible to this review. No executable tests or live operations were performed. No repository mutations were made.

Remote main was rechecked at the end of investigation and remains:

`9b113bd8e877a6c957750b9ece606223dd15e5a6`

**Final committee judgment:** Release 01, 02 and 05 for commissioned construction. Correct PG01's two localized findings concurrently. Re-review only those corrections, then release PG01 independently.

There is no engineering justification for another comprehensive E2 review or for holding the three ready Changes behind the remaining native evidence gates.
