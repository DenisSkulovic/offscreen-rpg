# HK09 | Reconcile open Change inventory and retire duplicate planning

**State:** Done

**Kind:** documentation. **Baseline:** `25d75a9a82716eb87e5c312de3ccde50d33b1e59` on `change/hk09-open-inventory`. No executable code, no provider call, and no cluster lock.

**Evidence:** User's lean ZIP is main@2f45deed with 36 open packet files and intentionally no archive. Live GitHub queue at main@79a28692 references exactly 35 distinct open paths. Since ZIP export, DATA02/K8S06/K8S08/STORY01 merged and archived, and AUD01/AUD02/AUD03 were added. Local Cursor uncommitted changes are unknown. The source of lifecycle authority is .agents/references/change-work-unit-standard.md; open means nonterminal, archive means Done or Cancelled/superseded, and no automatic selection follows being in a program.

## Decision

35 open packets are NOT 35 actively running tasks, nor 35 already-finished unarchived tasks. Most are unimplemented plans. The structural problem is that the same hot folder contains near-term code work, later product experiments, protected paid-provider gates, redundant integration tests and partially implemented changes. **Never archive as Done because a planned prerequisite or conceptual design is done.** Moving future design out of hot queue requires preserving its intended capability in its authoritative product/technical owner and marking the old Change Cancelled/superseded with a reconciliation receipt. Do not create a work/changes/backlog directory without changing the governing policy.

## Complete 35-item recommended disposition ledger

| Packet | Disposition | Exact reason / surviving owner |
| --- | --- | --- |
| AUD01 | ACTIVE | Cursor architecture-document reconciliation; don't collide |
| AUD02 | NEXT | Link fix after AUD01's overlapping docs; full-checkout validation |
| AUD03 | ACTIVE | Cursor snapshot-health scripts; don't collide |
| ENG03 short-lock | DEFER | Measured capture/performance enhancement; preserve engine concurrency intent, no broad refactor |
| GM delegated decision | DEFER | Solo permission/expiry/autonomy future, not necessary for first forkable turn |
| GM standing life | DEFER | Bounded recurring action; no unrestricted simulated living |
| SA07 evidence tools | DEFER | Re-evaluate after DATA06 exact branch-safe memory with corpus benchmark |
| OBS00-B live provider custody | GUARDED FUTURE | Required before paid TURN04, not fake POC; NEVER claim Done or bypass |
| OBS04 finite-action E0 evidence | DEFER | Reinspect overlap with DATA03 and observability before scheduling |
| DIR03 optional art direction | PARTIAL / DEFER | Provider-free appearanceSuggestion already landed; reconcile remaining unapproved live/art experiment |
| HK01 repair helper retirement | GUARDED FUTURE | Never delete unique uncertain-attempt settlement before replacement |
| HK03 storyteller test boundaries | DEFER | 5,232-line suite split is valid but not core POC blocker; preserve red baseline |
| BOOT01 ratify start ownership | CONSOLIDATE | Move unfulfilled contract to BOOT03 and accepted technical docs; close only after transfer |
| BOOT02 fixture import | CORE | Real shared S3 content-package importer |
| BOOT03 GA start | CORE | Single owner creation after DIST03/DATA03 |
| BOOT04 creation E2E | CONSOLIDATE | Retain unique start assertions within TURN03's one fixture |
| DATA03 scene checkpoint publication | CORE | DATA02 merged; must actually write scene checkpoints |
| DATA04 as-of read/fork | CORE | Not implemented; historical fork requires this |
| DATA05 cross-Pod S3 | CORE | K8S05 storage infra smoke is not application wiring |
| DATA06 fork-scoped memory | CORE | ARCH03/05 design is not deployed harness |
| DIST01 transport ratification | CONSOLIDATE | ARCH02 merged, AUD01 settling event path; remaining GA method details belong DIST03 |
| DIST02 broker event schema | REWRITE / CORE | AUD01 must replace Rabbit→Temporal with postcommit business fact contract |
| DIST03 Game Authority | CORE | K8S08 placeholders are not a writer-authority process |
| DIST04 broker integration | REWRITE / CONDITIONAL | Rabbit postcommit event consumer only; no second Temporal wake route |
| DIST05 Storyteller split | CONSOLIDATE | Move pure execution/publication separation checks into STORY03 |
| DIST06 distributed fake continuation | CONSOLIDATE | Unique pre-fork checks into TURN03 one integration fixture |
| K8S10 chaos/load | DEFER | Later curriculum; POC minimum failure drills remain TURN03 |
| K8S11 Next/Nest live edge | CORE | Synthetic K8S09 gateway didn't deploy apps |
| STORY02 task/result custody | CORE | STORY01 merged design, not runtime implementation |
| STORY03 Temporal executor | CORE | One implementation, absorbing DIST05; stable workflow versioning |
| STORY04 memory/publish proof | CONSOLIDATE | Keep unique context and canonical read/publish cases in TURN03 |
| TURN01 fixture acceptance | CONSOLIDATE | Move oracle/fixture to TURN03 PLAN unless independent canonical doc delta remains |
| TURN02 full app release | CORE | Reuse K8S08/K8S11/BOOT02/DATA05, not competing release framework |
| TURN03 final forkable POC proof | CORE | Single cold-kind complete provider-free trace and old-scene fork |
| TURN04 real paid provider | GUARDED FUTURE | Only after TURN03 and separate explicit spending authorization |

