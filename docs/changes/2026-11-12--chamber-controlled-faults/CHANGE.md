# Change CH08 | Deterministic failure cut points and interleaving injection

> **Cursor start:** [application developer tools](../../../packages/application/src/developer-tools/README.md) `createChamber.controlStoryteller` (already arm-hold/arm-failure/release) → [story transaction owners](../../../packages/application/src/stories/README.md) and outbox. **Target:** [C05/C07/C08/C16](../../engineering/targets/chamber-laboratory.md#11-verifiable-acceptance-c01c16); [protocol 5](../../technical/chamber-lab-protocol.md#5-fault-cut-points), [audit H05](../../engineering/audits/chamber-gap-2026-11-12.md#4-ranked-gaps). **Trap:** fake callback counts do not establish a persisted exactly-once effect.

**State:** Specified/Proposed, no code authorization. **Depends on:** CH05, CH06, CH07. **Source baseline:** `470a5df`.

## One executable outcome

A scoped, named `FaultPlan` adapter for at least three **real protocol seams**: after DB commit before HTTP ACK; duplicate the same outbox/operation delivery; late due-boundary or held Storyteller consequence. A typed plan names fault ID, run, target operation, trigger count, arm/disarm and expected observation. No global chaos switch.

## Exact design and constraints

- Inject only through **test-only local composition**; normal Nest API must never register these controls. Reuse existing `arm-hold`/`arm-failure` and stored operation identity, don't emulate provider success or invent external idempotency.
- Faults do not change game rules. A lost ACK cannot undo a commit; same-ID/same-payload replay must read/admit idempotently, different body must conflict. Observe the DB and current projection.
- Run cleanup always disarms faults and closes held resources. A scheduled fault for run A must not affect B, another story or a normal browser.
- Script timing as *named domain events*, not arbitrary sleeps, and keep request order/seed in the replay recipe. No paid provider calls.

## Falsifiable proof

**Normal:** one scenario reliably recreates committed-but-unacknowledged intent and one duplicate delivery; trace explains receipt and still exactly one effect.  
**Negative:** change body under same operation conflicts, faults cannot trigger from another run, forgotten disarm is caught and a GET never dispatches paid generation.  
**Check:** controlled fake-adapter unit tests plus **explicitly authorized** real isolated DB/outbox test, not full player browser unless needed.

**Handoff:** reuse current controls and one real outbox/commit seam; do not add a new message broker, durable scheduler or unsupported game mechanics.
