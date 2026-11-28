# **Observability E2 | Independent readiness review 03**

**Scope:** OBS-E2-03 and OBS-E2-06, including their affected downstream contracts.

## **OBS-E2-03**

READY

Authenticated kubelet resource metrics and cluster-bound certificate trust.

## **OBS-E2-06**

READY

Guarded SeaweedFS metrics owner transition, source construction only.

Critical

# **0**

High

# **0**

Ready

# **2/2**

Live authority

# **None**

**Both Changes are suitable for source construction following owner ratification and commission.** They may execute in parallel. Neither needs to wait for the remaining unrelated native evidence gates.

06's G4b occupied transition remains a separately authorized operation after its source construction has been archived and joined. It is not a prerequisite for closing 06 itself.

## **1. Reviewed revision and authority**

| Field                 | Verified value                                           |
| --------------------- | -------------------------------------------------------- |
| Repository            | `DenisSkulovic/offscreen-rpg`                            |
| Review branch         | `main`                                                   |
| Candidate SHA         | `0660d98a19012c2974ecc4c70c5d77cbe88e8844`               |
| Design branch         | `implementation/observability-infrastructure-visibility` |
| Observed Design HEAD  | `2a0ab0992a09b20d1637c9e8d73a386aa63f1c32`               |
| Defended architecture | `0e731739c8a97e6e83896612acec40f89a26516f`               |
| Review mode           | Independent, focused, read-only                          |