## Actual Cursor work required, not merely an audit

1. Re-enumerate ALL nonterminal folders on current full HEAD and local worktrees, checking open paths not referenced by README and archive paths that incorrectly still appear open. Do not trust the lean ZIP or queue alone. Verify active selections. Record source commit and owner for each packet.
2. For CONSOLIDATE packets: transfer every unique implementation requirement, negative test, doc owner and proof into the named surviving Change or an executable PLAN, then cancel/archive the redundant packet with full reconciliation ledger. Specific pairings: DIST05→STORY03; DIST06, BOOT04, STORY04, TURN01→TURN03; DIST01→ARCH02/AUD01/DIST03; BOOT01→BOOT03. If anything unique cannot be transferred, keep packet open and specify the blocker, never silently cancel.
3. For DEFER packets: preserve concrete capability, constraints and resumption trigger under existing product/technical initiative owners. Only then close the stale unselected Change as Cancelled/superseded and repair inbound references. A saved idea is not implemented. In particular, OBS00-B and HK01 are protected safety work; DON'T delete or mark completed, and require explicit source-backed resumption before TURN04.
4. For PARTIAL: DIR03 has landed a provider-free suggestion/parser, not a paid-live art outcome. Compare current source and packet's selected end state. Either document complete selected offline acceptance and archive Done, or retain a narrow residual; don't keep one endlessly Ready due to unapproved optional paid work.
5. For CORE: keep pending code as pending. DATA02/K8S08 being archived Done does not mean DATA03, K8S11 or DIST03 are implemented. Coordinate GA write ownership, publication, and actual cross-Pod S3 before starting dependent work.
6. For REWRITE: AUD01 is currently active and owns DIST02/DIST04 revisions. Do not run HK09 edits to the same docs/queue simultaneously. After AUD01 merge, require these packets to have corrected titles, executable contracts and exact tests: direct outbox→Temporal for durable workflow; independent RabbitMQ postcommit facts for replayable derived consumer, not broker-to-Temporal choreography.
7. Rewrite work/changes/README.md HOT section, rather than append a new 'current' table behind obsolete ones. Show one active batch, a small source-truth next-execution tier, gated dependencies, and a compact pointer to existing initiative roadmaps for later features. Historical status statements must be dated/moved to archival evidence or removed from current-tense exposition.
8. Inspect preventive HK06/HK07/HK08 and repo:maintenance/change guard. If needed, make a separate narrowly authorized script Change to detect: open packet missing queue reference, Done/Cancelled packet still under open, duplicate current active status, Cancelled without successor or retained requirement, and stale current-tense status across queue sections. Don't widen HK09 silently into new tooling.
9. Run on the complete Node 24 workspace: repo:brief, repo:maintenance, docs-health, wiki:health and wiki:change-guard close, plus archive/link validation. Record actual pass/fail/not-run, old/new packet counts, archive moves and source SHA. Lean archive omissions do not prove missing files.

