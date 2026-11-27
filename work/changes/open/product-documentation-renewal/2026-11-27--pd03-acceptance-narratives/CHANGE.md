# PD03 | Acceptance narratives and long-life benchmarks

**State:** Proposed — planner-authored first batch; independent Change readiness not performed; not commissioned.

**Kind:** documentation (DOC). **Approval:** E1 design owner-accepted for planning 2026-11-27; no execution authority. **Target:** `implementation/product-documentation-renewal`. **Source baseline:** `c7058958ec3f43fd37ec680d05757561d628926b` (main); original snapshot `94808654fdf93e3102469ed3f5d5b2d476ff6f8d`, intervening docs only. [Accepted Design](../../../../designs/open/product-documentation-renewal/README.md) · [Group](../README.md).

## Implementation first-screen brief

2 bounded editorial tasks. Parent reads this front door, [TASKS](TASKS.md), named source route and [PROOF](PROOF.md); child receives one task card and listed exact anchors. No runtime tests/live operations. No claim of time or token savings. Dependencies: None for local construction; PD01 keeps the existing first-playable heading and selected meaning. PD07 reconciles both.

## Target alignment and outcome

Authored future oracles readable as product acceptance, not delivered features or a mandatory implementation plan. The accepted E1 chooses substantial restructuring of existing owners over adding disclaimers or replacing the wiki. Existing correct paragraphs may survive; no new product or runtime decisions. [SOURCE-MAP](SOURCE-MAP.md) contains inspected claims and concrete contradictions. Actual changes confined to named pages; no new files or moved headings planned.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | changed: `docs/product/gameplay/acceptance-scenarios.md`, `docs/product/gameplay/long-life-benchmark-playthroughs.md` | foundation, gameplay and selected acceptance routes | task semantic negatives |
| Technical | unchanged because this packet changes product expression only; existing authority contracts and legacy transfer facts remain | existing engine and Storyteller authority links, TD05 transfer where named | source and claim map |
| Code | unchanged because documentation-only; no executable modifications authorized | no scripts, source, config, fixtures or tests changed | inspected diff; semantic negative in PROOF |
| Related | unchanged for shared indexes and STATUS because group integration owner reconciles; preserve exact affected heading paths, report stale dependent routes to integration owner | [SOURCE-MAP](SOURCE-MAP.md) and existing typed dependency headings | no link regression or lost claim |

## Scope and proof

May write only `docs/product/gameplay/acceptance-scenarios.md`, `docs/product/gameplay/long-life-benchmark-playthroughs.md` and own packet closure records. No sibling, shared index, native contract, active packet or runtime writes. Preserve all existing accepted conditions, refusal rules and scoped evidence; no policy, entitlement, source or new proof credit. [PROOF](PROOF.md) owns assigned semantic gate. An authored scenario is described as PASS; a legacy deadline becomes a general consent policy; duration or licensed setting becomes compulsory.

## Handoff and closure

When separately Ready and commissioned, use one linked worktree from verified `implementation/product-documentation-renewal` and `change/pd03-acceptance-narratives`; run `node scripts/repo-tools/change-branch-guard.mjs --change PD03 --target implementation/product-documentation-renewal --design product-documentation-renewal` before edits. Recheck actual HEAD and active ownership; do not override unrelated work. Execute tasks in order, compare exact changed claims and all retained negatives; run assigned docs checks at join. Stop on changed authority, unpreserved unique fact, active file overlap, or failed gate. No automatic successor. Archive own leaf on design branch after assigned gate and reconciliation; target-locked join, verify archive present and open absent, then report exact SHA. Joint semantic acceptance remains with PD07; no constituent main merge.

## Reconciliation ledger (complete before Done)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/product/gameplay/acceptance-scenarios.md` (task headings) | product | planned editorial rewrite, selected meaning unchanged | `c7058958ec3f43fd37ec680d05757561d628926b`; no executable edits | NOT RUN | assigned in PROOF | preserve routes; reconcile at closure |
| `docs/product/gameplay/long-life-benchmark-playthroughs.md` (task headings) | product | planned editorial rewrite, selected meaning unchanged | `c7058958ec3f43fd37ec680d05757561d628926b`; no executable edits | NOT RUN | assigned in PROOF | preserve routes; reconcile at closure |
| Known typed dependents (SOURCE-MAP) | related | unchanged selected authority; confirm each actual dependency | no source behavior changed | NOT RUN | semantic comparison | record actual affected route at closure |
