# Change: PVAL05 | Turn illustrative stories into falsifiable staged benchmarks

**State:** Done (2026-11-18).  
**Kind:** `documentation`.  
**Owner/approval:** Offscreen RPG owner; **no automatic selection or consent to spend**.  
**Parent initiative:** [Product reality reconciliation](../../../../../designs/open/product-reality-reconciliation/README.md).  
**Inspected baseline:** clean `main@ec8c652c5b0a`, 2026-11-18 lean snapshot; re-inspect actual HEAD before execution.

## Cursor first-screen brief

> **Route:** [Product documentation](../../../../../../docs/product/README.md), [current STATUS](../../../../../../STATUS.md), [claim register](../../../../../designs/open/product-reality-reconciliation/CLAIM-REGISTER.md).  
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
| Product | changed: `docs/product/gameplay/acceptance-scenarios.md` and `docs/product/gameplay/long-life-benchmark-playthroughs.md` now mark solo V0 texture apart from beyond-V0 stress tests | `docs/product/foundations/vision.md#first-playable-target` | Stories stay; they do not become release requirements |
| Technical | unchanged because the examples do not modify engine mechanics | `docs/technical/engine/selected-architecture.md` | No new executable acceptance |
| Code | unchanged because scenario text is not fixture implementation | no code owner edited | No tests invented |
| Related | unchanged because the product map already calls both pages illustrative and names the solo milestone | `docs/product/README.md` | Historic anchors preserved |

## Handoff and next action

- On explicit selection, inspect current `git status`, `git rev-parse HEAD`, affected canonical headings and existing Change dependencies; read the [design audit](../../../../../designs/open/product-reality-reconciliation/README.md) narrowly.
- Maintain `work/changes/README.md` as the **single selection owner**. Do not select the next packet when this one finishes.
- For docs-only work, **source code must remain unchanged**. For PVAL06 implementation, edit only the named helper/test paths and update policy routes, no product/game code.
- After editing, run `pnpm wiki:health`, `pnpm wiki:content-health`, `pnpm repo:docs-health`, the relevant `pnpm wiki:change-guard` plan/close commands; run targeted self-tests for an implementation packet, only if available. Mark not-run accurately.
- Reconcile affected product/technical/code/related owners in a completed ledger before Done; archive under `work/changes/archive/2026-11/other/` and repair links.

