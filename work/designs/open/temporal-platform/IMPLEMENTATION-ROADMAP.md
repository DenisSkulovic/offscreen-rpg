# Implementation roadmap | revised after strict review

Proposed only; no Change folders, IDs, commission or live permission. Reviewed main 4702f5637d6e6e167d7126606e7960343149e983; previous roadmap 72ef80ea. Existing Temporal directory deliberately excluded. This is the execution design, not a dispatchable packet.

## 1. Review verdict

Reject previous A/B/C partition as written. It bundled unrelated pin relocation with a new PG provisioning API, hid broad caller rewrites in B6, duplicated fixture work in C, and treated source merge as sufficient to switch runtime topology. The installer design also overreached: custom safe-values whitelist, independent CLI, repeated lint/render and speculative upgrade machinery are unnecessary for the first local installation. Preserve safety outcomes, not previous custom machinery.

Selected minimal programme: **one coherent platform replacement, preceded by a separate persistence Change only if the actual PG work merits independent integration.** The pin relocation is a small task in the replacement, not its own Change. No mandatory fourth verification Change. Integrate the basic fixture and consumer compatibility in the replacement. Advanced resilience/restore is a separate future decision, not part of this commission.

```text
ChatGPT: terminal experiments and source mapping
        |
Optional persistence Change (only if substantive)
        |
One Temporal replacement Change (includes pin relocation)
        |
Approved dev then release activation
```

A is a task within C. B is a conditional predecessor, otherwise also a task within C. C is the sole mandatory Change. Default serial execution; no separate pin-relocation chat. No second Temporal platform, no temporal-next, no partial runtime authority switch. Source tests before integration, operator live permission separate. One integration custodian; one branch/worktree per actual Change. No paid agent research assignment.

## 2. First resolve planning gates, not write packets

| Gate | Evidence required | Blocks |
| --- | --- | --- |
| Architecture acceptance | Owner accepts upstream chart, four local roles and narrow fresh-install lifecycle | all |
| Chart | Archive SHA, baseline both profiles, pinned dev lint/render and image strategy observed; exact committed file and pinned release regression remain | C final proof |
| Pin | Exact old PostgreSQL image and digest meaning; identify all consumers and matching test fixture | A |
| PG | Verify current CNPG CRD/role/database/ACL support; select exact existing owner, credentials and projection algorithm | B |
| Runtime transition | Owner-approved read-only old-folder inventory and live identity evidence, select preserve/migrate or explicitly disposable reset **per cluster** | C activation and final replacement mapping |
| Operations | Resolve exact parent authorization, lock/timeout lifetime and release namespace preparation; verify CLI output/error semantics | C |
| Packet review | Reconcile selected permanent docs, existing INF64–69 candidates, active branches and source maps; exact tests and G0–G7 child simulations | commission |

No actual packet creation until owner approves roadmap and material decisions settled. Do not conflate unavailable live permission with deterministic source-test readiness. Existing folder exclusion is respected; cannot claim exhaustive retirement map without that inspection. No permission to inspect it inferred.

## 3. Task A within C: remove unrelated verification pin dependency

One small bounded task, not a separate PATCH or PG subsystem redesign.

- Anchor: tools/verification/resources/postgres/docker-plan.mjs loadPinnedPostgresImage, normalizeImageId and resolvePinnedPostgresImageId. Existing reads Temporal images.pin, returns POSTGRES_IMAGE and POSTGRES_DIGEST. Docker image ID is not a registry manifest digest. Preserve exact image/digest and comparison behavior.
- Selected destination: verification-owned postgres pin adjacent to docker-plan.mjs (proposed image.pin, only POSTGRES_IMAGE and POSTGRES_DIGEST). Use common parsePins; keep legacy pin intact for old Temporal until C. No change to CNPG operator pin or deployed images.
- Exact matching test paths and current pin bytes still need source inventory. Positive proof identical image/digest, negative missing/invalid digest refuses; independent test proving legacy pin absent from fixture. No Docker pull, cluster or PG mutation.
- A is folded into C as its first tiny task. No dependency on B.

