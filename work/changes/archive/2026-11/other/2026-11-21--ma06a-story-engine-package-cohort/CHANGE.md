# MA06A | Extract coherent Story Engine workspace in one migration

**State: Done (2026-11-21).** Integrated on `undertaking/storyteller-workshop`. Integration target `undertaking/storyteller-workshop`. **MA05G was integrated and archived before this execution.** The parent used worktree `change/ma06a-story-engine-extraction` from undertaking HEAD `249fb3b8`. Live census before the move: 134 exporting TypeScript modules, one JSON fixture, one README, and only the two `../cache/read-cache` outward edges. No additional owner approval was required.

## Revised architectural decision (supersedes proposed immediate split into two npm packages)

**Extract ONE `@offscreen/story-engine` workspace initially**, containing existing application `stories/`, `campaign/`, `storyteller/` and `generations/` as _internal modules_. The physically separate existing `@offscreen/storyteller` package stays the pure task/provider/context library. `@offscreen/application` becomes a bounded compatibility/composition shell, developer tools, drafts, logging, and Admin adapter. No `@offscreen/story-authority` npm workspace yet.

**Reason:** source import graph (2bcebcdd baseline) has `stories→campaign` 19 imports, `campaign→stories` 31, `storyteller→stories` 25, `storyteller→campaign` 21, `campaign→storyteller` 3, `stories→storyteller` 3 before MA05F/G, `generations→{stories,storyteller}` 8. MA05F/G remove some, but campaign narration/report capture and materialization are still bidirectional. An immediate Authority/Runtime npm split would require additional ports, callbacks or temp ownership shims to compile; those APIs are likely to change with evolved gameplay. An honest cohesive Story Engine package with internal source domains is cleaner than inventing prematurely stable interfaces. **Enforce internal rules and narrow seams in MA06C when the source law is reliable.**

## Baseline coverage and direct migration map

The source snapshot inventory contains **125 TypeScript files / ~39,092 lines** in these four directories (stories 22, campaign 33, storyteller 63, generations 7), plus `campaign/fixtures/content/mechanical-openings.json` and `stories/README.md`. Post-MA05F/G file counts will differ; use actual HEAD. Move all four source subtrees together, unchanged in their relative relationship, from `packages/application/src/<domain>/` to `packages/story-engine/src/<domain>/`.

The only observed **outward application-source imports from engine domains into the remaining application** are `stories/index.ts` and `stories/reads.ts` importing `../cache/read-cache` (two imports). These cache contracts are pure type/disabled adapter, not IO logic. **Decided fix:** `story-engine/src/reads/cache-options.ts` (or `story-engine/src/stories/read-cache-options.ts`, choose the latter exact path) owns `CacheIncident`, `ReadCacheOptions`; import `ReadCache` and `disabledReadCache` from `@offscreen/contracts/read-cache`. Update `stories/index.ts` and `stories/reads.ts` to use this new local file. In `application/src/cache/read-cache.ts`, reexport `CacheIncident` and `ReadCacheOptions` types from `@offscreen/story-engine/stories/read-cache-options`, and keep the contracts reexports. This creates an acyclic `application→story-engine` relationship, not inverse. No new cache behavior.

**All inbound imports from remaining `application/developer-tools` into the moved domains** (memory evaluator, Chamber, fixtures, inspection, usage profiles, evidence packing and playability harness) should resolve via retained `application/src/<domain>/*.ts` forwarding modules. Keep old package public exports (`./stories`, `./stories/resolution`, `./stories/persistence`, `./storyteller`, `./storyteller/saved-generation-publish`, `./generations`) as **identity-preserving** reexports. Also retain old private `../dist/<domain>/<file>.js` import paths used by local application tests. Snapshot: **287 direct deep-dist imports across 80 application test files and 81 distinct paths**; moving tests in this Change would be larger, less useful churn.

### Mechanical, deterministic compatibility strategy

For every moved `src/<domain>/<relative>.ts`, replace original application source file with only `export * from '@offscreen/story-engine/<domain>/<relative>'` and any explicit `export type` or default export needed **after inspecting the original module**. No runtime wrapper functions. When a module contains no exports, use a direct side-effect import, but validate whether it is actually a useful public module before choosing side-effect semantics. Do not generate these stubs blindly for import-only files with observable registration/side effects; original module semantics must be preserved.

