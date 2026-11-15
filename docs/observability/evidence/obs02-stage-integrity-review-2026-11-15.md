# OBS02 stage-integrity review | Real receipts, but recovery can make them incomplete

**Source evidence:** GitHub `main@770774935cf2`, 2026-11-15, after Cursor implemented OBS02. **No runtime test or production data examined in this design review**. The original [OBS02 implementation](obs02-execution-stages-2026-11-15.md) is Done for its provider-disabled pilot; these are **additional source-based reliability findings**, not observed customer incidents. Proposed narrow hardening: [OBS02-H](../../changes/2026-11-15--obs02-h-stage-integrity/CHANGE.md).

## 1. What landed correctly

The repository now has `storyteller_execution_stage`, `recordExecutionStage` and `listExecutionStages`. This is **real runtime stage evidence**, not a generated SA01 fixture. Stages have a closed name/outcome/source taxonomy, real G/attempt references, no raw prompt text, an idempotent unique key on `(generationId,stage,idempotencyKey)` and tested normal scripted / exhausted-capture paths. Capture creation, successful promotion and publication can write a stage **inside the existing source transaction**.

Preserve this architecture. The following gaps concern **forensic integrity and recovery**, not a recommendation to abandon SQL stage receipts or rewrite gameplay.

## 2. Four concrete source findings

### A. Missing recovery epoch in stage identity

`capture-rearm.ts::rearmContextCapture` sets `rearmEpoch=1` and resets `materializationAttempts=0` on the **same G**. The subsequent materialization claim resumes at attempt 1.

But `capture-materialization.ts` uses:
- `context-materialization-started:ATTEMPT` for start receipts;
- `capture-terminal:STATE:ATTEMPT` for terminal held/failed receipts.

Neither contains the rearm epoch. `recordExecutionStage` uses `onConflictDoNothing` when the same `(G,stage,key)` already exists.

**Prediction:** epoch-1 attempt #1 can collide with epoch-0 attempt #1 and disappear from the forensic history. A second exhausted `held` at #3 can similarly disappear. The actual same-G recovery proceeds, but the Admin may falsely show that the second attempt never occurred.

**Required contract:** capture `epoch` inside the lease-claim transaction, return it alongside the lease, and form distinct `(G,stage,epoch,attempt)` identities for both start and terminal statuses. Preserve old rows as legacy, with unknown epoch when it cannot be proven; never relabel them retroactively.

### B. Failed stale-lease CAS may still create a terminal stage

`capture-materialization.ts::releaseCaptureFailure` calculates local terminal `state` and performs `database.db.update(storytellerContextCapture).where(captureId,leaseId)`. The code **does not check whether that conditional UPDATE actually matched** before calling `recordExecutionStage(database.db,...)`.

**Possible race:** worker A's lease expires; worker B acquires the capture. A computes “held/failed”, but its `UPDATE` matches zero rows because B now owns the lease. A then writes an authoritative-looking terminal stage **even though G did not transition to held/failed**.

**Required contract:** in one short DB transaction, attempt the fenced UPDATE with `RETURNING`; **only if the authoritative state changed** should that transaction append the corresponding stage receipt. A stale worker may record a separate `lease-lost observation` only if clearly typed as **non-authoritative**, not as a controlling held/failure transition. No remote CAS under lock.

### C. Start stage is written after the lease-claim transaction

`claimCaptureLease` commits `state=materializing` and increments attempts. `materializePendingActionCapture` subsequently calls `recordExecutionStage(database.db)` outside that transaction.

**Crash window:** lease claim committed, process dies before stage INSERT; a real materialization attempt exists without a start receipt. That is permissible **partial operational evidence** only if labelled honestly. For an exact stage history, co-commit the tiny start receipt inside the lease-claim transaction, with epoch/attempt identity.

### D. Conflicting same-key payload is silently discarded

`recordExecutionStage` calls `onConflictDoNothing`. A retry with the same key and *identical substantive fields* should be idempotent. A writer with the same key but different `outcome, sourceKind, sourceId/hash, attemptId or failureClass` is an **integrity conflict**, not an identical retry. Silent ignore can hide a changed failure cause or a key design bug.

**Required contract:** compare the existing row's stable semantic payload on conflict. Exact duplicate returns original ID/record; divergent payload raises/records a bounded integrity conflict without overwriting source. Exclude the random row ID/createdAt from equality. Never dump raw bodies to explain conflict.

## 3. Temporal ordering caution

`listExecutionStages` sorts only by `createdAt` with millisecond precision. Distinct stages can tie; some writers use separate transactions. Add a stable secondary display sort for repeatable pagination, but do **not** call it perfect causal order. Prefer actual `epoch/attempt`, source events and causal links where known; label wall-time ties as uncertain. A UUID tie-break gives stable display, **not proof of which writer ran first**.

The stage row's `producerBuildId` defaults to `OFFSCREEN_BUILD_ID` or `local-dev`; exact historical Git SHA is only proven where release identity was actually captured/configured. Source `sourceSha256` is optional; the stage may refer to a source without proving its body hash. Admin must expose these as distinct evidence-quality dimensions.

## 4. Mandatory proof matrix

| Fixture | Required result |
| --- | --- |
| Epoch-0 attempts 1–3, operator rearm, epoch-1 attempts 1–3 | Distinct start/failure receipts per actual attempt, one same G |
| Epoch-1 exhausted again | Second terminal receipt distinct, no hidden duplicate |
| Worker A lease expired, B owns current lease, A releases | No authoritative held/failed stage from A; B's capture state unchanged |
| Crash between claim and worker execution | Claim and start receipt co-commit, or visibly partial under an intentionally weaker policy |
| Duplicate same G/stage/key with same payload | Exactly one identical source receipt, safe no-op |
| Duplicate same G/stage/key with changed source/outcome | Detect conflict; don't silently mutate or suppress it |
| Success promotion races stale failure | Only real source transition recorded; no phantom conflicting stage |
| Historical pre-OBS02 G | `not-instrumented`/unknown coverage, never a synthesized completed trace |
| Same createdAt millisecond | Stable list ordering, exact causal order not falsely inferred |
| Full capture/lease path with 0/250/2000ms CAS injection | No new external work under story `FOR UPDATE`; model/provider disabled |
| Raw player text in source | No raw body emitted into stage table, support DTO or process logs |

**Disposition:** a narrow [OBS02-H](../../changes/2026-11-15--obs02-h-stage-integrity/CHANGE.md) should precede claims that OBS02 gives **complete** forensic history across same-G rearm/lease races. It does not need a full new event store. Source checks are strong but runtime manifestations remain unproven until targeted tests.
