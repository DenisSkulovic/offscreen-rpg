# DOC11 | Refactor selected engine architecture and mechanics into claim-led contracts

**State:** Done (2026-11-18). **Kind:** documentation. **Editorial wave:** S2a; execute after DOC08 and DOC09, never automatically. **Source baseline:** [editorial register](../../../../../designs/open/documentation-editorial-audit/PAGE-REGISTER.md). Inspected at `88d685aa`. No model call and no database.

## Cursor first-screen brief

**Why this Change exists:** Causal-spine architecture and capability/mechanics responsibilities are selected design, but long explanation can blur type/authority boundaries with the realized subset.

**Canonical pages to revise:**
- [docs/product/gameplay/rules.md](../../../../../../docs/product/gameplay/rules.md)
- [docs/product/gameplay/worlds-and-characters.md](../../../../../../docs/product/gameplay/worlds-and-characters.md)
- [docs/technical/engine/selected-architecture.md](../../../../../../docs/technical/engine/selected-architecture.md)
- [docs/technical/engine/mechanics-and-capabilities.md](../../../../../../docs/technical/engine/mechanics-and-capabilities.md)

Read the [editorial standards](../../../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md), [execution waves](../../../../../designs/open/documentation-editorial-audit/EDITORIAL-WAVES.md), and relevant current source/evidence only when factual status is at issue. Never treat a design-only target as shipped.

## Exact intended editorial delta

1. Organize selected architecture around state ownership, permission/admission, deterministic mechanics, durable effects and recovery, each with a cross-link to the governing product claim.
2. Separate existing supported roll/effect mechanisms from the future generalized capability kernel. Keep exact effect provenance, identity, deterministic randomness and applicability constraints.
3. Use one trace for attempted rule action with no applicable body capability and one for a valid mechanical consequence; source-status citations only where verified.

No bulk formatting, no blanket shortening, no new product policy, no executable edits, no paid provider calls, no new data migration. Move or split only when one canonical responsibility and all inbound anchors can be preserved. Mark a genuinely good subsection reviewed unchanged instead of forcing edits.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because the technical prose refactor may not revise player promises in `docs/product/gameplay/rules.md`, `docs/product/gameplay/worlds-and-characters.md` | `docs/product/gameplay/rules.md`, `docs/product/gameplay/worlds-and-characters.md` and their actual dependent headings | Owner ratification required for changed selected meaning; no automatic approval |
| Technical | changed: `docs/technical/engine/selected-architecture.md`, `docs/technical/engine/mechanics-and-capabilities.md`; reorganize and qualify target, proof and failure boundaries without modifying runtime contracts | `docs/technical/engine/selected-architecture.md`, `docs/technical/engine/mechanics-and-capabilities.md` and source maps as evidence | Exact selected/proposed vs implemented distinction and safe negative trace |
| Code | unchanged because this documentation-only Change authorizes **no** executable source/test/config/schema edit; source reads are evidence only | No code ownership move is planned; review factual source references only | Negative: any application code diff or invented passing test blocks Done |
| Related | unchanged because no file/anchor move is preapproved; repair `docs/README.md` and affected inbound Markdown links only if editorial movement is justified | All known reverse contract edges and meaningful inline links | Structural checker plus independent claim-level review |

## Success and discriminating negative

**Normal:** a reader can locate the selected claim, its governing rationale, its precise status and its negative branch with a bounded route through these owners. **Negative:** An LLM suggestion directly grants a mechanical effect or a nonhumanoid body silently inherits humanoid equipment/ability semantics.

**Escalation:** Do not reinterpret a selected but unimplemented mechanics kernel as live or change game rules from technical prose. Keep unresolved normative subsection Proposed/Blocked, while permitting only meaning-preserving edits elsewhere if reviewable independently.

**Proof required:** before/after claim inventory and unchanged-contract list, exact affected path/heading/links, real source evidence for any status correction, negative scenario result, `pnpm wiki:health`, `pnpm wiki:change-guard --mode plan` and `--mode close` when available, plus actual link checker. Mark Done only with an independent adverse-reading review and no unresolved material contradiction. Do not claim semantic correctness from a green structural checker.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/engine/selected-architecture.md#five-contracts | technical | changed: state, admission, deterministic mechanics, durable effects, and recovery now have one route | docs/technical/engine/selected-architecture.md at 88d685aa | documentation-only | a model suggestion does not grant a mechanical effect | the new heading does not replace an existing anchor |
| docs/technical/engine/selected-architecture.md#world-neutral-capability-kernel | technical | unchanged: the kernel stays a conceptual target and is not treated as live | docs/technical/engine/selected-architecture.md at 88d685aa | documentation-only | a nonhumanoid form does not inherit a humanoid schema | the heading stayed in place |
| docs/technical/engine/mechanics-and-capabilities.md#supported-mechanisms-and-the-future-kernel | technical | changed: the supported roll and effect slice stays separate from the future kernel | packages/game/src/checks.ts at 88d685aa | source-observed | an inapplicable Strength attempt throws before a die is drawn | the new heading does not replace an existing anchor |
| docs/product/gameplay/rules.md#world-independent-foundation | product | unchanged: the player rule already refuses unlimited capability for an inapplicable ability | docs/product/gameplay/rules.md at 88d685aa | documentation-only | technical prose did not revise this player promise | the heading stayed in place |
| docs/product/gameplay/worlds-and-characters.md#flexible-settings-and-protagonists | product | unchanged: a microorganism still does not inherit a humanoid inventory | docs/product/gameplay/worlds-and-characters.md at 88d685aa | documentation-only | technical prose did not revise this player promise | the heading stayed in place |

exception: work/changes/README.md because the queue line is the selection route for this documentation packet
exception: work/changes/ledger/2026-11.md because the closed-work index records this documentation packet
exception: work/changes/archive/2026-11/README.md because the month index lists the archived packet
exception: work/designs/open/documentation-editorial-audit/EDITORIAL-WAVES.md because the wave table will point at the archived packet

The actor test in packages/game/test/actor.test.mjs was read and not re-run. No executable diff. Close checks use base 88d685aa. No provider call.
