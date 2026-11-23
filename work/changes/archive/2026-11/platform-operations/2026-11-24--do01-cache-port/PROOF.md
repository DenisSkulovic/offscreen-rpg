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
- `node --test packages/cache-port/dist/test/read-cache.test.js`

## Stage-specific acceptance
Keep the MA02 neutral cache port independent of Redis and story semantics. `packages/cache/src/index.ts` implements it, `packages/story-engine/src/stories/read-cache-options.ts` consumes and re-exports it, `apps/api/src/app.ts` injects it. New `cache-port` has zero runtime dependencies; cache Redis adapter may depend on it but engine must not depend on Redis. Preserve existing engine read-cache-options re-export (not an old contracts alias). Negative: disabled read cache misses; set requires ttlSeconds and maxBytes. Update persistence-and-caching.md cache port heading.

## Stop conditions
Unexpected behavior or schema/digest change, private browser import, production graph cycle, unplanned Documents dependency or missing fixture: stop and report exact symbol/path to ChatGPT. No live provider, DB reset, or cluster operation.
