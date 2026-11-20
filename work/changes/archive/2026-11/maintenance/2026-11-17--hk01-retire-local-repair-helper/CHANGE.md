# HK01 | Retire unsupported local Storyteller response-reconciliation CLI

**Composer microtask entry (2026-11-20):** [TASKS.md](TASKS.md) is the selected microtask route *once the Change is authorized*; [all-open audit](../../COMPOSER-QUEUE-AUDIT-2026-11-20.md) records actual source tier and dependency. **Default parent/child model: Composer 2.5 Standard.** Delegation: guarded saved-response settlement verification; DO NOT delete last operator CLI before proven replacement. Don't interpret a task marked PLANNER-READY as permission to execute a Proposed Change, promote status or skip negative tests; novel architecture goes back to ChatGPT before a Grok exception.

**2026-11-18 executable decision:** [Backlog audit and acceptance](../../../designs/open/backlog-convergence-2026-11-18/README.md); [bounded contract choices](../../../designs/open/backlog-convergence-2026-11-18/CONTRACT-DECISIONS.md); [ordered Cursor handoff](../../../designs/open/backlog-convergence-2026-11-18/CURSOR-HANDOFF.md). The older Proposed/Blocked/No-code declarations retained below document the historical decision; they do not prohibit the **safe scoped implementation** now selected. External paid dispatch, nondisposable DB resets, production grants and irreversible accounting changes remain disallowed. A provider-free experiment that proves no new feature is needed must close with a source-backed positive alternative, not be parked again.

**State:** **Done (2026-11-20).** T01–T05 proved on branch `change/hk01-saved-repair` at base `eeeb2fef`: pure saved-response inspector, read-only `--plan`, guarded `--apply` with migration `0013` and optional `budget.settle` `recoveryFence`, legacy `reconcile-storyteller-response.mjs` removed, runbook and housekeeping audit reconciled. Operator command remains `scripts/repo-tools/plan-storyteller-saved-repair.mjs` (not wired into package.json start/dev/story scripts; no DXK04 packet in this worktree). Uncertain submit and funding-stopped semantics unchanged; this page does not authorize production/staging apply.

**Planner resolution (2026-11-20):** The [source-backed decision](DECISION-2026-11-20.md) identifies saved `requestSha256` and per-attempt `storyteller_dispatch_review.packetSha256`, but also specifies ambiguity refusal, a short transactional recovery fence, immutable operator audit, and no funding reactivation. Replacement is now **PLANNER-READY**, not implemented, and remains outside TURN02's current execution. The old CLI must remain until T02–T05 pass. Older `T02 PLANNER-BLOCKED` wording in past receipts is historical, not current task routing.

## Cursor first-screen brief

Inspect `scripts/repo-tools/reconcile-storyteller-response.mjs` in full and `package.json`, current runbooks, `packages/application/src/storyteller/budget.ts`, current provider/attempt recovery source and test coverage. At `4e42bd7`, no caller outside the file itself or root script was found; CLI hardcodes `offscreen_story_local`, reads saved provider JSON in `data/story-local-evidence`, and calls `createStorytellerBudget(...).settle` against an uncertain attempt. **Absence of in-repo references alone is not proof of zero manual use.**

## Intended diff

1. Record `rg`/git search for complete path, basename, usage phrase, commands, imports and history on latest source. Enumerate legitimate uncertain-attempt recovery paths from real application/runbooks; distinguish persistent workflow vs historical emergency triage. If this CLI has a unique legitimate recovery guarantee that is still relied upon, **stop** and propose a replacement before removal.
2. If unowned: delete `scripts/repo-tools/reconcile-storyteller-response.mjs` via Git; update any route or runbook that names it (none found in lean snapshot). Rely on Git history for historical source, not a second copy in `research/`.
3. Capture a minimal negative proof: package scripts, TS import resolution and supported Storyteller recovery tests do not import/execute the removed script; no user-visible or runtime recovery behavior is silently dropped.
4. Produce a dated disposition in [the audit](../../../designs/open/repository-housekeeping/AUDIT-2026-11-17.md), specifying confirmed caller search and safe alternative. Do not invent a new operational CLI for symmetry.

