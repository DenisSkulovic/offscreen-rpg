# Source map
Baseline `ed0837d0531be4050b40d9b2485b5759ef479fea`; actual post-Documents HEAD pending. Line anchors are snapshot observations, not current execution proof.

## chamber
- Source: `packages/contracts/src/chamber.ts` → `packages/lab-interface/src/chamber.ts`
- Import: `@offscreen/lab-interface/chamber`
- Current imports: `zod`, `@offscreen/game/immediate-actions`, `./campaign`, `./interactions`, `./stories`
- Exports: `ChamberScenario`, `chamberScenarioMetadataSchema`, `ChamberScenarioMetadata`, `chamberScenarioCatalog`, `listChamberScenarios`, `dispatchReviewViewSchema`, `dispatchReviewResponseSchema`, `dispatchReviewDecisionRequestSchema`, `DispatchReviewView`, `chamberStorytellerControlViewSchema`, `chamberStorytellerControlRequestSchema`, `chamberInspectorHistoryLimit`, `chamberInspectorSchema`, `ChamberInspector`
- Existing tests: `packages/contracts/test/chamber.test.ts`

| Consumer | Lines |
|---|---|
| `packages/lab-support/src/chamber.ts` | 2 |
| `packages/lab-support/src/chamber-inspector.ts` | 18 |
| `packages/lab-support/src/chamber-fixtures.ts` | 4 |
| `packages/lab-support/src/chamber-lab-catalog.ts` | 9 |
| `apps/web/src/features/developer-tools/chamber/transport.ts` | 1 |
| `apps/web/src/features/developer-tools/chamber/use-chamber-play.ts` | 12 |
| `apps/web/src/features/developer-tools/chamber/inspector.tsx` | 3 |
| `apps/web/src/features/developer-tools/chamber/scene.tsx` | 6 |
| `tools/api-integration/test/stories-core.integration.ts` | 11 |
| `tools/api-integration/test/stories-http.integration.ts` | 5 |
| `tools/chamber/src/memory-evaluation-run.ts` | 16 |
| `tools/chamber/src/live-evaluation-run.ts` | 9,10 |
| `tools/chamber/src/memory-packet-review.ts` | 19 |
| `tools/chamber/src/packet-review.ts` | 6,7 |
| `tools/api-lab/src/chamber-tools-controller.ts` | 18 |

## qa
- Source: `packages/contracts/src/qa.ts` → `packages/lab-interface/src/qa.ts`
- Import: `@offscreen/lab-interface/qa`
- Current imports: `zod`
- Exports: `qaCostClassSchema`, `qaDriverSchema`, `qaImportanceSchema`, `qaAssessmentSchema`, `qaRubricDimensionIdSchema`, `QaRubricDimensionId`, `qaQualityRubric`, `qaStageStatusSchema`, `qaRecordedStageStatusSchema`, `qaDispositionSchema`, `QaDisposition`, `qaEvidenceRequirementSchema`, `qaAvailabilitySchema`, `qaStageDefinitionSchema`, `qaCaseVariantSchema`, `qaJourneyCaseSchema`, `QaJourneyCase`, `qaEvidenceReferenceSchema`, `qaRunSetupSchema`, `qaGitStateSchema`, `qaEnvironmentSchema`, `openQaRunSchema`, `OpenQaRun`, `recordQaStageSchema`, `RecordQaStage`, `finalizeQaRunSchema`, `FinalizeQaRun`, `qaStageResultSchema`, `qaExecutionSchema`, `qaAccountingSchema`, `qaRunSchema`, `QaRun`, `qaRunSummarySchema`, `QaRunSummary`, `qaEvidenceBundleSchema`, `QaEvidenceBundle`
- Existing tests: no dedicated test file in old package

