# MA02 | inspected source
- `packages/application/src/cache/read-cache.ts`: `ReadCacheWrite`, `ReadCache`, `CacheIncident`, `ReadCacheOptions`, `disabledReadCache`; currently pure definitions with no imports.
- `packages/cache/src/index.ts` first import `type ReadCache` from `@offscreen/application/cache`; Redis config Zod, optional disabled cache, JSON.parse unknown, set/get deadline/error behavior. Preserve runtime behavior.
- `packages/cache/package.json`: `@offscreen/application: workspace:*`; `packages/contracts/package.json`: Zod/game/documents but no `application`; explicit per-subpath exports, NodeNext output `dist/src/*.js`.
- `packages/application/package.json` and `apps/api/src/app.ts` import `application/cache` interface; re-export compatibility prevents immediate unrelated migration. `packages/application/src/stories/index.ts` accepts `ReadCacheOptions`.
