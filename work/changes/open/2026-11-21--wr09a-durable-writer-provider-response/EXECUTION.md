# WR09A | decided implementation and state transitions

## 1. Provider preflight, exact TypeScript API

In `packages/storyteller/src/providers/writer-round-transport.ts`:
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
`preflight` synchronously checks nonblank `apiKey` and existing `validateWireAgainstPolicy` (self-consistent SHA, exact model/provider.only, no fallback, maxTokens), returning no secret. `invoke` checks preflight again immediately before fetch and sends exact frozen `capturedWire.serialized` with `authorization: Bearer <apiKey>` in header only; no default/test placeholder. If preflight fails, return existing `failed,sent:false` structure (zero usage, wire_rejected) with zero fetch. Existing `createWriterRoundTransport` remains a callable thin wrapper over prepared invoke, **but now requires injected `apiKey`**; update six existing tests. Strict custody accepts only `PreparedWriterRoundTransport`, not arbitrary naked callback.

## 2. Schema and private CAS

Migration `0023_wr09a_writer_response_object.sql`: nullable `response_object_hash` on `storyteller_writer_step`; CHECK null or lowercase SHA256, no separate index/unique. Update Drizzle field `responseObjectHash` and journal idx 23/version 7/breakpoints convention, after existing 0022. Do not edit historical steps or alter `resultCasHash`. Add `story-engine/src/storyteller/writer-provider-response.ts`:
- writer: accept exact identity `{missionId,contextId,ordinal,attemptId,requestSha256}` + raw body, compute `responseSha256=SHA256(utf8 raw)`, reject exceeding existing maximumStoredObjectBytes **after canonicalization**, construct `CanonicalStructuredDocument` with private noncanonical lore envelope `documentId=attemptId`, `schemaId='writer-provider-response.v1'`; call `storage.putStructuredDocument`; immediately `readStructuredDocument` and validate schema, exact IDs/hashes, raw-body digest; return the CAS object hash.
- reader: accept CAS pointer and exact expected identity+raw digest, use `readStructuredDocument` and strict validation; return original `serializedResponse` **only after** every comparison. No owner data/contents in errors/telemetry.

## 3. One shared budget state machine, not a new one

Define `SettleInput` as the **exact** current parameters of `createStorytellerBudget(database).settle`, including `generationOutcome`, `operationOutcome`, `recoveryFence`. Extract the entire existing SQL callback body, preserving lock order/window and audit operations, into `settleStorytellerAttemptInTransaction(tx:Transaction,input:SettleInput):Promise<void|'already-applied'>`. The current `budget.settle(input)` becomes `database.db.transaction(tx => settleStorytellerAttemptInTransaction(tx,input))`. No duplication/changed accounting formula, no nested DB transactions, no new funding tables.

Extract the **existing initial SQL plan** of `advanceWriterMissionProviderStep` to a private `planWriterProviderStepInTransaction(tx,input)` shared by scripted and strict paths. It retains `lockWriterContextStep`, `reserveWriterMissionProviderAttempt`, `markWriterMissionDispatched`, revision checks, existing return states and mission/child transitions. The scripted path calls it under current transaction wrapper. Strict path adds the advisory pre-lock (next section). Do not fork or rewrite reserve calculations.

## 4. Strict custody sequence, exact no-double-send rules

`advanceDurableWriterMissionProviderStep(database,storage,input,transport)`, `input` requires `providerPolicy` and `expectedWireSha256`. Existing `AdvanceWriterMissionProviderStepResult` union is retained.

1. Read the current step **without mutation** to decide state. If strict pointer+terminal state, call `readDurableWriterMissionResponse`, return `replayed` without checking credential or calling provider. If `dispatched|uncertain`, preserve possibly-sent liability and return uncertain, never preflight or resend. If `attempt-reserved`, require new credential preflight before first dispatch; no credential means held response but **do not release/delete reserved attempt**. If `model-request-prepared`, preflight before any new attempt reservation; invalid key/wire => held, no attempt/fetch. For any other held/failed state preserve existing no-send behavior.
2. Preflight ready SHA must equal `expectedWireSha256` and on locked step equal `requestCasHash`, and provider policy must match the preexisting pinned mission/attempt. A stale preliminary read cannot authorize a send: the SQL plan verifies revision and state under lock. Require nonblank secret and valid wire, no fallback.
3. Strict reserve/dispatch SQL transaction starts with **`SELECT pg_advisory_xact_lock(714092631)` as first SQL lock**, then invokes shared `planWriterProviderStepInTransaction`, verifies same mission/context/ordinal/attempt/request pin; commit possibly-dispatched state. This global advisory is the existing budget accounting lock, not a new lock family. The committed boundary is conservative: even a crash before actual HTTP call produces *possibly sent/uncertain*, never automatic re-dispatch.
4. Invoke `transport.invoke()` **once**. On `unknown`, thrown exception, timeout or wire/usage discrepancy after possible send: retain liability via existing `budget.uncertain` path, mark step/mission uncertain under existing state code. On retry, no second transport. On `failed,sent:false`: use existing `confirmUnsent` and hold step; no charge, no automatic reattempt after ambiguous recovery. On `failed,sent:true`: use the same atomic final transaction described below to settle actual reported usage and mark step failed/mission held, without response pointer.
5. On `delivered`, require exact wire hash and present usage/telemetry, privately `putStructuredDocument` and read back **before starting SQL**. If storage write/read fails after potential send: uncertain/held with reserved liability, no resend; no fake success or free-usage settlement.
6. Terminal SQL transaction starts with **advisory lock first**; call `settleStorytellerAttemptInTransaction(tx,{id:attemptId,execution,usage,telemetry,operationOutcome:'continue'})` using the existing attempt execution policy. **Only then** call `lockWriterContextStep(tx,...)` (mission+step), assert same attempt, revision, request hash, state `dispatched`, no pre-existing response pointer, `toolCallId IS NULL`; call `casWriterStep` to write `resultCasHash=SHA256(raw)`, `responseObjectHash=privateCASHash`, `state:'result-settled'`, then existing `markWriterContextActive`, all **within the same SQL TX**. On any mismatch or injected failure, throw and roll back funding, attempt, operation, windows, mission and step together. Do not do any CAS I/O while SQL locks are held. For known sent failed, same TX settlement followed by failed state/hold (pointer stays null).
7. Strict read requires SQL step in `result-settled|tools-applied|proposal-ready`, same attempt+request sha+model step, pointer nonnull, **same matching attempt state settled**, private CAS data+raw SHA verified. The read path **never invokes transport**, and may replay without present credential. Historical scripted steps with null pointer are not valid strict provider replay, but remain supported by existing scripted entrypoint.
8. Post-crash contract: before terminal SQL commit, orphan CAS private object is inert and step remains dispatched/uncertain; restart does not scan CAS to guess it belongs to an unsettled attempt. After commit, response pointer and charged attempt are durable together. Existing legacy scripted source/hash and WR04 child budget functions stay untouched.

**Hard stop:** cannot enforce advisory lock first for strict reserve and settle, cannot share existing budget SQL without copying business logic, observed original Writer mission mixing real/scripted strict modes, or new hidden lock inversion. Report exact function, conflicting lock order and minimal reproducer; do not bypass safety to claim test success.

## 5. Tests and ownership

T01 schema+CAS, T02 transport preflight, T03 shared budget/strict custody, T04 focused SQL injected-fake tests. See TASKS for 2–5 initial anchors. This Change edits no Writer-loop, Worker or old MA10 tests; all real provider sends are forbidden. Custodian later runs joined old P3B test after MA10 moves it.
