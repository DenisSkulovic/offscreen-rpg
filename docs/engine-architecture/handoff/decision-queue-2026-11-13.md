# Cursor decision handoff | ENG09 → ENG03-M → GM05 / live presentation

**Status: architecture choices documented, 2026-11-13; owner selects code execution.** No active Change and no paid/disposable DB authorization implied. **This is the short starting point**, not a second full engineering specification.

## Settled choices and packet readiness

| Priority | Decision | Packet | What Cursor may do after explicit authorization |
| --- | --- | --- | --- |
| **1 | ENG09** | **One controlling `action-interrupted` consequence from item-holder mismatch**; no stale offer and no generic recovery button | [ENG09 code packet](../../changes/2026-11-13--eng-item-interruption-reentry/CHANGE.md) / [selected contract](../decisions/eng09-interrupted-action-consequence.md) | Same-TX fact + hold + consequence + one outbox, reuse existing generation and publication; **disposable SQL consent required** |
| **2 | ENG03-M** | **Measure 0/250/2000ms DocumentStore delay vs story lock/writer wait**, repeat short/long scene; full refactor conditional | [Measurement packet](../../changes/2026-11-13--eng03-lock-measurement/CHANGE.md) / [threshold and conditional capture DTO](../decisions/eng03-measurement-and-capture-contract.md) | Test-only provider-free instrumentation on disposable SQL after consent; no production pipeline rewrite |
| **3 | GM05** | **Per-story monotonic, player-visible committed event projection**, no model recap; GM06 later | [GM05 packet](../../changes/2026-11-13--gm-return-event-projection/CHANGE.md) / [taxonomy and cursor](../../experience/patterns/committed-event-feed.md) | Bounded additive derived public index + authorized paginated read; **schema/migration and disposable SQL consent required** |
| **3 independent | PW01** | **Optional published passage-bound appearance**, not generated in React | [Live wire packet](../../changes/2026-11-13--live-scene-presentation-wire/CHANGE.md) / [public projection contract](../../experience/system/live-presentation-projection.md) | Coordinate backend read-model owner; then strict authorized DTO + Play resolver/asset catalog, **no image/model generation** |

**Most practical order:** finish ENG09 gameplay integrity first. ENG03-M may be run independently while UX/frontend work proceeds, but do not let it seize the whole backend task queue. GM05 naturally follows source events and helps Journal. PW01 has no correctness dependency on GM05, yet needs a backend publication read-model owner and should not interfere with concurrent engine work. Do not combine ENG09 and PW01 in one source-changing PR.

**Formal Ready policy:** the documents select the design and make code scope reviewable, but `Ready` in this repo includes explicit **owner approval to start**. When owner authorizes one (and the relevant disposable DB/schema permissions), Cursor updates `docs/changes/README.md` `Current change: none` to the selected packet, marks that packet Ready and implements only it. Do not elevate all four automatically. If owner has already approved an exact bounded packet in the active conversation, use that approval rather than inventing more gates.

## Outstanding tracks deliberately not invented in this pass

- **ENG03 full refactor:** conditional on actual lock contention and an exact *physical* capture DTO mapped to source schemas, plus speculative-settlement and old-task tests. The provisional semantic DTO isn't a magical migration.
- **GM06:** per-viewer shared read acknowledgment *after* GM05 has stable sequence and explicit legacy coverage; list GET is never read acknowledgment.
- **GM04:** offer distinctness still needs a source-backed failed-persuasion fixture/rule; not a generic cooldown or model instruction with no enforcement.
- **GM01→GM02:** custom text needs bounded interpretation cost/clarification and exactly one supported admitted action family; cannot be slipped into this turn.
- **GM03, GM07:** one bounded standing routine and delegated-decision fallback require distinct explicit player consent/time policy; no generalized autoplay.
- **ENG06b:** hosted worker deployment/versioning is a later deployment choice. Local replay proof alone does not authorize a production rollout.
- **Account grant/usage, admin, pricing:** backend read-model and privileged action design separate; PF01–PF05 didn't create funding entitlements.
- **UX craft review:** real browser screenshots + human comprehension remain necessary; passing code tests do not establish beauty or playability.

## Tool/budget and side-effect policy

All packets are documentation only as written. Cursor may run provider-free unit tests without paid calls as permitted by selected task; any disposable SQL test must use a **known throwaway database** and owner-approved reset scope. Never use production, live model, real image generator or deploy. No new actor model, no second rule engine, no player-generated item grant, no invented unlimited free trial, and no client authority over committed story truth.

**Executor first read:** this handoff table → ONE selected Change → its exact design decision → relevant nearest source map → 2–5 named source symbols. Return actual evidence, not a copied checklist or self-awarded “Ready.”
