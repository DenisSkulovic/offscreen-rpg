# OBS02-H | Same-G rearm/lease stage integrity, without phantom receipts

**State: Proposed, NOT Ready.** **Code-bearing candidate:** source-local SQL stage receipt hardening + provider-disabled disposable DB tests. **OBS02 original pilot is Done**; this is a separate residual integrity Change. **No paid model, production data, new Admin body access, E0 game state rewrite or OTel deployment authorized.**

**Authority:** [post-OBS02 source review](../../observability/evidence/obs02-stage-integrity-review-2026-11-15.md), [claim-quality contract](../../observability/technical/evidence-claims-and-quality-v1.md), [capture crash fences](../../observability/technical/capture-transaction-protocol.md). **Dependency:** C1-R same-G rearm Done; OBS02 real stage receipts Done. **Current change:** none until explicit owner selection.

## Cursor first screen

> **One outcome:** every real context-materialization attempt across **original epoch 0 and operator rearm epoch 1** is distinguishable. A losing worker cannot write a terminal stage when its capture lease CAS did not apply. A repeated stage key with *different source facts* is reported as integrity conflict, not silently discarded.
>
> **Exact owners:** `packages/application/src/storyteller/{capture-rearm,capture-materialization,execution-stages}.ts`, `packages/db/src/schema/storyteller.ts::{storytellerContextCapture,storytellerContextCaptureRearm,storytellerExecutionStage}`, [OBS02 actual evidence](../../observability/evidence/obs02-execution-stages-2026-11-15.md), [ENG03-C1-R](../2026-11-15--eng03-c1-provisional-recovery/CHANGE.md). Inspect current main and focused test files before changing code.

## 1. Preflight facts and scope

- Re-arm resets `materializationAttempts=0` and sets `rearmEpoch=1`, preserving G.
- Existing `context-materialization-started` stage key is attempt count only; terminal failure key is state+attempt only. **Epoch omitted**.
- `releaseCaptureFailure` records a terminal stage even if conditional `UPDATE...WHERE captureId AND leaseId` matches **zero rows**.
- Start stage occurs in a later autocommit INSERT after claim commits.
- `recordExecutionStage` silently ignores same-key conflicts, even if payload differs.
- `listExecutionStages` sorts only by millisecond timestamp.

These are source-level issues; no existing live incident or financial loss is claimed.

## 2. Narrow target delta

### A. Capture lease + atomic start record

Inside `claimCaptureLease` under the existing short transaction, return the **captured row's rearm epoch** and actual incremented attempt ordinal. Append `context-materialization-started` with idempotency identity including `(G,epoch,attempt)` **in that same transaction**. Only successful lease claim gets a start receipt. Do not make a second transaction, call DocumentStore or publish provider work here.

Use existing G and source capture ID. Worker lease/attempt metadata is authoritative; do not re-read current capture epoch later because another worker/rearm may have moved it.

### B. Terminal release fence

Change `releaseCaptureFailure`'s status UPDATE to `...WHERE captureId AND leaseId RETURNING ...` in a **single short transaction**. Only a row actually updated may emit `stage-held/stage-failed`, with exactly that recorded resulting state and source failure code. A loser must not claim G was held/stale; return an explicit `lease-lost/not-applied` result to the caller if API change is necessary.

Key terminal receipts by `(G,epoch,attempt,state)`. Do not use a random new UUID/notice key to create duplicate terminal outcomes for one attempt. A stale worker failure may have a separate **non-authoritative diagnostic** classification only if actually needed and safely retained; it cannot be a controlling state receipt.

### C. Duplicate-content integrity

At `recordExecutionStage` boundary:
- Existing matching row and **same normalized substantive fields** = identical retry; return/accept no-op.
- Same key with different `outcome,attemptId,sourceKind,sourceId,sourceSha256,failureClass,operationId,producerBuildId` = **integrity conflict**; do not overwrite original.
- Random row `id` and `createdAt` are excluded from matching.
- If a conflict occurs during a critical business SQL transaction, fail the **new invalid write** safely; do not partially commit a contradictory stage. If a source already committed from a prior transaction, record a bounded incident without corrupting it.
- Do not print raw task JSON or player content in logs; safe error code and source identity only.

No new generic audit subsystem; existing table/unique key may be sufficient, with a narrow application SQL helper. Review actual current runtime call sites that pass `database.db` vs `tx` before altering helper type.

### D. Stable read order, honest causality

Use a stable secondary ordering key for tied `createdAt` rows so pagination/inspection is repeatable; preserve exact source/epoch/attempt as actual causal ordering where known. **Do not** claim UUID tie-break reveals real execution order, nor assign a fabricated globally monotonic time to unrelated work.

Legacy OBS02 rows without epoch may remain visible as `legacy-identity/unknown-epoch`; do not rewrite or erase them. At most one V1 operator rearm epoch is supported by existing C1-R; no change to its permission, audit or maximum attempts.

## 3. Provider-free negative cases

| Test | Expected |
| --- | --- |
| Epoch 0 start attempts 1,2,3; hold; authorized same-G rearm | Epoch 1 start 1,2,3 retained as **distinct** real stage receipts |
| Exhaust both epochs | Separate `held` receipts with real epoch/attempt source, no false overwrites |
| Worker A lease expires; B claims; A releases terminal failure | A's source UPDATE matches zero; **no authoritative failure stage** and B unchanged |
| Crash after claim commits, before any off-lock CAS | Start receipt already co-committed; attempt owner/epoch visible |
| Two workers attempt same claim | One lease and one start stage; loser emits no authoritative stage |
| Duplicate same identity with equal substantive fields | Exactly one row/no conflict |
| Duplicate same identity with different failureClass/sourceSHA/outcome | Explicit conflict, preserved first source, no silent discard |
| Failed transaction / rollback | No committed capture or stage without the other when designed atomic |
| Successful Stage2 promotion | Existing same-G `context-materialization-completed`/task/outbox one time, still works |
| Original held before rearm | Player `canRetry=false`, operator-only recovery unchanged |
| Other capture purposes pending/C1/C2 and legacy versions | Identical mechanics, stage data and retry ownership |
| Time-tied stages | Stable UI ordering, no false “A causally preceded B” assertion |
| Inject 2s DocumentStore delay | No external I/O moved into story lock; actual lock/wait baseline unchanged beyond compact SQL |
| Provider disabled | No HTTP, no model attempt and no paid charge |

**Proof receipt:** source SHA, focused unit + disposable SQL commands/results, one redacted G timeline across two epochs, tested stale-lease no-match and divergent-key conflict, same-G/one-hold/zero-provider assertions, incremental lock-cost measurements. Don't mark Done with only an equality unit test that never exercises real lease takeover.

## 4. Hard exclusions and Ready gate

No new Staff privilege, raw prompt archive, task type change, Stream/Temporal rewrite, second story/event sequence, generic event sourcing, player controls or full history backfill. **No automatic code authorization from this Markdown.**

**Ready only when:** owner selects this exact residual, latest source symbols checked, source-aware lease/transaction proof prepared, test DB explicitly disposable, no conflicting Cursor Change active. This correctness hardening should be considered before using OBS02 as a *complete* cross-epoch Admin execution timeline.
