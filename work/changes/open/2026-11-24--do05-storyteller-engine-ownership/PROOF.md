# Proof matrix
No proof executed by ChatGPT. Run from repo root after install; report actual exit code and counts.

| Check | Positive | Negative |
|---|---|---|
| Source identity | moved validators and literals unchanged except imports/specified splits | no widened validators, altered digest or silent alias |
| Package graph | `pnpm repo:module-graph` and `pnpm repo:module-graph:test` | no cycle, undeclared dependency or forbidden edge |
| Build | `pnpm exec turbo run build typecheck` (full at closure, or explicitly scoped reverse consumers for intermediate tasks) | no stale dist-only resolution; fresh install |
| Tests | moved tests actually emitted and run | all pre-existing negative assertions preserved |
| Docs | `pnpm wiki:change-guard --mode plan` / `--mode close` with selected packet arguments per current CLI; `pnpm wiki:health` | no new broken links; baseline failures separately recorded |
| Quality | `pnpm repo:code-quality:changed` with actual reference and `pnpm repo:code-health --base <reference> --strict-new` | no unrelated edits or new severe bands |

## Relocated test commands
- `node --test packages/story-engine/dist/storyteller/dispatch-authority-policy.test.js`
- `node --test packages/story-engine/dist/generations/storyteller-kinds.test.js`
- `node --test packages/story-engine/dist/generations/storyteller-notices.test.js`

## Stage-specific acceptance
Return creative/retrieval semantics to Storyteller `src/context`, expose two explicit subpaths. All Storyteller imports of old contracts must already be removed by DO02/03 before introducing residual old `creative-exploration-evaluation.ts` -> `@offscreen/storyteller/context/creative-exploration`; otherwise stop for planner cycle correction. `current-authority.ts` is not the existing engine loader `src/storyteller/current-authority.ts`: move it to `dispatch-authority-policy.ts`, import usage-policy leaf, change both loader call sites. Storyteller kind and notice literals belong to engine durable generation identity (`src/generations/`), not runtime orchestrator or provider; use relative imports from stories/campaign/storyteller so MA05 neutral dependency inversion survives; preserve existing internal re-exports in records.ts and context-capture.ts if consumers need them. Never alter DB outbox strings or introduce a dependency from authority to runtime. Existing engine tests move to src beside modules; no new external exports for these three internal files (existing wildcard may technically resolve paths; guard external imports). Negative: balance and captured policy are not dispatch entitlement, hold denied on invalid current grant; existing tests are authoritative. Add fixture parse negatives for retrieval/creative if no existing focused coverage; use real fixtures, no provider.

## Stop conditions
Unexpected behavior or schema/digest change, private browser import, production graph cycle, unplanned Documents dependency or missing fixture: stop and report exact symbol/path to ChatGPT. No live provider, DB reset, or cluster operation.
