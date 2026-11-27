# Bounded implementation coordination | integration batches, truthful closure, economical Git

**Purpose:** implement one commissioned, predesigned Change with minimum parent context and safe ownership. [AGENTS.md](../../AGENTS.md) owns permissions, current integration target, severity and the implementation/acceptance split. [Submission standard](planning-artifact-quality.md) owns scale: one preferred outcome, normally 5–10 minutes of active implementation and 1–5 tasks. Seven actual assignments is a strong default. This procedure does not select work or grant live-resource permission. When the owner commissions a named batch, each Change keeps its own parent, branch and worktree. Eligible Changes proceed without a fresh owner confirmation at each task or routine checkpoint. A blocked sibling is not this parent's stop condition.

## Dependency readiness is not a planner blocker

Dispatch only selected, commissioned tasks whose frozen prerequisites hold. Ready (dependency-gated) work may wait for an exact predecessor receipt/source postcondition, without new approval. Verify named symbols against HEAD; allow mechanical reconciliation, stop on changed interface, authority, ownership or safety semantics. Return missing decisions to the planner; no broad rediscovery or invented architecture. Creating a specified new test harness does not require an existing harness.

## Mandatory Change branch policy

1. Identify the repository, the recorded integration target and HEAD, and inspect `git worktree list --porcelain`. Main is the trunk. A commissioned Design uses `implementation/<design-slug>`, created from the verified main revision that contains the accepted design, unless an existing authorized branch is grandfathered. Record that choice in the design-group README. A design implementation plan may keep historical mapping; it is not a second execution schedule. Creating the recorded branch is part of the Design commission. A standalone Change uses main or its explicitly recorded target. No new joins to the former Storyteller Workshop branch. Preserve in-flight work.
2. Before edits, create a dedicated linked sibling worktree from the latest verified target: `git worktree add -b change/<id>-<slug> <sibling-directory> <reference-branch>`, or reuse only the correctly assigned existing worktree. All writes, tests and commits for that Change happen there. Never switch the primary checkout, steal a worktree, or discard changes. One branch per Change, not per task. If direct work already began, preserve it and isolate later writes at a safe checkpoint.
3. Run `node scripts/repo-tools/change-branch-guard.mjs --change <ID> --target <reference-branch>` in that worktree before first edit/dispatch. Use --resume only after inspecting reference drift. Guard is read-only, not permission or proof; never force-reset to satisfy it.
4. The commissioned Change's coordinator owns delivery through the join. Use one linked integration checkout of the recorded target. Concurrent joins to that same ref take the exclusive lock created by `node scripts/repo-tools/change-lifecycle.mjs integrate` under `<git-common-dir>/offscreen-joins/`. The lock covers the target index, the merge, and shared ledger or closure edits in that join. Under the lock, refresh the target, verify predecessor postconditions, reconcile safe drift, merge, run the proportionate affected checks, and verify the new SHA. A design-branch join is an ordinary `--no-ff` merge. A standalone join to its recorded direct target keeps the established squash. Never force-reset, force-push, overwrite another agent's work, switch the primary checkout, or remove a dirty or unintegrated worktree. A material semantic conflict, an ownership contradiction, or a failed indispensable check stops the join. Update a shared group README or catalog from the target checkout under that lock. Do not rewrite it from a stale branch copy. A conflict in that shared file aborts; it is not merged by hand from an old schedule.
5. After a successful Change-level join, verify the target SHA, stop only owned temporary resources, and retire the clean integrated worktree with `node scripts/repo-tools/change-lifecycle.mjs retire`. Retirement refuses a dirty tree and a Change that is not contained by the target. A verified squash may retire once the landed commit's tree matches the Change. Design-level acceptance that the Design already allowed to remain pending does not by itself keep the worktree. Indispensable Change-level acceptance still does. Do not create another cleanup automation to guess ownership.

Undertaking custodian reconciles accepted receipt, STATUS and technical ledger with OVERVIEW.md at the same serialized join. Reestimate overall and major-track completion/remaining with uncertainty only when milestones, risk or priorities actually changed. The planner presents the supervisor recap; that recap is not an implementation task.

## 0a. Budget-first implementation dispatcher contract (2026-11-21)

Read CHANGE.md, the TASKS dispatch index when present, the current branch and worktree, and the first ready T-ID's named anchors. Check [submission scale](planning-artifact-quality.md#4-submission-scale-and-measurement). Return a newly commissioned packet that is incoherent, unsafe or forces architectural invention, and name the exact gap. A count or size signal alone is not that return. Do not audit architecture, preload every source and contract file, enumerate callers or design tests from scratch. Consult the precise linked sections as needed.