## Suggested compact execution order

**Unchanged active:** AUD01 and AUD03. **After AUD01:** AUD02 and HK09 coordination. **Immediate engineering candidates after explicitly selected and dependencies land:** DIST03, DATA03, DATA05, STORY02, K8S11, BOOT02, corrected DIST02. **Then:** DATA04/06, BOOT03, STORY03, TURN02 and justified broker subscriber. **Single final provider-free proof:** TURN03. Other features are program backlog, not a list of authorized execution tasks.

## Negative tests for the housekeeping

- No unimplemented feature appears archived as Done.
- No needed product decision or acceptance case disappears in a cancellation.
- No redundant end-to-end test harness or extra app service is introduced.
- No local Cursor branch, active audit file owner or shared cluster is overwritten.
- Current change: none can coexist with separately authorized active batch; that alone is not inconsistent.
- No provider charge, destructive data action or global schema migration.

## Four-plane planned impact and closing ledger

| Plane | Expected effect | Proof |
| --- | --- | --- |
| Product | Retain deferred autonomy/art direction/memory goals honestly | Explicit owner and resumption trigger per cancelled packet |
| Technical | Preserve merged ARCH02–05 authority and old-scene invariant | One surviving contract per executable concern |
| Code | None by default; real guard scripts require separate Change | No gameplay code diff |
| Related | Archive only reconciled Done/Cancelled, slim queue, repair links | Count each current open packet exactly once, full-checkout checks |

**Closure:** the sections below are the executed receipt. The table above was the proposal. Six duplicate packets were cancelled, not marked Done. Packets that still need a product decision stayed open. No `work/changes/backlog/` directory was created.

## Execution result (2026-11-19)

Re-enumerated `work/changes/open/` on `25d75a9a82716eb87e5c312de3ccde50d33b1e59`. Thirty-four nonterminal `CHANGE.md` files were present. AUD01 and AUD03 were already archived. DATA02, K8S06, K8S08, and STORY01 were already merged. DIR03's provider-free suggestion was already landed. A story wake remains a direct SQL outbox to Temporal. RabbitMQ remains an optional post-commit fact. There is no Game Economy service.

Cancelled/superseded, not Done:

- `work/changes/archive/2026-11/other/2026-11-19--dist05-storyteller-execution-worker-split/CHANGE.md` into `work/changes/open/2026-11-19--story03-separate-temporal-executor-and-publication/CHANGE.md#absorbed-dist05-cases-2026-11-19`
- `work/changes/archive/2026-11/other/2026-11-19--dist06-first-distributed-turn-integration/CHANGE.md` into `work/changes/open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md#absorbed-pre-fork-and-scorecard-cases-2026-11-19`
- `work/changes/archive/2026-11/other/2026-11-19--boot04-distributed-creation-e2e-fixture/CHANGE.md` into the same TURN03 section
- `work/changes/archive/2026-11/other/2026-11-19--story04-cross-service-memory-and-publish-proof/CHANGE.md` into the same TURN03 section
- `work/changes/archive/2026-11/other/2026-11-19--turn01-ratify-unified-poc-acceptance/CHANGE.md` into the same TURN03 section
- `work/changes/archive/2026-11/other/2026-11-19--boot01-ratify-candidate-and-start-ownership/CHANGE.md` into `work/changes/open/2026-11-19--boot03-game-authority-start-admission/CHANGE.md#absorbed-boot01-cases-2026-11-19`

Left open on purpose:

