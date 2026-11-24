# Source map
Baseline `ed0837d0531be4050b40d9b2485b5759ef479fea`; refreshed against `f28085e3e5cbf15bb32f430bd3b0b833f7429c6e` after LIB07. No original contracts source changed in the baseline comparison. Five consumer paths changed only in unrelated work; current contract imports checked and refreshed below. Line numbers are navigation anchors; use named imports for mechanical replacement after sibling joins.

## stories
- Source: `packages/contracts/src/stories.ts` → `packages/story-interface/src/stories.ts`
- Import: `@offscreen/story-interface/stories`
- Current imports: `./campaign`, `./storytellers`, `zod`, `./interactions`
- Exports: `storyItemReferenceSchema`, `storyItemSchema`, `storyItemsSchema`, `itemTransferSchema`, `itemCreateSchema`, `storyItemEffectSchema`, `passageContentSchema`, `publicSceneAppearanceAssetSchema`, `publicSceneAppearanceV1Schema`, `PublicSceneAppearanceV1`, `publicationSceneDirectiveV1Schema`, `makeValidatedAppearanceForPublication`, `readOptionalSceneAppearance`, `projectStoredSceneAppearance`, `storyCanonRootSchema`, `storySnapshotSchema`, `StorySnapshot`, `historicalSceneSchema`, `HistoricalScene`, `storyHistorySchema`, `StoryHistory`, `publicStoryEventSchema`, `storyEventPageSchema`, `PublicStoryEvent`, `StoryEventPage`, `storyVisitOpeningSchema`, `StoryVisitOpening`, `storyVisitAckBodySchema`, `storyVisitAckResultSchema`, `StoryVisitAckResult`, `startStorySchema`, `forkStorySchema`, `startChamberSchema`, `respondToStorySchema`, `resolutionOperationReceiptSchema`, `ResolutionOperationReceipt`, `canonicalResolutionRequestJson`, `controlIntervalSchema`, `storyListSchema`, `StoryList`, `storyUpdateHintSchema`, `StoryUpdateHint`, `STORY_VIEW_NOTIFY_CHANNEL`
- Existing tests: `packages/contracts/test/scene-appearance.test.ts`, `packages/contracts/test/stories-receipt.test.ts`, `packages/contracts/test/stories-update-hint.test.ts`

