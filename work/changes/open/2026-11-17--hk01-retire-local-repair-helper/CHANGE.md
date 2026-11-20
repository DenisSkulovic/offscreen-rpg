# HK01 | Retire unsupported local Storyteller response-reconciliation CLI

**Composer microtask entry (2026-11-20):** [TASKS.md](TASKS.md) is the selected microtask route *once the Change is authorized*; [all-open audit](../../COMPOSER-QUEUE-AUDIT-2026-11-20.md) records actual source tier and dependency. **Default parent/child model: Composer 2.5 Standard.** Delegation: guarded saved-response settlement verification; DO NOT delete last operator CLI before proven replacement. Don't interpret a task marked PLANNER-READY as permission to execute a Proposed Change, promote status or skip negative tests; novel architecture goes back to ChatGPT before a Grok exception.

**2026-11-18 executable decision:** [Backlog audit and acceptance](../../../designs/open/backlog-convergence-2026-11-18/README.md); [bounded contract choices](../../../designs/open/backlog-convergence-2026-11-18/CONTRACT-DECISIONS.md); [ordered Cursor handoff](../../../designs/open/backlog-convergence-2026-11-18/CURSOR-HANDOFF.md). The older Proposed/Blocked/No-code declarations retained below document the historical decision; they do not prohibit the **safe scoped implementation** now selected. External paid dispatch, nondisposable DB resets, production grants and irreversible accounting changes remain disallowed. A provider-free experiment that proves no new feature is needed must close with a source-backed positive alternative, not be parked again.

**State:** **Implementation unblocked by source-backed design** (2026-11-20); T01 5/5 and T02 pure inspector 17/17 on `change/hk01-saved-repair`. T03–T05 are **not executed**. The unsupported CLI is still the only operator procedure, so **HK01 is not Done and cannot be archived**. [Exact recovery contract and no-paid-provider proof plan](DECISION-2026-11-20.md) resolves the former planner blocker. QUEUE remains TURN02; do not self-select HK01.

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
| Code | changed: packages/application/src/storyteller/saved-response-settlement.ts and packages/application/test/saved-response-settlement.test.mjs; negative: a second settle and a generation that is not uncertain do not call settle | packages/application/src/storyteller/budget.ts | unit test of the refusals |
| Related | unchanged because docs/runbooks/uncertain-work-recovery.md#already-uncertain-local-attempt still names the CLI as the only saved-evidence settlement and this slice does not edit that guide | docs/runbooks/uncertain-work-recovery.md | the CLI remains the only operator procedure |

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/experience/play-and-decisions.md#denied-waiting-error-lost-connection-and-a-stale-offer | product | unchanged: an uncertain submit stays uncertain and is not presented as success | no source behavior changed for the player surface; inspected packages/application/src/storyteller/saved-response-settlement.ts | source-observed | A saved response cannot settle a generation that is not uncertain | no player map change |
| docs/technical/storyteller/provider-boundary.md#attempt-custody-and-an-unknown-call | technical | unchanged: an uncertain attempt still blocks further provider work and this function does not start a second paid call | packages/application/src/storyteller/budget.ts remains the settle owner; packages/application/src/storyteller/execution.ts was not edited | source-observed | The function is not called from the worker | docs/technical/storyteller/request-context-and-cost.md#budget-accounting stays the accounting owner |
| packages/application/src/storyteller/saved-response-settlement.ts | evidence | changed: a provider-free function settles one already-uncertain attempt from a saved response by calling budget.settle | T01 @ `ec73a535`; `packages/application/test/saved-response-settlement.test.mjs` **5/5 PASS** (~237ms) | fixture-tested (2026-11-20) | A second settle is refused and budget.settle is not called again; generation/attempt not uncertain and missing saved response refuse without settle | no package map change because the CLI remains the only operator procedure |
| scripts/repo-tools/reconcile-storyteller-response.mjs | evidence | unchanged: the CLI remains the only operator procedure because this slice does not prove a supported replacement | scripts/repo-tools/reconcile-storyteller-response.mjs was inspected and not deleted | source-observed | Deleting the CLI is refused until replacement proof is complete | docs/runbooks/uncertain-work-recovery.md#already-uncertain-local-attempt was not edited |
| docs/runbooks/uncertain-work-recovery.md#already-uncertain-local-attempt | task guide | unchanged: the guide still says the CLI is the only saved-evidence settlement and this slice does not replace that procedure | no source behavior changed; the runbook was not edited | source-observed | The new function must not be read as an operator command | the runbook link to this packet stays |

**Owner action:** do not select this packet for deletion, and do not mark it Done. A proved replacement procedure has to land before the CLI can be removed. The CLI remains the only operator procedure.
