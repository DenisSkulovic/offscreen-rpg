# MA05 | sources inspected, remaining proof
- `packages/application/src/stories/index.ts` ~375 lines: `createStories` around 63, `retryStoryteller` call around 128, `createStoryApplication` around 286, `chamberAllowsResponse` around 299. It composes Storyteller retry and campaign operations directly.
- `packages/application/src/stories/resolution.ts` ~501 lines: first import from `../storyteller/admission`; `prepareStorytellerResolution` used around 466; generated task and resolution operations.
- `packages/application/src/storyteller/admission.ts` ~641 lines: imports `stories/{persistence,errors,passage-documents}`, Writer task schemas, SQL and source captures; exports prepare/commit/replay operations.
- `packages/application/src/storyteller/publication.ts` ~978 lines: imports story continuation/checkpoint/persistence/appearance and campaign holds/delegated actions.
- `packages/application/src/stories/continuation.ts` ~735 lines and `campaign/persistence.ts` ~346 lines: SQL owner utility and transaction semantics; keep ordering and CAS.
- `apps/game-authority/src/application.ts`, `apps/api/src/app.ts`, `apps/worker/src/activities/index.ts`: outer compositions consuming application subpaths.
**Pending planner evidence before task readiness:** full MA01 SCC/public export graph, function signatures and their transaction scopes, precise importer list, regression fixtures for stale-root/replay, settled publication and rollback. Source baseline will change after WR05/WR06, hence do not ask Cursor to rediscover it.
