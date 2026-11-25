# Implementation roadmap | proposed, not commissioned

Baseline: main aa85115ddd47e1a0d18a1e85a3e783b5b93bb48a; outside-Temporal source cross-checked against original ZIP 03ea79c469d0 and targeted current GitHub reads. The existing Temporal infrastructure directory remains excluded. This is a design of future Changes, not actual Change packets, T-ID commissions or permission to edit/run infrastructure. No IDs reserved. No live worktree/cluster state asserted.

## 1. Strategy

Prefer **two source implementation Changes plus one verification Change**, with a planner gate before them and operator-owned live cutover after source acceptance. Earlier tentative three implementation Changes would split native chart and caller migration or introduce an intermediate transport; reject that because it leaves an incompatible or duplicate deployment authority on main. A Change is an independently useful integrated outcome, not one file. Small Composer assignments remain inside each Change.

```text
Planner gates: render, persistence contract, legacy inventory + migration choice
        |
        v
A  Shared PostgreSQL prerequisites and pin decoupling
        |
        v
B  Atomic Temporal Helm replacement + all active callers
        |
        v
C  Independent repeatable functional verification
        |
        v
Owner-approved serial dev then release cutover/proof
```

A and B may have disjoint preparation work in separate worktrees once interfaces are frozen, but B depends on A's actual exports and acceptance, and B touches shared environment assembly. Do not dispatch them concurrently by default. C may prepare independent fixture source against frozen endpoint/fixture contract after B is settled; integration after B. No simultaneous live cluster experiments, no new Kind cluster or parallel Temporal platform. Source tests are the default; authorized live proof is separate. One integration custodian (owner or nominated Cursor parent) serializes joins/docs/catalog updates. Per Change one branch/worktree; parent generally one cheap Composer child at a time, at most two only if exact disjoint writes/build outputs proven. Parent runs final focused checks once, not repeated whole-repo audits.

## 2. Pre-packet planner gates (ChatGPT, not Cursor)

| Gate | Required concrete evidence / decision | Affects |
| --- | --- | --- |
| P0 | Owner accepts four-role local upstream Helm architecture, which replaces earlier compact singleton design | all |
| P1 | Obtain archive 1.8.0, verify published SHA, lint/template both profiles; review exact objects, Secret refs, Job env, readiness, CLI command, image identity strategy. No cluster needed. | B/C |
| P2 | Verify CNPG operator/CRD support, exact role/database status fields and closed-before-grants algorithm, existing PG pin/digest semantics and credential projection ownership. No PG tuning. | A |
| P3 | Owner authorizes narrowly scoped existing Temporal source inspection and read-only live inventory; map legacy resources and all active callers/tests, current persistence identity/versions/shards/namespaces/workflows, and select preserve/migrate or explicit disposable reset. No write permission implied. | B / live |
| P4 | Resolve lock/process lifetime, time budgets, exact release ownership and safe config change policy; prove process fixture locally; verify CLI error discrimination and endpoint/namespace registration. | B |
| P5 | Reconcile accepted architecture to permanent technical/runbook owners, old held INF64–69 programme, and INF29 evidence tracker; check current branches and active changes. | packet creation |

P1, P2, P3 and P4 are substantive unresolved planner decisions, not dependencies masquerading as blockers. Do not create packets until appropriate gates settled and owner approves roadmap. Prior forbidden directory not opened by this roadmap. If user maintains exclusion, B cannot responsibly become dispatchable; planner must receive explicit permission or complete legacy inventory supplied by owner. No automatic migration/reset.

## 3. Future Change A: PostgreSQL-owned shared persistence prerequisites

Outcome: PG-owned preparation for two Temporal stores, stable scoped role and credential projection, independently usable/testable without installing Temporal. No change to active old Temporal deployment; no database capacity/storage/connection settings or app schema changes.

Candidate owned files: infra/platform/postgres/temporal-persistence.mjs and tests/temporal-persistence.test.mjs (final placement after inspecting PG source ownership); tools/verification/resources/postgres/docker-plan.mjs loadPinnedPostgresImage and matching tests; dedicated verification image pin under PG verification resource ownership if the existing operator.pin cannot express identical digest semantics. Do not add a generic database framework. Existing dev SQL adapter is reference, not reused directly. Interface proposed ensureTemporalPersistence({profileId, confirmation}, deps) -> {ok,detail}; only called by explicit installer after target/admission/lock. Separate read-only observation if independently needed, not a generic provisioner.