## Reconciliation ledger (complete after execution, do not prefill as proof)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Near-term scenes | docs/product/gameplay/acceptance-scenarios.md#1-arrive-and-create | changed: each scene states solo V0 texture or a beyond-V0 combination, and the stories remain | no source behavior changed; inspected docs/product/gameplay/acceptance-scenarios.md at c8796476 | illustrative; not an executed playtest | Vvardenfell is not on this page, and the apple rescue is not an implemented co-op resolver | Stage lines added under the six scenes |
| Long-life atlas | docs/product/gameplay/long-life-benchmark-playthroughs.md#vvardenfell-benchmark-a-life-that-takes-time | changed: the atlas has a stage table and stays a stress test, not release content | no source behavior changed; inspected docs/product/gameplay/long-life-benchmark-playthroughs.md at c8796476 | illustrative benchmark | A microorganism scene does not select a universal biological ruleset, and travel prose does not select a map | Stage table added |
| Narrative initiative | docs/product/storyteller/behavior-and-quality.md#narrative-initiative | unchanged: stored prose is still not a quality proof | no source behavior changed; inspected docs/product/storyteller/behavior-and-quality.md at c8796476 | selected permission; quality unproved | A discarded plan is still not truth | No behavior edit in this packet |
| What it must not do | docs/product/storyteller/behavior-and-quality.md#what-it-must-not-do | unchanged: dice, consent, and duplicate effects stay prohibited | no source behavior changed; inspected docs/product/storyteller/behavior-and-quality.md at c8796476 | selected prohibition | The scenes do not authorize a model-owned choice | No prohibition edit |
| Storyteller memory | docs/product/storyteller/memory-and-continuity.md#current-truth-versus-inspectable-history | unchanged: durable files are still not continuity quality | no source behavior changed; inspected docs/product/storyteller/memory-and-continuity.md at c8796476 | selected retrieval target | Cognee still does not prove game recall impossible | No memory edit |
| Prompts and experiments | docs/technical/storyteller/request-context-and-cost.md#prompts-and-experiments | unchanged: one Sol call is still not a monthly price | no source behavior changed; inspected docs/technical/storyteller/request-context-and-cost.md at c8796476 | one historical observation | The stage notes authorize no spend | No cost edit |
| Prompt responsibility | docs/technical/storyteller/provider-boundary.md#prompt-responsibility | unchanged: the model still does not own dice | no source behavior changed; inspected docs/technical/storyteller/provider-boundary.md at c8796476 | existing prompt boundary | A prompt still cannot grant dice | No provider-boundary edit |
| What the prompt must not grant | docs/technical/storyteller/prompts-and-tools.md#what-the-prompt-must-not-grant | unchanged: the model still cannot roll or mint tools | no source behavior changed; inspected docs/technical/storyteller/prompts-and-tools.md at c8796476 | existing tool contract | Model text still cannot change dice, clock, or item outcome | No prompts edit |
| Space, movement and maps | docs/product/gameplay/continuity.md#space-movement-and-maps | unchanged: the cube stays unselected | no source behavior changed; inspected docs/product/gameplay/continuity.md at c8796476 | selected invariant | Prose still cannot teleport a known character | No continuity edit |
| Flexible settings | docs/product/gameplay/worlds-and-characters.md#flexible-settings-and-protagonists | unchanged: arbitrary worlds stay unproved | no source behavior changed; inspected docs/product/gameplay/worlds-and-characters.md at c8796476 | selected limit | A microorganism still gets no invented humanoid inventory | No worlds edit |
| Bounded plans for absence | docs/product/gameplay/time-and-autonomy.md#bounded-plans-for-absence | unchanged: the queue stays proposed | no source behavior changed; inspected docs/product/gameplay/time-and-autonomy.md at c8796476 | proposed queue | Absence still cannot invent progress | No time edit |
| Permission to advance | docs/technical/engine/chronology-and-activities.md#permission-to-advance | unchanged: an unaccepted clock still does not move | no source behavior changed; inspected docs/technical/engine/chronology-and-activities.md at c8796476 | existing technical gate | Closing a tab still does not advance fictional time | No chronology edit |
| First playable target | docs/product/foundations/vision.md#first-playable-target | unchanged: the solo milestone stays the first proof | no source behavior changed; inspected docs/product/foundations/vision.md at c8796476 | owner-ratified scope | The scenes do not put a party back into that milestone | No vision edit |
| Product front door | docs/product/README.md#product | unchanged: both scenario pages stay illustrative | no source behavior changed; inspected docs/product/README.md at c8796476 | route text | The map does not turn the atlas into release scope | No product-map edit |
| Membership and settings changes | docs/technical/engine/lifecycle-and-compatibility.md#membership-and-settings-changes | unchanged: the invited friend stays outside the solo milestone | no source behavior changed; inspected docs/technical/engine/lifecycle-and-compatibility.md at c8796476 | unimplemented invite | This page still does not implement an invitation | No revocation edit |
| Frozen operation identity | docs/technical/platform/http-api-and-client-contracts.md#frozen-operation-identity | unchanged: five-owners was not edited | no source behavior changed; inspected docs/technical/platform/http-api-and-client-contracts.md at c8796476 | existing HTTP contract | A retry still reuses the captured operation id | No HTTP edit |

exception: docs/README.md because PVAL01 edited that front door in this same uncommitted working tree
exception: work/designs/open/documentation-editorial-audit/EDITORIAL-WAVES.md because PVAL02 added the supersession note in this same uncommitted working tree
exception: work/changes/archive/2026-11/other/2026-11-18--pval01-product-source-of-truth-warning/CHANGE.md because that earlier packet was closed in this same uncommitted working tree
exception: work/changes/archive/2026-11/other/2026-11-18--pval02-first-playable-scope-separation/CHANGE.md because that earlier packet was closed in this same uncommitted working tree
exception: work/changes/archive/2026-11/other/2026-11-18--pval03-grand-mechanics-maturity/CHANGE.md because that earlier packet was closed in this same uncommitted working tree
exception: work/changes/archive/2026-11/other/2026-11-18--pval04-storyteller-viability-gates/CHANGE.md because that earlier packet was closed in this same uncommitted working tree