| Consumer | Lines |
|---|---|
| `packages/story-engine/src/storyteller/launch-publication.ts` | 12 |
| `packages/story-engine/src/storyteller/context.ts` | 14 |
| `packages/story-engine/src/storyteller/context-capture.ts` | 13 |
| `packages/story-engine/src/storyteller/writer-scene-proposal.ts` | 8 |
| `packages/story-engine/src/storyteller/capture-materialization.ts` | 22 |
| `packages/story-engine/src/stories/persistence.ts` | 1,6 |
| `packages/story-engine/src/stories/command-policy.ts` | 17 |
| `packages/story-engine/src/stories/resolution-core.ts` | 20 |
| `packages/story-engine/src/stories/documents.ts` | 34 |
| `packages/story-engine/src/stories/resolution-receipt.ts` | 6 |
| `packages/story-engine/src/stories/plans.ts` | 1 |
| `packages/story-engine/src/stories/index.ts` | 14 |
| `packages/story-engine/src/stories/forks.ts` | 33 |
| `packages/story-engine/src/stories/scene-appearance.ts` | 4 |
| `packages/story-engine/src/stories/passage-documents.ts` | 15,20 |
| `packages/story-engine/src/stories/reads.ts` | 22,29 |
| `packages/story-engine/src/stories/storyteller-resolution-authority.ts` | 35 |
| `packages/story-engine/src/stories/timing.ts` | 1 |
| `packages/story-engine/src/campaign/fixtures/mechanical-content.ts` | 2 |
| `packages/story-engine/src/campaign/fixtures/item-transfer-plans.ts` | 2 |
| `packages/lab-support/src/chamber.ts` | 3 |
| `packages/lab-support/src/chamber-inspector.ts` | 19 |
| `packages/lab-support/src/lab/fixture-specimens.ts` | 15 |
| `packages/storyteller/test/scene-direction.test.ts` | 3 |
| `packages/storyteller/src/context/index.ts` | 17 |
| `packages/storyteller/src/tasks/writer-mission.ts` | 5 |
| `packages/storyteller/src/tasks/task-contracts.ts` | 12 |
| `packages/storyteller/src/tasks/playable.ts` | 3 |
| `packages/storyteller/src/tasks/playable-proposal.ts` | 2 |
| `apps/web/.storybook/main.ts` | 36 |
| `apps/web/src/test/query-harness.tsx` | 3 |
| `apps/web/src/test/story-fixtures.ts` | 1,2 |
| `apps/web/src/stories/story-frame.stories.tsx` | 2 |
| `apps/web/src/lib/story-transport.ts` | 1,2 |
| `apps/web/src/shared/api/stories-list-query.ts` | 2 |
| `apps/web/src/shared/api/story-snapshot-write.ts` | 2 |
| `apps/web/src/shared/api/resolution-receipt-client.ts` | 4 |
| `apps/web/src/shared/api/canonical-digest.ts` | 1 |
| `apps/web/src/shared/api/story-history-query.ts` | 5 |
| `apps/web/src/shared/api/story-update-stream.ts` | 4 |
| `apps/web/src/shared/api/story-snapshot-query.ts` | 2 |
| `apps/web/src/shared/api/story-historical-query.ts` | 5 |
| `apps/web/src/shared/api/story-pending-refresh.ts` | 1 |
| `apps/web/src/shared/api/story-snapshot-reconcile.ts` | 1 |
| `apps/web/src/stories/presenters/play-state-panel.tsx` | 3 |
| `apps/web/src/features/play/use-control-command.ts` | 5 |
| `apps/web/src/features/play/use-fork-historical-scene.ts` | 8 |
| `apps/web/src/features/play/resolution-recovery.tsx` | 3 |
| `apps/web/src/features/play/use-resolution-command.ts` | 5,6 |
| `apps/web/src/features/play/view.tsx` | 18 |
| `apps/web/src/features/play/campaign-settings.tsx` | 7 |
| `apps/web/src/features/play/view.test.tsx` | 16 |
| `apps/web/src/features/play/fork-historical-scene.test.tsx` | 16 |
| `apps/web/src/features/play/fork-historical-scene.tsx` | 3 |
| `apps/web/src/features/play/model/campaign-projections.ts` | 2 |
| `apps/web/src/features/play/model/play-status.ts` | 1 |
| `apps/web/src/features/play/model/live-presentation.ts` | 1 |
| `apps/web/src/features/play/model/play-status.test.ts` | 2 |
| `apps/web/src/features/play/api/campaign-command.ts` | 1 |
| `apps/web/src/features/play/api/use-campaign-command.ts` | 5 |
| `apps/web/src/features/play/ui/campaign-play.tsx` | 6 |
| `apps/web/src/features/play/ui/campaign-offer.tsx` | 2 |
| `apps/web/src/features/play/ui/appearance-roundtrip.test.tsx` | 1,2,3 |
| `apps/web/src/features/play/ui/journey-timing-notice.tsx` | 1 |
| `apps/web/src/features/developer-tools/chamber/use-chamber-play.ts` | 4 |
| `apps/web/src/features/developer-tools/chamber/scene.tsx` | 7 |
| `apps/web/src/features/developer-tools/chamber/view.tsx` | 7 |
| `apps/web/app/(authenticated)/stories/page.tsx` | 2 |
| `apps/web/app/(authenticated)/chamber/page.tsx` | 5 |
| `apps/web/app/(authenticated)/play/[id]/page.tsx` | 4 |
| `apps/api/src/modules/stories/game-authority-client.ts` | 8 |
| `apps/api/src/modules/stories/story-update-hub.ts` | 6 |
| `apps/api/src/modules/stories/controllers/story-documents.ts` | 13 |
| `apps/api/src/modules/stories/controllers/story-commands.ts` | 16 |
| `apps/game-authority/src/server.ts` | 11 |
| `apps/game-authority/src/application.ts` | 8 |
| `tools/api-integration/test/fork01-private-ga-fork.integration.ts` | 11 |
| `tools/api-integration/test/story03-causal-multiprocess.integration.ts` | 16 |
| `tools/api-integration/test/story-start.integration.ts` | 9 |
| `tools/api-integration/test/story-updates.integration.ts` | 8 |
| `tools/api-integration/test/stories-core.integration.ts` | 10 |
| `tools/api-integration/test/boot03-imported-start-distributed.integration.ts` | 12 |
| `tools/api-integration/test/stories-http.integration.ts` | 4 |
| `tools/api-integration/test/story-resolution.integration.ts` | 8 |
| `tools/chamber/src/live-evaluation-run.ts` | 12 |
| `tools/api-lab/src/chamber-tools-controller.ts` | 22 |
| `tools/terminal/test/fixtures.ts` | 1,2 |
| `tools/terminal/src/campaign-projections.ts` | 2 |
| `tools/terminal/src/player.ts` | 13 |
| `tools/terminal/src/http.ts` | 21 |
| `tools/terminal/src/render.ts` | 9 |
| `tools/terminal/src/digest.ts` | 6 |
| `scripts/repo-tools/module-graph.test.mjs` | 121,146,160 |

