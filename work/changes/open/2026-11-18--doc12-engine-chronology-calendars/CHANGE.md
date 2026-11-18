# DOC12 | Clarify precise time, calendar and tick contracts without revisiting selected policy

**State:** Proposed (unselected). **Kind:** documentation. **Editorial wave:** S2a; execute after DOC05 and DOC11, never automatically. **Source baseline:** [editorial register](../../../designs/open/documentation-editorial-audit/PAGE-REGISTER.md) at `f3e3bfe`; refresh exact HEAD, headings, archived evidence and dirty worktree before selection. **Current change remains:** none.

## Cursor first-screen brief

**Why this Change exists:** Accepted time, execution permission, calendar presentation and exact tick/tag arithmetic are related but different guarantees; status notes can obscure their boundaries.

**Canonical pages to revise:**
- [docs/product/gameplay/time-and-autonomy.md](../../../../docs/product/gameplay/time-and-autonomy.md)
- [docs/technical/engine/chronology-and-activities.md](../../../../docs/technical/engine/chronology-and-activities.md)
- [docs/technical/engine/calendars-and-world-time.md](../../../../docs/technical/engine/calendars-and-world-time.md)
- [docs/technical/engine/ticks-and-tags.md](../../../../docs/technical/engine/ticks-and-tags.md)

Read the [editorial standards](../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md), [execution waves](../../../designs/open/documentation-editorial-audit/EDITORIAL-WAVES.md), and relevant current source/evidence only when factual status is at issue. Never treat a design-only target as shipped.

## Exact intended editorial delta

1. Reframe chronology around permission, admitted interval, holds, settlement and interruption, with exact units and one normal/negative trace.
2. Explain that calendars label or project accepted world time; they do not grant idle time or automatically validate a fictional activity.
3. Keep exact tick arithmetic and tag semantics without inventing measurements, overflow behavior or calendrical policy that is not selected; link governing claims locally.

No bulk formatting, no blanket shortening, no new product policy, no executable edits, no paid provider calls, no new data migration. Move or split only when one canonical responsibility and all inbound anchors can be preserved. Mark a genuinely good subsection reviewed unchanged instead of forcing edits.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because the technical prose refactor may not revise player promises in `docs/product/gameplay/time-and-autonomy.md` | `docs/product/gameplay/time-and-autonomy.md` and their actual dependent headings | Owner ratification required for changed selected meaning; no automatic approval |
| Technical | changed: `docs/technical/engine/chronology-and-activities.md`, `docs/technical/engine/calendars-and-world-time.md`, `docs/technical/engine/ticks-and-tags.md`; reorganize and qualify target, proof and failure boundaries without modifying runtime contracts | `docs/technical/engine/chronology-and-activities.md`, `docs/technical/engine/calendars-and-world-time.md`, `docs/technical/engine/ticks-and-tags.md` and source maps as evidence | Exact selected/proposed vs implemented distinction and safe negative trace |
| Code | unchanged because this documentation-only Change authorizes **no** executable source/test/config/schema edit; source reads are evidence only | No code ownership move is planned; review factual source references only | Negative: any application code diff or invented passing test blocks Done |
| Related | unchanged because no file/anchor move is preapproved; repair `docs/README.md` and affected inbound Markdown links only if editorial movement is justified | All known reverse contract edges and meaningful inline links | Structural checker plus independent claim-level review |

## Success and discriminating negative

**Normal:** a reader can locate the selected claim, its governing rationale, its precise status and its negative branch with a bounded route through these owners. **Negative:** A changed calendar timezone, background tab or absent player is described as independently advancing fiction; negative settlement case must forbid duplicate reward.

**Escalation:** Any unresolved short-action implementation discrepancy found after DOC05 must remain explicitly evidenced, not overwritten. Keep unresolved normative subsection Proposed/Blocked, while permitting only meaning-preserving edits elsewhere if reviewable independently.

**Proof required:** before/after claim inventory and unchanged-contract list, exact affected path/heading/links, real source evidence for any status correction, negative scenario result, `pnpm wiki:health`, `pnpm wiki:change-guard --mode plan` and `--mode close` when available, plus actual link checker. Mark Done only with an independent adverse-reading review and no unresolved material contradiction. Do not claim semantic correctness from a green structural checker.

## Reconciliation ledger | fill at execution

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/engine/chronology-and-activities.md #heading to verify at HEAD | technical | pending specific wording/meaning review | no source behavior changed; record doc SHA | not run: Proposed | A changed calendar timezone, background tab or absent player is described as independently advancing fiction; negative settlement case must forbid duplicate reward. | pending dependent links |

**When selected:** update this plan with verified heading anchors; work only this packet, reconcile and archive; do not start the next DOC packet.
