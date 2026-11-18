# Change: PVAL05 | Turn illustrative stories into falsifiable staged benchmarks

**State:** Proposed.  
**Kind:** `documentation`.  
**Owner/approval:** Offscreen RPG owner; **no automatic selection or consent to spend**.  
**Parent initiative:** [Product reality reconciliation](../../../designs/open/product-reality-reconciliation/README.md).  
**Inspected baseline:** clean `main@ec8c652c5b0a`, 2026-11-18 lean snapshot; re-inspect actual HEAD before execution.

## Cursor first-screen brief

> **Route:** [Product documentation](../../../../docs/product/README.md), [current STATUS](../../../../STATUS.md), [claim register](../../../designs/open/product-reality-reconciliation/CLAIM-REGISTER.md).  
> **Authority:** `docs/product/gameplay/acceptance-scenarios.md; docs/product/gameplay/long-life-benchmark-playthroughs.md`.  
> **Trap:** A reviewer must not infer an implemented map because Vvardenfell has travel, an implemented co-op conflict resolver because of apple rescue, or a universal biological ruleset because the microbe scene is vivid.  
> **Scope:** Add compact per-scenario "stage, required capabilities, missing dependencies, discriminating failure, estimated provider-work shape" markers. Separate solo V0 tests, conceptual stress tests and beyond-V0 feature combinations. Preserve original story content and inbound anchors. No new adventure content required.

## Target alignment

- **One outcome:** The goblin, Vvardenfell, space, microbe and routine scenes remain inspiring but cannot silently authorize every feature, imply executed tests or inflate the first playability acceptance.
- **Source-grounded gap:** The examples already say they are illustrative but contain many normative sentences and mechanics across worlds. A human may conclude their combination is mandatory for release.
- **Retained core:** deterministic source truth, no inferred time, source-linked memory, consent, no duplicate effects, explicit provider budgets.
- **Alternative:** leave selected text unchanged if existing wording already makes the claim and evidence maturity unambiguous; do not add redundant caveats. Consider moving research to its existing proposal owner rather than replicating prose.
- **Ready gate:** owner-reviewed exact delta/meaning, current source reinspection, no conflicts with newer decisions, negative proof agreed.

## Authority and baseline

- **Product/technical owners:** `docs/product/gameplay/acceptance-scenarios.md; docs/product/gameplay/long-life-benchmark-playthroughs.md`.
- **Source evidence:** `STATUS.md`, relevant code/source maps and dated evidence; snapshot SHA `ec8c652c5b0a`. Do not claim a live test was rerun.
- **Unratified:** broad shared mechanics, 3D map, autonomous decisions, universal world forms, provider-driven exploratory memory and commercial pricing stay unselected unless independently ratified.

## Exact scope and exclusions

Add compact per-scenario "stage, required capabilities, missing dependencies, discriminating failure, estimated provider-work shape" markers. Separate solo V0 tests, conceptual stress tests and beyond-V0 feature combinations. Preserve original story content and inbound anchors. No new adventure content required.

**Exclude:** unrelated features, code refactors (unless this packet kind is `implementation` and code paths are explicitly listed), paid inference, downloads, hosted provider configuration, billing grants, production data, new gameplay rules and blanket pruning of product dreams.

## Acceptance and discriminating negative proof

- **Normal:** The goblin, Vvardenfell, space, microbe and routine scenes remain inspiring but cannot silently authorize every feature, imply executed tests or inflate the first playability acceptance.
- **Negative:** A reviewer must not infer an implemented map because Vvardenfell has travel, an implemented co-op conflict resolver because of apple rescue, or a universal biological ruleset because the microbe scene is vivid.
- **Checks:** inspect before/after selected meaning, preserve original benchmark/authority constraints, check affected links, run relevant provider-free repository documentation/guard commands on the REAL checkout; report actual results rather than declaring success from the plan.
- **Human decision gate:** No scenario may become acceptance of unratified game mechanics by editorial convenience. Any promotion to a selected promise needs separate owner decision and source/quality/cost evidence.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | changed: `docs/product/gameplay/acceptance-scenarios.md`, `long-life-benchmark-playthroughs.md` with explicit benchmark maturity/dependencies | first-playable vision, actions and time as invariants | Clear staged scenario classes |
| Technical | unchanged because examples do not modify engine mechanics; existing technical links are explanatory only | selected engine and story source headings | No new executable acceptance |
| Code | unchanged because scenario text is not fixture implementation | named benchmark scripts consulted only as evidence | No tests invented |
| Related | updated: `docs/product/README.md` benchmark route descriptions if needed | historic inbound anchors preserved | Search + links + negative reader test |

## Handoff and next action

- On explicit selection, inspect current `git status`, `git rev-parse HEAD`, affected canonical headings and existing Change dependencies; read the [design audit](../../../designs/open/product-reality-reconciliation/README.md) narrowly.
- Maintain `work/changes/README.md` as the **single selection owner**. Do not select the next packet when this one finishes.
- For docs-only work, **source code must remain unchanged**. For PVAL06 implementation, edit only the named helper/test paths and update policy routes, no product/game code.
- After editing, run `pnpm wiki:health`, `pnpm wiki:content-health`, `pnpm repo:docs-health`, the relevant `pnpm wiki:change-guard` plan/close commands; run targeted self-tests for an implementation packet, only if available. Mark not-run accurately.
- Reconcile affected product/technical/code/related owners in a completed ledger before Done; archive under `work/changes/archive/2026-11/other/` and repair links.

## Reconciliation ledger (complete after execution, do not prefill as proof)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| pending exact current-HEAD inspection | pending | proposed above, **not yet performed** | no source edits in this packet proposal | no verification run | planned negative above | not yet reconciled |
