# DATA06 | Composer dispatch: root-pinned future memory for the fork

**Baseline:** 584b594. **State:** Proposed, not selected. **Default:** Composer Standard; separate cross-service implementation from data/source design. **Existing deeper investigation:** [SOURCE-MAP.md](SOURCE-MAP.md).

**Observed source:** `stories/forks.ts:forkFromSceneCheckpoint` writes child manifest with child story/campaign ID and root; `storyteller/context-capture.ts` captures frozen source passages and root revision; `storyteller/canonical-knowledge.ts:loadCanonicalKnowledge` rejects mismatched campaignId/root; `storyteller/tasks/memory-exploration.ts` defines bounded ask/read shapes. Lexical story cache has root/branch isolation tests. A separated worker's owner-scoped remote memory service is **not yet implemented**.

## T01 | Exact fork source isolation baseline | PLANNER-READY, VERIFY
Read `packages/application/src/storyteller/{context-capture,canonical-knowledge}.ts`, `packages/application/test/{historical-fork,lexical-story-index-cache}.test.mjs`. Positive: child gets its own root and valid ancestor context; no requirement to synthesize future timeline. Negative: parent later root read with child ID, swapped hash, sibling cache result and wrong owner all refuse. Report local proof tier.

## T02 | One branch-scoped source resolver | PLANNER-READY ONLY AFTER STORY02/03 CONTRACTS
**Write owner:** Storyteller context source adapter and one narrow GA private endpoint, **not** generic Cognee, not browser SSR. Task frozen by GA contains storyId/branchRootHash/rootRevision and bounded source handles; executor requests exact read; GA loads manifest by supplied hash, checks campaignId/revision and actor, filters handles against manifest. Reuse ask_memory/read_memory existing DTO and budget. A missing lexical index may fall back to verified exact content or typed partial, never parent future. One Composer for DTO, another for adapter, one merge owner for GA routes. **Stop:** if frozen task has no authentic visibility/actor contract, return a planner blocker instead of loosening ACL.

## T03 | Real continued fork | GATED
TURN03 owns child continuation after parent scene2, asserting child model context excludes later parent item/lore, independently commits checkpoint/root after worker restart. Do not claim “all memory works” from lexical tests. **No Grok default.**
