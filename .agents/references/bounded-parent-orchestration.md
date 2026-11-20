# Bounded Cursor parent orchestration | integration batches, truthful closure, economical Git

**Selected operating rule (2026-11-20).** Applies to Cursor **parent/coordinator**, whether children run in the same checkout or isolated branches. Child implementation depth and model selection remain governed by [Composer microtasks](composer-first-execution.md), [Cursor budget](cursor-model-budget-policy.md), and [Change work units](change-work-unit-standard.md). [Current selection](../../work/QUEUE.md) stays the **only** global selector. This is a procedure, **not** a new Change kind, queue, automated approval or product rule.

## Diagnosis and end-state

Composer-first T-IDs have produced substantial useful implementation with low reported usage, but the parent's work was not bounded: it could keep dispatching tasks, defer all housekeeping, accumulate a very large dirty diff, and confuse a successful child with acceptance of its parent Change. Some earlier rules also told *every isolated child* to commit while newer rules assigned commits to the parent. Correct the conflicting ownership without replacing a fast execution workflow with administrative ceremony.

**Desired invariant:** every accepted implementation batch reaches an **integration checkpoint** with a coherent diff, appropriate normal/negative tests, an explicit disposition for each touched Change, and one or a few meaningful commits; or it stops with a truthful, recoverable blocked/dirty receipt. A child finishing never by itself satisfies the Change's Goal.

## 1. Declare a finite batch before dispatch

A **batch** is an **ephemeral scheduling and integration envelope**, not a Change, Task, or second backlog. It contains only explicitly owner-authorized Changed work and already-selected implementation T-IDs. A broad "continue the POC" instruction cannot silently authorize new provider spend, protected database mutation, or a destructive cluster run.

Parent writes a **tiny charter in its own current chat** (or uses existing [work/sessions](../../work/sessions/README.md) for a handoff genuinely needing persistence). Do not create a new folder or large plan for every batch:

```text
Batch: <short label> | source HEAD: <sha>
Authorized Changes/T-IDs: <specific IDs; no Proposed expansion>
Finish line: <one integrated observable outcome>
Owners: <disjoint write paths, canonical headings, shared resources>
Permitted checks: <focused positive, negative, integration only if safe>
Hard stops: <missing design/authorization, collision, red acceptance, unsafe environment>
Commit group: <one cohesive milestone or two separable results>
```

**Default budget:** approximately **2–5 small Composer T-IDs**, **at most two independently accepted Change outcomes**, or **one high-risk cross-service join**. **Five child dispatches is the default checkpoint ceiling**, not a license to skip the necessary last test or split an atomic operation. The owner can explicitly approve a larger envelope; still integrate/checkpoint after each manageable slice. **Never keep expanding the batch because unrelated T-IDs happen to be Ready.**

Keep **one or two concurrent children** by default, only with truly disjoint files/resources. Additional concurrency requires an explicit collision-free schedule and provides no new spending, DB or cluster authority. The parent should do small routing and join work, not another repository-wide investigation.

### Context-isolation delegation: use Auto for boring-but-bulky missions

The parent is not required to personally perform every easy operation. **Context isolation is itself a valid reason to delegate** when the work is straightforward but would generate enough repository reads, terminal output or repetitive edits to pollute the coordinator context.

Prefer the `utility-worker` on **Auto** when all of these hold:

- the mission is bounded and the desired result is already known;
- success can be stated as factual output or deterministic edits/checks;
- it is more than one or two tiny parent actions, or is likely to produce noisy intermediate output;
- no product/architecture/security/transaction decision is being delegated;
- the child can return a compact receipt instead of raw logs.

Typical examples: inspect a sequence of Git refs/status/diffs and summarize only relevant facts; run a small series of safe repository commands; rename/move/update already-decided documentation across several files; collect exact occurrences/links; reconcile a mechanical list; gather test counts or changed paths. **Do not delegate a two-command triviality merely to spawn an agent**, and do not use Auto for an ambiguous bug hunt or implementation slice just because it is cheap.

The utility child should read/emit the minimum needed, never spawn children, and stop with one precise blocker when the mission stops being mechanical. The parent consumes the receipt, not the transcript. This reduces compounding conversation tax and preserves the parent for integration, judgment and decisions.

