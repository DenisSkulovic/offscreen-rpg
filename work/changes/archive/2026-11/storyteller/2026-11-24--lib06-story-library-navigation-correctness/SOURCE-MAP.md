# LIB06 | Baseline source map
- `packages/story-engine/src/storyteller/library-navigation.ts`: `createPinnedLibraryNavigation`, `entriesForCurrentAccess`, `entryForPath`, `entryForObjectHash`, `browse`, `find`. First-128 v2 bug at `entriesForCurrentAccess`; v2 `find` currently iterates `this.browse` without bounded operation-wide scanning.
- `packages/documents/src/library-page.ts`: `pageLibraryPaths(readNode, pathsRootHash, {prefix,after,pageSize})` returns `entries`, `nextAfter` and enforces page <=128. Do not edit. Its raw cursor is suitable for skipping invisible entries.
- `packages/documents/src/schema.ts`: `libraryRootV2Schema`, `documentManifestEntrySchema`; v2 root contains only format/pathsRootHash/idsRootHash; source cannot independently validate campaign/revision. Validate v2 schema and rely on trusted host-bound story/root identity; v1 manifest has campaignId/revision.
- `packages/story-engine/src/storyteller/writer-library-tools.ts`: existing delegated navigation consumer and root/capability fences. Leave unchanged.
- `tools/api-integration/package.json`: `@offscreen/story-engine` and `@offscreen/documents` already deps, test build through `tsc`; use `dist/test/library-navigation-bounded.test.js`. No package graph edit.

No new persisted root format; no runtime authorization provider. Existing browse cursor has `{rootHash,prefix,after?}`; do not change its shape. Pagination must be RAW-ordered cursor over the immutable root; caller authorization is repeated for each operation.
