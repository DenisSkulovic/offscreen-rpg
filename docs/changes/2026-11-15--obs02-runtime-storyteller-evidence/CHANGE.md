# OBS02 | Emit one real, durable, redacted Storyteller stage history for a G

**State: Proposed, not Ready.** **Kind:** bounded backend instrumentation + additive small SQL stage receipt if justified, focused provider-free tests. **No raw prompt archive, model spend or Admin workbench UI.** **Dependency:** OBS01 source-linked operation coverage is recommended first, but a targeted packet can be separately authorized after verifying no duplicate work. **Design authority:** [SA01 redacted fixture trace](../../storyteller-architecture/evidence/sa01-operation-trace-sample-2026-11-14.md), [execution source map](../../observability/technical/storyteller-prompt-source-map-v1.md), [typed evidence model](../../observability/technical/evidence-model.md), [crash protocol](../../observability/technical/capture-transaction-protocol.md).

## Cursor first screen

> **Goal:** an actual provider-disabled `storyteller.profiled.v1` consequence G, when executed by the real application/worker, leaves enough durable **source-linked stage evidence** for an Admin read model to explain what ran, what did not run, which task/receipt and publication it belonged to, and where it failed. A lab-generated SA01 fixture or recomputation from current code is **not proof of a live trace**.
>
> **Observe existing source before editing:** `packages/application/src/storyteller/{records,execution,capture-materialization,context-capture,publication,budget,dispatch-review}.ts`, `packages/db/src/schema/{storyteller,generations}.ts`, `apps/worker/src/activities/index.ts`, `packages/storyteller/src/providers/operation-trace.ts`, actual SA01 evidence file. Reuse `generationId`, `operationId`, `attemptId` and persisted packet SHA; do not create second G or random new accepted command identity.

## Why a read-only synthetic timeline is insufficient

Today SA01 produces a rich **redacted fixture/lab** trace but its evidence document explicitly says runtime `createStorytellerExecution`/`runMemoryExploration`/`publishStorytellerResult` do **not** emit it. Existing SQL states are useful but can overwrite intermediate state/lease history and may not preserve *why* a stage was skipped. A “Trace Builder” called at the end with guessed timestamps/state transitions would fabricate historical precision.

**Selected V1 principle:** persist **tiny, typed stage receipts at real stage boundaries**, linking to already durable generation/attempt/source records. Build the human trace graph **later** from those receipts + existing SQL. Do not store another full task/packet body in each stage.

## One purpose, one bounded implementation

**Pilot:** one Storyteller **committed action consequence**, including a scripted successful/failed path, plus a provisional capture held-before-provider negative. Use the same-G ENG03 C1/C2 source pattern but don't redesign it. Other task purposes, live memory agent rounds and paid dispatch remain future additions.

### Stage receipt sketch

~~~text
storyteller_execution_stage_v1 (
  id UUID,
  generation_id UUID NOT NULL,
  operation_id UUID NULL,
  attempt_id UUID NULL,
  stage TEXT CLOSED:
    cause-captured | context-materialization-started |
    context-materialization-completed | task-prepared |
    dispatch-review-prepared | provider-dispatch-possible |
    model-response-recorded | validation-settled |
    publication-decided | stage-held | stage-skipped | stage-failed,
  outcome TEXT CLOSED: completed|failed|held|stale|uncertain|not-run,
  source_kind TEXT CLOSED,
  source_id TEXT NULL,
  source_sha256 TEXT NULL,
  failure_class TEXT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  producer_build_id TEXT NOT NULL,
  UNIQUE(generation_id, stage, idempotency_key)
)
~~~

**Not approved DDL.** Before migration inspect existing source timestamps/state/event tables and avoid storing a redundant receipt for a stage whose exact entry/exit is already durably recorded and linkable. If one compact typed table is genuinely needed, add one additive migration with rollback and small indexes, not a second general event-sourcing platform.

