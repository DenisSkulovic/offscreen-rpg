# LIB09 | Validate content-addressed trie nodes at Library-index load boundary

**Status:** Done (2026-11-24). Source-only. **Baseline:** `undertaking/storyteller-workshop@05b50418933c9a8dea6b7740222734a2729f9768`; recheck actual current HEAD. **Owner:** `packages/documents`. Independent of LIB08 and in-flight LIB07, unless source overlap/active worktree arises. No SQL, Story Engine, contracts package, storage keys or data migrations.

## Observed gap
`loadLibraryIndex(readNode,root)` in `packages/documents/src/library-index.ts` walks `root.pathsRootHash` and `root.idsRootHash`; it accepts each reader-returned node without validating `hashCanonicalJson(node) === requested nodeHash`. Subsequent `assertLibraryIndexConsistent` checks path↔ID graph equivalence but not cryptographic content identity. Normal S3/local typed readers check hashes, yet this public injectable abstraction shouldn't silently assume that every caller is a verified store.

## Decided change
Validate `libraryRootV2Schema.parse(root)` before walking. On each requested `nodeHash`, validate content-hash syntax and `libraryNodeV2Schema.parse(raw)`, compute existing `hashCanonicalJson(parsed)`, and require equality with the requested hash **before** adding to the visited map or following children. Validate the same consistency for the supplied `library.rootHash` in public `assertLibraryIndexConsistent` only if it is actually the canonical hash of `library.root`; do not mutate or rewrite stored nodes. Keep current sync/async APIs, no new package. Ensure no false hash mismatch due to serialization: use canonicalJson exactly as the writer does. Do not invent tenant ownership in v2 root (it only carries pathsRootHash/idsRootHash).
Preserve valid root hashes for existing fixtures; fail closed on an injected reader that serves structurally valid but wrong-hash node, malformed child, or mismatched rootHash. Existing v1 manifests and publisher transactional behavior stay out of scope.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Library index load accepts reader nodes without content-hash identity | code (`packages/documents` `loadLibraryIndex`) | changed: each loaded node must schema-parse and `hashCanonicalJson` to the requested hash before visit or child traversal | `packages/documents/src/library-index.ts` on this Change; integration SHA recorded at join | fixture-tested | substituted same-shape node, malformed node, and malformed child rejected | N/A; no product page claimed the old gap |
| `assertLibraryIndexConsistent` path/ID equivalence | code | changed: also requires `library.rootHash === hashCanonicalJson(library.root)` | same file | fixture-tested | mismatched rootHash rejected | Callers `loadLibraryIndex` and `applyLibraryBatch` already set `rootHash` immediately before assert. No pre-finalized draft caller in `packages/documents`. |
| Canonical JSON, persisted hashes, LibraryIndex APIs, v1 manifests | technical / code | unchanged: writer `hashCanonicalJson` and v2 root fields (`format`, `pathsRootHash`, `idsRootHash`) stay the same | `canonical-json.ts`, `schema.ts`, `library-trie.ts` inspected, not edited | source-observed | valid empty and create/rename/delete round-trip keeps original hashes | N/A |
| Product player-facing claims | product | unchanged: no selected product heading describes loader hash checks | no product file edited | reviewed | N/A | N/A |

## Acceptance
Use current Documents test conventions (new `packages/documents/test/library-index-integrity.test.mjs` or extend actual Library v2 focused suite). Valid createEmptyLibraryIndex -> load round-trip; valid create/rename/delete still consistent and original hashes unchanged; substituted same-shape node under old hash rejected; malformed/corrupt node rejected; rootHash mismatch rejected. Run `pnpm --filter @offscreen/documents test`, typecheck, focused new test, changed-file quality. Stop if callers legitimately construct inconsistent in-memory index drafts that rely on `assertLibraryIndexConsistent` before hash recalculation; return exact caller and minimize to loader-only validation rather than break draft semantics.
