# PD01 | Product foundations and vocabulary

**State:** Done — source joined to implementation/product-documentation-renewal; joint semantic acceptance pending (PD07/TD10 and Design).

**Kind:** documentation (DOC). **Approval:** E1 design owner-accepted 2026-11-27; implementation release recorded in group. **Target:** `implementation/product-documentation-renewal`. **Source baseline:** `c7058958ec3f43fd37ec680d05757561d628926b` (main); original snapshot `94808654fdf93e3102469ed3f5d5b2d476ff6f8d`, intervening docs only. [Accepted Design](../../../../../designs/open/product-documentation-renewal/README.md) · [Group](../../../../open/product-documentation-renewal/README.md).

**Release:** [group readiness and dispatch](../../../../open/product-documentation-renewal/README.md#owner-release-and-independent-readiness); exact reviewed candidate `606de3a0a4856eb36ce275bd4bc109ea46d480c0`. Verify named assignment, actual target, branch guard, prerequisites and custody before editing.

## Implementation first-screen brief

2 bounded editorial tasks. Parent reads this front door, [TASKS](TASKS.md), named source route and [PROOF](PROOF.md); child receives one task card and listed exact anchors. No runtime tests/live operations. No claim of time or token savings. Dependencies: None for local construction. PD07 owns final integration; retained legacy facts remain until technical successor is on main.

## Target alignment and outcome

Vision and vocabulary read as selected product intent, without implying delivery or dictating a prototype storage topology. The accepted E1 chooses substantial restructuring of existing owners over adding disclaimers or replacing the wiki. Existing correct paragraphs may survive; no new product or runtime decisions. [SOURCE-MAP](SOURCE-MAP.md) contains inspected claims and concrete contradictions. Actual changes confined to named pages; no new files or moved headings planned.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | changed: `docs/product/foundations/vision.md`, `docs/product/foundations/concepts.md` | foundation, gameplay and selected acceptance routes | task semantic negatives |
| Technical | unchanged because this packet changes product expression only; existing authority contracts and legacy transfer facts remain | existing engine and Storyteller authority links, TD05 transfer where named | source and claim map |
| Code | unchanged because documentation-only; no executable modifications authorized | no scripts, source, config, fixtures or tests changed | inspected diff; semantic negative in PROOF |
| Related | unchanged for shared indexes and STATUS because group integration owner reconciles; preserve exact affected heading paths, report stale dependent routes to integration owner | [SOURCE-MAP](SOURCE-MAP.md) and existing typed dependency headings | no link regression or lost claim |

## Scope and proof

May write only `docs/product/foundations/vision.md`, `docs/product/foundations/concepts.md` and own packet closure records. No sibling, shared index, native contract, active packet or runtime writes. Preserve all existing accepted conditions, refusal rules and scoped evidence; no policy, entitlement, source or new proof credit. [PROOF](PROOF.md) owns assigned semantic gate. Prepared Play requiring a preview; D&D imposed on a galaxy; narration owns dice; historical read triggers spend; one model call equals a scene.

## Handoff and closure

When separately Ready and commissioned, use one linked worktree from verified `implementation/product-documentation-renewal` and `change/pd01-product-foundations`; run `node scripts/repo-tools/change-branch-guard.mjs --change PD01 --target implementation/product-documentation-renewal --design product-documentation-renewal` before edits. Recheck actual HEAD and active ownership; do not override unrelated work. Execute tasks in order, compare exact changed claims and all retained negatives; run assigned docs checks at join. Stop on changed authority, unpreserved unique fact, active file overlap, or failed gate. No automatic successor. Archive own leaf on design branch after assigned gate and reconciliation; target-locked join, verify archive present and open absent, then report exact SHA. Joint semantic acceptance remains with PD07; no constituent main merge.

## Reconciliation ledger (complete before Done)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/product/foundations/vision.md` (task headings) | product | planned editorial rewrite, selected meaning unchanged | `c7058958ec3f43fd37ec680d05757561d628926b`; no executable edits | PASS (source-inspected editorial; semantic answers in closure receipt) | assigned in PROOF | all headings preserved; N/A |
| `docs/product/foundations/concepts.md` (task headings) | product | planned editorial rewrite, selected meaning unchanged | `c7058958ec3f43fd37ec680d05757561d628926b`; no executable edits | PASS (source-inspected editorial; semantic answers in closure receipt) | assigned in PROOF | all headings preserved; N/A |
| Known typed dependents (SOURCE-MAP) | related | unchanged selected authority; confirm each actual dependency | no source behavior changed | PASS (headings and anchors unchanged; no dependent edited) | semantic comparison | N/A; no route changed |

## Closure receipt

- Page commit: `393c98b95f51f4f97a4223851f9d9d74eeb8907d`. Changed: `docs/product/foundations/vision.md`, `docs/product/foundations/concepts.md`. No heading or anchor renamed or removed (`the-dd-foundation` kept; only its "legacy anchor" notice line was folded into the section's first sentence).
- Checks: `git diff --check` clean; `check_docs.py` 96 problems, identical to baseline; `docs-health.mjs` identical to baseline. Link health is not semantic proof. Runtime tests NOT RUN (not assigned).
- vision.md mapping: opening and `What this page selects` became an intro plus a commitments list with section links (delegation, allowance and consent notes kept); `The D&D foundation` duplicate merged (optional, authoritative when enabled); `Scene history` reworded to future tense and keeps every state category, no provider/spend/clock on reads, unresolved storage/timer/atomic design; `The storyteller` leads with creative identity, realization moved to a non-guarantee paragraph; solo/shared prose consolidated in `Larger shared worlds` (2026-11-18 ratification, not cancelled, proposed link) with cross-links elsewhere. `First playable target`, `Why build it` ($2 illustrative, no spend) and `Earned life` untouched.
- concepts.md mapping: opening is product vocabulary, storage-label caveat moved to `Execution and storage concepts`; Storyteller section reframed as selected investigative target; `result.scene`/`story_passage` and the dual-publication path kept in one dated legacy-realization paragraph pending TD05; beacon 600/660/750 example, D20 once, no repair labor, no chapters untouched.
- Semantic negatives: Prepared Play needs no preview: `First playable target` ("should not need to approve a generated preview"). D&D not imposed on a galaxy: `The D&D foundation` (optional, world-neutral engine) and the applicability paragraph in `The storyteller`. Narration owns dice: concepts `Player and world concepts` (Narration is presentation) and the worked example (engine records D20 once; Storyteller never owns a mechanical result). Historical read triggers spend: `Scene history and alternate continuities` (reading does not replay dice, call a provider, spend or change time). One model call equals a scene: concepts `Execution and storage concepts` ("Do not assume one model call equals...").
- Deferred findings: Low - vision.md `Earned life` is long and could be split later (destination: group register, custodian). Medium - transfer of storage-label facts to TD05 is pending (destination: PD07/TD05; facts preserved in concepts.md).
