# CACHE01 | bounded Composer tasks

Frozen interfaces, ownership and wave gates: [CACHE-PARALLEL](../../../undertakings/storyteller-workshop/CACHE-PARALLEL.md). Lane-specific source and tests only; no shared-file changes during parallel dispatch. One child at a time, DEPTH=PATCH, Composer Standard. Receipt: paths, command/cwd, positive and negative result, limitations. Stop on exact contradiction; no research swarm.

## T01 | Core contracts and keys

- Initial anchors: packages/cache/src/index.ts; packages/cache/package.json; packages/cache-port/src/read-cache.ts.
- Decided edit and proof: Implement exact frozen core signatures and key grammar from CACHE-PARALLEL.md: typed byte-store outcomes, policy validator, canonical length-prefixed UTF-8 tuple SHA-256 key; preserve legacy createCacheAdapter and DO01 port. Test tuple collision, owner/env/schema separation, bounds and invalid config.
- Verification (root): `pnpm --filter @offscreen/cache build`; T01 runs its emitted `node --test packages/cache/dist/cache01-*.test.js`; T02 runs the new package test script; affected workspace build/typecheck; no domain fixture needed. Foundation parent owns its package manifest and exports, before parallel dispatch. Stop on missing prerequisite, fixture, authority or source contradiction; report exact symbol.

## T02 | Codecs and test stores

- Initial anchors: packages/cache/src/core; packages/cache/tsconfig.json; packages/cache/package.json.
- Decided edit and proof: JSON parser codec, bytes copy, deterministic fake/disabled stores and clock. Test null vs miss, malformed JSON/schema, oversize. CACHE01 alone owns core/codecs public exports and manifest/test wiring. Add package test script (build then node --test dist/*.test.js); root src test files; explicit exports. Verify core imports do not load Redis.
- Verification (root): `pnpm --filter @offscreen/cache build`, `pnpm --filter @offscreen/cache test` (CACHE01 adds script); affected workspace build/typecheck; no domain fixture needed. Foundation parent owns its package manifest and exports, before parallel dispatch. Stop on missing prerequisite, fixture, authority or source contradiction; report exact symbol.
