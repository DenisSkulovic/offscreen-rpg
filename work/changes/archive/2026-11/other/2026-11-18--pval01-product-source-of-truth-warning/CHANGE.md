# Change: PVAL01 | Stop authority from implying feasibility

**State:** Done (2026-11-18).  
**Kind:** `documentation`.  
**Owner/approval:** Offscreen RPG owner; **no automatic selection or consent to spend**.  
**Parent initiative:** [Product reality reconciliation](../../../../../designs/open/product-reality-reconciliation/README.md).  
**Inspected baseline:** clean `main@ec8c652c5b0a`, 2026-11-18 lean snapshot; re-inspect actual HEAD before execution.

## Cursor first-screen brief

> **Route:** [Product documentation](../../../../../../docs/product/README.md), [current STATUS](../../../../../../STATUS.md), [claim register](../../../../../designs/open/product-reality-reconciliation/CLAIM-REGISTER.md).  
> **Authority:** `docs/README.md#documentation; docs/product/README.md#product`.  
> **Trap:** Fresh agent sees “selected shared play” and assumes it is deliverable or implemented. The revised hub must explicitly refuse that inference. Conversely, it must NOT downgrade no-double-spend, no-model-dice or consent to optional dreams.  
> **Scope:** Edit only the two hubs: add the compact two-axis distinction, direct readers to STATUS and product-reality claim context, and preserve existing question navigation. No new product mechanic, no changes to status tiers.

## Target alignment

- **One outcome:** A reader of documentation entrypoints understands that a selected experience target may be viable only as a hypothesis, while deterministic selected invariants remain binding.
- **Source-grounded gap:** Current wiki treats product as bible and properly distinguishes proposed from selected, but does not warn that selected ambition is unvalidated; source ec8c652c5b0a.
- **Retained core:** deterministic source truth, no inferred time, source-linked memory, consent, no duplicate effects, explicit provider budgets.
- **Alternative:** leave selected text unchanged if existing wording already makes the claim and evidence maturity unambiguous; do not add redundant caveats. Consider moving research to its existing proposal owner rather than replicating prose.
- **Ready gate:** owner-reviewed exact delta/meaning, current source reinspection, no conflicts with newer decisions, negative proof agreed.

## Authority and baseline

- **Product/technical owners:** `docs/README.md#documentation; docs/product/README.md#product`.
- **Source evidence:** `STATUS.md`, relevant code/source maps and dated evidence; snapshot SHA `ec8c652c5b0a`. Do not claim a live test was rerun.
- **Unratified:** broad shared mechanics, 3D map, autonomous decisions, universal world forms, provider-driven exploratory memory and commercial pricing stay unselected unless independently ratified.

## Exact scope and exclusions

Edit only the two hubs: add the compact two-axis distinction, direct readers to STATUS and product-reality claim context, and preserve existing question navigation. No new product mechanic, no changes to status tiers.

**Exclude:** unrelated features, code refactors (unless this packet kind is `implementation` and code paths are explicitly listed), paid inference, downloads, hosted provider configuration, billing grants, production data, new gameplay rules and blanket pruning of product dreams.

## Acceptance and discriminating negative proof

- **Normal:** A reader of documentation entrypoints understands that a selected experience target may be viable only as a hypothesis, while deterministic selected invariants remain binding.
- **Negative:** Fresh agent sees “selected shared play” and assumes it is deliverable or implemented. The revised hub must explicitly refuse that inference. Conversely, it must NOT downgrade no-double-spend, no-model-dice or consent to optional dreams.
- **Checks:** inspect before/after selected meaning, preserve original benchmark/authority constraints, check affected links, run relevant provider-free repository documentation/guard commands on the REAL checkout; report actual results rather than declaring success from the plan.
- **Human decision gate:** Owner selects this narrowly scoped docs-only change. No new game policy is ratified; changes to first-playable scope or decision authority require a separate explicit owner review.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | changed: `docs/product/README.md` introductory text; **no new mechanical requirement** | `docs/product/foundations/vision.md`, claim register | Source distinction and negative reading test |
| Technical | unchanged because all technical spending/authority/contracts stay intact | `docs/technical/README.md` checked as dependent | No technical schema change |
| Code | unchanged because this is a routing/meaning-only correction | no code owner affected | No executable modifications |
| Related | changed: `docs/README.md` front door, add a route to the product maturity investigation; no replacement of STATUS | `STATUS.md`, work/designs open index links as needed | Readable routes and link checks |

## Handoff and next action

- On explicit selection, inspect current `git status`, `git rev-parse HEAD`, affected canonical headings and existing Change dependencies; read the [design audit](../../../../../designs/open/product-reality-reconciliation/README.md) narrowly.
- Maintain `work/changes/README.md` as the **single selection owner**. Do not select the next packet when this one finishes.
- For docs-only work, **source code must remain unchanged**. For PVAL06 implementation, edit only the named helper/test paths and update policy routes, no product/game code.
- After editing, run `pnpm wiki:health`, `pnpm wiki:content-health`, `pnpm repo:docs-health`, the relevant `pnpm wiki:change-guard` plan/close commands; run targeted self-tests for an implementation packet, only if available. Mark not-run accurately.
- Reconcile affected product/technical/code/related owners in a completed ledger before Done; archive under `work/changes/archive/2026-11/other/` and repair links.

## Reconciliation ledger (complete after execution, do not prefill as proof)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Documentation front door | docs/README.md | changed: authority and evidence are separate questions, and a selected ambition is not a delivered feature | no source behavior changed; inspected docs/README.md at c8796476 | owner-selected wording; no new live proof | A reader cannot treat selected shared play as deliverable or implemented, and cannot treat consent, authoritative dice, or no duplicate effects as optional dreams | Question row added on docs/README.md |
| Product front door | docs/product/README.md | changed: the product map says selection is not feasibility and points at STATUS plus the unratified claim register | no source behavior changed; inspected docs/product/README.md at c8796476 | owner-selected wording; no new live proof | The same shared-play misreading is refused on the product map, without a new mechanic or a status-tier change | Question row added on docs/product/README.md |
| Implementation status tiers | STATUS.md | unchanged: this packet does not rewrite what is implemented, proved, or absent | no source behavior changed; inspected STATUS.md at c8796476 | existing status record | STATUS remains the evidence record; the new warning does not invent a second implementation ledger | No STATUS edit |
