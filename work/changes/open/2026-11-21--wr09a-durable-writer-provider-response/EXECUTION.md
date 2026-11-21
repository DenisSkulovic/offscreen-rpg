# WR09A | design selection and state ordering

## New data contract
`response_object_hash text NULL CHECK (response_object_hash IS NULL OR response_object_hash ~ '^[0-9a-f]{64}$')` on `storyteller_writer_step`; migration 0023 and schema. Preserve existing `result_cas_hash` as raw SHA256 for **all old and new model results**, and as CAS hash for **tool summary rows** as before. Never repurpose it globally, because P3B and Writer tool replay depend on it. `responseObjectHash` is only for an actual delivered model response, never tool steps.

New structured CAS object `writer-provider-response.v1`: exact immutable IDs/pins + `serializedResponse`; private noncanonical lore envelope documentId is the attempt UUID; deterministic envelope means duplicate same-attempt/same-output writes deduplicate naturally. Reject size beyond Documents limit rather than truncate. Store before step's terminal settled state; validate read-back and digest.

## Strict adapter vs legacy shim
Keep `advanceWriterMissionProviderStep` behavior for existing scripted/P3B compatibility and tests; it is **not** an allowed production live Writer route and must be clearly marked legacy/test scope. Implement `advanceDurableWriterMissionProviderStep(database, storage, input, transport)` by extracting a shared internal custody state machine (reservation→dispatched→outcome) with an explicit injected **delivered-response persistence strategy**, NOT by copying and maintaining two independent implementations of reservation or accounting. Strict adapter chooses CAS-first/read-back/SQL pointer semantics for real providerPolicy; missing/invalid storage or pin rejects pre-send. Scripted path retains raw SHA and no object pointer. Keep existing attempt UUID, revision CAS and `createStorytellerBudget` ledger; do not mint another.

## Fail-safe transaction ordering
1. Validate strict credentials/policy (transport side) and store existence, expectedWireSha, real mode, bounded dimensions. Persist/verify frozen request before spend. Reserve existing funding and attempt; mark possibly-dispatched using existing SQL transaction and operation fence.
2. Send **once** through injected fake transport. On unknown outcome, keep uncertain and do not reset reservation. On pre-send failure, confirm unsent; on known sent failure, settle reported usage once and hold.
3. On delivered, validate exact wire digest and nonnegative usage/telemetry; put private structured response CAS; immediately read it back and verify SHA/schema and pinned IDs; bounded size. **Do not let raw prose into SQL, logs or Temporal state.**
4. **Atomically commit accounting and step response pointer in ONE PostgreSQL transaction.** Refactor `packages/story-engine/src/storyteller/budget.ts:createStorytellerBudget().settle` by extracting its existing pure-transaction body into reusable `settleInTransaction(tx,input)`; the old `settle(input)` simply invokes the same implementation within `database.db.transaction`, unchanged for existing callers. After private CAS put + verified read, the strict custody path opens one transaction, calls `settleInTransaction(tx,{ id:attemptId, execution, usage,telemetry,operationOutcome:'continue' })` FIRST (it acquires the existing funding/attempt advisory locks), then locks the matching Writer step, checks its attempt/revision/wire identity and `state==='dispatched'`, writes both `responseObjectHash` and legacy `resultCasHash` with `state:'result-settled'`, and updates mission/child activity within this same transaction. Any mismatch throws and rolls back **both** settlement and step. No nested transaction, no second ledger, no external CAS I/O under the SQL lock. Crash before commit: step/attempt remain dispatched (possible send), restart becomes uncertain/no resend, private orphan CAS harmless. Crash after commit: attempt settled and response pointer committed together, and strict reader can recover exact bytes. Never rerun provider transport on replay.
5. Strict replay reader uses pointer after settled state, not transport. On missing or inconsistent CAS, refuse and report held/unavailable; **do not** change attempt charge or automatically resend.
6. Inject `apiKey:string` into `createWriterRoundTransport`. Validate non-empty string without logging value. Do not introduce a default credential. Existing unit fixtures supply a disposable fake key and fake fetch only. No Worker wiring or environment secret change in WR09A.

