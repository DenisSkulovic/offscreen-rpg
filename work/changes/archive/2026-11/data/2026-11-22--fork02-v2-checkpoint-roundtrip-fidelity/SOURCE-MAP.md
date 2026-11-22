# FORK02 | Actual source and complete risk inventory

Read on `undertaking/storyteller-workshop@28e2124bd76f009d61f0e2f1d8b5b056573ee6fa`. Cursor's observed live expected/actual `plans` mismatch is outside this checkout; treat it as captured TURN03 evidence, not a locally reproduced proof.

## Real live call path
1. `packages/story-engine/src/stories/forks.ts::forkFromSceneCheckpointV2` (around 383-490) stages mapped checkpoint and calls `buildV2ForkRows`, inserts story/items/settings/campaign/offers/activities/obligations/executions/passage/selector and finally `assertReconstructedV2Matches` inside the transaction. Any mismatch rolls back SQL.
2. `packages/story-engine/src/stories/fork-v2-reconstruct.ts::buildV2ForkRows` (198-413) owns insert projection. `extractOfferPlans` (172-195) mutates null -> [] and may rewrite present plans via schema parsers; `campaignOfferColumnFromFictional` (145-170) may strip nested offer keys. `game_offer.plans` uses `jsonb NOT NULL` (campaign schema around 191-205), NOT a nullable SQL column.
3. `packages/story-engine/src/stories/scene-after-state.ts::readSceneAfterState` selects all offer rows by story id (around 279-286) and returns sorted after-state.
4. `packages/story-engine/src/stories/scene-checkpoint-v2.ts::buildOfferSnapshot` (226-249) locates current offer by `campaign.offer.id` (no accidental historical row substitution); wraps `associated.plans` when row exists, else null. Its `offerTreeFromCampaignColumn` (218-224) strips tree keys to id/nodes when nodes array exists. `projectCheckpointSituationAuthorization` (around 386) is symmetric with FORK01's historical helper.
5. `packages/story-engine/src/stories/fork-reconstruct.ts::assertReconstructedV2Matches` reads after-state, maps to v2 and calls `assertV2PostStateMatches`. `scene-checkpoint-v2.ts::COMPARE_FIELDS` enumerates **24 fields** including later `acceptedActivityPlan`, active ids, authorization, conditions, activities, obligations, action; strict assert stops at first mismatch.
6. `packages/story-engine/src/stories/fork-state.ts::mapV2ForkState` (around 430-685) intentionally changes passage/offer/activities/obligations/action IDs and source-scoped references, so compare must use **mapped checkpoint as expected**, never the unremapped source. It rewrites present offer payload plans when mechanical and remaps selected action fields. This mapper is a potential *other* lossy boundary: only scrutinize further if full-state fixture demonstrates a changed valid payload after mapping.
7. `packages/story-engine/src/stories/fork-reconstruct.ts::v2ForkRowPlan` and `campaignOfferFromSnapshot`/`offerRowPlans` form the **older mapper**, not the live insertion route. Fix only when source ownership needs a reconciled consumer; do not drive the live repair through the wrong path.

## Known/possible semantic discrepancies to prove
| Field or boundary | Observed / source-derived | Proof target |
| --- | --- | --- |
| `offer.payload.body.plans` | live `null -> wrapped []` observed | preserve null without violating SQL NOT NULL; real SQL JSON null vs SQL NULL distinction |
| `offer` with plans [] | [] non-null becomes wrapped [] | must remain distinct from null |
| `offer` with plans payload | schema parsing may strip unknown fields | preserve mapped-checkpoint versioned body exactly; no unintended normalization |
| nested offer tree | fallback parse+reader projection may strip extra keys | demonstrate stable nested tree and meta |
| `acceptedActivityPlan` | mapping unwraps versioned form | compare after readback; null and selected variants |
| `activeActivityId` / `activeActionOperationId` | remapped IDs, no mutations expected after insert | compare mapped child IDs |
| `situationAuthorization` | FORK01 inserted historical projection | selected and none, wrapped plans, ensure no regression |
| `worldConditions` | DB JSON stored direct; obligation IDs remapped | compare nested provenance after readback |
| `activeActivities` | plan/progress version envelopes unwrapped into rows | validate wrap-on-read, ordering, revisions and progress unchanged |
| `worldObligations` | definition unwrapped, state `active` coerced to `pending` | prove allowed states round-trip, otherwise stop rather than weakening equality |
| `activeAction` | `actionDbState` changes unknown status to running; plan embeds `__v2ForkTarget` and strips on read | test available checkpoint status/target/pendingResolution and detect any lossy normalization |
| parent, identity, canon | child IDs deterministically remapped; source root reused | child independent, parent unaffected, invalid actor/hash refuses |

## Real test ownership
Existing tests `packages/story-engine/test/fork-reconstruct-authorization.integration.test.mjs` and `fork-reconstruct.test.mjs` prove FORK01 selected auth and rich fixture, but do **not** reproduce real scripted scene1 with `plans:null`. Add a single canonical regression corpus under that package, not a second fake fork engine. Use `packages/lab-support` existing disposable PostgreSQL harness. Do not assume a unittest of `buildV2ForkRows` equals SQL proof.
