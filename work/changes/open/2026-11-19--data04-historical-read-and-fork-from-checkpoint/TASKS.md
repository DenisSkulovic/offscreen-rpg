# DATA04 | Composer route: reconcile landed historical scene/fork code

**Baseline:** 584b594. **State:** In progress. **Default model:** Composer Standard. **Do not implement another checkpoint or generic rewind subsystem.**

**Verified source:** `packages/application/src/stories/scene-checkpoint.ts:readSceneCheckpointReference` exact immutable hash; `stories/reads.ts:readHistoricalScene` and `stories/forks.ts:createStoryForks.fork/forkFromSceneCheckpoint` use requested historical selector and new branch campaignId with remapped identifiers. `packages/application/test/historical-fork.test.mjs` contains parent scene1 king alive/sword vs scene2 later future. The no-checkpoint fallback `forkLiveRevisionOne` is restricted. Supported checkpoint fork refuses active holds/work/complex continuity, intentionally.

## T01 | Current source and negative proof reconciliation | PLANNER-READY, VERIFY
Read above 3 modules and `test/{historical-fork,scene-checkpoint,scene-checkpoint-publication}.test.mjs`. Run existing **provider-free** targeted tests. Positive: snapshot as-of scene1 returns exact state/root, fork from revision1 while parent current is scene2 yields child campaign ID, new root and remapped IDs. Negative: missing/corrupt blob, wrong story/owner, parent-future item/leak, unsupported active-work checkpoint all fail closed. If test currently covers only some negatives, record gaps rather than invent a PASS.

## T02 | Missing private GA historical write path | NOT OWNED BY DATA04
`apps/api/src/modules/stories/controller.ts:fork` still uses local application at baseline. Coordinate with DIST03/BOOT03 single GA endpoint writer and DATA06 branch context; no second local fork refactor under DATA04. An actual remote-fork implementation becomes a Composer route **only after** exact DTO/token/API bounds are planned at that owner.

## T03 | Full fork proof | GATED ON TURN03
After real kind app release, run scene1→scene2→fork scene1→child continuation with exact manifest roots and no parent future. TURN03 owns joined fixture. DATA04 may close its **source-defined local** outcome once its own negative tests and reconciliation pass, but cannot claim cross-Pod fork from local tests. **No Grok reason.**