Internal task groups (not actual T-IDs):
- A1: PG verification pin decoupling. Existing loadPinnedPostgresImage reads infra/platform/temporal/images.pin using TEMPORAL_IMAGE_PIN_KEYS and returns POSTGRES_IMAGE + POSTGRES_DIGEST. Move that exact verification image/digest contract to an appropriate PG-owned pin, preserve semantics; no substitution of CNPG image or registry digest for Docker image ID without evidence. This can be integrated independently and is mandatory before deleting legacy pin. Actual values require authorized source access or a supplied pin; do not guess.
- A2: role/database/Secret preparation with narrow fresh/adoption checks and retained CNPG resources. Use existing target/profile, exact role/database identities, scoped ownership, create-only credentials and verify projection; observe status/catalog before allowing connection. No auto rotation, no foreign adoption, no role superuser mount in Temporal. Apply only authorized fresh/adopted identities; mismatch refuses. Prove creation order, no-op and denied/mismatch fixtures. PG baseline bootstrap alone must not automatically provision Temporal.
- A3: bounded integration review and tests for adapter, pin consumer and existing PG verification; no changes in Temporal folder or app slot flows. A is source-only until explicit operator run, not a new live DB initialization commission.

Acceptance: deterministic tests cover missing/foreign resources, retained reclaim policy, role scope, password never output, retries don't rewrite credentials, denied target no writes, correct pin/digest result unchanged. Test source PG verification dependency remains intact even if legacy Temporal pin removed. Existing PG cluster creation/scaling and dev SQL tenant behavior unaffected. No live PG tuning.

## 4. Future Change B: atomic native Helm platform replacement

Outcome: one deployment authority at infra/platform/temporal/ for both environments; existing CLI, app bindings, tenant operations, status, verification and guards reference the new topology in the same integrated diff. No temporal-next, legacy runtime compatibility framework or in-place refactoring of discarded templates. Replace old code directly once migration contract approved. Preserve data and meaningful authorization guarantees, not legacy abstractions.

Internal task groups, ordered to minimize repeated reads:

| Group | Writes / outcome | Focused proof |
| --- | --- | --- |
| B1 chart/config | README.md, chart.pin, values.yaml, profiles/{development,release}.yaml; remove obsolete chart/ only at final join; carry actual verified specimen | Both profiles lint/render with exact archive, no secret payload, vendor schema hooks, expected resources; reject bad checksum |
| B2 observation | readiness.mjs, tests/readiness.test.mjs; shared release/core/admin/UI observations, endpoint contract | Wrong target, absent vs unreadable, failed/pending release, stale rollout, unavailable admin/RPC; no writes |
| B3 install | install.mjs, tests/install.test.mjs; explicit ensure only, A interface, lock, artifact acquisition, native Helm, bounded diagnostics | Denied/missing prerequisite, no-op, mismatch refusal, one install/upgrade, failed hook, timeout/lock; no automatic rollback |
| B4 environment dispatch | infra/environments/platform-plan.mjs and tests; common/render.mjs and pins.mjs + tests; infra-cli.mjs and tests; release install.sh and guard test | Both profiles route same installer; plan no writes; explicit context and memory gate; only Temporal bypasses legacy JSON renderer; other services unchanged |
| B5 tenant and workloads | dev-temporal-tenant.mjs, dev-slot-startup.mjs, dev-shared-core-readiness.mjs, dev-slot-app-graph.mjs, release values, relevant tests/fixtures; retire obsolete bootstrap CLI/test only after replacement | Read-only shared startup, same slot namespace and 1d retention, genuine namespace absence vs transport error, chart admin exec, new endpoint in all app roles; release namespace retained or explicitly provisioned |
| B6 proof consumer reconciliation + final deletion | existing diagnostics, smoke, tenant trial, release preflight, volume/layout guards, old pin/module/CLI imports; update permanent operator docs/runbook | No dangling imports or old active endpoint/resource references; focused tests and source suite; old layout guards replaced by meaningful safety checks; no live work |