**Not selected:** invent second provider-attempt ledger; change Story Authority tables; automatic resend for interrupted send; call a live endpoint; make exposed model response part of player records; place private objects into Shared Library. **Open live integration belongs to WR09B**.

**Hard stop / planner return:** if existing `budget.settle` cannot safely be reused with durable CAS+SQL step state, record specific attempt-state and transaction conflict and return to ChatGPT. Do not silently simulate atomicity or duplicate settle in a new helper. A ready change here is defined by no-double-send/charge safety, not by minimizing SQL phases.

## Revision 2: exact API and lock algorithm, replacing any ambiguous "strategy" wording above

**Source facts verified:** `writer-mission-custody.ts:advanceWriterMissionProviderStep` performs one SQL transaction for mission/step reserve→dispatch and then invokes `transport()`, calling `budget.settle` separately from `casWriterStep` on delivered. `budget.ts:createStorytellerBudget(...).settle` at ~619–918 validates usage and runs *exactly one* `database.db.transaction`; **every SQL statement inside it operates on the supplied `tx`**. `lockAllowance` locks global advisory key `714092631`, then funding FOR UPDATE, then run FOR UPDATE; next it locks attempt and operation. Writer reservation currently locks mission/step, operation, funding/run. Those orders can invert under concurrency.

### Decided TypeScript contracts (no new paid route)

**Transport provider module** `packages/storyteller/src/providers/writer-round-transport.ts`:
```ts
export type WriterRoundPreflight =
  | { kind: 'ready'; wireSha256: string }
  | { kind: 'rejected'; reason: 'credential_missing' | 'wire_rejected' };
export type PreparedWriterRoundTransport = Readonly<{
  preflight: () => WriterRoundPreflight;
  invoke: () => Promise<WriterRoundTransportResult>;
}>;
export function prepareWriterRoundTransport(input: {
  capturedWire: PreparedProviderWire;
  pinnedModelPolicy: WriterRoundModelPolicy;
  outputSchema: unknown;
  apiKey: string | undefined;
  fetchImpl: typeof fetch;
}): PreparedWriterRoundTransport;
```
`preflight()` is synchronous and checks a nonblank credential plus `validateWireAgainstPolicy` (including exact model/provider/no fallback/maxTokens and self-consistent hash), returning only reason/hash, never key. `invoke()` performs `preflight()` again immediately before fetch; if rejected, returns a `failed` `sent:false` with `wire_rejected` and zeroUsage/zeroTelemetry (no fetch), otherwise uses `authorization: 'Bearer ' + apiKey` only in HTTP headers. Do not place key in serialized wire, telemetry or return value. Keep old callable `createWriterRoundTransport` as a *thin wrapper around this prepared object* **but require apiKey in its input as well**, updating its six current unit-test call sites. The legacy callable API is still available to those tests; production strict custody must accept only `PreparedWriterRoundTransport`, never an arbitrary `() => transport` with no preflight.

**New strict custody** in `writer-mission-custody.ts`:
```ts
advanceDurableWriterMissionProviderStep(
 database: Database,
 storage: DocumentStore,
 input: AdvanceWriterMissionProviderStepInput & {
   providerPolicy: WriterRoundModelPolicy; expectedWireSha256: string;
 },
 transport: PreparedWriterRoundTransport
): Promise<AdvanceWriterMissionProviderStepResult>;
readDurableWriterMissionResponse(database: Database, storage: DocumentStore,
 input: {missionId:string; contextId?:string; ordinal:number; attemptId:string; requestSha256:string}
): Promise<string>;
```
The strict path calls `transport.preflight()` before **any new reservation or dispatch SQL**, and checks `ready.wireSha256 === input.expectedWireSha256 === step.requestCasHash` before send. On already-settled strict replay it checks linked pointer and reads exact private CAS **without requiring a current credential**. The current scripted `advanceWriterMissionProviderStep` retains its fake-callable mode and legacy `resultCasHash` semantics. Neither function changes the Writer loop/Worker.

### SQL transaction extraction, existing lock order