`story-engine/package.json` uses **the same CommonJS NodeNext module behavior as existing application (do not add `"type":"module"`)** and NodeNext-compatible wildcard `exports` for four module domains (`./stories/*`, `./campaign/*`, `./storyteller/*`, `./generations/*`) with `types: ./dist/<domain>/*.d.ts`, `default: ./dist/<domain>/*.js`, plus four domain index paths where necessary. Ensure `./stories`, `./storyteller` and `./generations` resolve their index modules exactly, not as folders. Package declares `@offscreen/contracts,db,documents,game,storyteller`, `drizzle-orm`, `zod` and Node/TS config; no `@offscreen/application` dependency. Copy `application`'s NodeNext/rootDir/outDir tsconfig conventions. `application` adds `@offscreen/story-engine: workspace:*` and retains its old public exports. Update lockfile via repo's pnpm workspace tool, never hand-edit package importer records.

**No intermediary individual MA05H capture move.** `context-capture.ts` (~3,079 current lines, six exported SQL capture functions) and `capture-materialization.ts` (~1,598 lines) move once, together with their current campaign/stories dependencies. Preserve the existing `Tx` capture → durable row → off-lock materialization → same-generation promotion lifecycle; this Change is a **packaging move, not logic rewrite**.

## Reconciliation ledger

| Affected selected claim/heading                                                    | Authority                                                                                                    | Target delta (changed/unchanged; reason)                                                                                   | Source delta & inspected SHA                                                        | Status/evidence tier | Negative proof                                                                                                     | Map/link update or N/A                                |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Cohesive story-engine package owns stories, campaign, storyteller, and generations | docs/technical/engine/selected-architecture.md#transitional-package-extraction-selected-for-ma06a-2026-11-21 | changed: the heading now says the package owns those trees, and application keeps compatibility exports                    | packages/story-engine/src/stories/index.ts at 249fb3b8 plus this Change    | fixture-tested       | compatibility test fails if story-engine imports `@offscreen/application` or a dist export is a different function | same heading, plus packages/story-engine/README.md    |
| Application remains the host facade                                                | docs/technical/platform/topology.md                                                                          | changed: story lifecycle implementation is named as story-engine, with the same application exports                        | packages/application/package.json at 249fb3b8 plus this Change    | source-inspected     | module graph reports no story-engine to application edge                                                           | topology paragraph and packages/application/README.md |
| Player story, capture, lock, and spend behavior                                    | docs/product/gameplay/rules.md                                                                               | unchanged because this Change moves modules and does not change rules, locks, capture, or spend                            | packages/story-engine/src/storyteller/budget.ts at 249fb3b8 plus this Change; byte-identical except the two cache imports | fixture-tested       | ENG03 stale-note fence refuses the commit; story03 rejects a flipped topic and an outbox identity conflict         | N/A                                                   |
| Read-cache options                                                                 | packages/application/src/cache/read-cache.ts                                                                 | changed: `CacheIncident` and `ReadCacheOptions` are owned by story-engine and re-exported here; contract cache values stay | packages/story-engine/src/stories/read-cache-options.ts at 249fb3b8 plus this Change | source-inspected     | story-engine package manifest has no application dependency                                                        | application cache re-export                           |

Provider spend: no new provider call. The pre-existing concurrent budget dispatch assertion still returns false on byte-identical `budget.ts`. No new SQL schema. MA06B was not started.

## Execution contract

Five bounded Composer work units, one Change closure, outlined in [TASKS.md](TASKS.md) and [PROOF.md](PROOF.md). T01 package scaffold and read-cache boundary; T02 move four domains in one deterministic batch with forwarding stubs; T03 migrate manifests/build/callers and deep test loading; T04 source graph, focused DB and negative proof; T05 docs/acceptance/archive/squash integrate. T01–T03 are mutually dependent, **one child at a time**; no pointless per-file manual delegation. Parent may use a reviewed script for mechanical moves and reports deterministic touched-file list, rather than burning a model conversation per 125 files.

### Critical constraints

