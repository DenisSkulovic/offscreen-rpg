# HK01 | Retire unsupported local Storyteller response-reconciliation CLI

**State: Ready with pre-delete evidence gate (unselected).** **Program:** [housekeeping audit](../../../designs/open/repository-housekeeping/AUDIT-2026-11-17.md). **Dependency:** HK02 preferred, not technically required. **Outcome:** remove an unowned one-off database mutation CLI from the supported repository surface, **only** if it is not a required recovery mechanism.

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

## Reconciliation ledger

| Authority | Intent | Implementation proof | Status/docs |
| --- | --- | --- | --- |
| Storyteller budget/recovery code | preserve supported uncertain-attempt semantics | pending | pending |
| Local scripts and package routing | remove unsupported alternate mutation entrypoint | pending | pending |
| Housekeeping audit | record remove/keep decision and trace | pending | pending |

**Owner action:** select HK01 explicitly. On surprising external usage or uncertain recovery, report and stop; a hidden mutation path is not an acceptable “cleanup test.”
