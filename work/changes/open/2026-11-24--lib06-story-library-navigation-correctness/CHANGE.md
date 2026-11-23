# LIB06 | Complete and bounded Story Library navigation

**State:** READY ON PREDECESSOR INTEGRATION, NOT YET COMMISSIONED. Baseline: `undertaking/storyteller-workshop@ed0837d0531be4050b40d9b2485b5759ef479fea`. Wait until LIB04-A integrates; then recheck current HEAD and avoid any overlapping source. Target: `undertaking/storyteller-workshop`. Source-only; no cluster, SQL, provider or release writes.

## Why
`packages/story-engine/src/storyteller/library-navigation.ts` currently pages only the first 128 entries in `entriesForCurrentAccess()` for v2, making its results silently incomplete. `find()` loops through `browse()` with no global page-scan budget. v2 `browse()` also filters an untrusted raw page after selecting `pageSize`, so pages may be sparse even when visible items follow. Source-root lookup and visibility are distinct concepts; fix navigation correctness without changing storage schema, Writer grants or any mission schema.

## Decided implementation
Keep the existing `createPinnedLibraryNavigation` public signatures and response shape for `browse/open/find/readByObjectHash`. Do not add another Library module or runtime cache. In the same file:
1. Replace `entriesForCurrentAccess()` v2 first-page behavior with a bounded, cursor-driven lookup only for its existing v1 fallback callers; v2 `entryForPath` stays trie direct. Avoid materializing the whole v2 library as an array. For v1 retain full manifest validation and duplicate-path checks.
2. Implement one private `scanVisibleV2` helper used by `browse` and `find`: invoke `pageLibraryPaths` in raw-path batches (<=128), apply visibility after each batch, advance using the RAW `nextAfter`, cap inspected raw entries per operation at 512 and return `nextAfter` when the budget or result page is exhausted. Non-visible rows never appear in payload, path titles, totals or error text. A zero-visible page may have a cursor if more raw paths remain.
3. For `find`, match literal path substrings on visible rows, not content grep. Preserve existing query/prefix/after semantics. Enforce one 512-raw-entry budget across the whole find, not 512 per nested browse call. Do not call `this.browse` recursively for find.
4. For legacy v1 manifest browse/find, retain existing sorted-page response and verification, but impose the same total scan budget with predictable continuation. For v2, `offscreen.library-root.v2` has only `format`, `pathsRootHash` and `idsRootHash`; **do not invent campaignId/revision members**. The trusted host/capture must bind `storyId`, `rootHash` and `rootRevision`. Validate the v2 root schema and both hashes, and reject malformed/missing v2 source rather than pretending it was a v1 manifest. For v1, continue verifying manifest campaignId/revision. Do not treat a corrupt/missing v2 node as a v1 fallback; only distinguish an actual v1 manifest from a valid v2 root.
5. Authorization must precede every storage access, and no operation may use cached authorization from a prior call. Preserve `LibraryNavigationError` codes, root-bound cursor and hash membership read enforcement. Cursor is continuation, not proof of authority. Preserve object hash and envelope matching on open/read.

## Writes
Only `packages/story-engine/src/storyteller/library-navigation.ts`, NEW `tools/api-integration/test/library-navigation-bounded.test.ts`, focused README/packet/evidence if necessary. No `packages/documents` changes, `writer-library-tools.ts` changes, manifests, SQL, config or source roots.

## Acceptance
A v2 root with >128 entries finds an entry after index 128; >512 entries requires continuation. First 512 private and later visible leads to an empty page plus continuation. `browse/find` cannot loop forever or request >512 raw entries per call. Corrupt root or node fails closed, a caller must use its already-authorized pinned story/root identity; v1 mismatched storyId/revision is stale-root; v2 schema validation and host identity binding (not nonexistent embedded metadata) are required; v1 compatibility and current root-bound cursors preserved. Run Story Engine typecheck, API integration build + named test, focused existing navigation tests, changed-file quality. Never call source-only a cross-Pod PASS.

**Stop** if existing consumers require changed cursor encoding or exact v2 root schema contradicts validation; return symbol to planner rather than widening this Change.
