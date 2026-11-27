# Bounded Cursor parent orchestration | integration batches, truthful closure, economical Git

**Purpose:** implement one commissioned, predesigned Change with minimum parent context and safe ownership. [AGENTS.md](../../AGENTS.md) owns permissions, current integration target and the implementation/acceptance split. [Submission standard](planning-artifact-quality.md) owns scale: one outcome, normally 5–10 minutes active implementation and 1–5 tasks, at most seven actual assignments. This procedure does not select work or grant live-resource permission.

## Dependency readiness is not a planner blocker

Dispatch only selected, commissioned tasks whose frozen prerequisites hold. Ready (dependency-gated) work may wait for an exact predecessor receipt/source postcondition, without new approval. Verify named symbols against HEAD; allow mechanical reconciliation, stop on changed interface, authority, ownership or safety semantics. Return missing decisions to ChatGPT; no broad rediscovery or invented architecture. Creating a specified new test harness does not require an existing harness.

## Mandatory Change branch policy

1. Identify actual repository, recorded integration target and HEAD; inspect primary checkout status and `git worktree list --porcelain`. Main is current trunk; another target requires explicit authorization. No new joins to former Storyteller Workshop branch. Preserve in-flight work.
2. Before edits, create a dedicated linked sibling worktree: `git worktree add -b change/<id>-<slug> <sibling-directory> <reference-branch>`, or reuse only the correctly assigned existing worktree. All parent/child writes, tests and commits occur there. Never switch primary checkout, steal worktree or discard changes. One branch per Change, not per T-ID. If direct work already began, preserve it and isolate future writes at a safe checkpoint.
3. Run `node scripts/repo-tools/change-branch-guard.mjs --change <ID> --target <reference-branch>` in that worktree before first edit/dispatch. Use --resume only after inspecting reference drift. Guard is read-only, not permission or proof; never force-reset to satisfy it.
4. For parallel Changes name one integration custodian (existing coordinator or owner) before dispatch. Each parent owns its branch and receipts; custodian serializes shared paths, canonical headings, migrations, catalogs, queue/status and joins in designated integration checkout. Single parent is its own custodian by default. Coordinate conflicts before touching shared integration files; no new approval ritual.
5. At accepted closure refresh actual reference, reconcile safe changes, squash-integrate by default, verify result and retire only clean fully integrated worktree/branch. No forced worktree removal, reset or overwrite. Squash-merged branch deletion with -D is allowed only after verifying its content landed and checkout is clean. Do not create another cleanup automation to guess ownership.

Undertaking custodian reconciles accepted receipt, STATUS and technical ledger with OVERVIEW.md at the same serialized join. Reestimate overall and major-track completion/remaining with uncertainty only when milestones, risk or priorities actually changed. ChatGPT presents supervisor recap; not a child task.

## 0a. Budget-first Composer dispatcher contract (2026-11-21)

Read CHANGE.md, TASKS dispatch index (if present), current branch/worktree and first ready T-ID's named anchors. Check [submission scale](planning-artifact-quality.md#4-submission-scale-and-measurement); reject new malformed/unbounded commission. Do not audit architecture, preload all source/contract files, enumerate callers or design tests from scratch. Consult precise linked sections as needed.

**Default:** Composer Standard parent and implementer child. For multiple substantive PATCH tasks, delegate the first substantive task and continue bounded dispatch. Direct parent edits only for truly mechanical, locally understood changes cheaper than delegation; one file can still contain substantive authorization, transaction or state work. Record brief reason for direct edit. No delegation ritual for routine Git/closure, pure VERIFY or tiny single edit. If runtime lacks subagents, disclose; direct bounded path only if cost/correctness justify it.

One child at a time normally. Up to two disjoint ready children when planner's frozen dependency/ownership matrix proves independence including generated files, test fixtures, resources and Git index. No wider concurrency without explicit collision-free schedule. Combining adjacent tiny tasks requires same frozen contract/write ownership and shared proof; count actual assignments under seven-task ceiling, never hide larger scope in subcards.