B1–B3 may be authored in sequence (B2 and B1 parallel only if frozen object names and no overlap). B4/B5 can follow frozen B2/B3 interfaces in separate task assignments, but no partial main integration that routes to absent infrastructure. B6 parent join after all. Keep task routes short with 2–5 start anchors and exact tests; if a group is too big subdivide mechanically by disjoint file ownership, not new architecture. Do not make a child discover all consumers or design migrations. Final deletion inventory is planner-owned after P3.

### Cross-check discovered additional external dependencies

Source search across original ZIP explicitly skipped infra/platform/temporal/**; targeted current HEAD reads confirm important findings. In addition to [INTEGRATION.md](INTEGRATION.md):
- infra/environments/release/install.sh:139–140 checks Service temporal-server; infra/images/release/test/overlay-guard.test.mjs fixtures match it. Both must change together.
- infra/workloads/profiles/release.yaml:77–78 sets temporalAddress=temporal-server.lab-temporal.svc.cluster.local:7233, temporalNamespace=default. Preserve default for release unless approved migration maps it. Upstream namespace-create:false means explicit release namespace preparation is REQUIRED if it is absent; no silent fallback. Earlier generic 'never default' language applies to dev slots, not existing release.
- tools/dev-environments/src/rendering/dev-slot-app-graph.mjs:64–65 sets endpoint and slot namespace. Update dev projection and workload fixture JSON (dev-1/dev-2/release) and tests/helpers/dev-bindings.mjs; do not change workflow contracts/queues or tenant names.
- infra/verification/release-acceptance/turn03/preflight.mjs:211 legacy temporal-server; update identity/health gate only, preserve TURN03 scope.
- infra/verification/smoke/temporal/{smoke.sh,start-job.yaml,worker.yaml}: legacy server/admin/postgres/PVC assumptions. Remove obsolete topology checks and direct embedded-PG dependencies; retain reusable fixture if compatible. Do not leave known-broken smoke entrypoint on main; C extends evidence, B fixes compatibility or explicitly refuses unsupported old test operation.
- infra/verification/dev-environments/dev-temporal-tenant-trial.mjs imports old constants, creates admin pods, port-forwards old service. Move to new shared identity/transport and correct service; preserve live token and tenant proof.
- infra/verification/diagnostic.mjs references schema-policy.test.mjs, render.test.mjs, release-install.test.mjs; update catalog to actual new tests, preserve unrelated entries. infra/verification/source/test/volume-guard.test.mjs points to old install.sh; replace with negative destructive-operation assertion in new source, not simply removing safety coverage.
- scripts/repo-tools/infra-layout.test.mjs hard-codes old chart template destinations; retire obsolete migration expectations only when new authority exists; preserve other services' layout.
- tools/verification/resources/postgres/docker-plan.mjs depends on Temporal pin; A removes this dependency before B removes pin.
- Existing source suite glob and package/script registrations must be mapped completely at P3. Archived docs/history may retain historical names; active executable/current runbook must not. No broad replacement of every string 'temporal-server' (vendor binary/image names remain valid).

### Atomic acceptance

On integrated B branch, test all affected callers and guard suites; render both chart profiles from verified archive; no active old deployment writer or incompatible imports; source suite truthful PASS/FAIL/NOT-RUN. Parent code-craft review and changed-file format/lint. Main runtime cutover is not automatic when source merges: coordinate operator maintenance boundary before next live ensure/start. If current live legacy resources are still present, new installer refuses rather than coexisting or taking over. Preserve old data and Git history. Approved migration runbook may require source and live steps in a tighter ordered maintenance window; decide at P3 before commission.

## 5. Future Change C: independent reusable verification

Outcome: a provider-free Temporal verification fixture using existing verification infrastructure (not a second global runner), able to prove actual workflow durability/visibility on approved local target. Existing smoke/tenant trial source must already be compatible at B close. C may be unnecessary as a standalone Change if that fixture already satisfies all requirements after B; do not create a packet merely to fill roadmap.

Task groups:
- C1: reuse or narrowly adapt existing deterministic SDK workflow/activity/timer/signal fixtures and worker; unique owned namespace/workflow ID, idempotent activity effects, bounded waits. No game/LLM/provider calls.
- C2: register with existing verification runner and evidence receipt conventions; choose exact command and suite owner after inspecting current verify.mjs and verification programme. infra:verify supports source/diagnostic today, not a fictional smoke/full suite. Keep source tests deterministic with no cluster.
- C3: basic acceptance script: validate target, database schema compatibility (separate diagnostic, not slot readiness), frontend RPC, namespace, workflow completion/history and visibility, repeat ensure no revision change/no intentional rollout, denied target. Explicit report of skipped/unrun checks.
- C4 (optional, separate live permission): worker interruption then same run completion; server interruption only on explicitly authorized idle/owned service. No shared cluster restart, PG failover/restore or production HA proof in default baseline. No automated destructive cleanup, preserve fixture evidence; cleanup only owned data/resources and separately approved.

Acceptance: harness works with injected deterministic transport and exact negative results without live cluster; live acceptance receipts separate. C does not rewrite installer or source architecture; defects return to planner/owning Change.

## 6. Parallelism and collisions

| Pair | Decision | Reason |
| --- | --- | --- |
| A/B | depends-on | A owns prerequisite interface and verification pin; B cannot delete old pin until A lands |
| B/C | depends-on at join | B owns active smoke compatibility and shared diagnostic registrations; C consumes final endpoint/fixture |
| B1/B2 | conditional parallel-write | disjoint files only after render confirms object identities; no common outputs |
| B4/B5 | conditional parallel-write | disjoint paths if exact tests/fixtures separated; parent serializes final shared registrations |
| Live dev/release | serial-shared-resource | one host memory budget, persistent state and operator approval |
| INF60 / other DB work | no assumed parallel safety | check current branches; no shared PG authority edits, package manifest or verification catalog collisions |

No new IDs until catalog collision check. Existing TEMPORAL-INFRASTRUCTURE.md has planner-held INF64–69: proposed roadmap consolidates INF64 into A; INF65–68 into B; INF69 into C (narrow local scope). Do not dispatch those old candidates in parallel, reopen archived INF61–63/70–71, or count their source receipts as runtime proof. On owner acceptance reconcile programme and catalog instead of creating duplicate packets. INF29 remains live evidence tracker; DBOPS/SCALE/DATAOPS/AI01 and other broad initiatives unchanged. No global queue change now.

## 7. Operator live cutover (not a Cursor source Change)

Planner selects exact runbook only after permitted inventory. Default preserve: capture identities, schema versions, shard count, namespace IDs/retention, active executions, and coherent backup/recovery evidence before moving persistence; stop relevant app callers, ensure exclusive approved maintenance; prepare PG stores; migrate or explicitly approved fresh initialization; install verified Helm release; confirm core/namespace readiness and real workflow proof; rebind/start only authorized applications. Old resources/data not deleted automatically. If owner instead explicitly chooses disposable reset, enumerate exact resources, data loss, target and cleanup actions; no implicit reset from 'replace folder'. Verify dev first, release after dev evidence; release data/namespace policy separately checked. Failure stops, captures diagnostics, no automatic rollback of schema. No live permission implied by roadmap or source merge.

## 8. Roadmap adversarial cross-check

| Question | Disposition |
| --- | --- |
| Can all packets start today? | No. P0–P4 material decisions remain, no packet creation/commission. |
| Does splitting native Helm code and caller routing create a broken intermediate main? | Avoided by B atomic source boundary. |
| Can A land without changing active Temporal? | Yes in concept; source-only PG preparation and pin decoupling, no automatic provisioning. Exact A file/CR contract still planner-held. |
| Can old pin be deleted without breaking unrelated PG proof? | Only after A decouples consumer and tests. |
| Is release default namespace silently lost? | No; preserve current contract and explicitly verify/provision as needed. |
| Can a successful Helm hook be mistaken for permanent Job readiness? | No; observe core and RPC; schema proof separately. |
| Does plan require child architecture research? | No future task may do so; P1–P4 explicitly planner-owned. Current roadmap not ready. |
| Is source acceptance mistaken for live adoption? | No; source evidence and operator cutover separate. |
| Is verification another bespoke framework? | No; reuse existing runner and fixture; collapse C if B already meets it. |
| Does it honor old-folder exclusion? | Yes for this review; explicitly prevents deletion/commission until authorized inventory. |

Before actual packet authoring: re-read current HEAD, complete exact source maps and positive/negative commands per task, simulate parent and every child route, then independent G0–G7 audit. No readiness percentages override blockers. This document is the roadmap only; no Change folders created.
