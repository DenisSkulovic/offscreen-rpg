# OBS-D04 candidate implementation contract

**Not dispatch authority.** Accepted guarantees from R5; detailed implementation candidate and numerical mechanisms require affected planner resolution before commission. Current contract sections below are the proposed narrow mechanism; no old packet precedence chain. No live mutation or compatibility bypass.

## Artifacts
D04/T01 uses its own private temporary directory: PROOF=$(mktemp -d); chmod 700 "$PROOF"; export PROOF; mkdir -p infra/platform/observability/values/profiles/dev. Do not depend on D01's shell environment or private temporary files. D04/T01 generator exact immutable source: git show 06306ace3717841f36ad0952cf7664afbd6fcd4a:work/designs/open/observability-developer/experiments/build-developer-values.py > "$PROOF/build-developer-values.py"; python3 "$PROOF/build-developer-values.py" infra/platform/observability/values/collector.yaml "$PROOF/collector-overlay.yaml"; install -m 0644 "$PROOF/collector-overlay.yaml" infra/platform/observability/values/profiles/dev/collector.yaml. PyYAML is existing design-time dependency; no runtime invocation or dependency addition. If unavailable report blocker, no hand-rewritten overlay. Default desired dev Collector ordered base then overlay, predecessor dev base singleton, release base singleton; reject unknown variant and release predecessor before any template. Keep five chart plans and hash validation before any render. For dual desired/predecessor observation avoid repeated four backend renders by adding internal loadObservabilityVariants(profileId,deps={}) returning {desired,predecessor:null|bundle}; use same validated plans, render five desired documents sets and one base Collector set, derive predecessor bundle by replacing only Collector descriptor/docs; both run same inventory and image validation. No public CLI variant or archive override. This internal optimization does not solve deadline feasibility by itself. Existing loadArtifacts(profileId,{variant}) remains single bundle API for tests; D04/T03 consumers use variants helper. D04/T01 expected render compare actual desired vs predecessor: only Collector ConfigMap/Deployment/Service changes (SA unchanged), exactly same four Collector identity keys, all non-Collector documents deep equal, pinned image identical, three existing diagnostic ports plus dev-otlp 4327 and dev-otlp-http 4328 (TCP, grpc appProtocol on dev-otlp), receiver endpoints 0.0.0.0:4327/4328, existing strict pipelines and processors unchanged. New traces/logs/metrics developer pipelines use otlp/developer and ordered memory_limiter/filter/developer/transform/developer/batch, existing exporters, generated YAML exact equality to accepted generator output. Parse relay YAML from rendered Collector ConfigMap, compare existing sections as deep objects (not string substring), verify no developer receiver/pipeline/port in release or predecessor. Save release parity baseline before overlay and verify exact after; predecessor dev equals D01 base. No live Collector run by Cursor.

## Inventory
### Input and output

Use the verified D01 descriptors (`chartName`, `chartVersion`, `appVersion`) and D04/T01 desired/predecessor renders. Read pin values from the descriptors, not duplicate version constants. Expected Helm chart string is chartName + '-' + chartVersion; appVersion matches literally, including any leading v. Only dev loads predecessor artifacts.

Retain existing snapshot fields and add:

| Field | Shape |
| --- | --- |
| helmReleases | Rows {name,namespace,revision,status,chart,appVersion} |
| helmHistory[name] | Sorted rows {revision,status,chart,appVersion} |
| helmManifests[name] | {revision,documents,previousDocuments?}; previousDocuments only for Collector rev2 |

Use these exact ordered Helm arguments with the frozen snapshot/context (all tokens strings; export the history builder for A9):

- List: `['--kubeconfig',snapshotPath,'--kube-context',contextName,'list','-n',namespace,'--all','--max','6','--output','json']`.
- History: `['--kubeconfig',snapshotPath,'--kube-context',contextName,'history',releaseName,'-n',namespace,'--max','6','--output','json']`.
- Manifest: `['--kubeconfig',snapshotPath,'--kube-context',contextName,'get','manifest',releaseName,'-n',namespace,'--revision',String(revision)]`.

 List once; read history and current manifest for each known listed release, plus Collector rev1 manifest when latest is rev2. Do not fetch unknown release histories/manifests or enumerate arbitrary revisions.

