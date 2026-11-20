# DATA04 | Composer route: reconcile landed historical scene/fork code

**Cross-owner note:** [FORK01](../2026-11-20--fork01-private-game-authority-historical-fork/CHANGE.md) now owns the private GA fork transport; DATA04 remains the domain checkpoint reconstruction authority. No duplicated fork algorithm.

**Baseline:** 584b594. **Verify SHA:** ef504d69 plus `change/data04-gap-negatives` (provider-free historical-fork **4/4** on 2026-11-20). **State:** In progress; **T01 VERIFY PASS**; gap negatives landed on the branch; **not Done**. **Default model:** Composer Standard. **Do not implement another checkpoint or generic rewind subsystem.**

**Verified source:** `packages/application/src/stories/scene-checkpoint.ts:readSceneCheckpointReference` exact immutable hash; `stories/reads.ts:readHistoricalScene` and `stories/forks.ts:createStoryForks.fork/forkFromSceneCheckpoint` use requested historical selector and new branch campaignId with remapped identifiers. `packages/application/test/historical-fork.test.mjs` contains parent scene1 king alive/sword vs scene2 later future. The no-checkpoint fallback `forkLiveRevisionOne` is restricted. Supported checkpoint fork refuses active holds/work/complex continuity, intentionally.

### T01 evidence tier (provider-free, batch 2026-11-20)

| Check | Result | Notes |
| --- | --- | --- |
| `packages/application/test/historical-fork.test.mjs` | **2/2 PASS** | Scene-1 sword + living king; fork child campaignId; parent scene-2 diverges on parent |
| `packages/application/test/scene-checkpoint.test.mjs` | **4/4 PASS** | Idempotent checkpoint insert, rollback, invalid/missing blob, S3 failure paths |
| `packages/application/test/scene-checkpoint-publication.test.mjs` | **3/3 PASS** | Publication checkpoint commits per scene; failed write leaves no selector |
| **Combined** | **9/9 PASS** | Targeted `historical-fork` + `scene-checkpoint` family only (no new fork schema) |

**Proven (local):** historical GET as-of scene1 returns frozen state/root; fork from scene1 checkpoint while parent is scene2 yields remapped child story/campaign IDs and preserved ancestor mechanics; missing/corrupt checkpoint, wrong owner, and parent-future live tables fail closed (`historical-fork` negatives); checkpoint storage/publication invariants hold in companion tests.

**Gap negatives (2026-11-20, `historical-fork.test.mjs` 4/4):** wrong checkpoint `storyId` refuses read and fork as `invalid` / `checkpoint_hash_mismatch` and inserts no child. A blob whose `mechanics.holds` is non-empty is refused the same way, because `sceneCheckpointSchema` will not parse active work (`fork_unsupported_active_work` stays unreachable through the store). A revision-1 story with no checkpoint and `continuityNotes: ['kept']` refuses as `conflict` / `fork_continuity_remap_required` and inserts no child. The checkpoint-mechanics `continuity_remap_required` branch is also unreachable: the schema allows only `null` or `[]`. **NOT-RUN:** journal disjoint query / zero outbox proof; Nest GA historical GET/fork (T02 owner is FORK01); T03/TURN03 joined continuation.

**Blocker for T02:** historical write/fork at GA — owner is FORK01, not DATA04. **Blocker for Done:** journal/outbox proof and T03/TURN03. The three local gap cases are recorded above; `fork_unsupported_active_work` is unreachable through `sceneCheckpointSchema`.

## T01 | Current source and negative proof reconciliation | VERIFY PASS (2026-11-20)
Read above 3 modules and `test/{historical-fork,scene-checkpoint,scene-checkpoint-publication}.test.mjs`. Run existing **provider-free** targeted tests. Positive: snapshot as-of scene1 returns exact state/root, fork from revision1 while parent current is scene2 yields child campaign ID, new root and remapped IDs. Negative: missing/corrupt blob, wrong story/owner, parent-future item/leak, unsupported active-work checkpoint all fail closed. If test currently covers only some negatives, record gaps rather than invent a PASS.

**Receipt (2026-11-20):** targeted historical-fork + scene-checkpoint family → **9/9 PASS**. Gaps recorded then: `unsupported_active_work`, `continuity_remap_required`, wrong `storyId` not asserted. No second fork schema invented; packet stays open.

**Follow-on (2026-11-20, `change/data04-gap-negatives`):** `node --test test/historical-fork.test.mjs` → **4/4 PASS**. See the gap-negative paragraph above. Scene-checkpoint companion files were not re-run in this batch.

## T02 | Missing private GA historical write path | NOT OWNED BY DATA04
`apps/api/src/modules/stories/controller.ts:fork` still uses local application at baseline. Coordinate with DIST03/BOOT03 single GA endpoint writer and DATA06 branch context; no second local fork refactor under DATA04. An actual remote-fork implementation becomes a Composer route **only after** exact DTO/token/API bounds are planned at that owner.

## T03 | Full fork proof | GATED ON TURN03
After real kind app release, run scene1→scene2→fork scene1→child continuation with exact manifest roots and no parent future. TURN03 owns joined fixture. DATA04 may close its **source-defined local** outcome once its own negative tests and reconciliation pass, but cannot claim cross-Pod fork from local tests. **No Grok reason.**