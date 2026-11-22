# MA09 | transaction-preserving algorithm, fully selected

## Phase 1: choose the structural port

`CampaignWriterCapturePort` is an immutable injected interface in `story-engine/src/campaign/writer-capture-port.ts`. It contains named methods, not generic `(kind:string,payload:unknown)`. Use explicit request structs from the current function signatures: `pending(tx,current,args): Promise<string>`; `committed(tx,current,receipt): Promise<string>`; `activityConsequence(tx,current,args): Promise<string>`; `worldObligationConsequence(tx,current,args): Promise<string>`; `interruptedConsequence(tx,current,args): Promise<string>`; `materializePending(database,operationId,documentStore?): Promise<{handled:boolean}>`; `historicalReport(tx,current,state,args): Promise<string>`; `scheduleNarrativeContinuation(tx,current,settledCampaign,operationId): Promise<void>`. The exact current capture method names and their argument interfaces are in `storyteller/context-capture.ts`; define neutral request types once in the campaign port rather than `import type` from Storyteller runtime. Retain strict discriminated receipt schemas where they currently parse. Only allow these callbacks in the already-authoritative call paths.

Use `createCampaignWriterCapturePort` in `storyteller/authority-writer-adapter.ts` to bind each method directly to its existing implementation. For continuation, resolve bases and schedule inside one callback with the caller's `tx`, `current`, `settledCampaign`, `operationId` (ownerId/controllingIntentOrReceiptId remain derived exactly as current). This is a pure wiring adapter, not a second transaction API.

## Phase 2: thread port through actual action ownership

`stories/index.ts:createStories` imports the adapter and `prepareStorytellerResolution` and creates the bridge once; passes to `createCampaignActions`, `createCampaignActionExecutions`, `createCampaignActivities`, `createActionExecutionControls`, `createWorldObligationControls`, `createConsequenceNarration`, and `createStoryResolution` as relevant. `createStoryResolution` takes explicit `prepare` after DB/store (no Writer default). In `campaign/actions.ts`, extend the last existing `options` object to include bridge for `admitCampaignActionInTransaction`; direct `admitPreapprovedWithdrawal` forwards bridge. In `campaign/action-executions.ts` and `activities.ts`, feed bridge into `settleNarrativeIntentExecution`, `fireWorldObligations`, `applyCampaignFollowUpIntents`; those feed `reports.ts` historical capture under existing tx. There is no module-global registration; a call missing the collaborator fails as configuration error before entering the transaction. Tests invoking raw helpers supply test adapter.

## Phase 3: keep original transaction and materialization boundaries

- Pending action: story lock and command receipt → `port.pending(tx,current,input)` → `preparationGenerationId` update; if capture fails, whole tx rolls back.
- Consequence: first off-lock `port.materializePending`, then existing story lock, receipt row `FOR UPDATE`, source/revision checks, `port.committed` or appropriate consequence method → generation relation + viewVersion; later optional post-commit materialization stays off-lock.
- History: existing report `sourceKey` equality/replay comparison → `port.historicalReport` → report row insert in same tx; if source mismatch throw without new report/charges.
- Narrative intent: clock/action settled + `port.scheduleNarrativeContinuation` within same tx; it retains existing Writer operation identity and wake, and its failure rolls back action transition.

**No SQL migration, no provider call, no new durable queue.** Keep notice operation IDs, story revisions, CAS hashes, source pins, research budgets, billing custody and error mapping unchanged. An implementation which moves any of these callbacks after transaction commit violates MA09 even if tests are green.

## Phase 4: boundary guard and tests

Add AST-scoped guard in existing module graph source checker for the 4 forbidden runtime backedges, excluding `stories/index.ts` allowed outer wiring and `storyteller/authority-writer-adapter.ts`. Synthetic one-line forbidden `campaign/reports.ts → storyteller/context-capture` fails; an allowed composition import passes. Existing SQL-focused tests for ENG03 report source, lock measurement and action replay must exercise callback adapter, not be stubbed into no-op. A test injected port throwing on historical report must rollback report row; injected port rejecting continuation must rollback action settlement and outbox; no provider expenditure. Capture materialization remains off-lock and no long DocumentStore read under `FOR UPDATE`. Reconcile docs, archive and integrate only after tests.