## campaign
- Source: `packages/contracts/src/campaign.ts` → `packages/story-interface/src/campaign.ts`
- Import: `@offscreen/story-interface/campaign`
- Current imports: `zod`, `@offscreen/game/checks`, `@offscreen/game/effects`, `@offscreen/game/immediate-actions`, `@offscreen/game/offers`, `@offscreen/game/state`, `@offscreen/game/time`, `@offscreen/game/calendar`, `@offscreen/game/world-obligations`, `./storytellers`, `@offscreen/documents/schema`, `@offscreen/documents/schema`, `@offscreen/documents/schema`
- Exports: `narrativeTagSchema`, `creativeSettingsSchema`, `CreativeSettings`, `campaignSettingsSchema`, `CampaignSettings`, `campaignActivityEventKindSchema`, `CampaignActivityEventKind`, `campaignActivityEventSchema`, `campaignActivityReportSchema`, `campaignWorldObligationReportSchema`, `acceptedActivityPlanViewSchema`, `campaignViewSchema`, `CampaignView`, `settingsCommandSchema`, `actionCommandSchema`, `activityControlSchema`, `actionExecutionControlSchema`, `acceptedActivityPlanControlSchema`, `worldObligationControlSchema`, `campaignStartSchema`, `CampaignStart`
- Existing tests: no dedicated test file in old package

| Consumer | Lines |
|---|---|
| `packages/story-engine/src/storyteller/context.ts` | 21 |
| `packages/story-engine/src/storyteller/context-capture.ts` | 8 |
| `packages/story-engine/src/stories/storyteller-start-candidate.ts` | 4,15 |
| `packages/story-engine/src/stories/scene-checkpoint-v2.ts` | 7 |
| `packages/story-engine/src/stories/scene-checkpoint-v2.test.ts` | 3 |
| `packages/story-engine/src/stories/index.ts` | 13 |
| `packages/story-engine/src/stories/passage-documents.ts` | 16 |
| `packages/story-engine/src/stories/reads.ts` | 41 |
| `packages/story-engine/src/stories/storyteller-resolution-authority.ts` | 36 |
| `packages/story-engine/src/stories/start.ts` | 4 |
| `packages/story-engine/src/campaign/persistence.ts` | 5 |
| `packages/story-engine/src/campaign/controls.ts` | 4 |
| `packages/story-engine/src/campaign/settings.ts` | 19 |
| `packages/story-engine/src/campaign/action-execution-controls.ts` | 4 |
| `packages/story-engine/src/campaign/actions.ts` | 15 |
| `packages/story-engine/src/campaign/narrative-intent-action.ts` | 30 |
| `packages/story-engine/src/campaign/reads.ts` | 27 |
| `packages/story-engine/src/campaign/world-obligation-controls.ts` | 10 |
| `packages/story-engine/src/campaign/accepted-plan-controls.ts` | 4 |
| `packages/lab-support/src/chamber.ts` | 1 |
| `packages/storyteller/src/context/index.ts` | 1 |
| `packages/storyteller/src/tasks/task-contracts.ts` | 13 |
| `apps/web/.storybook/main.ts` | 37 |
| `apps/web/src/test/campaign-fixtures.ts` | 4 |
| `apps/web/src/shared/api/start-intent-store.ts` | 3 |
| `apps/web/src/shared/api/settings-query.ts` | 6 |
| `apps/web/src/stories/presenters/settings-conflict-demo.tsx` | 4 |
| `apps/web/src/features/play/use-preset-save.ts` | 5 |
| `apps/web/src/features/play/campaign-settings.tsx` | 8 |
| `apps/web/src/features/play/view.test.tsx` | 15 |
| `apps/web/src/features/play/settings-form.ts` | 5 |
| `apps/web/src/features/play/model/campaign-projections.ts` | 1 |
| `apps/web/src/features/play/model/play-status.test.ts` | 1 |
| `apps/web/src/features/play/ui/campaign-play.tsx` | 7 |
| `apps/web/src/features/play/ui/campaign-status.tsx` | 1 |
| `apps/web/src/features/play/ui/campaign-offer.tsx` | 1 |
| `apps/web/src/features/play/ui/campaign-activity.tsx` | 2 |
| `apps/web/src/features/play/ui/campaign-history.tsx` | 1 |
| `apps/web/src/features/play/ui/campaign-records.tsx` | 1 |
| `apps/api/src/modules/stories/game-authority-client.ts` | 2 |
| `apps/game-authority/src/application.ts` | 7 |
| `tools/api-integration/test/fork01-private-ga-fork.integration.ts` | 10 |
| `tools/api-integration/test/turn03-distributed-poc-fixture.integration.ts` | 7 |
| `tools/api-integration/test/start-package.integration.ts` | 6 |
| `tools/api-integration/test/story03-causal-multiprocess.integration.ts` | 11 |
| `tools/api-integration/test/storyteller-suite.ts` | 12 |
| `tools/api-integration/test/boot03-imported-start-distributed.integration.ts` | 10 |
| `tools/api-integration/test/storyteller-imported-start.integration.ts` | 7 |
| `tools/chamber/src/main.ts` | 31 |
| `tools/chamber/src/packet-review.ts` | 5 |
| `tools/terminal/src/campaign-projections.ts` | 1 |
| `tools/terminal/src/player.ts` | 4 |
| `tools/terminal/src/render.ts` | 1 |

