# Independent Change packet readiness review | adversarial audit manual

**Owner:** ChatGPT reviewer, preferably a fresh review pass independent of packet authorship. **Goal:** judge whether the current *specific* Change can be executed correctly and economically by a short-reading Cursor parent and bounded Composer children. This review is not execution approval, a replacement for source inspection, or a generic docs-health score. Use with [packet design](packet-design-manual.md), [Composer tasks](composer-first-execution.md) and [planner investigation](planner-investigation-standard.md).

## Verdicts, not vibes

- **READY:** all hard gates pass on verified target HEAD; parent has an immediate legal first dispatch and each offered parallel wave is demonstrably safe. Minor cosmetic gaps do not defeat READY.
- **READY WITH EXPLICIT LIMITS:** only narrow noncritical matters remain, documented with an executable and bounded fallback; no uncertain permission, contract, transaction or core proof. State the limits, not “definitely ready.”
- **PLANNER-BLOCKED:** at least one substantive decision/source/caller/test/resource mapping remains with ChatGPT; no Cursor implementation commission.
- **UNVERIFIED:** target branch/HEAD, relevant code or test fixtures could not be inspected; do not convert absence of evidence into READY.
- **NOT AUTHORIZED:** scope/branch/permissions/ratification forbid execution regardless of packet craftsmanship.

Never promote a packet because a previous ChatGPT chat called it ready. A review must attempt to **falsify** readiness and cite the relevant exact file/symbol or missing entry. If the same ChatGPT authored the packet, perform a separate cold review with task cards read before the deep notes; never use authorship as a reason to be charitable.

## Audit sequence (stop early for hard gates)

**G0. Repository and authority.** Verify actual repo, integration branch, HEAD, active changes/worktrees and current rules. Confirm Change goal, product/technical authority, selected owner commission, permissions, no hidden branch switch and no collateral edits. Proposed designs cannot silently become accepted architecture.

**G1. Source truth.** Open every claimed high-impact symbol, relevant callers/exports and representative tests against verified HEAD. Check that the diagram/manifest covers actual cross-module edges, mutation boundaries, schema/permission/transaction/failure paths and required dependencies. A file path existing is insufficient proof. Name any uninspected important source and fail UNVERIFIED rather than guess.

**G2. Decisions closed.** Verify the exact input/output/public exports, state/authorization/failure/retry/idempotency semantics, migration/compatibility and selected algorithm. For domain extraction, require source→destination, public exports, manifests, all known consumer imports and test relocation. For policy gates require exact composition-root → policy-source/default-deny/test matrix. For stateful Changes require transaction/fence/rollback/replay semantics. Unresolved decisions mean PLANNER-BLOCKED.

**G3. Child context simulation.** Hide SOURCE-MAP and EXECUTION. Read one T-ID and only its 2–5 stated anchors. Attempt to enumerate precise edits and tests **without designing**. If card forces broad caller discovery, interface choice, fixture invention or ownership reconciliation, identify the first such step and fail. Repeat for *every* T-ID, not a sampled "representative" task. A child can fix localized compilation errors; it must not repair the architecture.

**G4. Parent cold-dispatch simulation.** With only CHANGE.md, TASKS.md, repo rules, branch guard and clear existing work, ask: can parent select an eligible T-ID/wave and launch without another architecture survey? Does task card contain sufficient context to forward without a 30 KB research paste? Can parent reconcile receipts, choose final focused proofs, run guards, archive/squash/push and retire safely? If the parent must independently plan, fail.

**G5. DAG and concurrency proof.** Construct explicit T-ID prerequisite graph and compare proposed parallel wave pairs for (a) files/symbols, (b) generated artifacts/package builds/lockfile, (c) fixtures/ports/DB/provider/network, (d) interface/branch drift, and (e) docs/ledger/commit/staging. Name one integration owner. Flag falsely parallel tasks; serial is acceptable. Two disjoint children only if matrix and runtime isolation really permit it. Include downstream join/retry and a deterministic conflict escalation.

**G6. Proof that separates correct from merely green.** For each task and whole Change identify exact cwd/command/preconditions, normal observation, **discriminating negative or fault** and expected response/state, changed-file quality checks, meaningful integration proof and precise honest limits. Distinguish manual/fixture/provider observation from source inspection. Avoid tests that only repeat assertions from code without exercising failure boundaries.

**G7. End-to-end cost and closure.** Evaluate task size, repeated reads, parent/child work duplication, unnecessary serial waits, excessive fanout, real safety cost of parallelism, and whether a single small patch would be cheaper. Confirm Change Done/archival criteria, exact Git target, source/document reconciliation and no next-Change auto-start. Never fabricate token or provider savings.

## Hard blockers vs advisory improvements

**Always blocks READY:** missing/contradictory authority; unknown actual target HEAD/critical source; design left to Cursor; missing security/data integrity/idempotency safeguards; impossible or unowned dependent edits; incomplete migration/composition map; no executable acceptance for a critical behavior; unsafely overlapping parallel writers; unapproved privileged/provider/destructive operations.

**Advisory:** stylistic task wording, redundant example, an optional additional test, a serial execution opportunity for independent small tasks, more elaborate diagrams or docs that would not change decisions. Never turn advisory polish into indefinite implementation blocking.

## Required audit output

Record a concise audit receipt with **review target** (`Change ID @ integration branch HEAD`), **source paths/symbols inspected**, **G0–G7** each PASS/FAIL/UNVERIFIED with the *diagnostic reason* (no score averaged across a hard failure), **task/wave table** (T-ID, readiness, exact write owner, prerequisites, negative proof, parallel classification), **first parent dispatch**, **blockers** assigned to ChatGPT with exact file/section and corrective edit, **advisories** and **verdict**. An evidence citation/commit SHA supports a claim but does not itself prove a test was run.

### Review loop and honesty

1. Audit existing packet with no edits first; record its real initial verdict.
2. If user wants repairs, make the **specific** source-grounded corrections in the existing packet, not a shadow duplicate.
3. **Re-audit all eight gates**, including every T-ID and parallel pair affected; verify updated remote content and links. A previous FAIL does not become PASS merely because the author says it was fixed.
4. Only then update Change readiness/indexes and give a narrow launch instruction. If verification is unavailable, report UNVERIFIED, even after improving the prose.
5. A later Cursor trace may expose missing planner decisions; classify that as planner escape, update the standard, and measure whether it recurs.

**Quality metric:** the best readiness audit predicts actual execution: rapid first dispatch, few planner escalations, clear Composer receipts, minimal parent design activity, correct negative proofs and clean integration. Observe these after execution; no rubric can guarantee an agent's behavior.
