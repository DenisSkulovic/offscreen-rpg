# Change CH05 | Controllable time and seeded entropy at real policy seams

> **Cursor start:** [story operations](../../../packages/application/src/stories/README.md) → `stories/persistence.ts:readDatabaseClockMs` and `campaign/clock.ts`; [developer tooling map](../../../packages/application/src/developer-tools/README.md). [Target C03/C05](../../engineering/targets/chamber-laboratory.md#11-verifiable-acceptance-c01c16); [protocol `4](../../technical/chamber-lab-protocol.md#4-time-and-randomness), [audit H06](../../engineering/audits/chamber-gap-2026-11-12.md#4-ranked-gaps).

**State:** Specified/Proposed. **Depends on:** CH02 and CH04. **Baseline:** `470a5df`.

## Outcome

Controlled, explicitly labeled time/entropy for Bench and a narrow persisted Sandbox seam. A developer can set a seed, freeze/advance to a logical due boundary, reproduce a deterministic draw and know **which clocks remain real**.

## Binding design

- Distinguish fictional `gameSecond`, PostgreSQL authoritative clock, worker/Temporal leases, test simulated clock and browser wall time. No global `Date.now()` patch or “one fake clock controls everything” claim.
- Implement a production-equivalent pure clock/entropy port only around actual policy operations. In Sandbox, a test-only clock adapter may replace specific boundary input only with equivalence proof; leave DB locking/transactions intact. Real DB-time collision tests stay Connected.
- Record draws, controlled time domain, resulting due/clock state and seed in observations. Rewind means checkpoint rematerialization and replay, not reversing committed effects.

## Proof

**Normal:** same valid specimen+seed+advancement yields same structural progress/time/draw and can advance a long fictional wait without a 20-second wall wait when the chosen pure boundary permits it.  
**Negative:** unsupported request to fast-forward Temporal/DB is refused or labeled uncontrolled; no idle time donation, negative time, nonmonotonic advance or hidden global random source.  
**Check:** pure time/seed tests plus authorized one guarded Sandbox assertion; no paid provider. **Preserve:** production clock semantics, game rules and current timed fixture behavior.

**Handoff:** inspect only named clock and call sites; return a precise stop report if production DB clock must remain real for the target assertion.
