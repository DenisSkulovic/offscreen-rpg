# FORK01 | Restore historical situation authorization when reconstructing scene forks

**State:** Done, 2026-11-22. Historical fork reconstruction projects wrapped checkpoint situation authorization into the live campaign form. Disposable fork proof passed. TURN03 live kind replay is not this Change's PASS. **Integration branch:** `undertaking/storyteller-workshop`; **inspected SHA:** `c76145c4e63de55e4229dabd50adcff05088e05f`. **Owner:** Story Engine historical fork reconstruction. **Prerequisite:** successful scripted scene1+scene2 TURN03 proof; TURN03 stays open.

## Concrete defect
The TURN03 historical fork of scene 1 (story `643837e6-fe57-4e5b-a994-75c2a1fc829d`, checkpoint `36cb04b5abdb5506e2ae78ca822eed4c1108d58be6bb92afe7f0a15a526f1b90`) fails before fork insertion. Cursor captured a `ZodError` on `activityAccess.kind`, surfaced as bare 503 by `apps/game-authority/src/server.ts:923`. This does NOT justify changing HTTP error mapping to fake success.

`packages/story-engine/src/stories/fork-reconstruct.ts::v2ForkRowPlan` copies `fictional.situationAuthorization` directly to the live `campaign.situationAuthorization` value. The checkpoint form wraps selected `activityAccess` as `{version:1,body:{kind:'selected',...}}`, but `packages/story-engine/src/stories/scene-checkpoint-v2.ts::projectCheckpointSituationAuthorization` expects live `activityAccess.kind`. The existing inverse `projectHistoricalSituationAuthorization` already parses and returns the live form, including historical prepared plans.

## Decided fix
In `v2ForkRowPlan`, for a mechanics-present checkpoint only, replace the raw assignment with `projectHistoricalSituationAuthorization(fictional.situationAuthorization)`, imported from `./scene-checkpoint-v2`. **Do not** unwrap with ad hoc object access and **do not** modify checkpoint serialization, immutable hashes, auth policy, SQL schema, fork ID/canon mapping, or server exception handler. Preserve the existing `assertReconstructedV2Matches` verification after the transaction row inserts. This is a source bug, not a TURN03 harness change.

## Proof and acceptance
Focused test must reconstruct a *valid selected-access* scene1 checkpoint through the existing fork path, asserting live campaign `activityAccess.kind='selected'`, prepared plans restored, successful `assertReconstructedV2Matches`, exactly one fork state, and scene1 parent checkpoint unchanged. Repeat fork with identical ID/request returns the existing idempotent outcome, not duplicate rows. Existing `kind='none'` fixture continues to work. An invalid wrapped selected payload or mutated hash still fails validation, rolling back with no fork row; wrong actor and wrong hash still refuse. Follow with TURN03's previously captured same-ID replay only after source is integrated and Tilt live sync verified; existing parent story remains rev2 with 2 checkpoints; child must continue independently and not inherit parent scene2.

**No paid providers.** No SQL manual fixes, no cluster reset, no unrelated app-layer edits or disruptive recovery tests. Story Engine source proof is necessary but is NOT TURN03 gate PASS. [Source map](SOURCE-MAP.md) · [Tasks](TASKS.md) · [Proof](PROOF.md).

## Reconciliation ledger

| Claim | Target | Source | SHA | Evidence | Negative | Map |
| --- | --- | --- | --- | --- | --- | --- |
| Live fork campaign stores unwrapped situation authorization | changed | `fork-reconstruct.ts::v2ForkRowPlan`, `fork-v2-reconstruct.ts::buildV2ForkRows` | worktree before integration | unit selected projection; disposable selected fork calls `assertReconstructedV2Matches` | malformed wrap, hash mismatch, wrong actor leave no child row; raw wrap fails the round-trip test | N/A |
| Checkpoint serialization and hash | unchanged because envelopes stay wrapped | `scene-checkpoint-v2.ts` not edited | same | parent checkpoint hash asserted stable | mutated hash refuses | N/A |
| Game Authority HTTP mapping | unchanged because 503 mapping was not the defect | `apps/game-authority/src/server.ts` not edited | same | no GA diff | N/A | N/A |
| Product and technical authority | unchanged because this restores the already selected live/checkpoint pair | no product or technical page edit | same | source-inspected | N/A | N/A |
| TURN03 historical fork on kind | not run | out of scope | same | NOT RUN | live replay remains TURN03 | N/A |

## Scoped integration
Cursor creates `change/fork01-historical-authorization-reconstruction` worktree off latest undertaking HEAD and edits only `packages/story-engine/src/stories/fork-reconstruct.ts` and one nearest existing Story Engine fork integration test (plus narrowly scoped fixtures if needed). Follow current repository agent rules and tests. Merge/squash on `undertaking/storyteller-workshop`, archive FORK01 after focused proof, then return TURN03 continuation to its existing chat. Do not touch TURN03 runner/proof files or Game Authority `server.ts`. If validation reveals another mismatch or different schema contract, stop with exact evidence to ChatGPT.