- Preserve old public exports, deep-test import paths and function identity; no story API or database schema change, no new provider calls.
- Preserve authorization, SQL lock order, replay, immutable capture hashes/leases, outbox notice-topic freezing, provider-spend budget and failure policy.
- Test with authorized disposable DB only; do not run destructive reset/fixture scripts against an unspecified target.
- All children commit to **one dedicated MA06A worktree from the undertaking HEAD AFTER MA05G joins**, never `main` or the planning branch; final squash integrates into undertaking.
- **Pre-dispatch factual gate, not a planning hold:** inspect current integration HEAD and `git status`, verify MA05G is archived, then generate a local migration manifest (all .ts modules, public exports, non-.ts resources, old deep test paths) from the _current_ source. The 2bcebcdd sample had 125 exporting .ts modules, no non-export .ts and one JSON fixture. If MA05G added a module, include it automatically; if it introduced a new app→engine reverse dependency, report the exact new import as an architectural contradiction. Ordinary path/fixture/compiler drift is executor work, not an excuse to stop the Change. G's own SQL tests need not be rerun by every mechanical child; focused acceptance at T04 remains mandatory.

## Closeout paths

- STATUS.md
- apps/api/src/modules/stories/README.md
- docs/technical/engine/selected-architecture.md
- docs/technical/platform/topology.md
- packages/application/README.md
- packages/application/package.json
- packages/application/src/cache/read-cache.ts
- packages/application/src/campaign/accepted-plan-controls.ts
- packages/application/src/campaign/accepted-plans.ts
- packages/application/src/campaign/action-execution-controls.ts
- packages/application/src/campaign/action-execution-transition.ts
- packages/application/src/campaign/action-executions.ts
- packages/application/src/campaign/action-overlap.ts
- packages/application/src/campaign/actions.ts
- packages/application/src/campaign/activities.ts
- packages/application/src/campaign/activity-follow-up-policy.ts
- packages/application/src/campaign/activity-lifecycle-events.ts
- packages/application/src/campaign/clock.ts
- packages/application/src/campaign/controls.ts
- packages/application/src/campaign/custom-intent-matcher.ts
- packages/application/src/campaign/custom-intent.ts
- packages/application/src/campaign/delegated-decision.ts
- packages/application/src/campaign/delegated-expiry.ts
- packages/application/src/campaign/delegated-offer.ts
- packages/application/src/campaign/fixtures/content/mechanical-openings.json
- packages/application/src/campaign/fixtures/harmless-invitation-offer.ts
- packages/application/src/campaign/fixtures/item-transfer-plans.ts
- packages/application/src/campaign/fixtures/mechanical-content.ts
- packages/application/src/campaign/follow-up-intents.ts
- packages/application/src/campaign/holds.ts
- packages/application/src/campaign/narration.ts
- packages/application/src/campaign/persistence.ts
- packages/application/src/campaign/reads.ts
- packages/application/src/campaign/report-source.ts
- packages/application/src/campaign/reports.ts
- packages/application/src/campaign/settings.ts
- packages/application/src/campaign/state-documents.ts
- packages/application/src/campaign/storyteller-activity-filter.ts
- packages/application/src/campaign/storyteller-wake.ts
- packages/application/src/campaign/topics.ts
- packages/application/src/campaign/world-obligation-controls.ts
- packages/application/src/campaign/world-obligations.ts
- packages/application/src/generations/generated-continuation.ts
- packages/application/src/generations/index.ts
- packages/application/src/generations/openings.ts
- packages/application/src/generations/scripted-continuation-timing.ts
- packages/application/src/generations/scripted-continuations.ts
- packages/application/src/generations/scripted-openings.ts
- packages/application/src/generations/service.ts
- packages/application/src/stories/README.md
- packages/application/src/stories/active-scene-anchor.ts
- packages/application/src/stories/command-policy.ts
- packages/application/src/stories/continuation.ts
- packages/application/src/stories/continuity-notes.ts
- packages/application/src/stories/delegation-policy.ts
- packages/application/src/stories/documents.ts
- packages/application/src/stories/errors.ts
- packages/application/src/stories/forks.ts
- packages/application/src/stories/index.ts
- packages/application/src/stories/initialization.ts
- packages/application/src/stories/passage-documents.ts
- packages/application/src/stories/persistence.ts
- packages/application/src/stories/plans.ts
- packages/application/src/stories/public-events.ts
- packages/application/src/stories/reads.ts
- packages/application/src/stories/resolution-core.ts
- packages/application/src/stories/resolution-receipt.ts
- packages/application/src/stories/resolution.ts
- packages/application/src/stories/scene-appearance.ts
- packages/application/src/stories/scene-checkpoint.ts
- packages/application/src/stories/start.ts
- packages/application/src/stories/storyteller-resolution-authority.ts
- packages/application/src/stories/storyteller-resolution-contract.ts
- packages/application/src/stories/storyteller-retry-policy.ts
- packages/application/src/stories/storyteller-retry.ts
- packages/application/src/stories/storyteller-start-candidate.ts
- packages/application/src/stories/storyteller-task-record.ts
- packages/application/src/stories/timing.ts
- packages/application/src/stories/topics.ts
- packages/application/src/stories/visit-checkpoint.ts
- packages/application/src/storyteller/activity-context.ts
- packages/application/src/storyteller/adaptive-recipe.ts
- packages/application/src/storyteller/admission.ts
- packages/application/src/storyteller/branch-pinned-memory.ts
- packages/application/src/storyteller/budget.ts
- packages/application/src/storyteller/canonical-knowledge.ts
- packages/application/src/storyteller/canonical-search.ts
- packages/application/src/storyteller/capture-materialization.ts
- packages/application/src/storyteller/capture-rearm.ts
- packages/application/src/storyteller/config.ts
- packages/application/src/storyteller/context-capture.ts
- packages/application/src/storyteller/context.ts
- packages/application/src/storyteller/creative-discovery.ts
- packages/application/src/storyteller/creative-exploration-recipes.ts
- packages/application/src/storyteller/current-authority.ts
- packages/application/src/storyteller/dispatch-authority.ts
- packages/application/src/storyteller/dispatch-review.ts
- packages/application/src/storyteller/evidence-packing.ts
- packages/application/src/storyteller/execution-stages.ts
- packages/application/src/storyteller/execution.ts
- packages/application/src/storyteller/generation-adoption.ts
- packages/application/src/storyteller/index.ts
- packages/application/src/storyteller/lexical-story-index-cache.ts
- packages/application/src/storyteller/lexical-story-index.ts
- packages/application/src/storyteller/library-navigation.ts
- packages/application/src/storyteller/load-current-dispatch-authority.ts
- packages/application/src/storyteller/local-lexical-story-index-store.ts
- packages/application/src/storyteller/loop-lifecycle.ts
- packages/application/src/storyteller/memory-evidence-packing.ts
- packages/application/src/storyteller/memory-evidence-use.ts
- packages/application/src/storyteller/memory-exploration-controller.ts
- packages/application/src/storyteller/memory-exploration.ts
- packages/application/src/storyteller/memory-provider-preview.ts
- packages/application/src/storyteller/memory-provider-runtime.ts
- packages/application/src/storyteller/memory.ts
- packages/application/src/storyteller/openings.ts
- packages/application/src/storyteller/prompt-provenance.ts
- packages/application/src/storyteller/publication.ts
- packages/application/src/storyteller/read-generation-dispatch-authority.ts
- packages/application/src/storyteller/records.ts
- packages/application/src/storyteller/recovery.ts
- packages/application/src/storyteller/retrieval-recipes.ts
- packages/application/src/storyteller/runtime.ts
- packages/application/src/storyteller/saved-generation-publish.ts
- packages/application/src/storyteller/saved-repair-apply.ts
- packages/application/src/storyteller/saved-repair-plan.ts
- packages/application/src/storyteller/saved-response-inspection.ts
- packages/application/src/storyteller/saved-response-settlement.ts
- packages/application/src/storyteller/start.ts
- packages/application/src/storyteller/task-admission.ts
- packages/application/src/storyteller/task-evidence-need.ts
- packages/application/src/storyteller/test-revoke-current-owner-grant.ts
- packages/application/src/storyteller/test-synthetic-current-authority.ts
- packages/application/src/storyteller/usage-policy-defaults.ts
- packages/application/src/storyteller/usage-policy-resolution.ts
- packages/application/src/storyteller/usage-policy.ts
- packages/application/src/storyteller/window-accounting.ts
- packages/application/src/storyteller/writer-library-tools.ts
- packages/application/src/storyteller/writer-loop.ts
- packages/application/src/storyteller/writer-mission-custody.ts
- packages/application/src/storyteller/writer-mission-store.ts
- packages/application/src/storyteller/writer-scene-proposal.ts
- packages/application/src/storyteller/writer-workdesk.ts
- packages/application/test/eng03-c1r-provisional-recovery.test.mjs
- packages/application/test/ma06a-story-engine-compatibility.test.mjs
- packages/story-engine/README.md
- packages/story-engine/package.json
- packages/story-engine/src/campaign/accepted-plan-controls.ts
- packages/story-engine/src/campaign/accepted-plans.ts
- packages/story-engine/src/campaign/action-execution-controls.ts
- packages/story-engine/src/campaign/action-execution-transition.ts
- packages/story-engine/src/campaign/action-executions.ts
- packages/story-engine/src/campaign/action-overlap.ts
- packages/story-engine/src/campaign/actions.ts
- packages/story-engine/src/campaign/activities.ts
- packages/story-engine/src/campaign/activity-follow-up-policy.ts
- packages/story-engine/src/campaign/activity-lifecycle-events.ts
- packages/story-engine/src/campaign/clock.ts
- packages/story-engine/src/campaign/controls.ts
- packages/story-engine/src/campaign/custom-intent-matcher.ts
- packages/story-engine/src/campaign/custom-intent.ts
- packages/story-engine/src/campaign/delegated-decision.ts
- packages/story-engine/src/campaign/delegated-expiry.ts
- packages/story-engine/src/campaign/delegated-offer.ts
- packages/story-engine/src/campaign/fixtures/content/mechanical-openings.json
- packages/story-engine/src/campaign/fixtures/harmless-invitation-offer.ts
- packages/story-engine/src/campaign/fixtures/item-transfer-plans.ts
- packages/story-engine/src/campaign/fixtures/mechanical-content.ts
- packages/story-engine/src/campaign/follow-up-intents.ts
- packages/story-engine/src/campaign/holds.ts
- packages/story-engine/src/campaign/narration.ts
- packages/story-engine/src/campaign/persistence.ts
- packages/story-engine/src/campaign/reads.ts
- packages/story-engine/src/campaign/report-source.ts
- packages/story-engine/src/campaign/reports.ts
- packages/story-engine/src/campaign/settings.ts
- packages/story-engine/src/campaign/state-documents.ts
- packages/story-engine/src/campaign/storyteller-activity-filter.ts
- packages/story-engine/src/campaign/storyteller-wake.ts
- packages/story-engine/src/campaign/topics.ts
- packages/story-engine/src/campaign/world-obligation-controls.ts
- packages/story-engine/src/campaign/world-obligations.ts
- packages/story-engine/src/generations/generated-continuation.ts
- packages/story-engine/src/generations/index.ts
- packages/story-engine/src/generations/openings.ts
- packages/story-engine/src/generations/scripted-continuation-timing.ts
- packages/story-engine/src/generations/scripted-continuations.ts
- packages/story-engine/src/generations/scripted-openings.ts
- packages/story-engine/src/generations/service.ts
- packages/story-engine/src/stories/README.md
- packages/story-engine/src/stories/active-scene-anchor.ts
- packages/story-engine/src/stories/command-policy.ts
- packages/story-engine/src/stories/continuation.ts
- packages/story-engine/src/stories/continuity-notes.ts
- packages/story-engine/src/stories/delegation-policy.ts
- packages/story-engine/src/stories/documents.ts
- packages/story-engine/src/stories/errors.ts
- packages/story-engine/src/stories/forks.ts
- packages/story-engine/src/stories/index.ts
- packages/story-engine/src/stories/initialization.ts
- packages/story-engine/src/stories/passage-documents.ts
- packages/story-engine/src/stories/persistence.ts
- packages/story-engine/src/stories/plans.ts
- packages/story-engine/src/stories/public-events.ts
- packages/story-engine/src/stories/read-cache-options.ts
- packages/story-engine/src/stories/reads.ts
- packages/story-engine/src/stories/resolution-core.ts
- packages/story-engine/src/stories/resolution-receipt.ts
- packages/story-engine/src/stories/resolution.ts
- packages/story-engine/src/stories/scene-appearance.ts
- packages/story-engine/src/stories/scene-checkpoint.ts
- packages/story-engine/src/stories/start.ts
- packages/story-engine/src/stories/storyteller-resolution-authority.ts
- packages/story-engine/src/stories/storyteller-resolution-contract.ts
- packages/story-engine/src/stories/storyteller-retry-policy.ts
- packages/story-engine/src/stories/storyteller-retry.ts
- packages/story-engine/src/stories/storyteller-start-candidate.ts
- packages/story-engine/src/stories/storyteller-task-record.ts
- packages/story-engine/src/stories/timing.ts
- packages/story-engine/src/stories/topics.ts
- packages/story-engine/src/stories/visit-checkpoint.ts
- packages/story-engine/src/storyteller/activity-context.ts
- packages/story-engine/src/storyteller/adaptive-recipe.ts
- packages/story-engine/src/storyteller/admission.ts
- packages/story-engine/src/storyteller/branch-pinned-memory.ts
- packages/story-engine/src/storyteller/budget.ts
- packages/story-engine/src/storyteller/canonical-knowledge.ts
- packages/story-engine/src/storyteller/canonical-search.ts
- packages/story-engine/src/storyteller/capture-materialization.ts
- packages/story-engine/src/storyteller/capture-rearm.ts
- packages/story-engine/src/storyteller/config.ts
- packages/story-engine/src/storyteller/context-capture.ts
- packages/story-engine/src/storyteller/context.ts
- packages/story-engine/src/storyteller/creative-discovery.ts
- packages/story-engine/src/storyteller/creative-exploration-recipes.ts
- packages/story-engine/src/storyteller/current-authority.ts
- packages/story-engine/src/storyteller/dispatch-authority.ts
- packages/story-engine/src/storyteller/dispatch-review.ts
- packages/story-engine/src/storyteller/evidence-packing.ts
- packages/story-engine/src/storyteller/execution-stages.ts
- packages/story-engine/src/storyteller/execution.ts
- packages/story-engine/src/storyteller/generation-adoption.ts
- packages/story-engine/src/storyteller/index.ts
- packages/story-engine/src/storyteller/lexical-story-index-cache.ts
- packages/story-engine/src/storyteller/lexical-story-index.ts
- packages/story-engine/src/storyteller/library-navigation.ts
- packages/story-engine/src/storyteller/load-current-dispatch-authority.ts
- packages/story-engine/src/storyteller/local-lexical-story-index-store.ts
- packages/story-engine/src/storyteller/loop-lifecycle.ts
- packages/story-engine/src/storyteller/memory-evidence-packing.ts
- packages/story-engine/src/storyteller/memory-evidence-use.ts
- packages/story-engine/src/storyteller/memory-exploration-controller.ts
- packages/story-engine/src/storyteller/memory-exploration.ts
- packages/story-engine/src/storyteller/memory-provider-preview.ts
- packages/story-engine/src/storyteller/memory-provider-runtime.ts
- packages/story-engine/src/storyteller/memory.ts
- packages/story-engine/src/storyteller/openings.ts
- packages/story-engine/src/storyteller/prompt-provenance.ts
- packages/story-engine/src/storyteller/publication.ts
- packages/story-engine/src/storyteller/read-generation-dispatch-authority.ts
- packages/story-engine/src/storyteller/records.ts
- packages/story-engine/src/storyteller/recovery.ts
- packages/story-engine/src/storyteller/retrieval-recipes.ts
- packages/story-engine/src/storyteller/runtime.ts
- packages/story-engine/src/storyteller/saved-generation-publish.ts
- packages/story-engine/src/storyteller/saved-repair-apply.ts
- packages/story-engine/src/storyteller/saved-repair-plan.ts
- packages/story-engine/src/storyteller/saved-response-inspection.ts
- packages/story-engine/src/storyteller/saved-response-settlement.ts
- packages/story-engine/src/storyteller/start.ts
- packages/story-engine/src/storyteller/task-admission.ts
- packages/story-engine/src/storyteller/task-evidence-need.ts
- packages/story-engine/src/storyteller/test-revoke-current-owner-grant.ts
- packages/story-engine/src/storyteller/test-synthetic-current-authority.ts
- packages/story-engine/src/storyteller/usage-policy-defaults.ts
- packages/story-engine/src/storyteller/usage-policy-resolution.ts
- packages/story-engine/src/storyteller/usage-policy.ts
- packages/story-engine/src/storyteller/window-accounting.ts
- packages/story-engine/src/storyteller/writer-library-tools.ts
- packages/story-engine/src/storyteller/writer-loop.ts
- packages/story-engine/src/storyteller/writer-mission-custody.ts
- packages/story-engine/src/storyteller/writer-mission-store.ts
- packages/story-engine/src/storyteller/writer-scene-proposal.ts
- packages/story-engine/src/storyteller/writer-workdesk.ts
- packages/story-engine/tsconfig.json
- pnpm-lock.yaml
- tools/api-integration/test/storyteller-provider-budget.integration.ts
- work/changes/README.md
- work/changes/ledger/2026-11.md
- work/undertakings/modular-monolith/UNDERTAKING.md