- `work/changes/open/2026-11-19--dist01-ratify-game-authority-delivery-boundaries/CHANGE.md` stays open. The single-writer, no-second-schema-writer, Storyteller-does-not-commit, and command-idempotency notes are already in `work/changes/archive/2026-11/other/2026-11-19--arch02-service-ownership-and-event-contracts/CHANGE.md`. DIST03 already requires one admitted receipt for its one operation. The remaining per-topic route table does not fit that seam.
- `work/changes/open/2026-11-17--dir03-storyteller-art-direction-author/CHANGE.md` stays Ready. The live creative trial is still unauthorized.
- `work/changes/open/2026-11-15--obs00-live-provider-custody/CHANGE.md` and `work/changes/open/2026-11-17--hk01-retire-local-repair-helper/CHANGE.md` stay open. They were not deleted and were not marked Done.
- Deferrals stay open because preserving them would edit forbidden product or technical pages, or a core packet body that this Change must not rewrite: `work/changes/open/2026-11-13--eng-short-lock-context/CHANGE.md`, `work/changes/open/2026-11-13--gm-delegated-decision/CHANGE.md`, `work/changes/open/2026-11-13--gm-standing-life/CHANGE.md`, `work/changes/open/2026-11-14--sa07-evidence-tools/CHANGE.md`, `work/changes/open/2026-11-15--obs04-finite-action-transition-evidence/CHANGE.md`, `work/changes/open/2026-11-17--hk03-storyteller-test-boundaries/CHANGE.md`, and `work/changes/open/2026-11-19--k8s10-distributed-fault-and-load-harness/CHANGE.md`. K8S10's full chaos program does not fit TURN03, which already excludes that program.
- Core packets stay open and unimplemented. `work/changes/open/2026-11-19--data05-cross-pod-canonical-s3-connection/CHANGE.md` was not edited. DIST02 and DIST04 were not edited again.
- Design-note links left for AUD02, because this Change must not edit `work/designs/open/distributed-turn-poc/`: `work/designs/open/distributed-turn-poc/D4-STORYTELLER-HANDOFF.md`, `work/designs/open/distributed-turn-poc/D5-RELEASE-AND-ACCEPTANCE.md`, and `work/designs/open/distributed-turn-poc/GAPS.md`.

Queue edits are in `work/changes/README.md` and `work/changes/ledger/2026-11.md`. One current-tense active batch remains in the batch orchestration note: AUD02, HK09, DATA05. Older batch sentences in that file were dated.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no player-facing promise was edited and no deferred idea was marked implemented | work/changes/README.md | Deferred packets stay open |
| Technical | unchanged because no canonical technical page was edited and the direct Temporal wake stays in force | work/changes/archive/2026-11/other/2026-11-19--arch02-service-ownership-and-event-contracts/CHANGE.md | No Economy service was added |
| Code | unchanged because this Change edits Markdown lifecycle files only. Negative: an unimplemented feature must not be archived as Done | work/changes/archive/2026-11/other/2026-11-19--hk09-reconcile-open-change-inventory/CHANGE.md | No source behavior changed |
| Related | changed: work/changes/README.md#distributed-architecture-laboratory-new-2026-11-19 now has one current batch sentence, and the survivor packets keep the moved acceptance cases | work/changes/ledger/2026-11.md | Cancelled packets are not Done |

## Document shape | shape-ops.v1

