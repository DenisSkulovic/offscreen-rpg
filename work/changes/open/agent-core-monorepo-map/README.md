# Agent Core E1 | current sprint implementation group

| Field | Value |
| --- | --- |
| Repository | DenisSkulovic/offscreen-rpg |
| Reviewed exact design | `5ea13cc6ac6ade8c3909acbecd54a039ceeb17fe`, original independent DEFENDED verdict preserved with acceptance patch |
| Inspected source baseline | `1cf22fe0f512b5dd92b5cedaa2d35a3fe27cee7c` on main; no source edits in planning |
| Permanent authority | [Agent Core technical contract](../../../../docs/technical/platform/agent-core.md), [package map](../../../../packages/README.md) |
| Design implementation branch | `implementation/agent-core-monorepo-map`; create only on owner commission from verified main containing promoted design and these packets |
| Standing | Independent review of `7b90ad10119fb300e04beaf35c8069205e1b12fd`: AC01–AC07 READY, AC08 H01 blocked. Corrections delivered; targeted impact confirmation pending for affected cards; no named implementation commission or live operation yet |

## Change register and execution order

All eight are current E1 scope, not backlog. Source dependencies below are actual prerequisites; acceptance dependency is all seven sources before AC08 joint proof. Frozen shared interfaces in the selected contract and packet INTERFACES/EXECUTION files. No unresolved future architecture assigned to coding agents. Deferred production gates remain in technical owner.

| Change | Outcome | Source prerequisites | Tasks | State |
| --- | --- | --- | ---: | --- |
| [AC01](2026-11-27--ac01-grouped-image-workspaces/CHANGE.md) | Grouped workspace image and sync compatibility | None | 2 | READY; small selected refinement pending impact confirmation |
| [AC02](2026-11-27--ac02-grouped-repository-checks/CHANGE.md) | Grouped source and repository knowledge checks | None | 3 | READY |
| [AC03](2026-11-27--ac03-workspace-and-contracts/CHANGE.md) | Agent Core workspace, dependency pins and pure contracts | None | 3 | READY |
| [AC04](2026-11-27--ac04-mission-policy-context/CHANGE.md) | Deterministic mission admission, context and execution limits | AC03 | 2 | READY (dependency-gated) |
| [AC05](2026-11-27--ac05-capability-registry-dispatch/CHANGE.md) | Explicit capability registry and guarded tool wrappers | AC03, AC04 | 2 | READY (dependency-gated) |
| [AC06](2026-11-27--ac06-native-loop-runtime/CHANGE.md) | Native Vercel loop and Workflow-safe execution composition | AC03, AC04, AC05 | 2 | READY (dependency-gated) |
| [AC07](2026-11-27--ac07-synthetic-fixtures/CHANGE.md) | Stateless synthetic model, definition and tool fixtures | AC03 | 3 | READY (dependency-gated); small refinement pending impact confirmation |
| [AC08](2026-11-27--ac08-integration-qualification/CHANGE.md) | Maintained runtime qualification and E1 joint acceptance | AC01, AC02, AC03, AC04, AC05, AC06, AC07 | 5 | H01 corrected; targeted re-review pending |

## Readiness disposition

[Original independent readiness review](READINESS.md) is preserved verbatim from the owner-supplied reviewer report, exact reviewed SHA above (not a verdict on subsequent edits). Zero Critical, one High, three Medium, one Low. AC01–AC07 original readiness can be reused for unchanged scope; AC02/03 first eligible upon commission, AC04–06 after their original prerequisites. AC01 classifier and AC07 adversarial fixture refinements are explicitly selected by this correction, pending narrow impact confirmation alongside AC08 T03/T05. H01 corrected by removing the live Docker test from offline commands; no additional architecture defense or full-batch review. Reviewer confirms the corrected cards and changed proof/ownership only; no claim of independent re-review or test execution here. E1-IR-M01 → package organization limitations, M02/M03 → Agent Core technical owner; L01 mechanically corrected. No new Change or task. Original verdict and correction do not commission implementation.

## Parallel execution and ownership