**Default:** one implementation coordinator and, where the client can delegate, one substantive implementation worker. For multiple substantive PATCH tasks, delegate the first substantive task and continue bounded dispatch. The coordinator edits directly only for a truly mechanical, locally understood change that is cheaper than delegation. One file can still contain substantive authorization, transaction or state work. Record a brief reason for a direct edit. No delegation ritual for routine Git, closure, pure VERIFY or a tiny single edit. A client without native subagents executes the same bounded task directly and says so. Model choice belongs to that client's execution policy. Cursor's policy is [.cursor/MODEL-POLICY.md](../../.cursor/MODEL-POLICY.md). Claude Code's policy is [.claude/MODEL-POLICY.md](../../.claude/MODEL-POLICY.md).

One child at a time normally. Up to two disjoint ready children when the planner's frozen dependency and ownership matrix proves independence, including generated files, test fixtures, resources and the Git index. No wider concurrency without an explicit collision-free schedule. Combining adjacent tiny tasks requires the same frozen contract, write ownership and assigned proof boundary. Count actual assignments. The seven-task default is a planning boundary, not a reason to hide scope in subcards.

Parent validates receipts/diffs, integrates dependency results, then selects next ready task. Child cannot spawn children. No alternate implementations, broad quality sweeps, model comparisons, excessive tuning or unapproved expensive-model escalation. Follow the active client’s model-budget policy. [Task format](task-execution-standard.md).

## 0. Dedicated Change commission owner shorthand

"Do DXK01" or an equivalent unambiguous named assignment authorizes that Change for its parent even if [QUEUE](../../work/QUEUE.md) selects another item. A named batch authorizes each listed Change under the same rule. It does not authorize an unlisted sibling, new architecture, spending or unassigned heavy or live proof. Continue all commissioned implementation tasks across internal checkpoints. Do not ask the owner to approve the next unchanged authorized T-ID. Never auto-start a successor that was not commissioned.

### Finish-to-reference-branch responsibility

