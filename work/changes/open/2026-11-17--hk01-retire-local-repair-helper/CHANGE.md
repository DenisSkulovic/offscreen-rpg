# HK01 | Retire unsupported local Storyteller response-reconciliation CLI

**State: Blocked (2026-11-18).** The pre-delete evidence gate failed. The file stays. **Program:** [housekeeping audit](../../../designs/open/repository-housekeeping/AUDIT-2026-11-17.md). **Dependency:** HK02 is Done and was not required for this audit. **Outcome:** do not remove `scripts/repo-tools/reconcile-storyteller-response.mjs` until a supported replacement can settle an already-uncertain local attempt from saved evidence.

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

## Reconciliation ledger

| Authority | Intent | Implementation proof | Status/docs |
| --- | --- | --- | --- |
| Storyteller budget/recovery code | preserve supported uncertain-attempt semantics | `execution.ts` fail-closes; this CLI is the only saved-evidence settlement | kept |
| Local scripts and package routing | remove unsupported alternate mutation entrypoint | no package script and no import, but the runbook's owner recovery has no other implementation | not removed |
| Housekeeping audit | record remove/keep decision and trace | F02 updated 2026-11-18 | blocked |

**Owner action:** do not select this packet for deletion. A replacement recovery procedure has to land before the file can be removed.