Reject nonarray responses, malformed rows, empty string fields, wrong namespace, duplicate list names/history revisions, >5 list rows, >=6 history rows, empty history for a listed release. Revisions are positive safe integers or canonical decimal strings ). Unknown releases remain foreign/legacy. Unexpected revision/status is not-ready or foreign; command/read errors are unreadable. Never report either as absent.

Parse manifests privately into objects keyed by apiVersion, kind, namespace, name. Resolve omitted namespace only for namespaced chart objects. Reject duplicate identities, invalid objects, missing identity or unexpected explicit namespace. Do not retain raw manifest strings. All reads share the inclusive inventory deadline; check before and after each invocation.

### Safe projection

- Secret: retain metadata UID/namespace/labels/annotations/ownerReferences/deletionTimestamp/resourceVersion and existing dataKeys/hasValues. Store names of nonempty data entries, never values.
- Collector ConfigMap only: add exact data/binaryData, derive name from rendered descriptor. Keep private.
- PVC: require spec.volumeName; fetch exactly that PV, require nonempty UID, matching claimRef name/namespace/UID, class/size/accessModes/volumeMode and Bound phase. No status.volumeName or claimRef-only fallback. Malformed PV response fails; evidence contains selected fields only.
- Keep existing spec/status and consumed metadata fields. No public inventory payload expansion.


## Readiness
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

D04/T04 retains install.mjs::verifyCompletedPhasePrefix as thin adapter to verifyOwnedEnsurePrefix with explicit identity/custody. Before each later write require D02 actual namespace create UID binding and compare own pending. Failure preserves pending, no later write.

### Intentional Tempo outage

Only operation outage, phase outage-down, restore=null and exact immutable baseline. Tempo UID equals baseline, generation=down.generation+1, spec.replicas=0, observedGeneration current, replica/current/ready/available/updated counts absent or zero. No nonterminal or terminating owned Pod, no ready or unknown active endpoint. Retain exact regular/headless Service and EndpointSlice owner/service/port, bound claim/PV. All other predicates and four healthy workloads remain required; compare expected Collector revision, workload/claim UIDs and Collector Pod UID. Planned/unknown down result does not prove write ownership; compensation only under D10 fixed restoration capability. Final restore uses full final shape.


## Installer
Observation preloads desired/predecessor descriptors once, collects one snapshot, rechecks full identity then classifies. Keep snapshot internal. Use the single ratified deadline contract (planner gate) and Callers below after ratification. Mutation/proof adapters use same frozen descriptors/identity and allocated checks.

Receipt schema1 and closed fields remain; add upgrade-required reason, no new state. Require plain nonnull object, correct operation/profile, explicit boolean ok/pending, known state/reason/mutation, exact string phase prefix (no coercion), byte-capped final line.

| Ensure outcome | Required receipt |
| --- | --- |
| No-op success | exit0, ok=true, ready/ready, none, empty prefix, pending=false |
| Install success | exit0, ok=true, ready/ready, confirmed, full prefix, pending=false |
| Predecessor refusal | nonzero, ok=false, not-ready/upgrade-required, none, empty prefix, pending=false |
| Unknown after launch | possible mutation, pending=true |

Explicit no-mutation refusal requires coherent receipt and empty prefix; actual pending refusal retains pending. Missing/malformed output, contradictory exit/ok, signal/timeout or invalid shape cannot imply none. parseEnsureReceipt always returns pending. No configRevision/history/snapshot/UID projection in generic receipt; never parse upgrade as ensure.

Status receipt requires operation status, mutation none, empty phases, explicit booleans, expected profile if supplied. Readable observations use exit0/ok=true even if not ready; unreadable uses exit1/ok=false. PASS only ready/ready/clear. Optional absent NOT-RUN only for default release allowAbsent and absent/absent/clear. Predecessor/pending FAIL with specific reason. Invalid/malformed/timeout/nonzero/signal cannot PASS. Keep public installed/not-installed/not-ready/unreadable mapping and specific upgrade-required/pending details. Pass expected profile through plan/diagnostic/provisioning.