## Forbidden / safety

Do **not** run the script, connect to any real/local Storyteller DB to test it, replay a provider response, settle funds, use a paid model, reset a database, migrate schema, or change `budget.ts` for convenience. Never remove the durable provider attempt/uncertain-state contract itself. If the safety gate fails, leave code untouched and mark this packet Blocked with evidence.

## Acceptance

- **Normal:** zero registered production/test imports or documented supported commands require the file after deletion; safe existing recovery behavior is named with a source/test receipt. Git diff contains only bounded removal and necessary route/doc reconciliation.
- **Negative:** a targeted search for its basename and old CLI invocation finds no current normative references; a provider-uncertain fixture still follows its normal **existing** fail-closed path. No direct state-mutating test.
- **Proof:** appropriate provider-disabled tests/compilation already available on local checkout; list skipped checks and reason. No provider spend.

## Evidence gate | 2026-11-18

Searched the worktree for `reconcile-storyteller-response`, its usage line, and `saved-response.json`. The only hits are this packet, the housekeeping audit, and the script. `package.json` has no script for it. Git history is `2ca39357` (add the recovery) and `b64579dc` (record the proof). The script was not executed, and no database was opened.

The live executor in `packages/application/src/storyteller/execution.ts` calls `budget.uncertain` and returns when a provider delivery is uncertain. It does not later read `data/story-local-evidence` and settle that attempt. `docs/runbooks/local-development.md` says an uncertain attempt makes `--story-mode` refuse to start, and that recovery is a separate owner procedure. This CLI is that procedure: it requires both the generation and the attempt to already be `uncertain`, checks the saved response, and calls `createStorytellerBudget(...).settle` with `operationOutcome: 'continue'`.

That is a unique recovery path. Deletion stops here. A later removal needs a named supported replacement first. No provider call was made.

## Replacement-first slice | 2026-11-19

`packages/application/src/storyteller/budget.ts` owns `createStorytellerBudget().settle`. This slice adds `settleUncertainAttemptFromSavedResponse` beside that module in `packages/application/src/storyteller/saved-response-settlement.ts`, with `packages/application/test/saved-response-settlement.test.mjs`. The function calls the existing settle path for one already-uncertain attempt and one saved response. It refuses a generation that is not uncertain, a missing saved response, and a second settle. It also refuses an attempt that is not already uncertain. `packages/application/src/storyteller/budget.ts` is not edited. The function is not wired into the worker, and `packages/application/src/storyteller/execution.ts` is not edited.

`scripts/repo-tools/reconcile-storyteller-response.mjs` remains the only operator procedure. This slice does not claim that replacement proof is complete. Do not delete the CLI or `data/story-local-evidence` on the strength of this function. No provider call was made, and `offscreen_story_local` was not opened.

**T01 VERIFY receipt (2026-11-20) at `ec73a535`:** `packages/application/test/saved-response-settlement.test.mjs` **5/5 PASS** (~237ms), provider-free. Positive: mocked `budget.settle` invoked once on a valid saved response. Negatives in suite: `generation_not_uncertain`, `missing_saved_response`, `already_settled` (second settle refused), `attempt_not_uncertain`. **NOT-RUN:** reconcile CLI, any database, provider send, durable audit lookup, supported operator path. **Not claimed:** operator parity, CLI retirement, or worker integration. `pnpm wiki:change-guard --mode plan --change` this packet → **ok, no findings** (2026-11-20, after receipt). Receipt does not promote Done.