## 4. Conditional B: narrow CNPG persistence preparation

If substantive independent work is established, a separate CONTRACT outcome; otherwise a bounded task within C. Source-only: prepare the two stores and scoped credential prerequisites, without deploying Temporal. No generic shared DB abstraction, no provisioning during PG baseline startup, no PG tuning.

- Candidate owner: infra/platform/postgres/temporal-persistence.mjs with focused test. Final owner and exact inputs chosen at PG gate. Existing dev SQL adapter is evidence of CNPG pattern, not code to import blindly. PostgreSQL owns role/databases, Temporal namespace owner owns its projected Secret; do not make PG responsible for Temporal workload namespace creation.
- Use native CNPG CRs for one role and two retained DBs, stable credential source. Verify actual CRD and installed operator first. A closed database cannot be connected to for in-database ACL verification: settle correct ordering/privilege mechanism here, not Cursor. Verify negative access to application stores without broadly changing unrelated DB ACLs. No blanket superuser grants, no secret logs or auto rotation.
- Target namespace creation and credential projection have explicit ownership and collision refusal; projection mismatch is not automatic rotation. No implicit adoption, schema initialization, migration or reset.
- Expose one narrow preparation contract consumed by C. Do not invent status CLI, plugin framework or generic resource DSL. Only explicit platform operation invokes it after authorization and shared lock.
- Tests: denied/foreign/mismatched prerequisite refuses before mutations; correct create order and retained policies; repeat ensure no credential rewrite; bounded failure with partial resources preserved; no app tenant changes. No live test required for source closure; actual CNPG reconciliation separately observed.

B needs a precise PG owner/ACL/Secret decision before becoming a packet. The user deferred PG redesign; if existing preparation is already adequate, B reduces to declarative config and a small adapter, not a new subsystem.

## 5. C: replace active Temporal architecture in one integration

Outcome: one upstream Helm release authority and all current consumers coherent on the same branch. No incremental cleanup of discarded old code. Initial automatic lifecycle **install absent / observe existing / refuse mismatch**. No automated same-version upgrade or version migration engine in baseline. Explicit human maintenance can use native Helm upgrade with separately reviewed configuration and schema compatibility. No custom values whitelist or generalized YAML merge policy; see OPERATIONS.md. Parent existing platform CLI owns plan, target confirmation and admission; do not expose another public Temporal CLI.

Proposed task sequence, not T-IDs (exact source/test paths frozen by planner before dispatch):

| Group | Narrow owned work | Proof |
| --- | --- | --- |
| C1 | Move reviewed specimen pin/values/profiles into final folder, concise README; native Helm render test using verified local archive, no repeated downloads in deterministic suite | Exact rendered identities, no bundled DB, no public listeners, correct schema hooks and Secret refs |
| C2 | readiness.mjs and its tests; release/core/admin/UI observation; shared endpoint identity | Missing vs unreadable, wrong target, pending release, stale rollout, RPC failure, no mutating calls |
| C3 | install.mjs and its tests; parent-invoked authorized install/no-op/refusal, call B, checksum, shared lock, native Helm wait | denied target, no-op no download or hook, foreign/legacy refusal, one install, failed hook and timeout, no destructive recovery |
| C4 | platform-plan.mjs, common/render.mjs/pins.mjs and focused tests; native Temporal path, keep other service paths | both profiles same authority, plan read-only, old JSON renderer only removed for Temporal, admission preserved |
| C5 | dev-shared-core-readiness, dev-slot-startup, dev-temporal-tenant and endpoint projection tests; existing tenant policy | preserve slot namespace/retention, absence vs failure, no ephemeral admin pod, no shared platform mutation on startup |
| C6 | release workload profile/install prerequisite and release namespace preparation; relevant overlay and binding fixtures | default namespace explicit, create/describe only on authorized release preparation, correct frontend DNS, no app startup before ready |
| C7 | infra-cli diagnostics, verification catalog, TURN03 preflight and exact matching tests | preserve diagnostic shape, no obsolete SQL probes or permanent schema Job check; unsupported proof honestly NOT RUN |
| C8 | existing tenant trial / smoke compatibility and basic repeatable fixture; remove old code and tests by exact planner deletion manifest; volume/layout guards and final docs | isolated bounded proof harness, no stale imports/pins/endpoint, preserve negative safety tests; parent final integrated source proof |

