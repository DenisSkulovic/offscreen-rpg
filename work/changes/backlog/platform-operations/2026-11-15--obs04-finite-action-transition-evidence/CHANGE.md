# OBS04 | Capture one finite-action commit as typed historical evidence

**Composer microtask entry (2026-11-20):** [TASKS.md](TASKS.md) has the source-backed, bounded `T01…` route, normal and negative tests and explicit stop gates; [full open-backlog audit](../../COMPOSER-QUEUE-AUDIT-2026-11-20.md) explains priority/ownership. **Default Cursor parent and child: Composer 2.5 Standard.** Current delegation: verify existing SQL event and exact missing evidence before proposing migration. A planned `T-ID` is **not** selection, implementation, PASS or lifecycle promotion; this Change's existing state and authorization restrictions still govern. No Grok unless a newly identified, specifically owner-approved exception survives additional ChatGPT investigation.

**2026-11-18 executable decision:** [Backlog audit and acceptance](../../../designs/open/backlog-convergence-2026-11-18/README.md); [bounded contract choices](../../../designs/open/backlog-convergence-2026-11-18/CONTRACT-DECISIONS.md); [ordered Cursor handoff](../../../designs/open/backlog-convergence-2026-11-18/CURSOR-HANDOFF.md). The older Proposed/Blocked/No-code declarations retained below document the historical decision; they do not prohibit the **safe scoped implementation** now selected. External paid dispatch, nondisposable DB resets, production grants and irreversible accounting changes remain disallowed. A provider-free experiment that proves no new feature is needed must close with a source-backed positive alternative, not be parked again.

**State:** **OPEN; planner blocker removed by a narrow source-event witness decision (2026-11-20). T02–T06 implementation NOT RUN and not selected.** Existing T01 7/7 recorded at `ec73a535`, but typed before/after witness, migration, rollback, event/public one-to-one join and measured overhead are NOT proven. [Exact decision](DECISION-2026-11-20.md) rejects a second event stream or unowned evidence sequence; [bounded tasks](TASKS.md) are the implementation route. TURN02 is Done. This packet is not selected.

**Planner resolution (2026-11-20):** [Source-backed missing-fact matrix and V1 witness](DECISION-2026-11-20.md) settles the former "name the missing datum" T02 gate. The execution event already provides identity and the public source ID; the missing facts are typed interruption cause and immediate pre-/post-transition mechanical facts that disappear when mutable campaign/item state changes later. One additive **nullable JSONB witness on that existing terminal execution event**, finalized **after** same-TX follow-up/obligation writes, meets the first finite pilot. No second internal sequence or all-campaign diff. **No migration/test executed** by this planning pass. Older references to unratified E0 sequence below are historical alternatives, not a new requirement.

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

## Reconciliation ledger (T03 documentation slice)

| Affected selected claim/heading | Authority | Target delta | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/engine/chronology-and-activities.md (status list; OBS04 witness outside proof) | chronology-and-activities.md | unchanged: finite-action fixtures remain the listed offline tests; typed transition witness not claimed | T01 @ `ec73a535`; writers `settleActionExecution` / `recordActionExecutionEvent` / `appendPublicStoryEvent` | fixture-exercised + live-observed (disposable SQL) | Post-terminal rollback NOT-RUN; 1:1 public link not SQL-asserted; no `transitionSequence` / typed `changed[]` | N/A — sentence already true |
| E0 migration / `FiniteActionTransitionEvidenceV1` | this CHANGE.md | unchanged: pilot contract remains proposed | No migration run | NOT-RUN | Docs receipt is not a persisted event | TASKS.md T02/T03 |
