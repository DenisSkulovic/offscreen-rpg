# LIB09 | Implementation cards

## T01 | Hash check at load
Read `packages/documents/src/library-index.ts` functions `loadLibraryIndex` and `assertLibraryIndexConsistent`; `canonical-json.ts`; `schema.ts` Library v2 root/node. Edit ONLY `library-index.ts`. Parse root, check each node against requested hash before caching/traversing. Add rootHash consistency only where existing callers guarantee it. Positive valid trie. Negative substituted same-shape wrong-hash node.

## T02 | Focused proofs
Read `packages/documents/test/library-v2-store.test.mjs`, actual library-index tests, `packages/documents/package.json`. Edit NEW `packages/documents/test/library-index-integrity.test.mjs` and narrow T01 fix only. Fixture: createEmptyLibraryIndex and applyLibraryBatch, map-backed readNode, tamper node under correct hash, corrupt child/root. Include unchanged canonical hash baseline. Run Documents test + typecheck and quality; integrate and archive after receipts. No world package/Story Engine edits.