## interactions
- Source: `packages/contracts/src/interactions.ts` → `packages/story-interface/src/interactions.ts`
- Import: `@offscreen/story-interface/interactions`
- Current imports: `zod`
- Exports: `choiceSpecificationSchema`, `interactionSpecificationSchema`, `interactionSchema`, `interactionAnswerSchema`, `interactionSubmissionSchema`, `InteractionSpecification`, `Interaction`, `InteractionSubmission`, `InteractionInputError`, `validateInteractionSubmission`
- Existing tests: `packages/contracts/test/interactions.test.ts`

| Consumer | Lines |
|---|---|
| `packages/story-engine/src/storyteller/context.ts` | 13 |
| `packages/story-engine/src/storyteller/context-capture.ts` | 14 |
| `packages/story-engine/src/storyteller/admission.ts` | 10 |
| `packages/story-engine/src/storyteller/publication.ts` | 38 |
| `packages/story-engine/src/stories/persistence.ts` | 2 |
| `packages/story-engine/src/stories/command-policy.ts` | 11 |
| `packages/story-engine/src/stories/initialization.ts` | 2 |
| `packages/story-engine/src/stories/resolution-core.ts` | 19 |
| `packages/story-engine/src/stories/plans.ts` | 2 |
| `packages/story-engine/src/stories/continuation.ts` | 6 |
| `packages/story-engine/src/stories/storyteller-resolution-contract.ts` | 1 |
| `packages/story-engine/src/stories/storyteller-resolution-authority.ts` | 16 |
| `packages/story-engine/src/stories/timing.ts` | 2 |
| `packages/story-engine/src/generations/scripted-continuations.ts` | 6 |
| `packages/lab-support/src/lab/fixture-specimens.ts` | 11 |
| `packages/storyteller/src/tasks/writer-mission.ts` | 4 |
| `packages/storyteller/src/tasks/playable.ts` | 4 |

## drafts
- Source: `packages/contracts/src/drafts.ts` → `packages/story-interface/src/drafts.ts`
- Import: `@offscreen/story-interface/drafts`
- Current imports: `zod`, `./storytellers`
- Exports: `draftIdSchema`, `draftContentSchema`, `saveDraftSchema`, `draftSchema`, `draftListSchema`, `Draft`, `DraftContent`, `SaveDraft`
- Existing tests: no dedicated test file in old package