## 2. Cheap children; parent owns reconciliation

Child receives one already-resolved task card: T-ID, 2–5 actual source/test anchors, exact edit/command, negative test, allowed paths, and stop case. Child returns a **short factual receipt**: what changed, tested commands/counts, negative observation, blockers, touched docs and whether work is in the parent checkout or isolated worktree.

**Compact child-completion protocol (selected after November 20 usage review):** Prefer a **six-line maximum receipt** for an ordinary successful child. A child may provide more detail only when an assertion failed, the task departed from design, or a safety/authority decision needs evidence; keep full test output in terminal logs or an existing evidence artifact, not pasted twice into the parent chat. The six lines are:

```text
<ID> | PATCH/VERIFY | PASS/FAIL/NOT-RUN | <one achieved outcome>
Files: <owned changed paths or none>; worktree/commit <ref or none>
Proof: <command + exact result / exit>; tier <pure|DB|two-process|browser|kind>
Negative: <one discriminating refusal or NOT RUN (reason)>
Docs: <canonical owner changed or none required>
Blocker/next: <precise missing condition or none>
```

**Parent notification discipline:** A completion notification and a child return for the same T-ID are **one event**, not two new tasks. Acknowledge only the decision taken (integrate, retry once with new hypothesis, or stop). Do not copy the child receipt into a second long parent report or issue TLDR after every notification. Integrate as soon as the dependency is relevant; do not refill idle child slots simply to maintain utilization. Consolidate results **once** at the batch checkpoint. Preserve exact detailed logs elsewhere when a failure actually requires reconstruction.

**No child-run bureaucracy:** do not make each T-ID write a Change reconciliation ledger, run the whole repo suite, archive a packet, generate a long report, or create a Git commit merely to be "complete." Children operating in the **shared checkout must not stage or commit**; only the parent integrates and commits. An isolated worktree child **may** create a local branch commit when necessary for clean cherry-pick/merge, but it is not mandatory, and the parent still owns the final integration and Change closure. This supersedes older blanket "each subagent commits" wording.

The parent executes no new speculative architecture. On an actual source discrepancy, localize once; if resolving it requires selecting retry/transaction/role semantics or new product intent, return the smallest concrete question to ChatGPT with exact code/error. Repeated identical failures are not an invitation to spawn an endless loop of new agents.

## 3. Integration checkpoint: do this once per batch, not per child

1. **Reconcile the working tree.** Inspect current HEAD, `git status --short`, relevant diffs and child receipts. Identify owner/unrelated modifications and clashes. No automatic `git add -A`, reset, clean, forced stash, amend or force-push. Stage exact owned paths only; inspect staged diff and check whitespace/obvious secrets.
2. **Test at the appropriate tier.** Focused normal and discriminating negative checks belong with each changed behavior. At the integration join run the narrow cross-module tests needed to catch boundary errors. Broader typecheck, `pnpm repo:maintenance --strict`, `pnpm wiki:health` and the Change close guard are **per closure or affected boundary**, not reflexively after every child. A skipped environment-dependent test remains **NOT-RUN**, never zero failures by implication.
3. **Resolve each touched Change:** compare its **originally selected, independently useful acceptance outcome** with the actual merged code and proof. Choose:
   - **ACHIEVED:** all required outcome/negative evidence exists → reconcile canonical docs and affected-claim ledger, mark Done, archive and update inbound index/links in the same integration window.
   - **PARTIAL / ACTIONABLE:** meaningful implementation landed but Goal not yet met → keep open, record accepted T-IDs, exact remaining acceptance and one next task/proof.
   - **PLANNER GAP / GATED:** missing contract, owner-approved spend/cluster access or safety precondition → keep open with the precise missing decision/permission and named route; stop dispatch on that boundary.
   - **SCOPE INFLATED:** an independently accepted original deliverable is complete but unrelated or later ambitions were appended → preserve the original scope and evidence, explicitly separate additional work only when a distinct selected outcome exists. Do **not** rename a required integration acceptance "optional" or invent a Done label from unit tests.
   - **UNSELECTED OPTIONAL:** retain its proposed state and trigger without pretending it blocks unrelated completed outcomes.