C8 is not a license for broad cleanup. Split it into bounded assignments when exact inventory known: fixture, deletion, guard updates are different responsibilities. Existing tenant trial currently hardcodes dev-1/dev-2, fixed 7244 forward, conflates failed describe with absence, and lacks reliable finally cleanup. Do not run it blindly or retain those hazards. Existing release smoke deletes server pods and queries embedded PG lab_effect; it is a destructive resilience experiment, NOT basic acceptance. Disable/refuse obsolete invocation explicitly until replacement, preserve historical evidence and intended durability guarantee. Basic fixture may reuse SDK slotPing code but use an explicitly owned fixture namespace, unique queue and workflow ID, ephemeral loopback port and bounded cleanup; no production queues or shared slot workloads, no restart by default. Exact fixture selection remains planner work; no new global verifier. Advanced restart/side-effect proof not claimed by basic fixture.

### Cross-check discovered additional external dependencies

Source search across original ZIP explicitly skipped infra/platform/temporal/**; targeted current HEAD reads confirm important findings. In addition to [INTEGRATION.md](INTEGRATION.md):
- infra/environments/release/install.sh:139–140 checks Service temporal-server; infra/images/release/test/overlay-guard.test.mjs fixtures match it. Both must change together.
- infra/workloads/profiles/release.yaml:77–78 sets temporalAddress=temporal-server.lab-temporal.svc.cluster.local:7233, temporalNamespace=default. Preserve default for release unless approved migration maps it. Upstream namespace-create:false means explicit release namespace preparation is REQUIRED if it is absent; no silent fallback. Earlier generic 'never default' language applies to dev slots, not existing release.
- tools/dev-environments/src/rendering/dev-slot-app-graph.mjs:64–65 sets endpoint and slot namespace. Update dev projection and workload fixture JSON (dev-1/dev-2/release) and tests/helpers/dev-bindings.mjs; do not change workflow contracts/queues or tenant names.
- infra/verification/release-acceptance/turn03/preflight.mjs:211 legacy temporal-server; update identity/health gate only, preserve TURN03 scope.
- infra/verification/smoke/temporal/{smoke.sh,start-job.yaml,worker.yaml}: legacy server/admin/postgres/PVC assumptions. Remove obsolete topology checks and direct embedded-PG dependencies; retain reusable fixture if compatible. Do not leave known-broken smoke entrypoint on main; C fixes compatibility or explicitly refuses unsupported old test operation.
- infra/verification/dev-environments/dev-temporal-tenant-trial.mjs imports old constants, creates admin pods, port-forwards old service. Move to new shared identity/transport and correct service; preserve live token and tenant proof.
- infra/verification/diagnostic.mjs references schema-policy.test.mjs, render.test.mjs, release-install.test.mjs; update catalog to actual new tests, preserve unrelated entries. infra/verification/source/test/volume-guard.test.mjs points to old install.sh; replace with negative destructive-operation assertion in new source, not simply removing safety coverage.
- scripts/repo-tools/infra-layout.test.mjs hard-codes old chart template destinations; retire obsolete migration expectations only when new authority exists; preserve other services' layout.
- tools/verification/resources/postgres/docker-plan.mjs depends on Temporal pin; Task A removes this dependency before C retires the pin.
- Existing source suite glob and package/script registrations must be mapped completely at the runtime transition gate. Archived docs/history may retain historical names; active executable/current runbook must not. No broad replacement of every string 'temporal-server' (vendor binary/image names remain valid).



## 6. Source integration is not live cutover

Previous roadmap omitted an operational hazard: once C merges, old worktrees can still execute old infrastructure writers and new application configs cannot use an unconverted cluster. Git integration is not a distributed lock. Before C joins main, owner selects and records maintenance boundary: stop affected app callers, prevent old worktree platform operations, maintain explicit per-cluster compatibility/status and coordinate activation. No second runtime installation in same namespace. No automatic deletion, adoption or migration. If live cutover not yet approved, do not claim current platform operational under new source; delay integration if the owner cannot tolerate downtime or select a deliberate maintenance window.

Fresh installation and preservation are **different runbooks**, not branches of a generic installer. Fresh path requires explicitly authorized empty/owned stores and no legacy resource collision. Preserve path needs actual server version, schema versions, shard count, DB identity and namespace IDs/retention, active execution inventory, coherent backups and tested restore/migration procedure. Decide per cluster; release default namespace is preserved unless explicitly changed. Do not turn migration into a paid agent investigation. No cluster reset or data loss authorization implied. Dev first, release second after observed evidence. Source changes do not touch existing live resources.

## 7. Scope and proof discipline

- Reuse existing infra verification runner; source tests and basic fixture belong to C, not duplicate Change C plus D. No PG failover, full restore, load testing, hosted TLS/HA, workflow/application redesign or paid provider calls.
- Pinned chart render is planner evidence once; regression test consumes local verified archive or reports explicit NOT RUN, no hidden network in generic source suite. Re-run once on final integrated configuration; not each child.
- Distinguish health from actual execution, source PASS from live PASS. Verify repeat explicit ensure causes no Helm revision/intentional rollout, not immutable pod UIDs.
- Exact source map and tests are still incomplete because old folder excluded. Do not label ready, assign speculative code counts, or claim full independent audit. After planner gates, run full packet G0–G7 review separately.
- Previous programme INF64–69 held, proposed A/B absorb relevant INF64 prerequisites; C absorbs INF65–69 local deployment and basic verification. No duplicate execution or reopening archived INF61–63/70–71. Existing INF29 live tracker stays. No change to queue or broader undertaking estimates; no live progress.
- Default serial parent children. A is the first task in C; optional B precedes C only if independent work is justified. C1–C8 sequential by default; optional disjoint child concurrency only if actual proof benefit. Parent integrates and reviews once; no repetitive repo-wide agent audits.

## 8. Strict review disposition

| Previous weakness | Correction | Remaining evidence |
| --- | --- | --- |
| A mixed independent pin and PG work | fold small pin task into C; isolate B only if substantive | old pin and test map |
| B broad cleanup/research group | exact bounded caller groups, final deletion inventory planner-owned | authorized legacy inventory |
| C duplicate proof programme | fold basic verification into replacement | exact existing fixture and runner contract |
| Custom upgrade policy | no automated upgrades in initial scope | maintenance contract |
| Repeated artifact render/download | one planner specimen proof and final regression | pinned release and exact committed files |
| Unowned runtime transition | explicit maintenance boundary and per-cluster migration decision | owner authorization/inventory |
| Release namespace and PG pin hazards | explicit separate ownership | exact live proof |
| Existing fixture dangerous assumptions | no blind invocation; bounded owned fixture | exact fixture contract |

Verdict: revised roadmap is materially leaner but **not approved or dispatchable**. No Changes created. Stop before implementation packet authoring; complete missing planner evidence and owner review.

## Defense revision

No standalone pin Change. No mandatory standalone persistence Change until the terminal and source evidence establish its size. No custom release description hash: compare Helm recorded values with narrowly composed endpoint overlays. Verify chart bytes before creating any persistence resources. See OPERATIONS.md. Next step is the read-only [terminal experiments](EXPERIMENTS.md), not packet drafting.
