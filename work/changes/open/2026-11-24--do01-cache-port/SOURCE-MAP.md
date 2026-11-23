# Source map
Baseline `ed0837d0531be4050b40d9b2485b5759ef479fea`; actual post-Documents HEAD pending. Line anchors are snapshot observations, not current execution proof.

## read-cache
- Source: `packages/contracts/src/read-cache.ts` → `packages/cache-port/src/read-cache.ts`
- Import: `@offscreen/cache-port/read-cache`
- Current imports: 
- Exports: `ReadCacheWrite`, `ReadCache`, `disabledReadCache`
- Existing tests: `packages/contracts/test/read-cache.test.ts`

| Consumer | Lines |
|---|---|
| `packages/cache/src/index.ts` | 1 |
| `packages/story-engine/src/stories/read-cache-options.ts` | 1,6,7 |
| `apps/api/src/app.ts` | 24 |
| `tools/api-integration/test/stories-core.integration.ts` | 13 |

## Non-source and internal import anchors
See program ownership map and Change split rules. Exact current relative import graph is listed above.

Technical/related owners referencing old package in snapshot (refresh impacted subset, do not rewrite historical receipts):

- `infra/kubernetes/lab/dev/dev-sync-paths.mjs`
- `infra/kubernetes/lab/app-release/production-workspace-closure.test.mjs`
- `docs/architecture/00-human-tour.md`
- `docs/technical/engine/selected-architecture.md`
- `docs/technical/platform/security-and-trust-boundaries.md`
- `docs/technical/platform/http-api-and-client-contracts.md`
- `docs/technical/platform/data-and-persistence.md`
- `docs/technical/platform/persistence-and-caching.md`
- `docs/technical/admin/topology-and-authorization.md`
- `docs/technical/lab/chamber-and-fixtures.md`
- `docs/technical/lab/experiment-protocol.md`
- `docs/technical/client/scene-direction-production.md`
- `docs/technical/client/living-book-poc.md`
- `docs/technical/client/presentation-runtime.md`
- `scripts/repo-tools/maintenance-coverage.test.mjs`
- `scripts/repo-tools/module-graph.test.mjs`
- `scripts/repo-tools/module-graph.mjs`
- `scripts/repo-tools/focused-integration.mjs`
- `scripts/repo-tools/ci-change-scope.test.mjs`
