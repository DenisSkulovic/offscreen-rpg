# STORY03S bounded tasks

## T01 | add the two authorization projections

Read:
- `packages/story-engine/src/stories/scene-checkpoint-v2.ts`
- `packages/game/src/immediate-actions.ts`
- `packages/documents/src/schema.ts`

Write only `scene-checkpoint-v2.ts`.

Implement:
- `projectCheckpointSituationAuthorization(live)`
- `projectHistoricalSituationAuthorization(checkpoint)`

Names may differ, behavior may not.

Positive:
- none + [] stays unchanged semantically;
- selected access and prepared plans are wrapped exactly once.

Negative:
- invalid wrapped selected access or invalid prepared plan is rejected by live schema after unwrap.

## T02 | focused tests

Write `scene-checkpoint-v2.test.ts`.

Add one valid ImmediateActionPlan fixture with `resolution.kind='process'` or `resume` and matching selected activityAccess. Assert:
1. `toV2FictionalState` succeeds;
2. checkpoint shape contains versioned selected access + versioned prepared plan;
3. `projectV2HistoricalCampaign` reconstructs the raw live authorization;
4. malformed wrapper fails.

Do not use source-string/regex tests.

## T03 | consequence regression

Run the smallest existing Storyteller consequence/checkpoint test that stages a v2 checkpoint. If no current test exercises selected/process authorization, add one focused integration case under the existing story-engine test owner rather than changing TURN03.

Required:
- staged checkpoint schema parses;
- post-state comparison still matches;
- no duplicate passage/checkpoint.

## T04 | close and unblock TURN03

Run focused Turbo dependency closure/tests. Reconcile/archive/integrate into `undertaking/storyteller-workshop`.

Then tell the existing TURN03 chat to rebuild only images affected by this source change and rerun a fresh story. No paid provider call.
