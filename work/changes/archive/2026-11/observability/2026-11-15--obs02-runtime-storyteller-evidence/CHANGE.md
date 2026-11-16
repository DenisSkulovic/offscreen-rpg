# OBS02 | Emit one real, durable, redacted Storyteller stage history for a G

**State: Done (2026-11-15).** **Kind:** bounded backend instrumentation + additive SQL stage receipt, focused provider-free tests. **No raw prompt archive, model spend or Admin workbench UI.** **Evidence:** [obs02](../../../../../../evidence/runs/observability-program-2026-11-15/obs02-execution-stages-2026-11-15.md). **Design authority:** [SA01 redacted fixture trace](../../../../../../evidence/inspections/doc01-legacy-snapshot/programs/storyteller/evidence/sa01-operation-trace-sample-2026-11-14.md), [execution source map](../../../../../../evidence/inspections/obs-technical-essays-2026-11/storyteller-prompt-source-map-v1.md), [typed evidence model](../../../../../../evidence/inspections/obs-technical-essays-2026-11/evidence-model.md), [crash protocol](../../../../../../evidence/inspections/obs-technical-essays-2026-11/capture-transaction-protocol.md).

## Cursor first screen

> **Goal:** an actual provider-disabled `storyteller.profiled.v1` consequence G, when executed by the real application/worker, leaves enough durable **source-linked stage evidence** for an Admin read model to explain what ran, what did not run, which task/receipt and publication it belonged to, and where it failed. A lab-generated SA01 fixture or recomputation from current code is **not proof of a live trace**.
>
> **Observe existing source before editing:** `packages/application/src/storyteller/{records,execution,capture-materialization,context-capture,publication,budget,dispatch-review}.ts`, `packages/db/src/schema/{storyteller,generations}.ts`, `apps/worker/src/activities/index.ts`, `packages/storyteller/src/providers/operation-trace.ts`, actual SA01 evidence file. Reuse `generationId`, `operationId`, `attemptId` and persisted packet SHA; do not create second G or random new accepted command identity.

## Why a read-only synthetic timeline is insufficient

Today SA01 produces a rich **redacted fixture/lab** trace but its evidence document explicitly says runtime `createStorytellerExecution`/`runMemoryExploration`/`publishStorytellerResult` do **not** emit it. Existing SQL states are useful but can overwrite intermediate state/lease history and may not preserve *why* a stage was skipped. A “Trace Builder” called at the end with guessed timestamps/state transitions would fabricate historical precision.

**Selected V1 principle:** persist **tiny, typed stage receipts at real stage boundaries**, linking to already durable generation/attempt/source records. Build the human trace graph **later** from those receipts + existing SQL. Do not store another full task/packet body in each stage.

## Landed implementation (pilot)

**Pilot:** committed-action consequence + scripted success path + provisional capture held-before-provider (CAS unavailable exhausted → held).

### Stage receipt

`storyteller_execution_stage` with closed stage/outcome/source_kind vocab, UNIQUE `(generation_id, stage, idempotency_key)`, index on `(generation_id, created_at)`. Writers: `execution-stages.ts`, context-capture, capture-materialization, scripted `execution.ts`, `setPublication`.

### Proven acceptance rows

| Scenario | Result |
| --- | --- |
| Normal scripted consequence G | cause→materialization→task→skipped-provider→validation→publication; same G |
| Provisional G held (document_store exhausted) | cause + materialization-started + stage-held; no task/model/publication |
| Duplicate complete / stage insert | one receipt per identity key |
| Stage schema | no narrative text |
| Provider disabled / scripted | no provider-dispatch / model-response stages |

### Deferred

- Full Admin S1 timeline projection UI
- Live memory / paid provider stage coverage
- Lock-latency p50/p95 instrumentation campaign (stage insert is local SQL only; no remote I/O under story lock for these writers)

## Stop rules honored

- No OTel, raw provider body retention, multi-purpose archive, E0 game ledger, replay UI, new capability grants or paid tests.
- `generation` / `storytellerPublication` / `storytellerAttempt` remain status and charge truth.