4. **Create coherent commits.** Prefer **one integration commit** for one cohesive accepted batch, or **a few** if independently reviewable/revertible outcomes can be staged separately. Include implementation, required tests, affected canonical docs and packet reconciliation. **Commit at the checkpoint**, not one commit per tiny child and not one huge end-of-session commit across unrelated outcomes. A Change can remain open after a truthful intermediate commit. If code is safe to commit but broad proof is gated, commit with a partial/NOT-RUN receipt rather than claiming Done.
5. **Return the batch receipt** and stop or explicitly open a newly authorized batch. Do not silently move from a completed batch into another entire Change family.

## 4. Parent stop conditions and context budget

**Stop, checkpoint and report** on any of: five dispatches completed; one high-risk cross-service integration achieved; a Change closure/ownership transition; two repeated failures without a new diagnostic; an unexpected schema/product authority decision; unsafe/uncertain external side effect; shared-file collision; or a parent context that can no longer state precisely what is staged, uncommitted and accepted. If a clean commit is currently unsafe, do not start new writing children; return the dirty-state/ownership summary and exact next safe action.

**Repeated failure escalation:** after one focused diagnosis and one materially changed-hypothesis retry, stop that line of work. Infrastructure prerequisites and stale builds may be repaired once with evidence; repeated timeout/quiet-wait/worker-flag perturbations without changed explanation are not independent progress. Return the exact failing invariant and owning source to ChatGPT. The existing two-failure stop rule still controls. Never downgrade correctness to meet this budget.

**One parent turn normally handles one bounded batch.** If the owner specifically authorizes a multi-batch campaign, the parent can perform up to **two clearly separate, committed/reconciled checkpoints** in that turn, then return a succinct status and ask for fresh selection/continuation. This is a **default stop discipline**, not a claim the repo can technically cap a Cursor model's tokens or stop its internal UI. No hidden auto-next task loops, no automatic Grok escalation.

## 5. Minimal batch receipt (parent, not children)

```text
Batch <label> | starting HEAD <sha> | ending HEAD <sha/unchanged>
T-IDs: accepted <IDs>; failed/NOT-RUN <IDs + exact reason>
Proof: <commands/cwd/counts, important negative, observed tier>
Change decisions: <ID: Done+archive | still open: exact missing | split: explicit new owner>
Commits: <SHAs and what each contains>; uncommitted: <paths/owner/reason>
Docs/guards: <actual changed owners; run/pass/fail/not-run>
Next: <one bounded candidate or explicit owner/planner/permission gate>
Usage: <actual measured cost when known; otherwise unknown>
```

Keep this in the parent response. Persist a short batch note under `work/sessions/` **only** if needed for recovery across sessions; avoid a second authoritative status file. [Work taxonomy](../../work/WORK-TAXONOMY.md) remains unchanged: Change = lasting diff; standalone Task = independently tracked operation; Composer T-ID = subordinate implementation step.

## 6. What can and cannot be automated

Existing [maintenance](../../work/changes/README.md) and archive/Change guards can detect malformed routes, terminal packets left under `open/`, broken links and some missing reconciliation. They **cannot infer** that Gary's promise appears in the browser, that two processes share real DB authority, or that an unfinished Goal was secretly achieved merely because several T-IDs are marked LANDED. Do **not** build an auto-archiver that guesses from commits or child receipts.

A parent integration checklist and an actual **acceptance-vs-proof comparison** are the primary control. Automate only a demonstrated mechanical gap with one small tested Change. Do not move the remaining acceptance to a new Change just to improve archive counts; don't keep a genuinely completed, scoped outcome open because some distant product dream could be added later.

**Measurement, not utilization theater:** [Cursor session usage and outcome measurement](cursor-usage-evaluation.md) explains the opt-in CSV window tool and accepted-outcome comparison. The parent is not expected to parse exports during every Change or retain private chat transcripts in the repo. Keep one small batch receipt, preserve actual evidence tiers, and evaluate total rework. Model defaults remain unchanged.

**Success metric:** accepted correct outcomes, truthful unfinished boundaries, recoverable clean commits, low parent/child context and actual overall usage if measurable. The number of Done folders is not the target.
