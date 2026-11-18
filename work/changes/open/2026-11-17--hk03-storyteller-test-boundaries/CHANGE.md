# HK03 | Split the Storyteller integration giant by independently runnable invariants

**2026-11-18 executable decision:** [Backlog audit and acceptance](../../../designs/open/backlog-convergence-2026-11-18/README.md); [bounded contract choices](../../../designs/open/backlog-convergence-2026-11-18/CONTRACT-DECISIONS.md); [ordered Cursor handoff](../../../designs/open/backlog-convergence-2026-11-18/CURSOR-HANDOFF.md). The older Proposed/Blocked/No-code declarations retained below document the historical decision; they do not prohibit the **safe scoped implementation** now selected. External paid dispatch, nondisposable DB resets, production grants and irreversible accounting changes remain disallowed. A provider-free experiment that proves no new feature is needed must close with a source-backed positive alternative, not be parked again.

**State:** Ready for red-baseline-preserving test suite extraction (2026-11-18); QA-SF01 becoming green is NOT a prerequisite.

## Cursor first-screen brief

`tools/api-integration/test/storyteller.integration.ts` is **5,232 lines**, one top-level `test('profiled storyteller...')` with approximately **32 nested `await t.test` cases** under a long shared `withAppIntegration` setup. This is not 5,232 lines of dead code. Related large but separate files: `start-package.integration.ts` (2,392 lines) and `packages/storyteller/test/storyteller.test.ts` (3,293 lines). They are **out of scope** for this slice.

Read `tools/api-integration/package.json`, `test/helpers/app-integration.ts`, `test/helpers/attested-fake-provider.ts`, `test/storyteller.integration.ts`, and [QA-SF01](../../archive/2026-11/other/2026-11-15--qa-storyteller-integration-fixtures/CHANGE.md). The focused suite is 33 with 0 failures. Determine the current case inventory before moving cases.

## Pre-implementation design gate (do not skip)

1. Inventory every existing nested case: original name, covered invariant, fixture dependencies, DB/Temporal isolation, runtime setup and output cleanup. Produce a case-to-destination ledger; exact case count may change on HEAD.
2. Establish an honest local baseline of the existing focused suite, using only disposable resources and provider-disabled fakes; QA-SF01 is already blocked, so inherited failure must **not** be disguised as a regression or “fixed” by deleting a test.
3. Choose bounded decomposition that preserves shared-fixture semantics. Prefer coherent scenario modules/case factories if separate files would change transactional isolation or work ordering; do not create a generic abstract test framework.

## Implementation scope after gate

- Move one coherent family first (for example provider accounting/failure and recovery) to an owned test module or fixture-driven subgroup, preserving exact assertions and nested case names or a stable mapping.
- Make focused commands run this family deterministically and keep the original `test:storyteller` coverage. All smoke and integration scripts must still discover the same tests.
- Extract only genuinely common setup helpers; preserve per-run random UUIDs, client teardown, temp-store lifecycle, captured authority and no-paid-provider guarantees.
- No production application, DB migration or Storyteller contract changes; no changes to starting content merely to make fixtures pass.

## Proof / negatives

- **Normal:** original suite and new focused selector cover the same named cases; selected family can fail/rerun without re-running unrelated 5k-line test body. Record pre/post case counts and results.
- **Negative:** injecting a controlled failing assertion in moved family makes focused and full suites fail (never silently skipped); client teardown still occurs, and tests cannot reuse another run's UUID/credentials.
- **Operational:** provider mock is attested; no OpenRouter dispatch, external spend or non-disposable DB. Existing QA-SF01 baseline failures remain separately identified and unresolved until their own Change.
- **Review:** extraction yields less shared mutable state and shorter search surface, not five new files that collectively obscure a still-global setup.

## Reconciliation ledger

| Owner | Contract/behavior | Test proof | Documentation |
| --- | --- | --- | --- |
| API integration tests | same case coverage, deterministic isolation | pending | pending |
| QA-SF01 fixture baseline | inherited failures not masked | pending | pending |
| Test scripts/README | discoverable focused command | pending | pending |
| Housekeeping audit | record split and remaining giant | pending | pending |

**Not Ready** until the fixture ledger and baseline are captured. Do not touch on the strength of line count alone. First Cursor assignment should be baseline mapping/feasibility; implementation only on accepted scope.
