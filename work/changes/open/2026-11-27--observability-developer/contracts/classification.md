# T05 | Inventory, classification and receipts

[Execution cards](../TASKS.md) · [Proof and deadlines](../PROOF.md)

T05.1 owns inventory; T05.2 owns readiness and fixtures; T05.3 owns installer and receipts; T05.4 owns external callers and the join. Keep intermediate states source-only.

## T05.1 Inventory

### Input and output

Use the verified T01 descriptors (`chartName`, `chartVersion`, `appVersion`) and T02 desired/predecessor renders. Read pin values from the descriptors, not duplicate version constants. Expected Helm chart string is chartName + '-' + chartVersion; appVersion matches literally, including any leading v. Only dev loads predecessor artifacts.

Retain existing snapshot fields and add:

| Field | Shape |
| --- | --- |
| helmReleases | Rows {name,namespace,revision,status,chart,appVersion} |
| helmHistory[name] | Sorted rows {revision,status,chart,appVersion} |
| helmManifests[name] | {revision,documents,previousDocuments?}; previousDocuments only for Collector rev2 |

Use the shared argv builders in [partial-install.md](partial-install.md) with frozen kubeconfig/context. List once; read history and current manifest for each known listed release, plus Collector rev1 manifest when latest is rev2. Do not fetch unknown release histories/manifests or enumerate arbitrary revisions.

