# Source map
Baseline `ed0837d0531be4050b40d9b2485b5759ef479fea`; refreshed at 372df9646108f0442dcca4f1dcc992fddfe50511; changed mapped callers inspected and original import sites retained. Preserve wave A imports; use named symbols, not line-number replacement.

## game-authority
- Source: `packages/contracts/src/game-authority.ts` → `packages/game-authority-protocol/src/game-authority.ts`
- Import: `@offscreen/game-authority-protocol/game-authority`
- Current imports: `zod`, `@offscreen/story-interface/stories`
- Exports: `gameAuthoritySeamVersion`, `gameAuthorityActorIdSchema`, `gameAuthorityStoryIdSchema`, `gameAuthorityResolutionRequestSchema`, `gameAuthorityErrorSchema`
- Existing tests: `packages/contracts/test/game-authority.test.ts`

| Consumer | Lines |
|---|---|
| `apps/api/test/game-authority-client.test.mjs` | 4 |
| `apps/api/src/modules/stories/game-authority-client.ts` | 7 |
| `apps/game-authority/src/server.ts` | 10 |
| `tools/api-integration/test/boot03-imported-start-distributed.integration.ts` | 11 |

## storyteller-task-custody
- Source: `packages/contracts/src/storyteller-task-custody.ts` → `packages/game-authority-protocol/src/storyteller-task-custody.ts`
- Import: `@offscreen/game-authority-protocol/storyteller-task-custody`
- Current imports: `node:crypto`, `zod`, `./game-authority`
- Exports: `storytellerTaskCustodyContractVersion`, `storytellerTaskCustodyVersionHeader`, `storytellerTaskCustodyBodyByteLimit`, `storytellerTaskCustodyGenerationIdSchema`, `pinnedStorytellerRootSchema`, `storytellerTaskCustodyResultHashSchema`, `storytellerTaskCustodyClaimRequestSchema`, `storytellerTaskCustodySaveResultRequestSchema`, `StorytellerTaskCustodyClaimRequest`, `StorytellerTaskCustodySaveResultRequest`, `storytellerTaskCustodyEvidenceRequestSchema`, `StorytellerTaskCustodyEvidenceRequest`, `storytellerTaskCustodyEvidenceResponseSchema`, `StorytellerTaskCustodyEvidenceResponse`, `storytellerTaskCustodyFetchResponseSchema`, `storytellerTaskCustodyClaimResponseSchema`, `storytellerTaskCustodySaveResultResponseSchema`, `storytellerTaskCustodyReadSavedResponseSchema`, `StorytellerTaskCustodyFetchResponse`, `StorytellerTaskCustodyClaimResponse`, `StorytellerTaskCustodySaveResultResponse`, `StorytellerTaskCustodyReadSavedResponse`, `storytellerTaskCustodyHttpErrorSchema`, `StorytellerTaskCustodyParseFailure`, `storytellerTaskCustodyGenerationBasePath`, `storytellerTaskCustodyTaskPath`, `storytellerTaskCustodyClaimPath`, `storytellerTaskCustodySaveResultPath`, `storytellerTaskCustodyReadSavedPath`, `storytellerTaskCustodyEvidencePath`, `storytellerGenerationPublishPath`, `storytellerGenerationPublishResponseSchema`, `StorytellerGenerationPublishResponse`, `StorytellerTaskCustodyRoute`, `routeStorytellerTaskCustody`, `hashStorytellerTaskCustodyResult`, `StorytellerTaskCustodyParsedBody`, `parseStorytellerTaskCustodyJsonBody`, `parseStorytellerTaskCustodyClaimRequest`, `parseStorytellerTaskCustodySaveResultRequest`, `parseStorytellerTaskCustodyEvidenceRequest`
- Existing tests: `packages/contracts/test/storyteller-task-custody.test.ts`

| Consumer | Lines |
|---|---|
| `apps/worker/test/storyteller-distributed-execution.test.ts` | 4 |
| `apps/worker/test/story03-control-publication.test.ts` | 14 |
| `apps/worker/test/storyteller-task-custody-client.test.ts` | 8 |
| `apps/worker/test/storyteller-generation-evidence.test.ts` | 8 |
| `apps/worker/src/custody/storyteller-publication-client.ts` | 7 |
| `apps/worker/src/custody/storyteller-task-custody-client.ts` | 28 |
| `apps/worker/src/activities/storyteller-distributed-execution.ts` | 5 |
| `apps/game-authority/test/storyteller-task-custody-persistence.integration.test.ts` | 18 |
| `apps/game-authority/test/storyteller-generation-publish.test.ts` | 8 |
| `apps/game-authority/test/launch-route.test.ts` | 3 |
| `apps/game-authority/test/storyteller-task-custody.test.ts` | 8 |
| `apps/game-authority/src/server.ts` | 24,27 |
| `apps/game-authority/src/branch-evidence.ts` | 12 |
| `apps/game-authority/src/application.ts` | 6 |
| `tools/api-integration/test/story03-causal-multiprocess.integration.ts` | 42 |

