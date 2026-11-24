# LIB09 | Verified anchors
- `packages/documents/src/library-index.ts` `loadLibraryIndex(readNode,root)`: calls reader(nodeHash), stores result by requested hash, traverses children, then `assertLibraryIndexConsistent`; currently no `hashCanonicalJson(node) === nodeHash` validation. `assertLibraryIndexConsistent` checks path/ID reverse links but not hashes.
- `packages/documents/src/canonical-json.ts`: `hashCanonicalJson` defined and used to create nodes in `library-trie.ts`.
- `packages/documents/src/library-trie.ts`: `commitNode` calls `hashCanonicalJson(validated)`; canonical compatibility source.
- `packages/documents/src/schema.ts`: `libraryRootV2Schema` is only `format, pathsRootHash, idsRootHash`; `libraryNodeV2Schema` Zod validators.
- `packages/documents/test/library-v2-store.test.mjs` verifies typed stores detect hash mismatch, not injected reader loader. New dedicated test needed. Current package test script `pnpm run build && node --test test/*.test.mjs`.
- No edits to LIB07 `packages/story-engine/src/storyteller/library-batch-read.ts` or DO01–DO07.