Reject nonarray responses, malformed rows, empty string fields, wrong namespace, duplicate list names/history revisions, >5 list rows, >=6 history rows, empty history for a listed release. Revisions are positive safe integers or canonical decimal strings (`^[1-9][0-9]*# T05 | Inventory, classification and receipts

[Execution cards](../TASKS.md) · [Proof and deadlines](../PROOF.md)

T05.1 owns inventory; T05.2 owns readiness and fixtures; T05.3 owns installer and receipts; T05.4 owns external callers and the join. Keep intermediate states source-only.

## T05.1 Inventory

### Input and output

Use the verified T01 descriptors (`chartName`, `chartVersion`, `appVersion`) and T02 desired/predecessor renders. Read pin values from the descriptors, not duplicate version constants. Expected Helm chart string is chartName + '-' + chartVersion; appVersion matches literally, including any leading v. Only dev loads predecessor artifacts.

Retain existing snapshot fields and add:

| Field | Shape |
| --- | --- |
| helmReleases | Rows {name,namespace,revision,status,chart,appVersion} |
| helmHistory[name] | Sorted rows {revision,status,chart,appVersion} |
| helmManifests[name] | {revision,documents,previousDocuments?}; previousDocuments only for Collector rev2 |

Use the shared argv builders in [partial-install.md](partial-install.md) with frozen kubeconfig/context. List once; read history and current manifest for each known listed release, plus Collector rev1 manifest when latest is rev2. Do not fetch unknown release histories/manifests or enumerate arbitrary revisions.

Reject nonarray responses, malformed rows, empty string fields, wrong namespace, duplicate list names/history revisions, >5 list rows, >=6 history rows, empty history for a listed release. Revisions are positive safe integers or canonical decimal strings ). Unknown releases remain foreign/legacy. Unexpected revision/status is not-ready or foreign; command/read errors are unreadable. Never report either as absent.

Parse manifests privately into objects keyed by apiVersion, kind, namespace, name. Resolve omitted namespace only for namespaced chart objects. Reject duplicate identities, invalid objects, missing identity or unexpected explicit namespace. Do not retain raw manifest strings. All reads share the inclusive inventory deadline; check before and after each invocation.

### Safe projection

- Secret: retain metadata UID/namespace/labels/annotations/ownerReferences/deletionTimestamp/resourceVersion and existing dataKeys/hasValues. Store names of nonempty data entries, never values.
- Collector ConfigMap only: add exact data/binaryData, derive name from rendered descriptor. Keep private.
- PVC: require spec.volumeName; fetch exactly that PV, require nonempty UID, matching claimRef name/namespace/UID, class/size/accessModes/volumeMode and Bound phase. No status.volumeName or claimRef-only fallback. Malformed PV response fails; evidence contains selected fields only.
- Keep existing spec/status and consumed metadata fields. No public inventory payload expansion.

## T05.2 Readiness

### Public classification and owned validators

| Function | Authority | Result |
| --- | --- | --- |
| classifyInventory(snapshot,desired,{predecessorArtifacts}) | Read-only; pending must be explicitly valid and clear for ready/absent | Existing public state/detail/reason |
| verifyOwnedFinalShape(snapshot,desired,{identity,custody,predecessorArtifacts,expectedOperation,expectedRevision}) | Actual exclusive pending capability; exact operation and revision | {ok,configRevision,detail} |
| verifyOwnedEnsurePrefix(snapshot,desired,{identity,custody,completedPhases}) | Exact ensure intent and completed phase prefix | {ok,detail} |
| verifyOwnedTempoDown(snapshot,desired,{identity,custody,predecessorArtifacts,expectedRevision,baseline}) | Exact outage intent and intentionally down Tempo | {ok,detail,configRevision} |

Use one private assessShape(snapshot,artifacts,variant) and private common projection predicates. No public ownedPending switch, generic partial allowlist or relaxed readiness flag.

Public classification:
- Require pending===false and pendingValid===true for ready/absent; missing or invalid flags refuse. Complete shape with pending is not-ready/pending. Preserve independently proven foreign/legacy details.
- Absent means namespace absent, no target PV claimRefs, objects, releases or legacy, clear pending. Present-empty namespace is not-ready.
- Present namespace requires exact profile owner and UID, nonterminating. Unknown/partial cannot become absent.

All owned validators require actual exclusive assertOwnPending(), exact immutable tuple, valid pending=true, matching namespace UID, and matching operation. Compare own record before and after shape assessment. Missing snapshot fails. Never clone snapshot with pending=false or return public ready. Only the caller clears after full identity recheck, verified phase/transition and closed children; reread pending after clear.

Final shape requires desired configuration and exact revision: ensure=1, attempted upgrade=2, persistence/outage=actual admitted baseline revision. Operation enum ensure/upgrade/persistence/outage is explicit, never inferred.

### Revision matrix

| Release/profile | Allowed history | Manifest |
| --- | --- | --- |
| Four backends; release Collector | rev1 deployed | Desired |
| Dev Collector, fresh | rev1 deployed | Desired |
| Dev Collector, predecessor | rev1 deployed | Base; public upgrade-required |
| Dev Collector, upgraded | rev1 superseded, rev2 deployed | Base rev1, desired rev2 |

Latest list row equals latest history; every row matches chart/app pins. Reject failed, rollback, pending, gap, extra history, wrong old manifest or predecessor rev2.

Require exact Helm storage Secret bijection. Candidate if name starts sh.helm.release.v1., owner=helm or type=helm.sh/release.v1. Require expected name/type/owner/name/status/version labels, namespace, UID, nonterminating, release in dataKeys. Extra/missing candidates refuse.

Compare all four parsed Collector chart documents exactly, ignoring only document order. Other releases compare manifest identity sets. For live Collector use canonical [Exact admission projection](../../../../../docs/technical/platform/observability-native-infrastructure.md#exact-admission-projection), including ConfigMap bytes, checksum, Service ports/selectors/type/exposure, workload and current Pod operational fields, config volumes/mounts, SA and ownership.

Explicit API defaults only: TCP protocol, targetPort=port, ClusterIP service type, volume defaultMode 420, rolling strategy 25%/25%, absent hostNetwork/PID/IPC=false. Ports keyed by unique name. Retain existing Pod spec/runtime image verification. Exact single pinned regular container, no init/ephemeral, one ready active owned Pod per workload. Zero-replica historical RS admitted only under exact Deployment UID. EndpointSlice requires exact service name/controller UID, expected named targetPort and ready targetRef UID of admitted Pod; no unknown/extra active targets. Other roles retain exact enumeration/ownership and Service selector/ports/type checks; headless clusterIP=None exact, otherwise ignore server-assigned clusterIP absent from authored Service. Unexpected defaults stop; no broad equality relaxation.

### Ensure prefix

Derive allowed release subset privately from isValidPhasePrefix(completedPhases). Pending phase matches latest attempted/completed prefix phase after namespace creation. Initial no-mutation admission stays public. Require namespace/Secret only when completed, exact direct/generated inventory, rev1 list/history/manifest/storage and pinned image for completed releases. Refuse future releases, objects, claims, storage, controller descendants or foreign/legacy. Reuse common predicates; no separate duplicate classifier.

T05.3 retains install.mjs::verifyCompletedPhasePrefix as thin adapter to verifyOwnedEnsurePrefix with explicit identity/custody. Before each later write require T03 actual namespace create UID binding and compare own pending. Failure preserves pending, no later write.

### Intentional Tempo outage

Only operation outage, phase outage-down, restore=null and exact immutable baseline. Tempo UID equals baseline, generation=down.generation+1, spec.replicas=0, observedGeneration current, replica/current/ready/available/updated counts absent or zero. No nonterminal or terminating owned Pod, no ready or unknown active endpoint. Retain exact regular/headless Service and EndpointSlice owner/service/port, bound claim/PV. All other predicates and four healthy workloads remain required; compare expected Collector revision, workload/claim UIDs and Collector Pod UID. Planned/unknown down result does not prove write ownership; compensation only under [T11.1](disruptions.md). Final restore uses full final shape.

## T05.3 Installer and receipts

Observation preloads desired/predecessor descriptors once, collects one snapshot, rechecks full identity then classifies. Keep snapshot internal. Use the single [deadline contract](../PROOF.md) and [external caller contract](observation-callers.md) after ratification. Mutation/proof adapters use same frozen descriptors/identity and allocated checks.

Receipt schema1 and closed fields remain; add upgrade-required reason, no new state. Require plain nonnull object, correct operation/profile, explicit boolean ok/pending, known state/reason/mutation, exact string phase prefix (no coercion), byte-capped final line.

| Ensure outcome | Required receipt |
| --- | --- |
| No-op success | exit0, ok=true, ready/ready, none, empty prefix, pending=false |
| Install success | exit0, ok=true, ready/ready, confirmed, full prefix, pending=false |
| Predecessor refusal | nonzero, ok=false, not-ready/upgrade-required, none, empty prefix, pending=false |
| Unknown after launch | possible mutation, pending=true |

Explicit no-mutation refusal requires coherent receipt and empty prefix; actual pending refusal retains pending. Missing/malformed output, contradictory exit/ok, signal/timeout or invalid shape cannot imply none. parseEnsureReceipt always returns pending. No configRevision/history/snapshot/UID projection in generic receipt; never parse upgrade as ensure.

Status receipt requires operation status, mutation none, empty phases, explicit booleans, expected profile if supplied. Readable observations use exit0/ok=true even if not ready; unreadable uses exit1/ok=false. PASS only ready/ready/clear. Optional absent NOT-RUN only for default release allowAbsent and absent/absent/clear. Predecessor/pending FAIL with specific reason. Invalid/malformed/timeout/nonzero/signal cannot PASS. Keep public installed/not-installed/not-ready/unreadable mapping and specific upgrade-required/pending details. Pass expected profile through plan/diagnostic/provisioning.

## Fixtures and proof

Use actual offline pinned Helm renders, existing test-only verifyArchive=false where applicable, and separate archive hash negatives. No fabricated pins, no fake render fallback. Missing Helm is NOT RUN, not PASS.

T03 install.test.mjs::makeEnsureDeps runMutation namespace success returns JSON Namespace with exact name/kind/UID/owner label; subsequent stage observation independently returns same UID; add mismatched/missing create response UID and malformed response stop before Secret. T04 makeEnsureDeps custody begin/advance/assertOwnPending/clear maintain independent schema2 record clone, state and operation ID; readPending and snapshot pending flags derived from this state (not constant false). Inject foreign replacement before finalization and compare-clear, no fake boolean bypass. Real custody tests remain T04.

T05 snapshot-fixtures.mjs::objectFromDoc merges Helm managed-by into existing labels and annotations instead of overwriting chart-authored values; include ConfigMap data/binaryData, exact metadata namespace/uid/RV/generation. buildCompleteDevSnapshot(artifacts,{predecessorArtifacts,revision=1}={}): use artifacts.documents and release.documents for live/manifest data; require desired/predecessor input supplied explicitly for upgraded fixture. Namespace object exact profile namespace/UID/owner label; profileId from artifacts.profile.id so release fixture uses its actual namespace/storage class. Each list row uses descriptor chartName/chartVersion/appVersion, numeric revision; history rev1 deployed; manifests map nonempty parsed docs. Upgraded fixture starts desired live projection, Collector list rev2, history rev1 superseded+rev2 deployed, distinct storage Secret UIDs and correct status/version labels, previousDocuments from predecessor Collector release only; no other revision change. Predecessor rev1 fixture uses actual base artifacts throughout. No mutation of shared render docs: structuredClone all fields before perturbation.

Generated claim spec from actual StatefulSet volumeClaimTemplates (name storage, ordinal 0), no hard-coded Tempo 2Gi (canon 5Gi), preserve class/access/size, spec.volumeName unique; direct Prometheus claim same with bound volumeName. PV metadata UID, name, spec.claimRef exact; include Bound status, class/capacity matching selected claim where asserted. Grafana Secret dataKeys sorted, type Opaque, UID/RV, no credential payload. Every Helm Secret as sanitized metadata/dataKeys/hasValues with correct release/namespace/revision/status. Pod metadata labels from workload template, controller:true ownerReference to exact RS/STS UID, Deployment RS exact controller UID and template, generation and current replicas; Pod Ready condition, status running, exact container imageID, deterministic Pod IP/node if endpoint fixture needs it. EndpointSlice per actual Service selector matched workload, ownerReference Service UID, label kubernetes.io/service-name, named protocol/port from corresponding targetPort (resolve named targetPort against container ports), ready targetRef Pod UID/name/namespace; no arbitrary endpoints. Set pendingValid=true and pending=false for complete fixture. Tests mutate one field independently; do not weaken classifier for fixture shortcuts.

install.test.mjs::absentSnapshot adds helmHistory:{}; snapshotForPhases filters direct/generated rows, list/history/manifests, Helm storage, PVs and owned RS/Pod/EndpointSlice descendants by completed release, not only direct objects. Namespace object comes from complete fixture. makeEnsureDeps finalObservation uses actual stage and pure classify result (pending not-ready), adapter verifies own record; remove foreignPendingAtAdmission/Finalize production test toggles in favor of actual fixture pending state/record replacement. Keep prior phase failure, slow Helm, secret redaction, namespace replacement tests. New negative cases future release history/Secret/descendant and missing completed manifest. Proof.test.mjs minimal disruption observations are T08/T11 migration, not accepted as classifier fixtures.

readiness.test.mjs existing complete fixture now desired rev1; pending complete test expects not-ready/pending; add exact predecessor rev1 upgrade-required, desired rev2 with base history ready, release rev1 ready and release rev2 refusal. Negatives each independently: unknown ConfigMap byte, extra binaryData key, old checksum, port/selector/ownership namespace mismatch, extra active Pod, foreign EndpointSlice target UID, missing/duplicate current storage, wrong chart/app including stripped v, extra history/gap/failed/rollback, wrong previous manifest, stale revision1 desired substituted for predecessor, PV name/UID/claimRef mismatch, missing pendingValid; owned adapter rejects wrong record and absence of snapshot. Retain all existing legacy/image/headless/termination tests. inventory.test.mjs fake command traces distinguish list/history/get manifest revision arguments; malformed array, duplicate row, overflow, deadline after exit0, wrong namespace and Secret values never appear in snapshot. Include all five history reads and rev1 additional Collector manifest, no arbitrary unknown chart manifest fetch.

receipt.test.mjs update valid fixtures operation/profile/ok/pending explicitly; assert lost stdout nonzero is possible, contradictory exit and valid-looking body possible, null/array and missing fields fail, predecessor refusal propagates, pending diagnostic FAIL with pending=true, wrong operation/profile fail. diagnostic-worker.test.mjs pending readable receipt exit0/ok=true then mapped FAIL; unreadable exit1/ok=false; diagnostic.test.mjs default release absence unchanged and predecessor explicit dev FAIL; provisioning.test.mjs same predecessor FAIL, timeout unchanged. platform-plan.test.mjs and infra-cli-operation.test.mjs verify nonzero predecessor ensure stops later phases, mutation none, pending false; malformed worker possible and later phases skipped; infra-cli.test.mjs verify status mapping detail upgrade-required. Existing read-only plan/release behavior preserved. 


Focused commands (repo root, no live):
```bash
node --test infra/platform/observability/tests/{inventory,readiness,install,receipt,diagnostic-worker}.test.mjs
node --test infra/environments/{platform-plan,infra-cli,infra-cli-operation}.test.mjs infra/verification/{diagnostic,provisioning}.test.mjs
```
The above requires actual offline Helm available for existing artifact-backed fixtures; no image pull/network/live cluster. If unavailable, NOT RUN and return exact missing binary, no fake render replacement. Test actual default command trace (not only injected finalObservation) for history and receipt path. 

