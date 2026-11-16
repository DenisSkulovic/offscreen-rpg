# OBS04 | Capture one finite-action commit as typed historical evidence

**State: Proposed, NOT Ready.** **Kind:** additive SQL-backed, source-transaction E0 evidence pilot for finite-action settle/interrupt, strict runtime types and provider-free tests. **Design authority:** [one-commit capture contract](../../../../evidence/inspections/obs-technical-essays-2026-11/committed-transition-capture-v1.md), [writer closure](../../../../evidence/runs/observability-program-2026-11-15/writer-closure-and-sequence-2026-11-15.md), [physical storage](../../../../evidence/inspections/obs-technical-essays-2026-11/physical-evidence-storage-v1.md), [failure protocol](../../../../evidence/inspections/obs-technical-essays-2026-11/capture-transaction-protocol.md). This Change is **not** a general historical replay engine, generic database audit system or data migration of every campaign.

## Cursor first screen

> **One outcome:** a newly settled or interrupted finite action produces exactly **one** durable, indexed, source-linked transition group in **the same SQL transaction** as existing authoritative receipt/event/time/state. On retry/rollback none duplicate; a read can show the original changed fields and source identity without relying on log verbosity or current mutable campaign JSON.
>
> **Sources:** `packages/application/src/campaign/action-executions.ts::settleActionExecution`, `campaign/action-execution-transition.ts`, `campaign/follow-up-intents.ts`, `campaign/holds.ts`, `stories/persistence.ts::lockStoryById`, `db/schema/campaign.ts::{gameActionExecution,gameActionExecutionEvent,gameActionReceipt,campaign}`, `stories/storyPublicEvent` and any actual writer called during these transitions. Source SHA must be rechecked at selection time.

## Preflight before editing

1. Verify current code and tests and the **whole actual reachable write chain** for action success vs interruption, including world obligations/holds, source passage and clock anchor. Confirm which source rows already hold each needed field.
2. Determine the **smallest real missing before/after values** that cannot be inferred from existing receipt/event and immutable settings records. Do **not** duplicate the entire plan, model context or all campaign JSON every time.
3. Measure baseline story lock hold/wait and SQL counts under a provider-disabled fixture; select max bounded E0 bytes and statement budget. Do not invent latency target from an imaginary 1000-player load.
4. Review one additive migration and compatibility rollback; preserve real source authority and current `story.viewVersion`. If physical schema differs or owner declines migration, keep packet Proposed.

## One bounded implementation

- A per-story **internal committed evidence sequence** row or field, allocated by the story writer under the existing story lock; it is **distinct from `story.revision`, `viewVersion` and GM05 public eventSequence**.
- A strict `FiniteActionTransitionEvidenceV1` (or tight physical equivalent), keyed by `(storyId,transitionSeq)` and unique same source execution/revision/outcome. The E0 event references real receipt/event/operation IDs, original rule/plan hash, code build and exact before/after *changed* fields and time/hold state.
- One domain-pure capture function that receives already validated `before` state and actual transition result **inside current transaction**. No remote CAS, KMS, OTLP or model call while story row locked.
- One insert of the compact evidence (plus optional bounded child source refs) **before SQL commit**. Evidence rollback and mechanic rollback are one event, not two eventual reconciliations.
- When action waits or duplicate Temporal delivery produces no new factual outcome, **no new sequence**. When interrupted, capture exact cause/event with **no fake successful `gameActionReceipt`** and no hidden item transfer.
- Older pre-instrumentation stories get explicit `instrumentedFrom` and partial historic coverage. Do **not** mark the entire campaign history reconstructable after one transition is captured.
- A **read-only test projection** may show the changed keys/receipt linkage and coverage; do not add a production Admin raw JSON endpoint in this Change.

**No second source of gameplay truth.** Live commands still use existing `campaign`, `gameActionExecution` and `gameActionReceipt`. The forensic record is a co-committed witness for historical explanation.

## Falsifiable acceptance

| Scenario | Must prove |
| --- | --- |
| Normal accepted finite action settles with one receipt | One source receipt/event, one E0 transition group, correct actual time/effects before/after, no new Storyteller result |
| Required item changes holder before settlement | One committed interrupt event; **zero successful action receipts**; one E0 interrupted source, correct post-interrupt clock/hold and no transferred item |
| Controlling world obligation due at equality | Exact source world event/cause and no early productive effect, per current rule |
| Action still waiting | No new committed transition; no “earned” event from estimates |
| Duplicate worker wake / command replay | Original source/transition identity, no extra sequence/roll/effect |
| Two same-story settlers race | Same lock serializes; exactly one source/E0 result |
| Transaction fails after E0 insert or after source effect but before commit | No ghost evidence or half-applied effect |
| E0 storage failure | New settlement rolls back, existing accepted action remains addressable and recoverable with same identity; no fresh RNG success after an already committed prior effect |
| C2 pending narration G downstream | E0 source linked to one G/operation; later provider/publication don't increment settlement again |
| Current settings, character or story root changes later | Historical E0 retains original before/after values and source hashes, never reads today's mutable row as old |
| Legacy story before enable frontier | Exact old state marked uninstrumented, no invented genesis |
| Actor/other-story lookup | No source or artifact leak across owner/story scope |
| 0/250/2000ms CAS delay in downstream context | E0 SQL instrumentation does not cause additional CAS under story lock |

**Proof receipt:** source SHA, migration/rollback, focused tests/commands, captured redacted evidence fixture with stable IDs, before/after authoritative hash comparison, measured DB lock wait and hold p50/p95, extra SQL/WAL/index bytes, no provider HTTP and no accidental new story/public event semantics.

## Hard exclusions

No other game mutation family, not the entire `settleActivity` loop, no whole World/Storyteller publication refactor, no historical checkpoint worker, no player rewind, no new agent, no Kafka, no OTel deployment, no raw prompts, no paid model. If the physical schema pilot is too invasive under measured source conditions, stop and return a smaller alternative instead of implementing a generic event-sourcing framework.

**Ready gate:** explicit owner selection/authorization, source-wide actual writer coverage for this pilot, accepted bounded E0 schema/latency cost, disposable SQL/CAS/Temporal proof environment. The fact that this packet is Markdown does **not** make it Ready or Done.