- First independent candidates AC01 (image graph/sync), AC02 (repository checks), AC03 (workspace/manifests/lock/contracts), after readiness + explicit commission. Each uses own Change branch and linked worktree, no shared index. AC03 is sole `pnpm-workspace.yaml`/`pnpm-lock.yaml` writer; never run competing lock edits. AC01/02 tests use current flat source plus temp grouped fixtures; AC03 manifest may land before tools, isolated incomplete source allowed, no main/deploy or broad qualification.
- AC04 and AC07 can start after AC03 source join; AC07 writes only test fixtures, AC04 writes pure admission/limits/context. AC05 after AC04, AC06 after AC05. AC07 may run beside AC05/06 because frozen interface and disjoint paths. AC08 after all seven source joins; owns test-local adapter, scenario/recovery harness, final docs/status and integration. No shared test outputs/worktree. AC08 uses one live namespace/queue at a time, only acceptance lead/owner runs live. No multi-agent swarms; one coordinator per Change, one bounded child normally. Internal task lists serial, no artificial parallel workers.
- AC01/AC02/AC03 write independent source paths but share target catalog/ledger and Git merge index; serialized by existing `repo:change-lifecycle integrate` target lock; never merge stale schedule copies. AC03 lockfile conflicts with any outside package dependency work: stop and reconcile with actual current base, never overwrite. Parallel observability work is separate branch; inspect actual worktrees and any changed shared scripts/lockfiles before join. No speculative worktree claims by planner.
- Construction may integrate before final compile/runtime proof under source-only gate; only AC01/02 focused local tests and AC03 exact dependency resolution are assigned early. AC08 offline build/typecheck/tests and source-based release checks once complete (no Docker builds/runs), acceptance lead owns exact baseline/candidate closure comparison, four-app builds/typechecks, dependency and live matrix. Expected incomplete workflow export/test files before AC06/08 are not failures to debug on construction branches. Do not disable CI; no incomplete main integration or exposure.

## Shared contracts and permanent findings

AC03 pure contracts and `missionWorkflowId`, AC04 `admitMission/assembleContext/MissionLedger/resolveOutcome`, AC05 `CapabilityBinding/SyntheticToolRequest/DispatchSyntheticTool/createSdkTools`, AC06 `executeMission` + trusted bindings, AC07 static fixture constants/definitions/model/tool factory; AC08 test-local adapter and host. Exact internal interfaces are in the relevant packet INTERFACES.md; later code and package README must remain discoverable after archive. AC-M01 + affected and wiki path blind spots → AC02, AC-M02 → AC06, AC-M03 → AC07, AC-M04 → AC03/08, AC-L01 normal retirement. Existing Worker Zod baseline note stays in Worker README. No production authority, SQL/Redis, paid model, delegate, persistence or package move. Record still-relevant limits/unknowns in permanent technical owner/README before each packet retirement.

## Proof and closure

AC08 [joint proof](2026-11-27--ac08-integration-qualification/PROOF.md#joint-acceptance-matrix) retains all mandatory E1 acceptance. Archive each completed Change in same commission after own assigned gate, before reporting source integration; join only design branch, under current lifecycle and target lock. A source-only join is not qualification. Update group register under target lock; if last packet archived, transfer joint proof and provenance to durable owner/Design as required and retire group index. Owner-operated live qualification explicitly authorized separately, only isolated dev Temporal. Main merge requires exact final joint matrix pass, durable evidence/limitations reconciled, owner permission, no unresolved Critical/High scope defect. After a native qualification failure, acceptance lead retains the failed receipt and routes ordinary source defects through a narrowly scoped explicitly commissioned repair Change on the design implementation branch; rerun affected proof on corrected SHA, with material contradictions returned to planner. No new review for mere wording. No successor auto-commission. Retire design with original immutable verdict/evidence and links once obligations fulfilled/transferred.

## Planner self-check / submission limits

Source audit compared snapshot to current main; no affected source drift; source anchors include actual graph/sync, module scanner, affected manifest, wiki classifiers, config and existing POC, pinned SDK callback/Activity downloader source, namespace helper. New code planned, not run. Every task has named files, interface/algorithm, negative, source/assigned proof boundary and stop; parallel writers disjoint except explicitly serialized joins. Each card simulated against its named anchors and frozen predecessor outputs; AC03 resolution is an early gate, AC08 requires all predecessor source and final live authorization. No claim independent review, local pnpm install, runtime proof or verified active WSL worktrees. Exact actual checkout applicability and readiness reviewer still required. Medium/Low findings do not trigger new review by themselves. The original independent G0–G7 review is retained above; run applicable current plan guard and targeted impact re-review for corrected cards. Reuse unaffected evidence, verify actual candidate SHA before commission. No implementation commission in this artifact.
