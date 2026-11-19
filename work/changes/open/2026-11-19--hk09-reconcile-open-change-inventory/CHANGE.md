# HK09 | Reconcile open Change inventory and retire duplicate planning

**State:** Proposed housekeeping reconciliation, 2026-11-19. **Kind:** substantive documentation/lifecycle cleanup; no gameplay code or paid calls. **Selection:** not part of current Cursor active batch AUD01/AUD03.

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

**Closure:** fill per-packet reconciliation ledger with exact path/sha, original disposition, retained acceptance destination, link repair and tests. Archive HK09 as Done only when actual lifecycle moves and queue cleanup land. Until then this table is an execution proposal, not a completed cleanup.