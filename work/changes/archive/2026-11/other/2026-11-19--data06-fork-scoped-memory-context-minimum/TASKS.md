# DATA06 | Composer dispatch: root-pinned future memory for the fork

**Baseline:** 584b594. **Verify SHA:** `ec73a535` (2026-11-20). **State:** Done · 2026-11-20. Cold-kind continuation stays TURN03. **T03 is not a DATA06 blocker.**

**Observed source:** `stories/forks.ts:forkFromSceneCheckpoint` writes child manifest with child story/campaign ID and root; `storyteller/context-capture.ts` captures frozen source passages and root revision; `storyteller/canonical-knowledge.ts:loadCanonicalKnowledge` rejects mismatched campaignId/root; `storyteller/tasks/memory-exploration.ts` defines bounded ask/read shapes. Lexical story cache has root/branch isolation tests. A separated worker's owner-scoped remote memory service is **not yet implemented**.

### T01 evidence tier (provider-free, @ `ec73a535`)

| Check | Result | Notes |
| --- | --- | --- |
| `packages/application/test/historical-fork.test.mjs` | **2/2 PASS** | Child own `documentManifest` root; scene-1 sword + living king; parent scene-2 diverges unchanged on parent |
| `packages/application/test/lexical-story-index-cache.test.mjs` | **1/1 PASS** | Same-root reuse; fork/stale-root isolation |
| **Combined** | **3/3 PASS** | `pnpm run build && node --test` on the two files above |

**Proven (local):** historical scene-1 fork keeps ancestor mechanical state; wrong owner, bad checkpoint, and later live tables fail closed (`historical-fork` negative case); lexical cache refuses sibling/stale root after hit.

**NOT-RUN / not asserted in T01 files:** `loadCanonicalKnowledge` with parent `rootHash` + child `storyId` is enforced in `canonical-knowledge.ts` (`manifest.campaignId !== input.storyId`) but **not** exercised by `historical-fork` or `lexical-story-index-cache`; cross-Pod fork continuation; branch-pinned remote `ask_memory`/`read_memory` resolver (T02); full cluster child continuation after worker restart (T03/TURN03).

**Blocker for T02:** STORY02/03 frozen visibility/actor contracts and GA private endpoint design. **Blocker for Done:** T02–T03 plus reconciliation ledger; no cross-service memory facade claimed from lexical tests alone.

## T01 | Exact fork source isolation baseline | VERIFY PASS (`ec73a535`)
Read `packages/application/src/storyteller/{context-capture,canonical-knowledge}.ts`, `packages/application/test/{historical-fork,lexical-story-index-cache}.test.mjs`. Positive: child gets its own root and valid ancestor context; no requirement to synthesize future timeline. Negative: parent later root read with child ID, swapped hash, sibling cache result and wrong owner all refuse. Report local proof tier.

**Receipt (2026-11-20):** command `cd packages/application && pnpm run build && node --test test/historical-fork.test.mjs test/lexical-story-index-cache.test.mjs` → **3/3 PASS**. Negative isolation covered via historical fork (owner/checkpoint/live tables) and lexical cache (fork/stale root); explicit `loadCanonicalKnowledge` parent-root/child-id assertion remains **source-only** until a focused test is added under a later task.

## T02 | One branch-scoped source resolver | PARTIAL library only (2026-11-20, branch `change/data06-branch-memory`)

**Landed in the worktree, not on main:** `resolveBranchPinnedEvidence` in `packages/application/src/storyteller/branch-pinned-memory.ts`. It checks an injected owner gate before `readManifest`, refuses a parent `campaignId` or a different revision as `stale-root`, refuses `private-possibility` and `developer-private` as `unknown-handle`, and caps handles at 8. It does not read document bodies and does not call a lexical index.

**Proof:** `pnpm exec turbo run build --filter=@offscreen/application` then `node --test test/branch-pinned-memory.test.mjs test/canonical-knowledge-root-pin.test.mjs` → **8/8 PASS**. Tier: pure (fake `DocumentStore`, no database). Negative: wrong owner never reads the manifest; parent campaign id and revision mismatch refuse; private-possibility returns no path.

**Still blocked:** no Game Authority private read route. Executor custody authenticates a shared bearer, not `ownerId` on the frozen task body. Do not add that route by treating the bearer as the player. T03 stays gated.

## T02 original card | PLANNER-READY ONLY AFTER STORY02/03 CONTRACTS
**Write owner:** Storyteller context source adapter and one narrow GA private endpoint, **not** generic Cognee, not browser SSR. Task frozen by GA contains storyId/branchRootHash/rootRevision and bounded source handles; executor requests exact read; GA loads manifest by supplied hash, checks campaignId/revision and actor, filters handles against manifest. Reuse ask_memory/read_memory existing DTO and budget. A missing lexical index may fall back to verified exact content or typed partial, never parent future. One Composer for DTO, another for adapter, one merge owner for GA routes. **Stop:** if frozen task has no authentic visibility/actor contract, return a planner blocker instead of loosening ACL.

## T03 | Real continued fork | GATED
TURN03 owns child continuation after parent scene2, asserting child model context excludes later parent item/lore, independently commits checkpoint/root after worker restart. Do not claim “all memory works” from lexical tests. **No Grok default.**