No product or technical behavior is changed. `docs/product/experience/play-and-decisions.md#denied-waiting-error-lost-connection-and-a-stale-offer` still keeps an uncertain submit uncertain. `docs/technical/storyteller/provider-boundary.md#attempt-custody-and-an-unknown-call` still blocks a second paid call. `docs/technical/storyteller/request-context-and-cost.md#budget-accounting` still settles an attempt once. `docs/runbooks/uncertain-work-recovery.md#already-uncertain-local-attempt` was not edited, because the CLI remains the only operator procedure.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because an uncertain submit in docs/product/experience/play-and-decisions.md#denied-waiting-error-lost-connection-and-a-stale-offer stays uncertain and is not presented as success | docs/product/experience/play-and-decisions.md | no player surface change |
| Technical | unchanged because docs/technical/storyteller/provider-boundary.md#attempt-custody-and-an-unknown-call still blocks further provider work on an uncertain attempt, and docs/technical/storyteller/request-context-and-cost.md#budget-accounting still settles an attempt once | docs/technical/storyteller/request-context-and-cost.md | budget.ts remains the settle owner |
| Code | changed: inspector, read-only plan, guarded apply, migration 0013, optional budget recovery fence, and removal of reconcile-storyteller-response.mjs; negative: a non-uncertain generation, a bad digest, and a failed audit insert do not settle | packages/application/src/storyteller/budget.ts | disposable-db apply tests |
| Related | changed: docs/runbooks/uncertain-work-recovery.md#already-uncertain-local-attempt and #commands cite `plan-storyteller-saved-repair.mjs`; the page does not run `--apply` | docs/runbooks/uncertain-work-recovery.md | operator procedure renamed; production/staging refused |

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/experience/play-and-decisions.md#denied-waiting-error-lost-connection-and-a-stale-offer | product | unchanged: an uncertain submit stays uncertain and is not presented as success | no player-surface behavior changed on `change/hk01-saved-repair` | source-observed | Plan/apply refuse non-uncertain generations | N/A |
| docs/technical/storyteller/provider-boundary.md#attempt-custody-and-an-unknown-call | technical | unchanged: uncertain attempt custody blocks further provider work; worker does not call repair apply | `execution.ts` unedited; repair path is operator CLI only | source-observed | No provider HTTP in HK01 tests | N/A |
| docs/technical/storyteller/request-context-and-cost.md#budget-accounting | technical | unchanged: one attempt settles once; `budget.ts` charge math unchanged | optional `recoveryFence` on `budget.settle`; accounting writes stay in budget | fixture-tested | Idempotent/contradictory apply tests refuse double charge | N/A |
| packages/application/src/storyteller/saved-response-inspection.ts | code | changed: pure H1 saved-byte validator | T02; `saved-response-inspection.test.mjs` | fixture-tested | Wrong digest/model/purpose refused without DB | N/A |
| packages/application/src/storyteller/saved-repair-plan.ts | code | changed: read-only preview + plan fingerprint | T03; unit + integration tests | fixture-tested + disposable SQL | Ambiguous evidence and bad revision refuse without mutation | N/A |
| packages/application/src/storyteller/saved-repair-apply.ts | code | changed: guarded apply + operator audit in one transaction | T04; `0013_hk01_saved_repair_audit.sql` | disposable-db tested | Parallel/contradictory apply and audit failure rollback | N/A |
| scripts/repo-tools/plan-storyteller-saved-repair.mjs | code | changed: `--plan` / `--apply` maintenance command; `databasePathAllowed` for `offscreen_story_local` and `offscreen_hk01_repair_test` only | T05 @ `eeeb2fef`; not added to package.json scripts; DXK04 placement deferred (no packet here) | CLI integration tested | `offscreen_auth_test` and other pathnames → `database_url_not_allowed`; symlink/escape → hold | cited in uncertain-work-recovery runbook |
| scripts/repo-tools/reconcile-storyteller-response.mjs | code | removed after replacement proof | `git rm` T05 | source-observed | `rg` finds no normative current command outside archive/history | housekeeping audit F02 updated |
| docs/runbooks/uncertain-work-recovery.md#already-uncertain-local-attempt | task guide | changed: names `plan-storyteller-saved-repair.mjs`; does not execute apply | reconciled T05 | source-observed | Production/staging still refused; funding stopped not cleared | links archived HK01 packet |

**Owner action:** none. Packet archived after T05 proof and `wiki:change-guard --mode close`.