## writer-round-private-custody
- Source: `packages/contracts/src/writer-round-private-custody.ts` → `packages/game-authority-protocol/src/writer-round-private-custody.ts`
- Import: `@offscreen/game-authority-protocol/writer-round-private-custody`
- Current imports: `node:crypto`, `node:buffer`, `zod`, `./game-authority`
- Exports: `writerRoundPrivateCustodyContractVersion`, `writerRoundPrivateCustodyVersionHeader`, `writerRoundPrivateCustodyBodyByteLimit`, `writerRoundPrivateMaxWireBytes`, `writerRoundCanonicalMicrousdSchema`, `writerRoundModelPolicyWireSchema`, `WriterRoundModelPolicyWire`, `writerRoundPreparedProviderWireSchema`, `WriterRoundPreparedProviderWire`, `writerRoundProviderUsageWireSchema`, `WriterRoundProviderUsageWire`, `writerRoundProviderTelemetryWireSchema`, `WriterRoundProviderTelemetryWire`, `writerRoundPrivatePrepareRequestSchema`, `WriterRoundPrivatePrepareRequest`, `writerRoundPrivatePrepareResponseSchema`, `WriterRoundPrivatePrepareResponse`, `writerRoundPrivateOutcomeSchema`, `writerRoundPrivateSubmitOutcomeRequestSchema`, `WriterRoundPrivateSubmitOutcomeRequest`, `writerRoundPrivateSubmitOutcomeResponseSchema`, `WriterRoundPrivateSubmitOutcomeResponse`, `writerRoundPrivateStatusResponseSchema`, `WriterRoundPrivateStatusResponse`, `writerRoundPrivateHttpErrorSchema`, `WriterRoundPrivateParseFailure`, `writerRoundPrivateMissionIdSchema`, `writerRoundPrivatePreparePath`, `writerRoundPrivateOutcomePath`, `writerRoundPrivateStatusPath`, `WriterRoundPrivateRoute`, `routeWriterRoundPrivateCustody`, `writerRoundMicrousdWireToBigInt`, `writerRoundModelPolicyFromWire`, `writerRoundModelPolicyToWire`, `writerRoundProviderUsageFromWire`, `writerRoundProviderUsageToWire`, `preparedWriterRoundWireIsSelfConsistent`, `WriterRoundPrivateParsedBody`, `parseWriterRoundPrivateJsonBody`, `parseWriterRoundPrivatePrepareRequest`, `parseWriterRoundPrivateSubmitOutcomeRequest`
- Existing tests: `packages/contracts/test/writer-round-private-custody.test.ts`

| Consumer | Lines |
|---|---|
| `apps/worker/test/writer-round-private-client.test.ts` | 11 |
| `apps/worker/test/writer-round-provider-execution.test.ts` | 13 |
| `apps/worker/src/custody/writer-round-private-client.ts` | 19 |
| `apps/worker/src/activities/writer-round-provider-execution.ts` | 2,7 |
| `apps/game-authority/test/writer-round-private-custody.test.ts` | 9 |
| `apps/game-authority/src/server.ts` | 38 |
| `apps/game-authority/src/writer-round-private-seam.ts` | 15 |
| `tools/api-integration/test/wr10-private-round-protocol.integration.ts` | 31 |
| `tools/api-integration/test/wr10b-provider-free-temporal-writer.integration.ts` | 35 |
| `tools/api-integration/test/wr11-provider-continuation.integration.ts` | 58 |

## writer-scene-round-control
- Source: `packages/contracts/src/writer-scene-round-control.ts` → `packages/game-authority-protocol/src/writer-scene-round-control.ts`
- Import: `@offscreen/game-authority-protocol/writer-scene-round-control`
- Current imports: `zod`, `./game-authority`
- Exports: `writerSceneRoundControlContractVersion`, `writerSceneRoundControlVersionHeader`, `writerSceneRoundMissionIdSchema`, `writerSceneRoundExecutionPlanSchema`, `writerSceneRoundMissionStateSchema`, `writerSceneRoundFinalizeResultSchema`, `writerSceneRoundPlanResponseSchema`, `writerSceneRoundHttpErrorSchema`, `WriterSceneRoundExecutionPlan`, `WriterSceneRoundMissionState`, `WriterSceneRoundFinalizeResult`, `writerSceneRoundPlanPath`, `writerSceneRoundFinalizePath`, `writerSceneRoundStatePath`, `WriterSceneRoundControlRoute`, `routeWriterSceneRoundControl`
- Existing tests: `packages/contracts/test/writer-scene-round-control.test.ts`

| Consumer | Lines |
|---|---|
| `apps/worker/src/custody/writer-scene-round-control-client.ts` | 14 |
| `apps/game-authority/test/writer-round-control-custody.test.ts` | 10 |
| `apps/game-authority/src/server.ts` | 48 |
| `apps/game-authority/src/writer-round-control-seam.ts` | 11 |
| `tools/api-integration/test/wr10b-provider-free-temporal-writer.integration.ts` | 39 |
| `tools/api-integration/test/wr11-provider-continuation.integration.ts` | 62 |

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