| File | Operation | Migration | Conservation |
| --- | --- | --- | --- |
| work/changes/open/2026-11-19--story03-separate-temporal-executor-and-publication/CHANGE.md#absorbed-dist05-cases-2026-11-19 | MERGE | work/changes/archive/2026-11/other/2026-11-19--dist05-storyteller-execution-worker-split/CHANGE.md#acceptance-positive-and-discriminating-negative -> work/changes/open/2026-11-19--story03-separate-temporal-executor-and-publication/CHANGE.md#absorbed-dist05-cases-2026-11-19 | The Storyteller process must not gain SQL permission to mutate mechanical state or the published root. |
| work/changes/open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md#absorbed-pre-fork-and-scorecard-cases-2026-11-19 | MERGE | work/changes/archive/2026-11/other/2026-11-19--dist06-first-distributed-turn-integration/CHANGE.md#acceptance-positive-and-discriminating-negative -> work/changes/open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md#absorbed-pre-fork-and-scorecard-cases-2026-11-19 | A 202 response must not display an uncommitted scene. |
| work/changes/open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md#absorbed-pre-fork-and-scorecard-cases-2026-11-19 | MERGE | work/changes/archive/2026-11/other/2026-11-19--boot04-distributed-creation-e2e-fixture/CHANGE.md#acceptance-normal-and-discriminating-negatives -> work/changes/open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md#absorbed-pre-fork-and-scorecard-cases-2026-11-19 | Production-style app Pods must not mount the content directory. |
| work/changes/open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md#absorbed-pre-fork-and-scorecard-cases-2026-11-19 | MERGE | work/changes/archive/2026-11/other/2026-11-19--story04-cross-service-memory-and-publish-proof/CHANGE.md#acceptance-and-negative-tests -> work/changes/open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md#absorbed-pre-fork-and-scorecard-cases-2026-11-19 | A wrong branch, a stale task, or an invalid document patch must not create a half-published scene or a second billable request. |
| work/changes/open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md#absorbed-pre-fork-and-scorecard-cases-2026-11-19 | MERGE | work/changes/archive/2026-11/other/2026-11-19--turn01-ratify-unified-poc-acceptance/CHANGE.md#acceptance--negative-proofs -> work/changes/open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md#absorbed-pre-fork-and-scorecard-cases-2026-11-19 | A local or Compose shortcut, or a fake database succeeded row, is an explicit fail. |
| work/changes/open/2026-11-19--boot03-game-authority-start-admission/CHANGE.md#absorbed-boot01-cases-2026-11-19 | MERGE | work/changes/archive/2026-11/other/2026-11-19--boot01-ratify-candidate-and-start-ownership/CHANGE.md#acceptance-normal-and-discriminating-negatives -> work/changes/open/2026-11-19--boot03-game-authority-start-admission/CHANGE.md#absorbed-boot01-cases-2026-11-19 | An arbitrary success row must not start a story. |

## Migration receipt | shape-receipt.v1

