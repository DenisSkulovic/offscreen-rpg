# Proof matrix
Local source-only receipt on `change/do05-storyteller-engine-ownership` from `032f00700eb13cad0d3115d9f5d91c5f16feeb10`. Not a custodian join and not live acceptance.

| Check | Result |
|---|---|
| Relocated node tests | PASS 10/10 |
| `turbo build typecheck` for storyteller, contracts, story-engine and their dependencies | PASS 20/20 |
| Dependents build/typecheck | PASS except `@offscreen/api-integration#typecheck` on `test/library-batch-read.test.ts` exactOptional `corruptHash` (file not in this diff; recorded baseline) |
| `pnpm repo:module-graph` | FAIL on pre-existing `forbidden-authority-writer-import` in `action-executions.ts`; no package-dependency-cycle or package-source-cycle |
| `pnpm repo:module-graph:test` | PASS 26/26 |
| `repo:code-health --strict-new` | PASS strict 0 |
| `repo:code-quality:changed` | NOT VERIFIED: script resolves `npm_execpath` as a missing `pnpm` module. Direct Prettier/quality eslint on new and fully moved modules PASS. Consumer files still carry pre-existing quality findings after import-only edits. |
| wiki plan/close | NOT RUN. Shared docs stay with the DO04 custodian. |

| Check | Positive | Negative |
|---|---|---|
| Source identity | moved validators and literals unchanged except imports/specified splits | no widened validators, altered digest or silent alias |
| Package graph | `pnpm repo:module-graph` and `pnpm repo:module-graph:test` | no cycle, undeclared dependency or forbidden edge |
| Build | `pnpm exec turbo run build typecheck` (full at closure, or explicitly scoped reverse consumers for intermediate tasks) | no stale dist-only resolution; fresh install |
| Tests | moved tests actually emitted and run | all pre-existing negative assertions preserved |
| Docs | `pnpm wiki:change-guard --mode plan` / `--mode close` with selected packet arguments per current CLI; `pnpm wiki:health` | no new broken links; baseline failures separately recorded |
| Quality | `pnpm repo:code-quality:changed` with actual reference and `pnpm repo:code-health --base <reference> --strict-new` | no unrelated edits or new severe bands |

## Relocated test commands
- `node --test packages/storyteller/dist/test/story-retrieval-contract.test.js packages/storyteller/dist/test/creative-exploration-contract.test.js`
- Exact fixtures and atomic joins in CHANGE.md.
- `node --test packages/story-engine/dist/storyteller/dispatch-authority-policy.test.js`
- `node --test packages/story-engine/dist/generations/storyteller-kinds.test.js`
- `node --test packages/story-engine/dist/generations/storyteller-notices.test.js`

## Stage-specific acceptance
Return creative/retrieval semantics to Storyteller `src/context`, expose two explicit subpaths. Remove final two Storyteller imports and manifest dependency in T01/T02 before introducing residual old `creative-exploration-evaluation.ts` -> `@offscreen/storyteller/context/creative-exploration`; otherwise stop for planner cycle correction. `current-authority.ts` is not the existing engine loader `src/storyteller/current-authority.ts`: move it to `dispatch-authority-policy.ts`, import usage-policy leaf, change both loader call sites. Storyteller kind and notice literals belong to engine durable generation identity (`src/generations/`), not runtime orchestrator or provider; use relative imports from stories/campaign/storyteller so MA05 neutral dependency inversion survives; preserve existing internal re-exports in records.ts and context-capture.ts if consumers need them. Never alter DB outbox strings or introduce a dependency from authority to runtime. Existing engine tests move to src beside modules; no new external exports for these three internal files (existing wildcard may technically resolve paths; guard external imports). Negative: balance and captured policy are not dispatch entitlement, hold denied on invalid current grant; existing tests are authoritative. Add fixture parse negatives for retrieval/creative if no existing focused coverage; use real fixtures, no provider.

## Stop conditions
Unexpected behavior or schema/digest change, private browser import, production graph cycle, unplanned Documents dependency or missing fixture: stop and report exact symbol/path to ChatGPT. No live provider, DB reset, or cluster operation.
