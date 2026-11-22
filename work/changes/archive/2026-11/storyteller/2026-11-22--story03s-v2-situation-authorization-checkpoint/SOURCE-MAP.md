# STORY03S source map

**Baseline:** `87d0a86fd04dcd8cea5c5e6cc69075ab88bd6753`.

## Relevant owners

- `packages/game/src/immediate-actions.ts`
  - `activityAccessSchema`: none or selected/actionKeys.
  - `situationAuthorizationSchema`: raw live activityAccess + raw prepared ImmediateActionPlan[].
  - `authorizeSituation`: produces that live shape.

- `packages/documents/src/schema.ts`
  - `sceneCheckpointSituationAuthorizationSchema`: intentionally historical/open-work safe; selected access and prepared plans are versioned JSON payloads rather than imported Game types.

- `packages/story-engine/src/stories/scene-checkpoint-v2.ts`
  - `wrapVersionedOpenPayload` and `unwrapVersionedOpenPayload` already exist.
  - `presentMechanicsFictionalState` currently writes raw `campaign.situationAuthorization`.
  - `projectV2HistoricalCampaign` currently parses checkpoint authorization directly with live `situationAuthorizationSchema`.
  - These two call sites are the incomplete adapter.

- `packages/story-engine/src/storyteller/publication-candidate.ts`
  - `stageConsequencePublicationCheckpoint` constructs a valid live authorization with `authorizeSituation`, projects the after-state, calls `toV2FictionalState`, then validates `sceneCheckpointSchema`.
  - It correctly fails closed with `state_not_representable`; do not weaken this boundary.

## Why the old local proof missed it

`tools/api-integration/test/story03-causal-multiprocess.integration.ts:campaignForPins` uses `mechanics:false`, and existing `scene-checkpoint-v2.test.ts` coverage only uses `activityAccess:{kind:'none'}, preparedPlans:[]`. The live timed action reaches a richer authorization state.

## Stop condition

If a failing live row has `activityAccess:none` and `preparedPlans:[]`, do not broaden this packet. Return the exact Zod issue/path from `sceneCheckpointSchema.safeParse(candidate)`; that would disprove this diagnosis and require a different narrow repair.