| Consumer | Lines |
|---|---|
| `packages/lab-support/src/qa-journeys.ts` | 13 |
| `packages/lab-support/src/qa-catalog.ts` | 1 |
| `packages/lab-support/src/qa-catalog/calendar-and-live-evaluation.ts` | 1 |
| `packages/lab-support/src/qa-catalog/support.ts` | 4 |
| `packages/lab-support/src/qa-catalog/activity-lifecycle.ts` | 1 |
| `packages/lab-support/src/qa-catalog/player-entry.ts` | 1 |
| `packages/lab-support/src/qa-catalog/storyteller-operations.ts` | 1 |
| `packages/lab-support/src/qa-catalog/start-packages.ts` | 1 |
| `apps/web/src/features/developer-tools/chamber/transport.ts` | 10 |
| `apps/web/src/features/developer-tools/chamber/qa-workspace.tsx` | 9,13 |
| `tools/api-lab/src/create-lab-app.ts` | 6 |

## chamber-lab
- Source: `packages/contracts/src/chamber-lab.ts` → `packages/lab-support/src/interfaces/chamber-lab.ts`
- Import: `relative internal`
- Current imports: `zod`
- Exports: `chamberLabLaneSchema`, `ChamberLabLane`, `chamberLabCostClassSchema`, `ChamberLabCostClass`, `chamberLabFamilySchema`, `ChamberLabFamily`, `chamberLabAvailabilityStateSchema`, `chamberLabLaneAvailabilitySchema`, `ChamberLabLaneAvailability`, `chamberLabFixtureRefSchema`, `ChamberLabFixtureRef`, `chamberLabLegacyBridgeSchema`, `ChamberLabLegacyBridge`, `chamberLabScenarioDefinitionSchema`, `ChamberLabScenarioDefinition`, `scenarioKey`, `parseChamberLabScenario`, `assertChamberLabCatalogue`, `canOpenScenarioOnLane`, `chamberLabFixtureOverlayKindSchema`, `acceptedFiniteWorkOverlaySchema`, `ownedItemOverlaySchema`, `dueDecisionBoundaryOverlaySchema`, `chamberLabFixtureOverlaySchema`, `ChamberLabFixtureOverlay`, `chamberLabFixtureRecipeSchema`, `ChamberLabFixtureRecipe`, `parseChamberLabFixtureRecipe`, `labRunLifecycleSchema`, `LabRunLifecycle`, `labStepCommandKindSchema`, `LabStepCommandKind`, `labFaultCutPointSchema`, `LabFaultCutPoint`, `labFaultPlanSchema`, `LabFaultPlan`, `parseLabFaultPlan`, `labStepCommandSchema`, `LabStepCommand`, `labStepRequestSchema`, `LabStepRequest`, `parseLabStepRequest`, `labObservationDomainSchema`, `LabObservationDomain`, `labObservationConsistencySchema`, `labFacetObservationSchema`, `labObservationSchema`, `LabObservation`, `labSemanticChangeSchema`, `labPreventedEffectSchema`, `labSemanticDeltaSchema`, `LabSemanticDelta`, `labAssertionResultSchema`, `LabAssertionResult`, `parseLabObservation`, `parseLabSemanticDelta`, `labEvidenceAuthoritySchema`, `LabEvidenceAuthority`, `labEvidenceArtifactRefSchema`, `LabEvidenceArtifactRef`, `labRunEvidenceCapsuleSchema`, `LabRunEvidenceCapsule`, `parseLabRunEvidenceCapsule`, `qaLabBindingKindSchema`, `QaLabBindingKind`, `qaLabStageBindingSchema`, `QaLabStageBinding`, `parseQaLabStageBinding`, `qaLabCatalogueEntrySchema`, `QaLabCatalogueEntry`
- Existing tests: `packages/contracts/test/chamber-lab.test.ts`

