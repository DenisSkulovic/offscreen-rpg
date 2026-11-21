# WR09A | Crash-safe Writer response custody before live provider integration

**Status: READY FOR SOURCE-BOUNDED IMPLEMENTATION, subject to hard money/lock stops.** Baseline source: `6dd1276131a813f694ec3bccf4f9062ad3708208`, MA08 integrated, target `undertaking/storyteller-workshop`. This is the *first correctness stage* of WR09, not provider-enabled gameplay. **No real OpenRouter request, secret installation, funded account, production feature flag, protected SQL or main merge authorized.** Fake transport and disposable SQL only.

## Exact outcome

An actual provider-shaped Writer result can survive restart without a duplicate send, a duplicate charge, or loss of response bytes. For **new strict provider steps only**, keep the legacy raw `storyteller_writer_step.result_cas_hash=SHA256(serializedResponse)` but add a separate nullable `response_object_hash` pointing to immutable, private, hash-verified CAS body. The existing P3B scripted/legacy test behavior and all tool-summary hash semantics must remain unchanged.

Two new strict public functions in `packages/story-engine/src/storyteller/writer-mission-custody.ts`:
```ts
advanceDurableWriterMissionProviderStep(
 database: Database, storage: DocumentStore,
 input: AdvanceWriterMissionProviderStepInput & {
   providerPolicy: WriterRoundModelPolicy;
   expectedWireSha256: string;
 },
 transport: PreparedWriterRoundTransport
): Promise<AdvanceWriterMissionProviderStepResult>;

readDurableWriterMissionResponse(
 database: Database, storage: DocumentStore,
 input: {missionId:string;contextId?:string;ordinal:number;attemptId:string;requestSha256:string}
): Promise<string>;
```
Strict path requires a prepared, synchronously preflighted credential/wire and documented durable SQL/CAS. Legacy `advanceWriterMissionProviderStep` stays callable for scripted tests, **but is not an approved paid-provider entrypoint**. Do not wire Worker, launch, continuation, child research, or provider env/secret composition yet: those belong to WR09B.

## Immutable private response contract

SQL migration `0023_wr09a_writer_response_object.sql`, next journal idx 23, adds nullable `storyteller_writer_step.response_object_hash TEXT` with optional-null SHA256 CHECK. Does not rewrite historical rows or other tables.

`writer-provider-response.v1` is a `CanonicalStructuredDocument` stored using existing `DocumentStore.putStructuredDocument`: `format:'offscreen.structured-document.v1'`, `envelope:{documentId:attemptId(UUID),schemaVersion:1,revision:1,kind:'lore',authority:'noncanonical',visibility:'storyteller-private',sources:[]}`, `schemaId:'writer-provider-response.v1'`, `data:{missionId,contextId,ordinal,attemptId,requestSha256,responseSha256,serializedResponse}`. Read back and validate the CAS hash, schema, identity and SHA256 of exact response UTF8 bytes before accepting. The existing 1MiB Documents object limit applies; no response body goes to logs, public DTO, outbox or Temporal history.

## Preflight and atomicity

The provider adapter `@offscreen/storyteller/providers/writer-round-transport` exposes `prepareWriterRoundTransport({capturedWire,pinnedModelPolicy,outputSchema,apiKey,fetchImpl})`, returning `{preflight(): WriterRoundPreflight, invoke(): Promise<WriterRoundTransportResult>}`. Preflight synchronously verifies **nonblank credential**, self-consistent captured wire, exact model/provider/no-fallback/maxTokens and returns only `ready{wireSha256}` or `rejected{reason}`. Missing key/invalid wire must refuse **before new attempt reservation or possibly-sent transition**. Existing callable `createWriterRoundTransport` remains as thin compatibility wrapper, but also requires an injected key (six unit-test callsites updated, using fake fetch).

For strict reserved→dispatched and terminal delivery SQL transactions, acquire the existing **global budget advisory lock 714092631 as the first SQL lock** before any Writer mission/step/operation/funding rows. After the transport returns delivered, write/read back private CAS **outside SQL**; final SQL transaction reuses existing `budget.ts` settlement body via `settleStorytellerAttemptInTransaction(tx,input)` then CAS-updates the matching step pointer, raw SHA and state in **that same transaction**. Current public `createStorytellerBudget(...).settle(input)` remains a thin transaction wrapper over the same function, retaining recovery fence, all accounting, windows and locks. Crash before final commit: possible-send remains liable/uncertain, never resend; crash after commit: pointer+charge agree and exact same body replays, zero new send.

For `failed,sent:true`, usage settles and step moves to failed **atomically**. For `failed,sent:false`, preserve existing confirmUnsent financial release and no new provider attempt on ambiguous crash. No second accounting ledger, no eager automatic reconciliation and no retry after a possibly sent request.

## Exclusively owned source

`packages/db/src/schema/storyteller.ts`, `packages/db/migrations/0023_wr09a_writer_response_object.sql`, `packages/db/migrations/meta/_journal.json`; `packages/story-engine/src/storyteller/{budget,writer-mission-custody,writer-mission-store,writer-provider-response}.ts`; `packages/storyteller/src/providers/writer-round-transport.ts` and `packages/storyteller/test/writer-round-transport.test.ts`; one new `tools/api-integration/test/wr09a-provider-response-custody.integration.ts`. None of MA10's moved tests or manifest, none of MA11's module-graph tools, and no Worker/source capture edits. The integration custodian alone touches lockfile/catalog/undertaking docs.

## Acceptance / safety stop

Must prove fake delivery persisted once, original raw response SHA preserved, exact reply rehydrated without credential or new transport, invalid/missing/corrupt CAS denied, known sent failure charged+failed atomically, unknown possible-send remains uncertain/no resend, and injected fault between settlement accounting and step CAS rolls **both** back. Preserve existing P3B/WR04 tests at joined acceptance. If the existing transaction cannot be reused safely without altering financial math or lock order, **STOP with exact code evidence**. No paid network request authorized.

[Source map](SOURCE-MAP.md) · [decided algorithm](EXECUTION.md) · [bounded tasks](TASKS.md) · [proof](PROOF.md).
