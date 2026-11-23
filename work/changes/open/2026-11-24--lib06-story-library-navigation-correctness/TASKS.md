# LIB06 | Serial bounded tasks

## T01 | Page/scan design implementation
**Read anchors:** `packages/story-engine/src/storyteller/library-navigation.ts` (entriesForCurrentAccess, browse, find); `packages/documents/src/library-page.ts`; `packages/documents/src/schema.ts`; `packages/story-engine/src/storyteller/writer-library-tools.ts`. **Write:** only `library-navigation.ts`. Add private scan helper with raw-page iteration and <=512 inspected raw entries; preserve exported API, error codes and root-bound cursor. Before v2 reads, check storyId/revision. Reuse trie for exact path and full paged search for find. **Positive:** page 129+ visible and mixed visibility. **Negative:** first 512 private yields cursor; unknown root/wrong tenant fails; no unbounded traversal. **Stop:** cannot preserve legacy API and semantics.

## T02 | Focused regression
**Read anchors:** new nav helper, existing `tools/api-integration/test` navigation fixtures, `packages/documents/src/library-index.ts`, `packages/documents/src/library-trie.ts`. **Write:** NEW `tools/api-integration/test/library-navigation-bounded.test.ts` and narrow T01 corrections only. Construct v1/v2 immutable fixture using real trie path functions. Assert 128/129, 512/513, all-hidden-first-page, stale revision, corrupt node, v1 sorted list, readByHash membership and no private path leakage. Count reader calls and raw entries to enforce budget. **Stop:** needs schema/caller widening.

## T03 | Acceptance and join
**Read:** full diff and PROOF. **Write:** packet receipt/evidence and docs link only. Run `pnpm --filter @offscreen/story-engine typecheck`; `pnpm --filter @offscreen/api-integration build`; `node --test tools/api-integration/dist/test/library-navigation-bounded.test.js` plus directly relevant old tests; changed-file Prettier/quality. Integrate into Undertaking only if all focused negative cases and unchanged public signatures pass; archive Change with truthful receipt.
