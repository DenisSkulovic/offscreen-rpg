# LIB07 | Anchors, after LIB06

- `packages/story-engine/src/storyteller/library-navigation.ts` `createPinnedLibraryNavigation` returns `open({path,offset?,characters?})`; verifies root membership, per-call authorization, visibility and envelope, returning rootHash/rootRevision/path/documentId/revision/objectHash/content/nextOffset/totalCharacters.
- `packages/story-engine/src/storyteller/writer-library-tools.ts` calls navigator but owns LLM-specific limits. It is NOT an owner/caller for this Change.
- `packages/documents/src/schema.ts` path normalizer is authoritative for file paths; batch helper must rely on existing `open` guard, only additionally enforce unique nonempty paths and count.
- `tools/api-integration/package.json` already has Story Engine dependency and compiles `dist/test/*.test.js`.
- `packages/story-engine/package.json` exports `./storyteller/*` wildcard: new module discoverable without barrel edit.

**Open gate:** after LIB06, check that `open` reauthorizes per call, preserves its return shape, and can differentiate `not-found` from integrity/auth failure. If not, don't widen LIB07.
