# Repository housekeeping | 2026-11-17

**State:** source-grounded audit and bounded implementation candidates; NOT an approved blanket cleanup. **Baseline:** `main@f279b3620d00c7ee11c20ad62a41661723f0a69d` (one documentation-only commit after inspected source snapshot `4e42bd76028ebf13458b799016446cc3f9dae38f`).

Start with [the dated audit](AUDIT-2026-11-17.md) for cleanup candidates and [the prevention-system design](PREVENTION-SYSTEM.md) for the root cause and permanent feedback architecture. Neither is a second source of product/technical truth.

## Execution map

- [HK02 repository documentation integrity](../../../changes/open/2026-11-17--hk02-repository-doc-integrity/CHANGE.md): first; closes blind spots in link checks and change-only commits.
- [HK06 tracked-artifact inventory and lifecycle guard](../../../changes/open/2026-11-17--hk06-maintenance-inventory-and-lifecycle/CHANGE.md): after HK02, discover active orphans, ambiguous states and unclassified control files.
- [HK07 dependency-aware freshness](../../../changes/open/2026-11-17--hk07-dependency-aware-freshness/CHANGE.md): after HK06, tie owner docs to changed source/commit evidence and review age cohorts without false truth claims.
- [HK08 CI, brief and status convergence](../../../changes/open/2026-11-17--hk08-maintenance-feedback-and-status-convergence/CHANGE.md): after HK07, move deterministic failures into push/PR gates, periodic reviews and first-screen hygiene.
- [HK01 retire local response-reconciliation helper](../../../changes/open/2026-11-17--hk01-retire-local-repair-helper/CHANGE.md): after independent caller and recovery-path check.
- [HK03 split Storyteller integration tests](../../../changes/open/2026-11-17--hk03-storyteller-test-boundaries/CHANGE.md): only after QA-SF01 baseline is characterized.
- [HK05 retire Play compatibility shims](../../../changes/open/2026-11-17--hk05-play-compatibility-shims/CHANGE.md): after UI03, remove two one-line reexport entrypoints and repair import-sensitive tests.
- [HK04 decompose Chamber launcher](../../../changes/open/2026-11-17--hk04-chamber-launcher-seams/CHANGE.md): proposed, with security/provider/billing freeze and harness-proof gate.

**Unselected:** none of these Changes is the current Change. Execute one at a time when the owner tasks Cursor. Documentation-only historical reclassification is maintenance under the [change standard](../../../../.agents/references/change-work-unit-standard.md), not a pretext for a fake code Change.