| Consumer | Lines |
|---|---|
| `packages/story-engine/src/drafts/index.ts` | 7,8 |
| `packages/storyteller/src/tasks/opening.ts` | 2 |
| `apps/web/.storybook/main.ts` | 35 |
| `apps/web/src/test/draft-fixtures.ts` | 1 |
| `apps/web/src/shared/api/drafts-list-query.ts` | 2,3 |
| `apps/web/src/shared/api/draft-query.ts` | 2 |
| `apps/web/src/stories/presenters/draft-state-panel.tsx` | 11 |
| `apps/web/src/features/stories/opening/opening-preview.tsx` | 5 |
| `apps/web/src/features/stories/drafts/draft-editor.tsx` | 8 |
| `apps/web/src/features/stories/drafts/draft-content.ts` | 2,3 |
| `apps/web/src/features/stories/drafts/use-draft-save.ts` | 6 |
| `apps/web/app/(authenticated)/stories/page.tsx` | 3 |
| `apps/web/app/(authenticated)/stories/[id]/page.tsx` | 3 |
| `apps/web/app/(authenticated)/stories/[id]/preview/page.tsx` | 4 |
| `tools/api-integration/test/drafts.integration.ts` | 4 |
| `tools/chamber/src/packet-review.ts` | 8 |

## openings
- Source: `packages/contracts/src/openings.ts` → `packages/story-interface/src/openings.ts`
- Import: `@offscreen/story-interface/openings`
- Current imports: `zod`, `./storytellers`, `./interactions`, `./stories`, `./campaign`
- Exports: `requestOpeningSchema`, `mechanicalContentSummarySchema`, `mechanicalContentCatalogueSchema`, `MechanicalContentSummary`, `openingCandidateSchema`, `openingPreviewSchema`, `OpeningCandidate`, `OpeningPreview`, `latestOpeningSchema`
- Existing tests: `packages/contracts/test/openings.test.ts`

| Consumer | Lines |
|---|---|
| `packages/story-engine/src/storyteller/openings.ts` | 30 |
| `packages/story-engine/src/generations/scripted-openings.ts` | 9 |
| `apps/web/src/test/opening-fixtures.ts` | 4 |
| `apps/web/src/shared/api/opening-query.ts` | 5 |
| `apps/web/src/features/stories/opening/opening-preview.tsx` | 6,7 |
| `apps/web/src/features/stories/opening/use-opening-generate.ts` | 6 |
| `apps/web/src/features/stories/opening/use-start-story.ts` | 13 |
| `apps/web/src/features/stories/drafts/draft-editor.tsx` | 9 |
| `apps/web/app/(authenticated)/stories/[id]/page.tsx` | 7 |
| `apps/web/app/(authenticated)/stories/[id]/preview/page.tsx` | 8 |
| `apps/api/src/modules/drafts/openings-controller.ts` | 17 |
| `tools/api-integration/test/openings.integration.ts` | 17 |
| `tools/api-integration/test/story03-causal-multiprocess.integration.ts` | 15 |
| `tools/api-integration/test/story-start.integration.ts` | 8 |
| `tools/chamber/src/live-evaluation-run.ts` | 11 |

## story-launch
- Source: `packages/contracts/src/story-launch.ts` → `packages/story-interface/src/story-launch.ts`
- Import: `@offscreen/story-interface/story-launch`
- Current imports: `zod`
- Exports: `storyLaunchRequestSchema`, `StoryLaunchRequest`, `storyLaunchStatusSchema`, `StoryLaunchStatus`, `canonicalStoryLaunchRequestJson`
- Existing tests: `packages/contracts/test/story-launch.test.ts`, `packages/contracts/test/story-launch-canonical.test.ts`

| Consumer | Lines |
|---|---|
| `packages/story-engine/test/wr08-opening-offer.test.mjs` | 8 |
| `apps/web/src/shared/api/story-launch-intent-store.test.ts` | 10 |
| `apps/web/src/shared/api/story-launch-intent-store.ts` | 5 |
| `apps/web/src/features/stories/launch/story-launch-status.tsx` | 3 |
| `apps/web/src/features/stories/launch/story-launch-form.test.tsx` | 14 |
| `apps/web/src/features/stories/launch/use-story-launch.test.tsx` | 13 |
| `apps/web/src/features/stories/launch/use-story-launch.ts` | 9 |
| `apps/api/src/modules/stories/controllers/catalogue-and-launch.ts` | 16 |
| `apps/worker/test/wr07b-scripted-launch.integration.test.ts` | 5 |
| `apps/game-authority/test/wr07b-launch-put.integration.test.mjs` | 8 |
| `apps/game-authority/src/launch-ledger.ts` | 8 |
| `apps/game-authority/src/application.ts` | 12 |
| `apps/game-authority/src/launch-put.ts` | 9 |
| `tools/api-integration/legacy-engine-tests/wr07b-launch-admission.integration.test.mjs` | 5 |
| `tools/api-integration/legacy-engine-tests/wr07b-joined-play.integration.test.mjs` | 9 |
| `tools/api-integration/legacy-engine-tests/wr07b-launch-publication.integration.test.mjs` | 8 |
| `tools/api-integration/test/testlab-provider-free-launch.integration.ts` | 9 |
| `tools/api-integration/test/longform-acceptance.integration.mjs` | 8 |
| `tools/terminal/src/player.ts` | 18 |
| `tools/terminal/src/http.ts` | 27 |
| `tools/terminal/src/render.ts` | 13 |
| `tools/terminal/src/digest.ts` | 5 |

