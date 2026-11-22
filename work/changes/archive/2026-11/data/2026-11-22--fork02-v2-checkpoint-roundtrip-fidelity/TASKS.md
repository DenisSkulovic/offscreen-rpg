# FORK02 | Bounded inexpensive Cursor execution cards

**Branch:** new `change/fork02-v2-checkpoint-roundtrip-fidelity` linked worktree based on current `undertaking/storyteller-workshop`, recheck HEAD and file ownership. One parent coordinates focused serial cards; no broad subagent audit, no Kubernetes retry. Read AGENTS.md, CHATGPT.md and all FORK02 packet parts first.

### T01 (test groundwork): JSON null and full diagnostic
**Inspect:** `packages/db/src/schema/campaign.ts::gameOffer`; `packages/story-engine/src/stories/{forks,scene-after-state,scene-checkpoint-v2}.ts`; `packages/story-engine/test/fork-reconstruct-authorization.integration.test.mjs`.
**Implement:** create test-only fixture that reproduces a real v2 scene1 mapped checkpoint `offer.payload.body.plans=null` and all downstream fields. Add field-diff collector that reports **all** mismatching semantic checkpoint fields and useful nested path, without editing production `assertV2PostStateMatches`. Verify on disposable PostgreSQL that `game_offer.plans` accepts explicit JSONB `'null'::jsonb` under NOT NULL, returns `plans IS NULL=false`, `jsonb_typeof(plans)='null'`, and JS driver maps it to `null`. If Drizzle cannot preserve that exact distinction, **stop** with precise SQL+driver receipt before changing production schema. Negative SQL NULL insert must violate constraint.
**Proof:** red failing `null -> wrapped []` real-fork test before patch, full later-field report. Don't count test skip as PASS.

### T02 (source fix): symmetric offer persistence
**Inspect:** `fork-v2-reconstruct.ts::{extractOfferPlans,campaignOfferColumnFromFictional,buildV2ForkRows}`, `scene-checkpoint-v2.ts::{buildOfferSnapshot,offerTreeFromCampaignColumn}`.
**Implement:** represent null plans as explicit JSONB literal null while retaining current associated gameOffer row; readback `plans===null` -> null, present [] or payload body -> singly version-wrapped exact value. Preserve offer `id/source/meaning` and raw valid nested tree shape, no parser-stripping stored open data. Keep existing checkpoint schema/identity validation and no widened auth. If a current production consumer requires non-null array plans and cannot distinguish JSON null safely, STOP with call-site evidence; do not silently omit the row, substitute [] or change schema.
**Proof:** real Postgres fork null, [], nonempty open plans and meta all reconstruct identically; invalid schema / mismatch continues to fail. No direct Kubernetes edits.

### T03 (finish whole field round trip): detect and repair remaining localized mismatches
**Inspect:** `fork-v2-reconstruct.ts::buildV2ForkRows`, `fork-state.ts::mapV2ForkState`, `scene-checkpoint-v2.ts::presentMechanicsFictionalState`, `scene-after-state.ts::readSceneAfterState`.
**Implement:** use T01 collector against comprehensive mapped checkpoint combinations and log every remaining unequal field, including those after offer. Reconcile *only* genuine localized fork insert/readback loss of canonical valid data, using the established inverse projection conventions; never suppress assertions, weaken hashes, or silently change source open payload. Test action/offer IDs, status/target, prepared plans, active activity/obligations/holds and null variants. If a mismatch requires DB migration or cross-owner policy change, stop with exact field expected/actual and source anchor.
**Proof:** zero differences for each valid fixture and existing tests; mutation of each representative field fails exact strict comparator. No unknown field normalization.

### T04 (integrate and handoff)
**Implement:** run package build/typecheck and focused unit/disposable fork suite, preserve FORK01 tests. Add negative cases wrong owner/hash, malformed payload and rollback; verify idempotent same fork request and parent/child independent future. Record run evidence in packet, archive/change catalog/ledger and squash/merge onto undertaking branch after checks.
**Proof:** include exact executable commands, counts and any NOT RUN; do not claim cold kind PASS. No live cluster DB, Tilt worktree, image rebuilds, S3 fault injection, provider send. Report integrated SHA to TURN03; its separate chat later verifies correctly compiled live source and retries existing fork ID. If a new field mismatch shows up, don't hand back a green offer-only test.