| Old owner | Successor | Unique claim |
| --- | --- | --- |
| work/changes/archive/2026-11/other/2026-11-19--dist05-storyteller-execution-worker-split/CHANGE.md#acceptance-positive-and-discriminating-negative | work/changes/open/2026-11-19--story03-separate-temporal-executor-and-publication/CHANGE.md#absorbed-dist05-cases-2026-11-19 | unique negative: The Storyteller process has no SQL permission to mutate mechanical state or the published root. |
| work/changes/archive/2026-11/other/2026-11-19--dist06-first-distributed-turn-integration/CHANGE.md#acceptance-positive-and-discriminating-negative | work/changes/open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md#absorbed-pre-fork-and-scorecard-cases-2026-11-19 | unique negative: A 202 response must not display an uncommitted scene. |
| work/changes/archive/2026-11/other/2026-11-19--boot04-distributed-creation-e2e-fixture/CHANGE.md#acceptance-normal-and-discriminating-negatives | work/changes/open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md#absorbed-pre-fork-and-scorecard-cases-2026-11-19 | unique negative: Production-style app Pods must not mount the content directory. |
| work/changes/archive/2026-11/other/2026-11-19--story04-cross-service-memory-and-publish-proof/CHANGE.md#acceptance-and-negative-tests | work/changes/open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md#absorbed-pre-fork-and-scorecard-cases-2026-11-19 | unique negative: A wrong branch, a stale task, or an invalid document patch must not create a half-published scene or a second billable request. |
| work/changes/archive/2026-11/other/2026-11-19--turn01-ratify-unified-poc-acceptance/CHANGE.md#acceptance--negative-proofs | work/changes/open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md#absorbed-pre-fork-and-scorecard-cases-2026-11-19 | unique negative: A local or Compose shortcut, or a fake database succeeded row, is an explicit fail. |
| work/changes/archive/2026-11/other/2026-11-19--boot01-ratify-candidate-and-start-ownership/CHANGE.md#acceptance-normal-and-discriminating-negatives | work/changes/open/2026-11-19--boot03-game-authority-start-admission/CHANGE.md#absorbed-boot01-cases-2026-11-19 | unique negative: An arbitrary success row must not start a story. |

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| .agents/references/change-work-unit-standard.md | agent rule | unchanged: open still means nonterminal and archive still means Done or Cancelled/superseded | no source behavior changed; baseline 25d75a9a82716eb87e5c312de3ccde50d33b1e59 | reviewed | A cancelled duplicate was not labeled Done | work/changes/README.md |
| work/changes/README.md#distributed-architecture-laboratory-new-2026-11-19 | related | changed: one current-tense active batch remains AUD02, HK09, and DATA05, and older batch sentences are dated | no source behavior changed; baseline 25d75a9a82716eb87e5c312de3ccde50d33b1e59 | reviewed | A second undated active batch sentence would falsify this row | work/changes/ledger/2026-11.md |
| work/changes/open/2026-11-19--story03-separate-temporal-executor-and-publication/CHANGE.md#absorbed-dist05-cases-2026-11-19 | related | changed: DIST05 acceptance cases and negatives now live here and the split is still unimplemented | no source behavior changed; baseline 25d75a9a82716eb87e5c312de3ccde50d33b1e59 | reviewed | The Storyteller process must not gain SQL permission to mutate mechanical state or the published root | work/changes/archive/2026-11/other/2026-11-19--dist05-storyteller-execution-worker-split/CHANGE.md |
| work/changes/open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md#absorbed-pre-fork-and-scorecard-cases-2026-11-19 | related | changed: DIST06, BOOT04, STORY04, and TURN01 cases now live here and the cold-cluster proof is still unimplemented | no source behavior changed; baseline 25d75a9a82716eb87e5c312de3ccde50d33b1e59 | reviewed | A 202 response must not display an uncommitted scene | work/changes/archive/2026-11/other/2026-11-19--dist06-first-distributed-turn-integration/CHANGE.md |
| work/changes/open/2026-11-19--boot03-game-authority-start-admission/CHANGE.md#absorbed-boot01-cases-2026-11-19 | related | changed: BOOT01 start cases now live here and start admission is still unimplemented | no source behavior changed; baseline 25d75a9a82716eb87e5c312de3ccde50d33b1e59 | reviewed | An arbitrary success row must not start a story | work/changes/archive/2026-11/other/2026-11-19--boot01-ratify-candidate-and-start-ownership/CHANGE.md |
| work/changes/open/2026-11-17--dir03-storyteller-art-direction-author/CHANGE.md | related | unchanged: the packet stays Ready because the live creative trial is still unauthorized | no source behavior changed; baseline 25d75a9a82716eb87e5c312de3ccde50d33b1e59 | reviewed | Archiving DIR03 as Done would claim the live trial happened | work/changes/README.md |
| player-facing promises and canonical technical pages | product | unchanged: no product page and no technical page was edited, so deferred ideas and the direct Temporal wake stay where they were | no source behavior changed; baseline 25d75a9a82716eb87e5c312de3ccde50d33b1e59 | reviewed | No unimplemented feature was archived as Done | work/changes/open/2026-11-19--dist01-ratify-game-authority-delivery-boundaries/CHANGE.md |

Verification before archive: `pnpm wiki:change-guard --mode plan` returned ok with no findings. `pnpm wiki:change-guard --mode close --base 25d75a9a82716eb87e5c312de3ccde50d33b1e59` returned ok. The only close findings were citation-candidate warnings on pages that already cite `work/changes/README.md`. Those pages were not edited. `python3 scripts/check_docs.py` still reports the design-note links named above, plus a pre-existing ROADMAP fragment and two design-note slugs that already pointed at folders this tree does not contain. No provider was called.