## storytellers
- Source: `packages/contracts/src/storytellers.ts` → `packages/story-interface/src/storytellers.ts`
- Import: `@offscreen/story-interface/storytellers`
- Current imports: `zod`
- Exports: `storytellerReferenceSchema`, `storytellerSummarySchema`, `storytellerCatalogueSchema`, `StorytellerReference`, `StorytellerSummary`
- Existing tests: no dedicated test file in old package

| Consumer | Lines |
|---|---|
| `packages/story-engine/src/drafts/index.ts` | 3 |
| `packages/storyteller/src/profiles/index.ts` | 5 |
| `apps/web/.storybook/main.ts` | 38 |
| `apps/web/src/features/stories/drafts/draft-content.ts` | 4 |
| `apps/web/src/features/stories/drafts/storyteller-select.tsx` | 7 |

## campaign-holds
- Source: `packages/contracts/src/campaign-holds.ts` → `packages/story-interface/src/campaign-holds.ts`
- Import: `@offscreen/story-interface/campaign-holds`
- Current imports: `zod`
- Exports: `campaignHoldSchema`, `campaignHoldsSchema`
- Existing tests: `packages/contracts/test/campaign-holds.test.ts`

| Consumer | Lines |
|---|---|
| `packages/story-engine/src/campaign/holds.ts` | 6 |
| `packages/admin/src/situation-reads.ts` | 39 |
| `tools/api-integration/legacy-engine-tests/admin-compat.test.mjs` | 20 |

## Non-source and internal import anchors
See program ownership map and Change split rules. Exact current relative import graph is listed above.

Technical/related owners referencing old package in snapshot (refresh impacted subset, do not rewrite historical receipts):

- `infra/kubernetes/lab/dev/dev-sync-paths.mjs`
- `infra/kubernetes/lab/app-release/production-workspace-closure.test.mjs`
- `docs/architecture/00-human-tour.md`
- `docs/technical/engine/selected-architecture.md`
- `docs/technical/platform/security-and-trust-boundaries.md`
- `docs/technical/platform/http-api-and-client-contracts.md`
- `docs/technical/platform/data-and-persistence.md`
- `docs/technical/platform/persistence-and-caching.md`
- `docs/technical/admin/topology-and-authorization.md`
- `docs/technical/lab/chamber-and-fixtures.md`
- `docs/technical/lab/experiment-protocol.md`
- `docs/technical/client/scene-direction-production.md`
- `docs/technical/client/living-book-poc.md`
- `docs/technical/client/presentation-runtime.md`
- `scripts/repo-tools/maintenance-coverage.test.mjs`
- `scripts/repo-tools/module-graph.test.mjs`
- `scripts/repo-tools/module-graph.mjs`
- `scripts/repo-tools/focused-integration.mjs`
- `scripts/repo-tools/ci-change-scope.test.mjs`

## Current-baseline consumer refresh

- `packages/story-engine/src/stories/start.ts`: campaign import ends at line 4.
- `tools/api-integration/test/boot03-imported-start-distributed.integration.ts`: campaign line 10, stories line 12.
- `tools/api-integration/test/start-package.integration.ts`: campaign line 6.
- `tools/api-integration/test/storyteller-imported-start.integration.ts`: campaign line 10.
- `tools/chamber/src/main.ts`: campaign line 31.
- All retain the mapped contract imports. Preserve current LIB changes. `packages/documents/src/schema.ts` retains the three required exports; `packages/documents/src/package-reference-schema.ts` owns the reference validators. No Documents or object-storage edits.
