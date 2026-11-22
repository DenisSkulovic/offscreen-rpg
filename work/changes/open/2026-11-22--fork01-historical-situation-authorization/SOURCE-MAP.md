# FORK01 | Checked source boundaries

Source reviewed at `undertaking/storyteller-workshop@c76145c4e63de55e4229dabd50adcff05088e05f`.

- `packages/story-engine/src/stories/fork-reconstruct.ts::v2ForkRowPlan`: `campaign.situationAuthorization: fictional.situationAuthorization` around line 286; this directly copies historical wrapped data into live SQL.
- `packages/story-engine/src/stories/fork-reconstruct.ts::assertReconstructedV2Matches`: reads new fork via `readSceneAfterState`, calls `toV2FictionalState`, then `assertV2PostStateMatches`. The exception arises here, but the input violation originates earlier in row planning.
- `packages/story-engine/src/stories/scene-checkpoint-v2.ts::projectCheckpointSituationAuthorization`: `situationAuthorizationSchema.parse(live)` and wraps selected `activityAccess` plus each prepared plan into checkpoint envelope.
- `packages/story-engine/src/stories/scene-checkpoint-v2.ts::projectHistoricalSituationAuthorization`: existing inverse reads checkpoint `activityAccess`, unpacks versioned payload when not none, unwraps preparedPlans, then parses as live schema. Already called from `projectV2HistoricalCampaign`.
- `apps/game-authority/src/server.ts` fork route lines 852–868, unexpected non-`StoryError` mapped to opaque 503 at line 923. **Not in write set.**
- Existing `forkFromSceneCheckpointV2` owns transaction and identity mapping; **do not change transaction ordering**.

Proof priority: selected access; none access; invalid selection rejects; old hash rejects; no change to parent or fork duplicate behavior. Existing fixture/source names for tests must be checked by Cursor at latest HEAD; no repository-wide exploration is needed.
