# LIB06 | Complete and bounded Story Library navigation

**State: Done.** Source-only. LIB04-A was already integrated at `undertaking/storyteller-workshop@7e2b554fbaaede28cbdbbf536c44c44a9ac511e5` before this work. Planning baseline remains `ed0837d0531be4050b40d9b2485b5759ef479fea`. Target: `undertaking/storyteller-workshop`. No cluster, SQL, provider, or release writes.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta and reason | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| packages/story-engine/src/storyteller/library-navigation.ts | Code | changed: v2 browse and find walk raw trie pages with a 512-entry cap and keep the existing public signatures | createPinnedLibraryNavigation on change/lib06-story-library-navigation-correctness | source-only | A denied authorize performs zero root or node reads. A v2 root missing trie hashes is corrupt-source and does not fall through to a v1 manifest. The first 512 private paths are absent from the page text | packages/story-engine/README.md |
| tools/api-integration/test/library-navigation-bounded.test.ts | Code | changed: injected trie and v1 manifest proof | node --test tools/api-integration/dist/test/library-navigation-bounded.test.js passed 5/5, with the existing navigation tests 13/13 | source-only | Continuation after 512 private entries reaches the later visible path. A stale v1 revision is stale-root | No Writer tool test was added |
| packages/story-engine/README.md | Code | changed: the question table names the bounded library helper | packages/story-engine/README.md | reviewed | The row does not claim a new route or a Writer schema change | The existing storyteller wildcard export was reused |
| docs/product | Product | unchanged because no player-facing behavior, route, or story rule changed | No product page was edited | reviewed | A library browse is not a play action | work/QUEUE.md was not the selector for this commission |
| docs/technical/storyteller/operation-and-controller.md | Technical | unchanged because Writer mission schemas, tool grants, SQL, and Temporal were not edited | writer-library-tools.ts was not edited | reviewed | Full @offscreen/api-integration tsc is still blocked by missing sibling package outputs and was not used as acceptance | LIB07 stays backlog |

Declared paths:

- packages/story-engine/src/storyteller/library-navigation.ts because browse and find now share a bounded raw scan
- packages/story-engine/README.md because discoverability names that helper
- tools/api-integration/test/library-navigation-bounded.test.ts because the proof is injected
- STATUS.md because demonstrated source now includes bounded v2 navigation and still excludes live authorization
- work/changes/README.md because the catalog must point at the archive
- work/undertakings/storyteller-workshop/OVERVIEW.md because the undertaking status names this slice as integrated source

Receipt: the navigation file typechecked with the Story Engine strict compiler settings. `@offscreen/story-engine` full `tsc --noEmit` was not a clean acceptance: that project still fails on unrelated missing `@offscreen/db`, `@offscreen/game`, and `@offscreen/contracts` outputs. Changed-file ESLint quality passed. Focused tests 18/18. `pnpm --filter @offscreen/api-integration build` was not a clean acceptance for the same missing sibling outputs. The new test file was compiled alone with NodeNext settings and passed. No database, cluster, or provider call. A non-visible continuation is an opaque string so the private path is not in the response; a plain path continuation is still accepted.

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