| Consumer | Lines |
|---|---|
| `packages/lab-support/src/chamber-lab-catalog.ts` | 8 |
| `packages/lab-support/src/lab/fixture-specimens.ts` | 10 |
| `packages/lab-support/src/lab/qa-lab-bridge.ts` | 11 |
| `packages/lab-support/src/lab/mechanics-coverage.ts` | 8 |
| `packages/lab-support/src/lab/packet-lab.ts` | 10 |
| `packages/lab-support/src/lab/lab-run.ts` | 13,34 |
| `packages/lab-support/src/lab/lab-faults.ts` | 10 |
| `packages/lab-support/src/lab/lab-evidence.ts` | 15 |
| `packages/lab-support/src/lab/lab-workbench-service.ts` | 10 |
| `packages/lab-support/src/lab/replay-compare.ts` | 9 |
| `packages/lab-support/src/lab/lab-observation.ts` | 13 |

## live-evaluation
- Source: `packages/contracts/src/live-evaluation.ts` → `packages/lab-support/src/interfaces/live-evaluation.ts`
- Import: `@offscreen/lab-support/interfaces/live-evaluation`
- Current imports: `zod`
- Exports: `liveEvaluationRecipeSchema`, `LiveEvaluationRecipe`, `evaluationPacketConfigSchema`, `EvaluationPacketConfig`, `memoryEvaluationRecipeSchema`, `memoryEvaluationPacketConfigSchema`, `MemoryEvaluationPacketConfig`, `memoryEvaluationManifestSchema`, `MemoryEvaluationManifest`, `evaluationPacketInspectionSchema`, `liveEvaluationManifestSchema`, `LiveEvaluationManifest`, `liveComparisonDimensionSchema`, `LiveComparisonDimension`, `liveComparisonCandidateSchema`, `LiveComparisonCandidate`, `liveComparisonStopPolicySchema`, `humanReviewWorksheetSchema`, `HumanReviewWorksheet`, `liveComparisonTrialManifestSchema`, `LiveComparisonTrialManifest`
- Existing tests: no dedicated test file in old package

| Consumer | Lines |
|---|---|
| `packages/lab-support/src/live-comparison.ts` | 15 |
| `packages/lab-support/src/live-evaluation.ts` | 8 |
| `tools/api-integration/legacy-engine-tests/live-evaluation.test.mjs` | 10 |
| `tools/chamber/src/memory-evaluation-run.ts` | 12 |
| `tools/chamber/src/live-evaluation-run.ts` | 8 |
| `tools/chamber/src/evaluation-config.ts` | 8 |

## memory-evaluation
- Source: `packages/contracts/src/memory-evaluation.ts` → `packages/lab-support/src/interfaces/memory-evaluation.ts`
- Import: `relative internal`
- Current imports: `zod`
- Exports: `memoryQueryClassSchema`, `memoryOracleQuerySchema`, `longStoryMemoryCorpusSchema`, `LongStoryMemoryCorpus`, `MemoryOracleQuery`, `memoryEvaluationObservationSchema`, `memoryEvaluationStageSchema`, `memoryEvaluationReportSchema`, `memoryEvaluationSuiteReportSchema`, `MemoryEvaluationObservation`, `MemoryEvaluationReport`
- Existing tests: no dedicated test file in old package

| Consumer | Lines |
|---|---|
| `packages/lab-support/src/long-story-memory-corpus.ts` | 5 |
| `packages/lab-support/src/memory-evaluator.ts` | 8 |
| `packages/lab-support/src/creative-exploration-evaluator.ts` | 8 |

## creative-exploration-evaluation
- Source: `packages/contracts/src/creative-exploration-evaluation.ts` → `packages/lab-support/src/interfaces/creative-exploration-evaluation.ts`
- Import: `relative internal`
- Current imports: `zod`, `./creative-exploration.js`
- Exports: `creativeExplorationBenchmarkCaseSchema`, `creativeExplorationObservationSchema`, `creativeExplorationEvaluationReportSchema`, `CreativeExplorationBenchmarkCase`, `CreativeExplorationObservation`, `CreativeExplorationEvaluationReport`
- Existing tests: no dedicated test file in old package

| Consumer | Lines |
|---|---|
| `packages/lab-support/src/creative-exploration-evaluator.ts` | 7 |

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
