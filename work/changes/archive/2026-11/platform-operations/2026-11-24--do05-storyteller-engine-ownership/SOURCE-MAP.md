# Source map
Baseline `ed0837d0531be4050b40d9b2485b5759ef479fea`; refreshed at 372df9646108f0442dcca4f1dcc992fddfe50511; changed mapped callers inspected and original import sites retained. Preserve wave A imports; use named symbols, not line-number replacement.

## story-retrieval
- Source: `packages/contracts/src/story-retrieval.ts` → `packages/storyteller/src/context/story-retrieval.ts`
- Import: `@offscreen/storyteller/context/story-retrieval`
- Current imports: `zod`
- Exports: `storyRetrievalTuningSchema`, `balancedStoryRetrievalTuning`, `storyRetrievalQuerySchema`, `storyRetrievalUnitSchema`, `storyRetrievalCandidateSchema`, `storyRetrievalResultSchema`, `StoryRetrievalQuery`, `StoryRetrievalTuning`, `StoryRetrievalUnit`, `StoryRetrievalCandidate`, `StoryRetrievalResult`, `evidenceRepresentationLevelSchema`, `packableEvidenceItemSchema`, `PackableEvidenceItem`, `EvidenceRepresentationLevel`, `evidencePacketSchema`, `EvidencePacket`
- Existing tests: no dedicated test file in old package

| Consumer | Lines |
|---|---|
| `packages/story-engine/src/storyteller/memory-evidence-use.ts` | 1 |
| `packages/story-engine/src/storyteller/canonical-search.ts` | 7 |
| `packages/story-engine/src/storyteller/memory-evidence-packing.ts` | 1 |
| `packages/story-engine/src/storyteller/memory-exploration.ts` | 9 |
| `packages/story-engine/src/storyteller/evidence-packing.ts` | 5 |
| `packages/story-engine/src/storyteller/retrieval-recipes.ts` | 4 |
| `packages/story-engine/src/storyteller/lexical-story-index.ts` | 8 |
| `packages/lab-support/src/evidence-packing-evaluator.ts` | 4 |
| `packages/lab-support/src/memory-evaluator.ts` | 9 |
| `packages/storyteller/test/storyteller.test.ts` | 4 |
| `packages/storyteller/src/tasks/memory-exploration.ts` | 5 |

## creative-exploration
- Source: `packages/contracts/src/creative-exploration.ts` → `packages/storyteller/src/context/creative-exploration.ts`
- Import: `@offscreen/storyteller/context/creative-exploration`
- Current imports: `zod`
- Exports: `creativeLensSchema`, `creativeExplorationPostureSchema`, `creativeExplorationLimitsSchema`, `creativeExplorationRecipeSchema`, `disabledCreativeExplorationRecipe`, `creativeExplorationNeedSchema`, `creativeDiscoveryRequestSchema`, `creativeDiscoveryResultSchema`, `CreativeExplorationPosture`, `CreativeLens`, `CreativeExplorationLimits`, `CreativeExplorationRecipe`, `CreativeExplorationNeed`, `CreativeDiscoveryRequest`, `CreativeDiscoveryResult`
- Existing tests: no dedicated test file in old package

| Consumer | Lines |
|---|---|
| `packages/story-engine/src/storyteller/task-evidence-need.ts` | 6 |
| `packages/story-engine/src/storyteller/creative-exploration-recipes.ts` | 8 |
| `packages/story-engine/src/storyteller/creative-discovery.ts` | 7 |
| `packages/story-engine/src/storyteller/task-admission.ts` | 17 |
| `packages/story-engine/src/storyteller/memory-exploration.ts` | 1,5 |
| `packages/story-engine/src/storyteller/adaptive-recipe.ts` | 9 |
| `packages/storyteller/src/tasks/resources.ts` | 6 |
| `tools/api-integration/legacy-engine-tests/long-story-memory-evaluation.test.mjs` | 51 |

## current-authority
- Source: `packages/contracts/src/current-authority.ts` → `packages/story-engine/src/storyteller/dispatch-authority-policy.ts`
- Import: `relative internal`
- Current imports: `zod`, `@offscreen/usage-policy/usage-policy`
- Exports: `storytellerDispatchRouteEntrySchema`, `StorytellerDispatchRouteEntry`, `storytellerDispatchRouteMapSchema`, `StorytellerDispatchRouteMap`, `storytellerCurrentPlatformPolicyRowSchema`, `StorytellerCurrentPlatformPolicyRow`, `storytellerCurrentOwnerGrantRowSchema`, `StorytellerCurrentOwnerGrantRow`, `IndependentAuthorityDenialReason`, `parseStorytellerCurrentPlatformPolicyRow`, `parseStorytellerCurrentOwnerGrantRow`, `fundingBalanceIsNotDispatchEntitlement`, `capturedUsagePolicySnapshotIsNotDispatchEntitlement`, `assessPlatformPolicyAvailability`, `assessOwnerGrantAvailability`
- Existing tests: `packages/contracts/test/current-authority.test.ts`

| Consumer | Lines |
|---|---|
| `packages/story-engine/src/storyteller/current-authority.ts` | 7 |
| `packages/story-engine/src/storyteller/load-current-dispatch-authority.ts` | 14 |
| `tools/api-integration/legacy-engine-tests/obs00-b-current-authority-contract.test.mjs` | 7 |

## storyteller-kinds
- Source: `packages/contracts/src/storyteller-kinds.ts` → `packages/story-engine/src/generations/storyteller-kinds.ts`
- Import: `relative internal`
- Current imports: 
- Exports: `storytellerKind`, `storytellerContextCaptureKind`
- Existing tests: `packages/contracts/test/storyteller-kinds.test.ts`

| Consumer | Lines |
|---|---|
| `packages/story-engine/src/storyteller/records.ts` | 11,22 |
| `packages/story-engine/src/storyteller/context-capture.ts` | 86,88 |
| `packages/story-engine/src/stories/continuity-notes.ts` | 15 |
| `packages/story-engine/src/stories/storyteller-task-record.ts` | 10 |
| `packages/story-engine/src/stories/continuation-checkpoint.ts` | 46 |
| `packages/story-engine/src/stories/reads.ts` | 51 |
| `packages/story-engine/src/stories/storyteller-retry.ts` | 16 |
| `packages/story-engine/src/stories/start.ts` | 5 |
| `packages/story-engine/src/stories/continuity-notes.test.ts` | 7 |
| `packages/story-engine/src/campaign/storyteller-wake.ts` | 9 |
| `tools/api-integration/legacy-engine-tests/ma05a-storyteller-kinds.test.mjs` | 8 |

## storyteller-notices
- Source: `packages/contracts/src/storyteller-notices.ts` → `packages/story-engine/src/generations/storyteller-notices.ts`
- Import: `relative internal`
- Current imports: 
- Exports: `storytellerTopic`, `storytellerDistributedTopic`
- Existing tests: `packages/contracts/test/storyteller-notices.test.ts`

| Consumer | Lines |
|---|---|
| `packages/story-engine/src/storyteller/records.ts` | 15 |
| `packages/story-engine/src/stories/storyteller-task-record.ts` | 14 |
| `packages/story-engine/src/campaign/storyteller-wake.ts` | 8 |
| `tools/api-integration/legacy-engine-tests/ma05d-wake-parity.test.mjs` | 6 |

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