[Reviewed main revision](https://github.com/DenisSkulovic/offscreen-rpg/commit/0660d98a19012c2974ecc4c70c5d77cbe88e8844?utm_source=chatgpt.com) · [Observed implementation revision](https://github.com/DenisSkulovic/offscreen-rpg/commit/2a0ab0992a09b20d1637c9e8d73a386aa63f1c32?utm_source=chatgpt.com)

Applied the current `AGENTS.md`, `CHATGPT.md`, planner investigation standard, independent packet-readiness standard, Change work-unit standard and progressive-resolution rules.

The Design branch confirms that 01, 02, 05 and PG01 source construction have already been archived and joined. I reuse those dispositions without reopening their reviews.

**Important dispatch prerequisite:** the Design branch still contains older planning text for 03/06. Synchronize the reviewed planning revision and readiness disposition onto that branch while preserving its completed archives and source changes. Do not dispatch from the stale packet versions.

## **2. OBS-E2-03 | Kubelet metrics**

**Verdict: READY.** The 02 construction dependency is satisfied on the observed Design branch.

The G2 refinement closes the previously unresolved trust-provisioning decision without introducing a new certificate authority, modifying Kind nodes or weakening TLS verification.

| Review dimension                   | Result                            |
| ---------------------------------- | --------------------------------- |
| Cluster-bound CA acquisition       | Pass                              |
| Certificate and DNS SAN validation | Pass                              |
| Immutable Helm trust binding       | Pass                              |
| Historical E1 compatibility        | Pass                              |
| Downstream artifact routing        | Pass                              |
| Resource metric selection          | Pass, with nonblocking refinement |
| Assigned construction proof        | Sufficient                        |

### **Trust acquisition and validation**

The selected trust mechanism is coherent with the existing `identity.mjs` boundary:

- Verified local Docker endpoint, frozen Kubernetes identity and exact Kind node ownership.
- Distinct Node UIDs and Docker container IDs, with matching network addresses.
- Public serving certificate matched against the node-local disk certificate.
- Explicit root CA, validity period, chain, server purpose and exact DNS SAN verification.
- Identity rechecks before and after acquisition, without accessing bearer credentials.

The binding appropriately excludes leaf fingerprints. Consequently, valid leaf renewal under unchanged roots does not manufacture a new Helm artifact identity.

### **Trust lifecycle**

Verified Kind identity

Public CA validation

Immutable E2 binding

Valid leaf renewal, same root

Continue

Different root or node identity

Refuse E2

Trust unavailable, exact E1 installed

Preserve E1 admission

Trust unavailable, E2 requested

Refuse activation

### **Exact artifact and operational routing**

I verified the existing historical artifact resolver on the Design branch and the affected interfaces specified in 08–12.

| Operation                             | Required resolution                                 |
| ------------------------------------- | --------------------------------------------------- |
| Historical E1 render/proof            | Exact historical descriptor, no E2 trust dependency |
| Release operation                     | Unchanged release E1                                |
| Fresh E2 installation                 | Independently validated cluster-bound descriptor    |
| Occupied E2 upgrade                   | Same immutable descriptor throughout custody        |
| E2 observation with unavailable trust | Refusal, not historical fallback                    |
| Root drift during mutation            | Stop and retain owned pending fence                 |

The proposed `desired:null` representation is particularly important. It prevents failure to obtain E2 trust from making an occupied E2 installation disappear from inventory or masquerade as E1.

08 owns the actual Helm argument construction and rendered inventory. 03 does not need to prematurely implement those interfaces.

### **Resource queries**

The selected `/metrics/resource` endpoint is a better canonical CPU and memory source than combining overlapping cAdvisor series.

| Metric                   | Authoritative source             |
| ------------------------ | -------------------------------- |
| Node CPU and memory      | `/metrics/resource`              |
| Pod CPU and memory       | `/metrics/resource`              |
| Container CPU and memory | `/metrics/resource`              |
| Allocatable resources    | KSM                              |
| Pod network              | Conditional cAdvisor collection  |
| Disk and throttling      | Unsupported in selected coverage |

The queries distinguish working-set memory from allocated memory, use CPU cores rather than misleading host utilization percentages, and gate aggregation on scrape freshness.

The network exclusion is correctly qualified. Observed family names and label keys do not establish unique sandbox attribution.

### **Task simulation**

| Task | Implementation determination                                   |
| ---- | -------------------------------------------------------------- |
| T01  | Bounded trust acquisition, identity and certificate validation |
| T02  | Exact jobs, RBAC, immutable ConfigMap and read-only mount      |
| T03  | Frozen coverage rows and focused positive/negative fixtures    |

All three tasks are executable without additional native investigation.

**Source references:** [03 task cards](https://github.com/DenisSkulovic/offscreen-rpg/blob/0660d98a19012c2974ecc4c70c5d77cbe88e8844/work/changes/open/observability-infrastructure-visibility/2026-11-28--obs-e2-03-kubelet-metrics/TASKS.md?utm_source=chatgpt.com), [G2 frozen contract](https://github.com/DenisSkulovic/offscreen-rpg/blob/0660d98a19012c2974ecc4c70c5d77cbe88e8844/work/changes/open/observability-infrastructure-visibility/NATIVE-INPUTS.md?utm_source=chatgpt.com#g2-construction-freeze-candidate--direct-https-and-cluster-bound-trust), [actual historical resolver](https://github.com/DenisSkulovic/offscreen-rpg/blob/2a0ab0992a09b20d1637c9e8d73a386aa63f1c32/infra/platform/observability/artifacts.mjs?utm_source=chatgpt.com).

## **3. OBS-E2-06 | SeaweedFS owner transition**

**Verdict: READY for construction. G4b remains NOT RUN.**

06 is now a coherent, independently useful object-storage Change rather than a circular dependency between service ownership, metrics enrollment and native qualification.

| Review dimension                 | Result |
| -------------------------------- | ------ |
| Exact chart variants and history | Pass   |
| Predecessor compatibility        | Pass   |
| Storage identity preservation    | Pass   |
| Private pending admission        | Pass   |
| Single-rollout authorization     | Pass   |
| Retained marker contract         | Pass   |
| Owner custody and quiescence     | Pass   |
| Construction/native split        | Pass   |

### **Exact history classification**

The packet correctly evolves `observeObjectStorageHistory`, whose current implementation admits native revision 1 only.

Admissible dev object-storage histories

**Existing predecessor**

dev-base-r1

R1 · Base

**Fresh metrics installation**

dev-metrics-r1

R1 · Metrics

**Occupied upgrade**

dev-metrics-r1-r2

R1 · Base

Superseded

R2 · Metrics

Deployed

Revision numbers alone never establish admission. Exact manifests, user values, Helm storage identities and live topology are required.

Preserving the old installed user values without `metricsEnabled`, while explicitly rendering the predecessor with that setting disabled, correctly distinguishes historical stored configuration from the current chart defaults.

Release remains outside the metrics evolution.

### **Object-storage preservation**

The proposed transition permits precisely the intended workload replacement while preserving the durable authority and data chain.

**Preserved**

Namespace and Deployment UID

Service UID and ClusterIP

Admin Secret UID and version

PVC, PV and claim reference

Host directory identity

Image and S3 port

Retained marker contents

Revision 1 Helm storage

**Permitted changes**

One Helm revision increment

One new ReplicaSet

One replacement Pod

Metrics process argument

Named metrics port 9327

Corresponding Service endpoint

The existing chart has one replica with `Recreate` strategy. The selected successor classification accounts for the retained scaled-zero ReplicaSet instead of weakening the current verifier to accept arbitrary historical controllers.

Requiring directory device/inode continuity in addition to PVC/PV identity is a valuable safeguard against accepting the correct Kubernetes objects while observing the wrong backing directory.

### **Pending-state and mutation authority**

The most consequential source constraint is real: `mutation-guard.mjs::identityAdoptAfterWrite` currently rejects replacement of a known Pod UID.

The packet correctly chooses a dedicated transition capability rather than relaxing this generic guard.

### **Selected occupied transition**

1. Acquire existing object-storage custody.
2. Verify quiescence, memory, exact predecessor, identities and existing marker.
3. Persist private, versioned, durable intent.
4. Dispatch exactly one fixed Helm upgrade.
5. Verify successor history, preserved storage, retained marker and metrics endpoint.
6. Clear only the exact owned pending record.

**Failure or uncertain outcome**

Retain the pending fence. No automatic retry, rollback, resume or further Helm mutation.

The private active capability, exact pending-record comparison and unchanged generic mutation guard form a sufficiently determined implementation boundary.

The packet also acknowledges the actual limitation of cooperative flock custody: it cannot exclude arbitrary external S3 clients. Operator quiescence is therefore required in addition to registry and Kubernetes workload checks.

### **Retained marker proof**

The marker contract is sufficiently bounded:

- A synthetic object, never an application document.
- Exact private descriptor and bounded object size.
- Identical byte count and SHA-256 before and after the rollout.
- Admin Secret identity verified around reads.
- Bounded loopback SDK access and awaited cleanup.
- No creation, deletion or overwrite authority inside the transition.

Marker preparation, if necessary, remains a separate G4b acceptance operation with its own authorization and durable intent. It is not an unfinished 06 construction task.

A successful repeat on an already upgraded target cannot reconstruct missing occupied-transition evidence. That distinction is explicitly preserved.

### **Task simulation**

| Task | Implementation determination                                    |
| ---- | --------------------------------------------------------------- |
| T01  | Exact variants, manifests and revision history                  |
| T02  | Structural successor verification and private pending admission |
| T03  | Dedicated single-write operation and focused fixtures           |

The tasks map to actual source ownership in `observe.mjs`, `install.mjs`, `mutation-guard.mjs`, `live-sdk.mjs` and the provider chart.

No unresolved architectural decision is delegated to the implementation worker.

**Source references:** [06 task cards](https://github.com/DenisSkulovic/offscreen-rpg/blob/0660d98a19012c2974ecc4c70c5d77cbe88e8844/work/changes/open/observability-infrastructure-visibility/2026-11-28--obs-e2-06-seaweedfs-owner-metrics/TASKS.md?utm_source=chatgpt.com), [G4a frozen contract](https://github.com/DenisSkulovic/offscreen-rpg/blob/0660d98a19012c2974ecc4c70c5d77cbe88e8844/work/changes/open/observability-infrastructure-visibility/NATIVE-INPUTS.md?utm_source=chatgpt.com#g4a-owner-transition-candidate--bounded-seaweedfs-metrics-enablement), [existing mutation guard](https://github.com/DenisSkulovic/offscreen-rpg/blob/0660d98a19012c2974ecc4c70c5d77cbe88e8844/infra/platform/object-storage/providers/seaweedfs/mutation-guard.mjs?utm_source=chatgpt.com), [canonical object-storage contract](https://github.com/DenisSkulovic/offscreen-rpg/blob/0660d98a19012c2974ecc4c70c5d77cbe88e8844/docs/technical/platform/object-storage-infrastructure.md?utm_source=chatgpt.com).

## **4. Findings and durable dispositions**

No Critical or High findings block either construction Change. Two nonblocking refinements are recorded.

| ID        | Severity | Finding                                                                                                                                                                                | Disposition                                                                                                                                                                                                |
| --------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E2-IR-M03 | Medium   | Cluster CPU totals gate current raw samples, but a fresh counter series can have insufficient samples for `rate()`, temporarily producing an incomplete aggregate.                     | Resource query owner in 07 and canonical observability contract. Refine the aggregate gate to require both rate-producing node series; synchronize frozen rows before 08.                                  |
| E2-IR-M04 | Medium   | G2 refers to existing narrow Pod discovery permissions. The actual joined overlay has the dedicated Prometheus SA, but not yet the final Pod discovery permissions or token automount. | 03 T02 must realize node permissions and token mounting under the already selected TARGET §2 contract; 04 adds its selected Pod discovery permissions. Preserve exact combined RBAC verification in 08/13. |

M04 is a source-baseline clarification, not permission to broaden RBAC. The defended TARGET already determines the intended permission split.

Neither finding requires another readiness cycle. Preserve both in the existing review receipt and reconcile them into their canonical technical owners.

## **5. Eligible dispatch order**

03 and 06 are independent source writers. Their joins serialize under the existing repository lock.

| Wave              | Scope                                  | Disposition                                                   |
| ----------------- | -------------------------------------- | ------------------------------------------------------------- |
| Preparation       | Synchronize reviewed planning revision | Required                                                      |
| 1A                | OBS-E2-03                              | Ready for commission                                          |
| 1B                | OBS-E2-06                              | Ready for parallel commission                                 |
| Native owner work | PG01 and G4b                           | Separately authorized, serialized                             |
| Later             | OBS-E2-04                              | Await positive owner receipts and frozen remaining G3/G4 rows |
| Later             | OBS-E2-07/08                           | Existing coverage and artifact dependencies                   |
| Final             | OBS-E2-13                              | Joint qualification                                           |

There is **no source dependency between 03 and 06**. Their exclusive write sets are distinct. Neither needs to wait for the other's construction or native qualification.

## **6. Final review disposition**

| Review dimension                | 03   | 06   |
| ------------------------------- | ---- | ---- |
| G0 Repository and authority     | Pass | Pass |
| G1 Source truth                 | Pass | Pass |
| G2 Decisions closed             | Pass | Pass |
| G3 Bounded child context        | Pass | Pass |
| G4 Parent dispatch              | Pass | Pass |
| G5 Dependencies and concurrency | Pass | Pass |
| G6 Assigned proof boundary      | Pass | Pass |
| G7 Execution and closure        | Pass | Pass |

**Limitations:** This was a remote, read-only source and packet review. No tests or live operations were executed. Vendored Helm archive template behavior was assessed from the recorded source investigation rather than independently extracting the binary archive. Actual local worktrees, uncommitted changes and native cluster state were not inspected.

The recorded G2 specimen retains its existing evidentiary standing. G4b and integrated G5 qualification remain outstanding. Previously accepted architecture and Change verdicts remain unchanged.

**Final release disposition: READY, 2/2 Changes.**

Bound to candidate `0660d98a19012c2974ecc4c70c5d77cbe88e8844`.

Recommend owner acceptance of the G2 and G4a refinements, synchronization of the reviewed packets onto the Design branch, and immediate parallel commission of OBS-E2-03 and OBS-E2-06 for source construction.

No further planning or committee cycle is required for these two Changes.