In `budget.ts`, introduce `type SettleInput` covering exactly the current `settle` arguments (including `generationOutcome`, `operationOutcome`, and `recoveryFence`); export `settleStorytellerAttemptInTransaction(tx: Transaction, input: SettleInput): Promise<void|'already-applied'>`. Lift lines from the **inside** of the existing `database.db.transaction(async(tx)=>{...})` into that helper unchanged, including validation, advisory/funding/run/attempt/operation locks, window debits, recovery fence and idempotency comparison; `createStorytellerBudget(database).settle(input)` calls `database.db.transaction(tx => settleStorytellerAttemptInTransaction(tx,input))`. No second implementation of charge arithmetic, no SQL migration to funding/attempt/run. Existing budget cases must prove identical before and after.

**Important lock-order decision:** strict Writer custody SQL transactions acquire the current global budget advisory lock `SELECT pg_advisory_xact_lock(714092631)` **as their first SQL lock**, *before* `lockWriterContextStep`/mission/operation/funding, in both reservation→dispatched and final-settlement transactions. Where shared reservation helper obtains funding/operation locks, do not add a second reversed lock path. On final delivery, call `settleStorytellerAttemptInTransaction(tx,...)` **before locking Writer mission/step** (the advisory is reentrant), then lock and validate matching attempt/context/ordinal/revision/state/request sha and CAS-write both hashes + state. This common advisory pre-lock serializes strict Writer transitions with the global budget settlement and prevents strict reserve (mission→funding) from deadlocking strict final settle (funding→mission). Existing legacy callers remain unchanged, are not eligible for strict real-mode on the same mission, and must not simultaneously use the same strict context/ordinal. No manual transaction nesting.

### Delivered outcome: exact state transition

1. Preflight sync before reservation. On rejection return `held` with `transportInvoked:false`, **zero new attempt**, no `dispatched` transition.
2. Acquire advisory first; lock Writer step; verify selected policy, model, request hash, ordinal and revision; use existing `reserveWriterMissionProviderAttempt` and `markWriterMissionDispatched` without changing funding amounts; commit. The send boundary is now possible; crash after this is liable/uncertain even if fetch never began.
3. Call `transport.invoke()` once. For `unknown` or thrown/timeout outcome, existing `budget.uncertain` keeps liability; retry sees dispatched/uncertain and **must not send**.
4. On valid delivered outcome with expected exact wire hash and usage, put `writer-provider-response.v1` private structured object, read back and verify all identity fields and raw response SHA. No CAS I/O while a DB transaction is open. Do not persist >1MiB, reject input/output hash mismatches.
5. Final SQL TX begins advisory lock first. Execute existing settle logic via `settleStorytellerAttemptInTransaction(tx,{ id:attemptId,execution,usage,telemetry,operationOutcome:'continue' })`; then lock Writer mission/step; demand step `dispatched`, same attempt, same request SHA and captured revision. CAS update `responseObjectHash`, legacy raw `resultCasHash`, `state:'result-settled'`, and mission/child state. If any check/update throws, **roll back accounting and pointer together**. No second provider send on retry.
6. On a known `failed,sent:true`, settle reported usage **in the same kind of SQL TX** with step `failed`/held; no response pointer required because there is no delivered payload. On `failed,sent:false`, existing `confirmUnsent` path releases liability and step held; if its committed state is temporarily inconsistent after crash, restart must refuse resend, recheck bound attempt, and reconcile unsent without charging. Do not turn a previously dispatched attempt into automatic new attempt.
7. Replay strictly requires linked CAS object **and** settled attempt, matching request hash, attemptId and raw digest. Missing pointer on a historical legacy scripted step is not a valid strict/provider replay; refuse without send. Missing/corrupt pointer on strict step means held/unavailable; preserve prior settled charge. Orphan CAS without committed SQL pointer is inert; restart remains dispatched/uncertain, never scans storage guessing a prior response.

**Stop condition retained and sharpened:** If original global account-advisory lock cannot be acquired first in both strict SQL transitions while preserving existing reservation semantics or existing global budget lock order, the executor reports the exact named conflicting function and **does not invent another lock hierarchy**. This is a real safety stop, not permission to relax cost fences.
