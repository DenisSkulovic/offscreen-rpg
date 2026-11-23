# CACHE06A | bounded Composer tasks

Frozen interfaces, ownership and wave gates: [CACHE-PARALLEL](../../../undertakings/storyteller-workshop/CACHE-PARALLEL.md). Lane-specific source and tests only; no shared-file changes during parallel dispatch. One child at a time, DEPTH=PATCH, Composer Standard. Receipt: paths, command/cwd, positive and negative result, limitations. Stop on exact contradiction; no research swarm.

## T01 | Immutable seam

- Initial anchors: packages/documents/src/s3-store.ts; packages/object-storage/src/object-storage.ts; packages/cache/src/strategies.
- Decided edit and proof: Add optional injected immutable cache to S3DocumentStore and LocalDocumentStore readValidated only; keep readRaw/direct storage.get for write verification. Validate hash and schema inside cache decode and authoritative loader before population; invalid cached value reloads origin once. Preserve DocumentStorageError mapping and 1 MiB origin read cap; 256 KiB is admission only. Decorate explicit eligible immutable byte reads, scoped hash/kind identity, 256 KiB default, memory and optional Redis. Separate direct verification, exists/list/delete/conditional writes; domain hash/schema and authorization/root membership preserved.
- Verification (root): `pnpm --filter @offscreen/cache build`, `pnpm --filter @offscreen/cache test` (CACHE01 adds script); affected workspace build/typecheck; pnpm --filter @offscreen/documents build && node --test packages/documents/test/document-read-cache.test.mjs. Shared manifests/lock and exports belong exclusively to the integration custodian; no lane edits them. Stop on missing prerequisite, fixture, authority or source contradiction; report exact symbol.

## T02 | Integrity proof

- Initial anchors: packages/documents/test/documents.test.mjs; new packages/documents/test/document-read-cache.test.mjs; packages/documents/src/s3-store.ts.
- Decided edit and proof: Counting fake origin proves reuse, corrupt cache reload, corrupt origin fails, write readback hits origin despite warm cache, mutable/unauthorized reads never eligible.
- Verification (root): `pnpm --filter @offscreen/cache build`, `pnpm --filter @offscreen/cache test` (CACHE01 adds script); affected workspace build/typecheck; named focused domain test after planner pins fixture command. Shared manifests/lock and exports belong exclusively to the integration custodian; no lane edits them. Stop on missing prerequisite, fixture, authority or source contradiction; report exact symbol.
