# MA09 | inspectable runtime and SQL call-path map

Snapshot `e122d080` on undertaking; source-inspected and grep-confirmed, no SQL tests run by planner.

| Caller | Current callee and invariant | Port propagation |
| --- | --- | --- |
| `stories/index.ts:createStories` | `createStoryResolution(database,documentStore)` and `createConsequenceNarration` | bind `prepareStorytellerResolution` and `CampaignWriterCapturePort` once at outer engine composition; preserve all `createStories` external signatures |
| `stories/resolution.ts:createStoryResolution` | imports `../storyteller/admission`, invokes `createStoryResolutionCore` | remove import, require injected `PrepareStorytellerResolution`, existing `resolution-core.ts` untouched |
| `campaign/narration.ts:preparePendingActionNarration` | `capturePendingActionNarration(tx,current,...)`, updates `gameActionExecution.preparationGenerationId` | port captures under same tx before update |
| `campaign/narration.ts:createConsequenceNarration` | `materializePendingActionCapture` off-lock; under tx `lockStoryById`+receipt lock → `captureCommittedActionNarration` or `capture*ConsequenceNarration` → generation id + version; post-tx pending materialization | port methods must preserve separate off-lock materialization and transactional captures; no SQL schema changes |
| `campaign/reports.ts:requestHistoricalReport` | sourceKey read/compare, `captureHistoricalReport(tx,...)`, insert `campaignReport` | injected port capture under same tx, before report row insert |
| `campaign/narrative-intent-settlement.ts:settleNarrativeIntentExecution` | settle action and clock + `resolveWriterContinuationBases` + `scheduleWriterContinuation` under same tx | **one port method** `scheduleNarrativeContinuation(tx,current,settledCampaign,operationId)` combines both existing functions; never split into separate tx |
| `campaign/actions.ts:admitCampaignActionInTransaction` | `preparePendingActionNarration` inside active transaction; called by `createCampaignActions`, `admitPreapprovedWithdrawal` | pass port in already-present options and propagate to existing callers (incl deferred/preapproved) |
| `campaign/action-executions.ts` | `settleNarrativeIntentExecution`, `fireWorldObligations`, `applyCampaignFollowUpIntents` | pass same port from outer constructor to all transitives |
| `campaign/activities.ts` | `applyCampaignFollowUpIntents` and `fireWorldObligations` | pass port from constructor for both loop sites |
| `campaign/follow-up-intents.ts` | `requestActivityReport`, `requestConsequenceNarration` | pass port to historical report helper, leave pure durable request unchanged |
| `campaign/world-obligations.ts:fireWorldObligations` | `requestWorldObligationReport` | pass port into report helper |
| `campaign/{world-obligation-controls,action-execution-controls,activities,actions}.ts` constructors | invoked via `stories/index.ts` | accept optional existing options object + **required** port where capture is reachable; do not leave silent default |
| `storyteller/context-capture.ts` | functions `capturePendingActionNarration`, `captureCommittedActionNarration`, `captureActivityConsequenceNarration`, `captureWorldObligationConsequenceNarration`, `captureInterruptedActionNarration`, `captureHistoricalReport` | unchanged implementations; Writer adapter delegates |
| `storyteller/capture-materialization.ts` | `materializePendingActionCapture` | unchanged implementation; off-lock only |
| `storyteller/writer-continuation.ts` | `resolveWriterContinuationBases`, `scheduleWriterContinuation` | unchanged after WR09 stabilization, combined adapter callback |

**Direct-test legacy edges:** `packages/application/test/eng03-resolution-lock-measurement.live.test.mjs` directly constructs `createStoryResolution(database,delayed)` (three sites), requiring test-side binding of `prepareStorytellerResolution` via explicit port. `packages/application/test/eng03-t05-historical-report-capture.live.test.mjs` directly calls `requestActivityReport` and `requestWorldObligationReport` with sourceKey/staleness/failure probes; pass explicit Writer port in those helper invocations. Their eventual location changes in MA10, but do **not** move them while adjusting MA09 SQL behavior.

**Fundamental guard:** Story Authority runtime (excluding declared `stories/index.ts` composition adapter) must not import implementation `../storyteller/{admission,context-capture,capture-materialization,writer-continuation}`. Importing low-level contracts and Game schemas for validation is allowed; no blanket ban on all Storyteller grammar types.

**Coverage cap:** these are the four inspected direct implementation backedges. More domain cycles, including `campaign/action-executions ↔ campaign/narrative-intent-settlement`, are MA10 internal graph concerns, not permission to expand MA09.