**Storage authority:** a receipt associated with a SQL game/generation state change must be written in that **same** transaction; if the old transaction rolls back, no “task was prepared” receipt survives. For a pure non-mutating operation, one bounded record can follow successful source validation. No remote store calls while holding story `FOR UPDATE`. A stage write that fails at a mandatory boundary rolls back the new transition where feasible; optional telemetry can fail without changing gameplay.

### Timeline semantics, exact truth

- `cause-captured` ≠ game action succeeded. A pending consequence is still private until settled.
- `task-prepared` ≠ provider dispatch; `dispatch-review-prepared` may be held or rejected without a request.
- `provider-dispatch-possible` ≠ provider actually billed or received packet. Keep existing `storytellerAttempt` uncertain semantics and reported usage from budget.
- `validation-settled` ≠ published scene; stale publication remains a real, source-linked refusal.
- `stage-skipped` must have an actual reason (e.g. mode scripted or capture held), not be inferred from absence of a trace row; missing stage record can mean **unknown**, never “not run.”
- Duplicate outbox/workflow delivery links to previous G/cause; receipt uniqueness prevents duplicate stage event; no extra roll/time/attempt.
- Source SHA/version and E1 protected packet custody remain referenced from existing `storytellerDispatchReview` and `generation.input`. Full packet access/expiry are **out of scope**.
- Stage and outcome vocab must reuse SA01 semantic categories where compatible; no fake nested tools/agent loop on one-shot.

**Use existing SA01 output as a *presentation adapter*** once real stage evidence is persisted. The current `createStorytellerOperationTrace` may generate random span IDs; these must not become the durable source IDs of repeated reads. Create stable event refs or persist span IDs once and link to record. No post-hoc false timestamps or token/cost values.

## Bounded integration and acceptance

| Scenario | Expected persistent evidence |
| --- | --- |
| Normal scripted consequence G after an accepted action | True cause→task→validation→publication source stages, zero provider dispatch, same G and one published passage |
| Provisional G captured but CAS unavailable | Captured/held with same G; **no fabricated task promotion/model stage** |
| Scripted source fails validation | Actual invalid output stage + source failure, no published scene |
| Generation succeeded but publication source stale | Saved candidate/result, stale publication stage and no scene update |
| Activity/outbox delivered twice | One source operation/G; no duplicate stages, receipt, roll or new paid attempt |
| Story lock/CAS injected 0,250,2000ms | No new remote I/O or material lock amplification from stage recording |
| Missing stage receipt due to pre-instrumentation legacy | Explicit `unrecorded` coverage in Admin, not plausible fake sequence |
| Different owner/campaign/G | No cross-scope stage data exposure; stage schema contains no narrative text |
| Provider disabled and `scripted` execution | No external network/provider usage; no zero-cost assertion for unrelated failed real attempt |
| SA01 fixture traces | Continue passing; no accidental change of their private/public field schema |

**Test receipt:** source SHA, added/changed files, actual commands/results, one redacted persisted stage timeline with real IDs and recorded at-stage timestamps, explicit unknowns, negative gate test, p50/p95 incremental SQL latency and max rows per G. No claim of production reliability from provider-free fixture.

## Stop rules and dependencies

- Do not implement OTel collector, Grafana, raw provider body retention, full multi-purpose archive, AB-test platform, E0 game state ledger, replay UI, new capability grants or paid tests inside OBS02.
- No second source of gameplay authority; `generation`/`storytellerPublication`/`storytellerAttempt` still own status and charge truth.
- If a writer cannot co-commit stage evidence safely without another story lock or a high-write stream, stop and return its exact source symbol/cost to design.
- If code has changed so SA01 live instrumentation now exists on current main, cancel duplicate work and do a narrower audit.

**Ready only after:** explicit owner code authorization, latest source recheck, selected pilot purpose, additive schema/measurement acceptance, no conflicting ENG03/SA implementation active, and provider-disabled disposable verification plan. **Current change remains none** until then.
