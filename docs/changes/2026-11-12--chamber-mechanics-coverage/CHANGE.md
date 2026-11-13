# Change CH15 | Mechanics coverage catalogue and truthful availability

> **Cursor first look:** [developer-tooling source map](../../../packages/application/src/developer-tools/README.md), [QA catalogue](../../../packages/application/src/developer-tools/qa-catalog.ts) and [target 8](../../engineering/targets/chamber-laboratory.md#8-mechanics-catalogue-and-evolution). **Source gap:** [H12/H14](../../engineering/audits/chamber-gap-2026-11-12.md#4-ranked-gaps). **Trap:** a listed or manually assessed case is not automatically an executable, successful scenario.

**State: Done** (2026-11-13). Owner authorized via continue after CH14. **Dependencies:** CH01–CH03, CH06, CH09, CH10 (Done). No combat/unsupported mechanics added.

**Evidence:** `lab/mechanics-coverage.ts`. Tests: `mechanics-coverage.test.mjs` 2/2. Normal: search `duplicate-settlement` / `item-transfer` resolves bench-policy runnables with owning sources. Negatives: interrupt mechanic blocked with reason; `automatedPassAllowed` always false.

## One bounded executable outcome

Implement a **cross-mechanic, per-lane coverage registry** mapping current game mechanics to real Bench/Sandbox/Connected/Packet scenario IDs, fixture versions, production owning symbols, available/blocked/planned states and evidence tier. Register a representative vertical pack for existing finite activity/time and item-transfer mechanics with executable scenarios, boundary conditions and invariant assertions. This Change does **not** add combat, inventory complexity or unsupported gameplay.

## Binding technical design

- Every coverage entry declares the real domain invariant, owning exported policy/use case, supported lanes, fixture, cheap proof, durable/worker proof where necessary, injected failure case and exact test anchor. A scenario that cannot run is `blocked/planned` with a reason; never silently construct a fake substitute game engine.
- Preserve `chamber.v1–v5` and current QA IDs; they remain source/historical identities, while new LabRun cases declare what they truly execute.
- Test representative equivalence classes and limited seeded properties, not a gigantic Cartesian matrix. A pure policy is not automatically proof of persisted time/reward accounting.
- New mechanics later extend this registry and relevant domain fixture, not the giant launcher or every React inspector component.

## Golden scenario design candidates (not all implemented by CH15)

These **six target experiments** represent different evidence boundaries. CH15 connects at least the first two available mechanics; other candidates remain **planned/blocked with exact reasons** until their real game owner supports them:

1. An accepted partial shift at 80% progress, early/late due boundary and wage earned **exactly once**.
2. Item handoff with a second identical submission and no duplicate transfer.
3. Pause/interrupt/block/resume a finite activity at a prerequisite change, **only if current mechanics support it**.
4. Same-tick player choice/default deadline collision, fenced against stale publication.
5. Duplicate finite action or worker completion with one persisted effect/receipt.
6. Nonhuman or alternate-calendar world with absent humanoid defaults and a consequential time boundary.

Do not treat the six as executable simply because they appear in the catalogue; each has a provenance, lane, valid minimal specimen and negative invariant.

## Acceptance

**Normal:** query “finite activity, duplicate settlement” or “item transfer, stale version” to obtain an actual runnable scenario at its truthful lane with owner/source and evidence reference.  
**Negative:** planned mechanic, unavailable fixture, unrun manual QA, mock assertion or nonexistent production policy cannot display as “automated passed”; a mutation of relevant production policy is detected in the scenario.  
**Proof:** pure catalogue/coverage tests plus one authorized real DB exercise for persisted claims; no blanket browser/worker startup. No provider calls.

**Cursor handoff:** CH01 catalogue + the two selected mechanics owners + this packet only. Return source/test diff, real negative proof and unsupported holes.
