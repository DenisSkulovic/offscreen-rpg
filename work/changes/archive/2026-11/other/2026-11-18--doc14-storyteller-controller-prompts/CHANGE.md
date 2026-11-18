# DOC14 | Separate Storyteller selected agent architecture from real prompt/tool execution

**State:** Done (2026-11-18). **Kind:** documentation. **Editorial wave:** S2c; execute after DOC10 and DOC13, never automatically. **Source baseline:** [editorial register](../../../../../designs/open/documentation-editorial-audit/PAGE-REGISTER.md). Inspected at `8749ca5a`. No model call and no database.

## Cursor first-screen brief

**Why this Change exists:** The desired two-loop/controller model, prompt composition, tool rights and publication fences can be read as one implemented agent loop, although some parts remain selected targets or narrow implemented steps.

**Canonical pages to revise:**
- [docs/product/storyteller/behavior-and-quality.md](../../../../../../docs/product/storyteller/behavior-and-quality.md)
- [docs/technical/storyteller/operation-and-controller.md](../../../../../../docs/technical/storyteller/operation-and-controller.md)
- [docs/technical/storyteller/prompts-and-tools.md](../../../../../../docs/technical/storyteller/prompts-and-tools.md)
- [docs/technical/storyteller/generation-and-publication.md](../../../../../../docs/technical/storyteller/generation-and-publication.md)

Read the [editorial standards](../../../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md), [execution waves](../../../../../designs/open/documentation-editorial-audit/EDITORIAL-WAVES.md), and relevant current source/evidence only when factual status is at issue. Never treat a design-only target as shipped.

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

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/storyteller/operation-and-controller.md#step-status | technical | changed: read, decide, tool call, stop, and publish now name selected target versus the landed recipe | docs/technical/storyteller/operation-and-controller.md at 8749ca5a | documentation-only | the two-loop design is not described as a live autonomous investigation loop | the new heading does not replace an existing anchor |
| docs/technical/storyteller/operation-and-controller.md#two-loops | technical | unchanged: the two loops stay a selected design and not an implementation claim | docs/technical/storyteller/operation-and-controller.md at 8749ca5a | documentation-only | a provider conversation still does not move items or world time | the heading stayed in place |
| docs/technical/storyteller/prompts-and-tools.md#what-the-prompt-must-not-grant | technical | changed: the preamble points at step status and still adds no tool entitlement | docs/technical/storyteller/prompts-and-tools.md at 8749ca5a | documentation-only | a prompt still cannot decide dice, the scheduler, or the payer | the heading stayed in place |
| docs/technical/storyteller/generation-and-publication.md#what-publication-must-refuse | technical | changed: a failed or stale publication keeps the committed situation | docs/technical/storyteller/generation-and-publication.md at 8749ca5a | documentation-only | narrator text does not transfer an item, roll a die, or move the clock | the heading stayed in place |
| docs/product/storyteller/behavior-and-quality.md#falsifiable-principles-adopted | product | unchanged: the adopted quality matrix still forbids prose that grants an uncommitted item | docs/product/storyteller/behavior-and-quality.md at 8749ca5a | documentation-only | technical prose did not grant a new Storyteller right | the heading stayed in place |

exception: work/changes/README.md because the queue line is the selection route for this documentation packet
exception: work/changes/ledger/2026-11.md because the closed-work index records this documentation packet
exception: work/changes/archive/2026-11/README.md because the month index lists the archived packet
exception: work/designs/open/documentation-editorial-audit/EDITORIAL-WAVES.md because the wave table will point at the archived packet

The live route remains uncertified on the controller page. No executable diff. Close checks use base 8749ca5a. No provider call.
