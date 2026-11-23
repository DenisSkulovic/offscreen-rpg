# LIB04-A | Implementable source anchors at abdce8d7

- `packages/documents/src/schema.ts` exports `worldPackageManifestSchema`, `rulePackageManifestSchema`, `canonicalDocumentSchema`, `documentManifestEntrySchema`. `package-reference-schema.ts` holds world/rule refs following LIB02. Use these type/parse contracts, not new persisted schemas.
- `packages/documents/src/local-store.ts` `DocumentStore`: `readWorldPackageManifest(hash)`, `readRulePackageManifest(hash)`, `readDocument(hash)` suitable injected readers. S3 implementation has same typed methods. No storage edit.
- `packages/story-engine/src/storyteller/library-navigation.ts` `createPinnedLibraryNavigation`, `LibraryAccess`, `LibraryNavigationError`: existing story-only navigation and visibility pattern. Do not change its 128-first-page issue here; the new helper specifically handles world/rule manifest pages independently.
- `packages/story-engine/src/storyteller/writer-library-tools.ts` `createWriterLibraryToolExecutor`: root and capability fences explicitly NOT touched by A.
- `packages/story-engine/package.json`: `./storyteller/*` maps to dist; new module can be imported through `@offscreen/story-engine/storyteller/pinned-reference-shelf-navigation`.
- `tools/api-integration/package.json` already depends on Story Engine and Documents; TS tests compile to `dist/test/*.test.js`. Add one focused file; no dependency changes.
- `packages/documents/src/schema.ts` allows up to 4096 entries for world/rule manifests; world and rule refs retain root+revision identity; rules require engine adapter/version. Those manifests differ from `offscreen.library-root.v2`.
- `packages/story-engine/src/storyteller/canonical-knowledge.ts` already reads pinned worlds/rules for task context. A is a *new optional read helper*, not a replacement or dual authority for context selection.

**No caller migration in A.** Intentional absence of runtime integration keeps B's persisted mission and authorization map out of scope. New helper must not create an alternate implicit source resolver.
