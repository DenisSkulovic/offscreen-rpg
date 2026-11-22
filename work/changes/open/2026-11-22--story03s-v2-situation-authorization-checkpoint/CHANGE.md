# STORY03S | Make v2 consequence checkpoints represent selected situation authorization

**State: READY.**  
**Kind:** implementation · **Profile:** PATCH/STATE · **Reference:** `undertaking/storyteller-workshop`  
**Baseline:** `87d0a86fd04dcd8cea5c5e6cc69075ab88bd6753`  
**Unblocks:** TURN03 `ga-scene-publication`.  
**No provider call is authorized.**

## Observed live failure

TURN03 now passes settlement waiting and reaches a real Game Authority DocumentStore. A mechanics-enabled signed-in action settles at game second 60, then `publishSavedStoryteller` fails with `state_not_representable` while staging the consequence checkpoint.

The local STORY03/TURN03 golden causal fixture uses `mechanics:false`, `activityAccess:none`, and no prepared activity plans, so it does not cover this live shape.

## Source-grounded defect

`packages/game/src/immediate-actions.ts:authorizeSituation` returns live v2 authorization:

- `activityAccess = {kind:'none'} | {kind:'selected', actionKeys:[...]}`
- `preparedPlans = ImmediateActionPlan[]`

`packages/story-engine/src/stories/scene-checkpoint-v2.ts:presentMechanicsFictionalState` currently copies `campaign.situationAuthorization` unchanged into the checkpoint.

But `packages/documents/src/schema.ts:sceneCheckpointSituationAuthorizationSchema` deliberately stores open work as:
- `activityAccess = {kind:'none'} | VersionedPayload`
- `preparedPlans = VersionedPayload[]`

Therefore a real selected/process authorization can be valid live state yet fail `sceneCheckpointSchema.safeParse` as `state_not_representable`.

The reverse path is also incomplete: `projectV2HistoricalCampaign` passes the checkpoint authorization directly to live `situationAuthorizationSchema.parse` without unwrapping those versioned payloads.

## Selected repair

Keep the checkpoint schema unchanged.

In `scene-checkpoint-v2.ts` add two narrow internal projections:

1. **live → checkpoint**
   - parse with live `situationAuthorizationSchema`;
   - preserve `version` and `offerId`;
   - keep `{kind:'none'}` unchanged;
   - wrap selected `activityAccess` with `wrapVersionedOpenPayload`;
   - wrap each prepared plan with `wrapVersionedOpenPayload`.

2. **checkpoint → live historical**
   - unwrap versioned selected `activityAccess`;
   - unwrap each prepared plan;
   - validate the reconstructed object with live `situationAuthorizationSchema`.

Use the live→checkpoint projection in `presentMechanicsFictionalState`. Use the checkpoint→live projection in `projectV2HistoricalCampaign`.

Do not loosen `sceneCheckpointSituationAuthorizationSchema`, do not store raw arbitrary plans, and do not bypass validation.

## Write scope

- `packages/story-engine/src/stories/scene-checkpoint-v2.ts`
- `packages/story-engine/src/stories/scene-checkpoint-v2.test.ts`
- one focused consequence/checkpoint integration test if needed to prove the real selected/process shape.

No DB migration, no Worker/GA workflow change, no TURN03 harness edit, no provider code.

## Acceptance

- live selected activity access + at least one valid prepared process/resume plan serializes to a valid v2 checkpoint;
- checkpoint projection back to historical campaign reconstructs the same live authorization;
- `none + []` remains byte/semantic compatible;
- malformed wrapped access or prepared plan still fails closed;
- existing scene-checkpoint-v2 tests and STORY03 causal publication tests remain green;
- TURN03 reruns a fresh mechanics-enabled story and must advance to scene 2 before this Change is considered operationally proven.