Parent validates receipts/diffs, integrates dependency results, then selects next ready task. Child cannot spawn children. No alternate implementations, broad quality sweeps, model comparisons, excessive tuning or unapproved expensive-model escalation. [Model budget](cursor-model-budget-policy.md) · [Task format](composer-first-execution.md).

## 0. Dedicated Change commission owner shorthand

"Do DXK01" or equivalent unambiguous named assignment authorizes that Change for its parent even if [QUEUE](../../work/QUEUE.md) selects another item. It does not authorize siblings, new architecture, spending or unassigned heavy/live proof. Continue all commissioned implementation tasks across internal checkpoints; no owner prompt for unchanged authorized next T-ID. Never auto-start a successor.

### Finish-to-reference-branch responsibility

Use the [integration checkpoint](#3-integration-checkpoint-do-this-once-per-batch-not-per-child) to commit source and determine acceptance disposition. At heavy-acceptance handoff stop IMPLEMENTED — ACCEPTANCE PENDING, retain worktree/branch and transfer exact source receipt to ChatGPT/owner. Resume closure after accepted evidence, not merely a successful child. Cheap-only Changes proceed to closure autonomously when all required proof passes. Independent post-integration review is normally a follow-up; an explicitly selected pre-merge independent review must pass first. Never waive required evidence or safety failures.

### What is *not* a legitimate reason to linger or stop

A completed child, clean intermediate commit, optional future improvement, different global selector after explicit commission, ordinary docs/Git/cheap-test work or desire for another planner opinion is not a blocker. Close the bounded outcome when its own required evidence exists; separately owned broader system proof stays with its selected owner. Do not relabel a required gate as optional or inflate scope.

### Genuine early-stop conditions

Stop the affected work for actual unresolved design/authority/transaction or safety contradiction, ungranted paid/destructive/live permission, missing indispensable prerequisite/environment, unsafe collision, failing required proof, or repeated unexplained failure. Ordinary compiler/import/fixture errors are local debugging: one focused diagnosis and one materially changed retry per unexplained invariant, not a global two-error quota. If still failing, return T-ID, file:symbol, failed assumption, smallest reproducer and concrete planner/owner question. No repeated timeout tuning or expensive-model upgrade. A dirty or uncertain ownership state stops further writes until reconciled.

## Diagnosis and end-state

One parent delivers a coherent source diff, focused proof and recoverable commit for one Change, or a truthful blocker. Acceptance and Done are distinct. Optimize total accepted outcome cost including rework, not child utilization or number of closed folders.

## 1. Declare a finite batch before dispatch

A batch is only an internal scheduling/checkpoint envelope within one Change, not another folder, selector or approval. Keep in chat: Change/T-IDs, HEAD, outcome, write/resource owners, allowed checks and stop conditions. Checkpoint after at most five dispatches or one risky join, then continue remaining authorized tasks (seven total maximum) without repeated approval. Never expand to unrelated ready work.

### Context-isolation delegation: use Auto for boring-but-bulky missions

Use Auto utility-worker for bounded deterministic chores with known output, when noisy/multiple reads or repetitive edits would pollute parent context: Git status/ref summaries, exact occurrence/link collection, decided doc moves, test counts. No child for a trivial two-command operation; no ambiguous bug hunt, architectural/security/transaction decisions or nested agents. Return concise facts and stop at nonmechanical contradiction. This does not authorize additional independent task scope.

## 2. Cheap children; parent owns reconciliation

Give one T-ID, 2–5 real source/test anchors, exact mandatory contract sections, permitted write paths, decided edit, normal/negative test commands and stop condition. Child verifies nearby source, implements, runs focused checks and returns:

```text
<ID> | PATCH/VERIFY/INVESTIGATE | PASS/FAIL/NOT-RUN | achieved outcome
Files: owned changed paths; worktree/commit or none
Proof: exact command/result/exit; evidence tier
Negative: observed refusal or NOT RUN with reason
Docs: affected canonical owner or none
Blocker/next: precise missing condition or none
```

INVESTIGATE is only a precisely bounded factual assignment, not design. Six lines normally; details only for material failure/contradiction. Keep raw logs in terminal/evidence. Completion notification and return are one event; acknowledge decision, not repeat receipt. Shared-checkout children must not stage/commit; isolated child may commit locally only when needed for clean join. Parent owns staging, final receipt, documentation, acceptance handoff and closure. No full suite, ledger, archive or commit ceremony per child.

## 3. Integration checkpoint: do this once per batch, not per child

1. Inspect HEAD, status, relevant diff and receipts; identify unrelated changes/collisions. Stage exact owned paths only; inspect staged diff, whitespace and obvious secrets. No blind add -A, reset, clean, forced stash, amend or force-push.
2. Inspect changed code against [code craftsmanship](../rules/code-quality.md): meaningful responsibilities, trust-boundary validation, safe types, readable phases and invariant comments. Run changed-file Prettier and eslint.quality.config.mjs where available, assigned focused normal/diagnostic negative tests and necessary cheap boundary checks. Broader typechecks/suites/maintenance/guards only at required tier/join, not every child. Reuse trustworthy unchanged evidence; skipped checks NOT RUN.
3. Commit coherent source milestone (not per child). If remaining commissioned tasks are ready, continue. If mandatory heavy proof remains, record IMPLEMENTED — ACCEPTANCE PENDING and transfer exact SHA/commands/prerequisites to ChatGPT/owner. No merge/archive/retirement. If blocked, keep open, preserve safe work, record specific residual test/permission/decision and owner. Never claim Done from structural proof alone.
4. When all required acceptance exists, reconcile actual outcome against original scope, canonical product/technical docs and affected-claim ledger. Run applicable plan/close guards and link/maintenance checks; mark Done, archive, repair inbound links/catalog/roadmap/queue/status in same ownership window. New independent ambitions belong in a separately selected Change, not appended to this one.
5. Commit closure, refresh recorded reference, reconcile conflicts without history loss, squash-integrate by default through custodian, rerun smallest necessary join checks, verify reference SHA and archive placement, retire clean worktree/branch. If source changed since accepted proof, assess and rerun affected proof before claiming acceptance; no ornamental duplicate full sweep.

## 4. Parent stop conditions and context budget

Checkpoint after five dispatches, risky join or ownership transition; these are internal continuation points. Stop at completion, heavy-acceptance handoff or genuine blocker above. If context no longer establishes ownership/staged state, stop new writes and recover exact state. Never skip safety to hit the time target. No hidden cross-Change auto-next. Repository text cannot cap model runtime/UI or prove compliance.

## 5. Minimal batch receipt (parent, not children)

```text
Change / target / starting HEAD / committed SHA
Tasks: completed; failed/NOT-RUN + reason
Proof: commands/cwd/results/negative/evidence tier
Disposition: Done+archive | IMPLEMENTED — ACCEPTANCE PENDING | open blocker
Docs/guards: owners and run/pass/fail/not-run
Resources/Git: ownership, uncommitted paths, worktree/branch, final target SHA if integrated
Next: exact acceptance or planner/permission condition; no auto-next
Usage: measured cost/time if known, otherwise unknown
```

One concise final receipt. Persist a small [session handoff](../../work/sessions/README.md) only when recovery genuinely needs it; no shadow status or private transcript. Parent/child task assignments remain within the [work taxonomy](../../work/WORK-TAXONOMY.md).

## 6. What can and cannot be automated

Existing guards detect structural defects, not semantic correctness or runtime success. Compare actual proof to accepted outcome; never infer Done from child completion or commit count, auto-archive unproven work, or defer required acceptance just to close a packet. Automate demonstrated mechanical gaps only via bounded tested work. [Usage evaluation](cursor-usage-evaluation.md) is opt-in, not per-Change ceremony.
