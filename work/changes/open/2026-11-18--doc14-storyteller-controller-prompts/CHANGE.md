# DOC14 | Separate Storyteller selected agent architecture from real prompt/tool execution

**State:** Proposed (unselected). **Kind:** documentation. **Editorial wave:** S2c; execute after DOC10 and DOC13, never automatically. **Source baseline:** [editorial register](../../../designs/open/documentation-editorial-audit/PAGE-REGISTER.md) at `f3e3bfe`; refresh exact HEAD, headings, archived evidence and dirty worktree before selection. **Current change remains:** none.

## Cursor first-screen brief

**Why this Change exists:** The desired two-loop/controller model, prompt composition, tool rights and publication fences can be read as one implemented agent loop, although some parts remain selected targets or narrow implemented steps.

**Canonical pages to revise:**
- [docs/product/storyteller/behavior-and-quality.md](../../../../docs/product/storyteller/behavior-and-quality.md)
- [docs/technical/storyteller/operation-and-controller.md](../../../../docs/technical/storyteller/operation-and-controller.md)
- [docs/technical/storyteller/prompts-and-tools.md](../../../../docs/technical/storyteller/prompts-and-tools.md)
- [docs/technical/storyteller/generation-and-publication.md](../../../../docs/technical/storyteller/generation-and-publication.md)

Read the [editorial standards](../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md), [execution waves](../../../designs/open/documentation-editorial-audit/EDITORIAL-WAVES.md), and relevant current source/evidence only when factual status is at issue. Never treat a design-only target as shipped.

## Exact intended editorial delta

1. State whether each read/decide/tool-call/stop/publish step is selected target, implemented source path, verified fixture or unproven prototype.
2. Define tool rights, versioned input capture, stopping rules, refusal and publication validity at the relevant headings; no invented new tool entitlement.
3. Give a source-grounded trace distinguishing single LLM call from adaptive multi-round inspection, and a failed/stale publication case that retains committed state.

No bulk formatting, no blanket shortening, no new product policy, no executable edits, no paid provider calls, no new data migration. Move or split only when one canonical responsibility and all inbound anchors can be preserved. Mark a genuinely good subsection reviewed unchanged instead of forcing edits.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because the technical prose refactor may not revise player promises in `docs/product/storyteller/behavior-and-quality.md` | `docs/product/storyteller/behavior-and-quality.md` and their actual dependent headings | Owner ratification required for changed selected meaning; no automatic approval |
| Technical | changed: `docs/technical/storyteller/operation-and-controller.md`, `docs/technical/storyteller/prompts-and-tools.md`, `docs/technical/storyteller/generation-and-publication.md`; reorganize and qualify target, proof and failure boundaries without modifying runtime contracts | `docs/technical/storyteller/operation-and-controller.md`, `docs/technical/storyteller/prompts-and-tools.md`, `docs/technical/storyteller/generation-and-publication.md` and source maps as evidence | Exact selected/proposed vs implemented distinction and safe negative trace |
| Code | unchanged because this documentation-only Change authorizes **no** executable source/test/config/schema edit; source reads are evidence only | No code ownership move is planned; review factual source references only | Negative: any application code diff or invented passing test blocks Done |
| Related | unchanged because no file/anchor move is preapproved; repair `docs/README.md` and affected inbound Markdown links only if editorial movement is justified | All known reverse contract edges and meaningful inline links | Structural checker plus independent claim-level review |

## Success and discriminating negative

**Normal:** a reader can locate the selected claim, its governing rationale, its precise status and its negative branch with a bounded route through these owners. **Negative:** Documentation asserts a live autonomous investigation loop merely because target architecture describes one; or narrator output mutates mechanics directly.

**Escalation:** If live behavior cannot be confirmed from code/tests, keep its realization status unknown and point at the exact evidence gap. Keep unresolved normative subsection Proposed/Blocked, while permitting only meaning-preserving edits elsewhere if reviewable independently.

**Proof required:** before/after claim inventory and unchanged-contract list, exact affected path/heading/links, real source evidence for any status correction, negative scenario result, `pnpm wiki:health`, `pnpm wiki:change-guard --mode plan` and `--mode close` when available, plus actual link checker. Mark Done only with an independent adverse-reading review and no unresolved material contradiction. Do not claim semantic correctness from a green structural checker.

## Reconciliation ledger | fill at execution

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/storyteller/operation-and-controller.md #heading to verify at HEAD | technical | pending specific wording/meaning review | no source behavior changed; record doc SHA | not run: Proposed | Documentation asserts a live autonomous investigation loop merely because target architecture describes one; or narrator output mutates mechanics directly. | pending dependent links |

**When selected:** update this plan with verified heading anchors; work only this packet, reconcile and archive; do not start the next DOC packet.