"Do OBS-D02", "Do DXK01", or an equivalent named assignment authorizes the routine lifecycle, not a stop after the first task. Use the [integration checkpoint](#3-integration-checkpoint-do-this-once-per-batch-not-per-child) to archive the completed packet, commit that closure, judge the Change-level gate, join the recorded target, verify the archived packet is present and the open packet is absent, and retire a clean integrated worktree. If indispensable Change-level acceptance is pending, stop IMPLEMENTED — ACCEPTANCE PENDING and keep the worktree. If that gate passed and the Design allows an isolated source join while joint acceptance remains, join the design implementation branch and retire the worktree. That is not design certification or a main merge. The design-level closure joins main only after every constituent is integrated and the required joint acceptance has passed. Cheap-only standalone Changes close on their own when their required proof passes. An explicitly selected pre-merge independent review must pass first. Never waive required evidence or safety failures.

### What is *not* a legitimate reason to linger or stop

A completed child, clean intermediate commit, passing focused test, finished source diff, optional future improvement, different global selector after explicit commission, ordinary docs/Git/cheap-test work, or desire for another planner opinion is not a blocker. Pending design-level acceptance is not a blocker when the Design already permits the isolated source join. Close through that join and the clean retirement when the Change-level evidence exists. Separately owned joint proof stays recorded on the implementation branch. Do not relabel a required Change-level gate as optional or inflate scope.

### Genuine early-stop conditions

Stop the affected work for actual unresolved design/authority/transaction or safety contradiction, ungranted paid/destructive/live permission, missing indispensable prerequisite/environment, unsafe collision, failing required proof, or repeated unexplained failure. A compiler, import or fixture failure that the packet already declared as unfinished downstream work is not a debugging campaign. An unexpected local compiler, import or fixture error gets one focused diagnosis and one materially changed retry, not a global two-error quota. If still failing, return T-ID, file:symbol, failed assumption, smallest reproducer and concrete planner/owner question. No repeated timeout tuning or expensive-model upgrade. A dirty or uncertain ownership state stops further writes until reconciled.

## Diagnosis and end-state

One parent delivers a coherent source diff, focused proof and recoverable commit for one Change, or a truthful blocker. Acceptance and Done are distinct. Optimize total accepted outcome cost including rework, not child utilization or number of closed folders.

## 1. Declare a finite batch before dispatch

A batch is only an internal scheduling envelope within one Change, not another folder, selector or approval. Keep in chat: Change and T-IDs, HEAD, outcome, write and resource owners, allowed checks and stop conditions. Checkpoint after at most five dispatches or one risky join, then continue the remaining authorized tasks without another approval. Never expand into unrelated uncommissioned work.

### Context-isolation delegation

Delegate a bounded deterministic chore when noisy reads or repetitive edits would crowd the coordinator: Git status and ref summaries, exact occurrence or link collection, already decided documentation edits, test counts. Use the client's mechanical utility route when it has one. The active client adapter owns the utility worker and model choice. A client without that route does the chore directly. No worker for a trivial two-command operation. No ambiguous bug hunt, architectural, security or transaction decision, and no nested agents. Return concise facts and stop at a nonmechanical contradiction. This does not authorize additional independent task scope.

## 2. Cheap children; parent owns reconciliation

Give one T-ID, 2–5 real source or test anchors, exact mandatory contract sections, permitted write paths, the decided edit, the assigned checks or an explicit source-only gate, and the stop condition. Child verifies nearby source, implements, runs only assigned checks and returns:

```text
<ID> | PATCH/VERIFY/INVESTIGATE | PASS/FAIL/NOT-RUN | achieved outcome
Files: owned changed paths; worktree/commit or none
Proof: exact command/result/exit, source inspection, or NOT RUN; evidence tier
Negative: observed refusal, none assigned, or NOT RUN with reason
Docs: affected canonical owner or none
Blocker/next: precise missing condition or none
```

INVESTIGATE is only a precisely bounded factual assignment, not design. Six lines normally; details only for material failure/contradiction. Keep raw logs in terminal/evidence. Completion notification and return are one event; acknowledge decision, not repeat receipt. Shared-checkout children must not stage/commit; isolated child may commit locally only when needed for clean join. Parent owns staging, final receipt, documentation, acceptance handoff and closure. No full suite, ledger, archive or commit ceremony per child.

## 3. Integration checkpoint: do this once per batch, not per child

1. Inspect HEAD, status, relevant diff and receipts; identify unrelated changes/collisions. Stage exact owned paths only; inspect staged diff, whitespace and obvious secrets. No blind add -A, reset, clean, forced stash, amend or force-push.
2. Inspect changed code against [code craftsmanship](../rules/code-quality.md): meaningful responsibilities, trust-boundary validation, safe types, readable phases and invariant comments. Run changed-file Prettier and eslint only when the gate assigns them or the files are expected to pass. Run assigned normal and diagnostic negative tests. Do not add a build, typecheck, lint or test the packet left to a later boundary. Broader suites and maintenance guards run at the qualification boundary or a join to main, not after every child. Reuse trustworthy unchanged evidence. An unassigned or skipped check is NOT RUN. An expected failure from unfinished downstream work is a recorded limitation, not a new defect.
3. Commit the coherent source milestone, not one commit per child. If remaining commissioned tasks are ready, continue. If indispensable Change-level proof is still pending, record IMPLEMENTED — ACCEPTANCE PENDING and keep the worktree. Do not join or archive. If the Change-level gate passed, archive this packet in the same commission even when design-level acceptance remains. Transfer those obligations onto the Design first and do not mark them passed. Reconcile the catalog, inbound references and ledger, then commit that closure on the Change branch. If blocked, keep the work open, preserve safe work, and record the specific residual test, permission, or decision. Never claim Done from a structural proof alone.
4. Join with `scripts/repo-tools/change-lifecycle.mjs`, passing `--leaf` and, when design acceptance is still pending, `--obligations-transferred`. Refresh the recorded target, check predecessor postconditions, merge without rewriting history, rerun the smallest affected checks, and verify the new target SHA. The same command refuses completion unless the archived packet is on the target and the open packet is absent. Use a merge commit on a design implementation branch and squash on a standalone direct join. A constituent Change cannot name main. Before starting a constituent, `lookup` that target so an already archived Change is not executed again. Main may still show the open packet. If the source changed after the accepted proof, rerun the affected proof before claiming acceptance.
5. Then retire the clean integrated worktree with `--leaf`. The design-level closure, not this Change, integrates the finished implementation branch into main. New independent ambitions belong in a separately selected Change, not appended to this one.

## 4. Parent stop conditions and context budget

Checkpoint after five dispatches, risky join or ownership transition; these are internal continuation points. Stop at completion, heavy-acceptance handoff or genuine blocker above. If context no longer establishes ownership/staged state, stop new writes and recover exact state. Never skip safety to hit the time target. No hidden cross-Change auto-next. Repository text cannot cap model runtime/UI or prove compliance.

## 5. Minimal batch receipt (parent, not children)

```text
Change / target / starting HEAD / committed SHA
Tasks: completed; failed/NOT-RUN + reason
Proof: assigned commands/cwd/results, source inspection, or NOT RUN; evidence tier
Disposition: Done+archive | IMPLEMENTED — ACCEPTANCE PENDING | open blocker
Docs/guards: owners and run/pass/fail/not-run
Resources/Git: ownership, uncommitted paths, worktree/branch, final target SHA if integrated
Next: exact acceptance or planner/permission condition; no auto-next
Usage: measured cost/time if known, otherwise unknown
```

One concise final receipt. Persist a small [session handoff](../../work/sessions/README.md) only when recovery genuinely needs it; no shadow status or private transcript. Parent/child task assignments remain within the [work taxonomy](../../work/WORK-TAXONOMY.md).

## 6. What can and cannot be automated

Existing guards detect structural defects, not semantic correctness or runtime success. Compare actual proof to accepted outcome; never infer Done from child completion or commit count, auto-archive unproven work, or defer required acceptance just to close a packet. Automate demonstrated mechanical gaps only via bounded tested work. [Usage evaluation](cursor-usage-evaluation.md) is opt-in, not per-Change ceremony.