## Callers
Selected owner-approved deadline candidate awaiting independent ratification: single constants module within existing identity.mjs owner (D02 adds exports, D04 wires consumers), no second scheduler. Export OBSERVABILITY_ARTIFACT_BUDGET_MS=390000, PREFLIGHT_BUDGET_MS=210000 (identity only), INVENTORY_BUDGET_MS=120000, OBSERVABILITY_OBSERVATION_WORKER_MS=1000000, OBSERVABILITY_OBSERVATION_SUPERVISOR_MS=1060000, OBSERVABILITY_ENSURE_WORKER_MS=5880000, OBSERVABILITY_ENSURE_SUPERVISOR_MS=6000000. OBSERVATION_BUDGET_MS retained as alias of observation worker constant for existing imports, no second value. Observation budget allocation 640000 start (artifact390000+identity210000+custody10000+host30000, unused custody slot for read-only), inventory120000, full final recheck210000, close/receipt30000. No new read-only lock requirement. Install WORKER_BUDGET_MS aliases shared ensure worker constant; retain 60s terminal reserve. Existing unrelated services untouched. These values are candidate authority only until independent review; no actual runtime constants modified in this repair.

D04 observeObservability(profileId,deps) is sole owner of read-only phase deadlines: one monotonic start and absolute min(callerDeadline,start+worker), exact phase bounds, real artifact load within own allocation, frozen identity capture, inventory, final full recheck, snapshot cleanup; if caller supplied frozen identity/preloaded descriptors, no duplicate capture/render, explicit supplied phase deadline and ownership contract. All command timeout options clamped to remaining positive time; no command when <=0, late exit0 not success. Caller-supplied deadline cannot extend default absolute cap. Diagnostic worker must pass whole worker deadline, not old inventoryDeadline as global cap. createObservabilityDiagnosticBudget retains existing exported clamp helpers for focused tests but computes preflight boundary from 640000 combined start and inventory boundary +120000, final recheck/cleanup within absolute deadline; no separate clock reset, no duplicate reservation. Remove verifyArchive:false from diagnostic worker and all production observe/load calls; test-only injection may supply already validated descriptor fixture through explicit seam, not production boolean bypass. Diagnostic worker output closed receipt: readable pending/not-ready/absent/foreign/legacy state reports ok=true and exit0 (observation readable, not health PASS); unreadable reports ok=false exit1; pending must never be ready admission. Pass expected profile and operation status to evaluateObservationReceipt, preserve allowAbsent only optional release diagnostic. Timeout/signal/malformed receipt remains FAIL regardless of state. No raw Secret or debug output.

diagnostic-live.mjs OBSERVABILITY_SUPERVISOR_MS aliases shared observation supervisor constant; runObservabilityDiagnosticSubprocess default same, reject caller timeout greater than shared cap (allow smaller for explicit bounded tests/operations). diagnostic.mjs existing imported alias automatically uses new value; update focused test expectations and expected-profile argument. provisioning.mjs OBSERVABILITY_PROVISIONING_ENSURE_MS aliases shared ensure supervisor 6000000; existing explicit dev-only restriction retained; use expected profile in observation evaluation, maintain typed failed/unknown mutation mapping for ensure. Provisioning timeout encompasses public CLI setup and worker; 120s difference from worker is outer overhead allowance, if actual CLI setup exceeds it fail bounded and retain pending, not claim successful refusal. No change default RabbitMQ/other service timeouts. Public platform-plan.mjs::platformRunnerSpawnTimeout extends exact path/executable/argv/profile/context predicate to subcommand plan only (actual platform-plan builder emits plan/ensure; no generic command string matching); return shared observation supervisor cap1060000, preserve ensure exemption (worker owns absolute deadline), default600000 for all unmatched. infra-cli direct status observe uses default worker cap and correct typed state mapping; no new broad aggregate timeout. All parent boundaries must preserve nonzero/timeout as unknown mutation where applicable, no automatic retry. Actual diagnostic-engine runCommand parent-death/termination semantics and provisioning outer timeout tree remain targeted D11 external process follow-up: do not claim subprocess chain verified merely by changing numeric values.


## Activation boundary (not accepted)
D04's source candidate must not expose changed default on main until real A6 authenticated health/repeat, A7 strict synthetic correlation/privacy, V03/V08 developer functionality and safe proof UID cleanup are available on the coordinated candidate. D07/D09/D08 tooling may be developed against reviewed D04 candidate source, not require an unsafe merged default. No public unsafe old route; planner must specify actual entrypoint refusals or safe migration, cross-worktree exclusion and joint acceptance before commission. Until approved, R5 joint gate holds.
