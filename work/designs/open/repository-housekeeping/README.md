# Repository housekeeping | 2026-11-17

**State:** source-grounded audit and bounded implementation candidates; NOT an approved blanket cleanup. **Baseline:** `main@f279b3620d00c7ee11c20ad62a41661723f0a69d` (one documentation-only commit after inspected source snapshot `4e42bd76028ebf13458b799016446cc3f9dae38f`).

Start with [the dated audit](AUDIT-2026-11-17.md) for cleanup candidates and [the prevention-system design](PREVENTION-SYSTEM.md) for the root cause and permanent feedback architecture. Neither is a second source of product/technical truth.

## Execution map

- [HK02 repository documentation integrity](../../../changes/archive/2026-11/other/2026-11-17--hk02-repository-doc-integrity/CHANGE.md): Done; open Change packets and research/evidence routers are in the docs link check, and a Change-only path matches the docs workflow filter.
- [HK06 tracked-artifact inventory and lifecycle guard](../../../changes/archive/2026-11/other/2026-11-17--hk06-maintenance-inventory-and-lifecycle/CHANGE.md): Done; `pnpm repo:maintenance --strict` checks open routes, selection, and terminal state.
- [HK07 dependency-aware freshness](../../../changes/archive/2026-11/other/2026-11-17--hk07-dependency-aware-freshness/CHANGE.md): Done; commit order produces review candidates, and age alone is not a false contract.
- [HK08 CI, brief and status convergence](../../../changes/archive/2026-11/other/2026-11-17--hk08-maintenance-feedback-and-status-convergence/CHANGE.md): Done; strict lifecycle failures are on the maintenance workflow, and `repo:brief --health` shows three candidates.
- [HK01 retire local response-reconciliation helper](../../../changes/open/2026-11-17--hk01-retire-local-repair-helper/CHANGE.md): Ready for replacement-first recovery with idempotent/mismatch fixtures. The earlier search still shows the old CLI is the unique saved-response settlement, so deletion remains prohibited until a proved replacement exists.
- [HK03 split Storyteller integration tests](../../../changes/open/2026-11-17--hk03-storyteller-test-boundaries/CHANGE.md): Ready to characterize and preserve the existing red QA-SF01 baseline during extraction; green is not a prerequisite.
- [HK05 retire Play compatibility shims](../../../changes/archive/2026-11/other/2026-11-17--hk05-play-compatibility-shims/CHANGE.md): Done; PlayScene and Campaign settings import the owner modules, and the two one-line reexports are gone.
- [HK04 decompose Chamber launcher](../../../changes/open/2026-11-17--hk04-chamber-launcher-seams/CHANGE.md): Ready for a pure mode-plan seam and provider-disabled tests, without privileged boot or permission/billing changes.

**Unselected:** none of these Changes is the current Change. Execute one at a time when the owner tasks Cursor. Documentation-only historical reclassification is maintenance under the [change standard](../../../../.agents/references/change-work-unit-standard.md), not a pretext for a fake code Change.
