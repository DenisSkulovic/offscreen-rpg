# DOC05 | Reconcile the deliberate-time implementation-status disagreement

**State:** Done (2026-11-18). **Kind:** documentation. **Editorial wave:** S0. **Order:** first accuracy wave. **Source basis:** the [editorial audit](../../../../../designs/open/documentation-editorial-audit/AUDIT-2026-11-18.md) and [page register](../../../../../designs/open/documentation-editorial-audit/PAGE-REGISTER.md). The canonical status text was inspected at `e1efd331`. No model call and no database.

## Cursor first-screen brief

**Outcome:** Reconcile the deliberate-time implementation-status disagreement. **No executable modifications authorized.** Start at [editorial standards](../../../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md), then these canonical owners:
- [time-and-autonomy.md](../../../../../../docs/product/gameplay/time-and-autonomy.md)
- [authority-and-transitions.md](../../../../../../docs/technical/engine/authority-and-transitions.md)
- [chronology-and-activities.md](../../../../../../docs/technical/engine/chronology-and-activities.md)

**Known defect:** Establish which execution gate, accepted-time, finite-action and short-action sub-slices are actually implemented at HEAD, which remain selected targets and what evidence supports each statement. The two overlapping technical introductions currently disagree about the implementation boundary.

## Approved editorial envelope after selection

Inspect the current source symbols, accepted time-related Change receipts and focused tests, then build a capability-by-capability status matrix. Edit only factual realization phrasing in the two technical owners, and only factual status/pointer lines in the product time document if stale. Preserve the selected no-unaccepted-time rule. Move version diary material to evidence/STATUS rather than rewriting mechanics.

Produce a compact before/after claim inventory, classification (selected target / proposed / illustrative / implemented with evidence), exact changed heading anchors and links, and a counterexample showing what the text must **not** imply. Reinspect source/tests only where a factual realization statement is at issue. A good original paragraph may remain untouched with a documented reason. Preserve unique source detail and repair real inbound references, not cosmetic link quotas.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | changed: `docs/product/gameplay/time-and-autonomy.md`; clarify selected meaning and proposal boundaries without new permission | `docs/product/gameplay/time-and-autonomy.md`; dependent claim check | Human ratification required for meaning changes; otherwise claim-equivalence review |
| Technical | changed: `docs/technical/engine/authority-and-transitions.md`, `docs/technical/engine/chronology-and-activities.md`; reconcile selected technical or evidence wording only | `docs/technical/engine/authority-and-transitions.md`, `docs/technical/engine/chronology-and-activities.md`; no inferred implementation permission | Source SHA and selected-vs-realization check where relevant |
| Code | unchanged because this is a documentation-only Change: no executable source, tests, configuration, migrations or provider behavior may be changed | Exact source owners may be inspected read-only for factual claims | Negative: executable diff or invented test result blocks close |
| Related | unchanged because no hub/anchor relocation is assumed; update inbound links and `docs/README.md` / owner README only if the approved editing actually moves headings or pages | Reverse semantic graph and inbound links; record reviewed unchanged or repaired path for each material dependent | Link/heading integrity and independent context reading |

## Discriminating acceptance

**Normal:** a fresh reader can determine one selected promise, its status at HEAD (when material), one governing dependency and the revised claim without consulting historic Change diaries. **Negative:** A reader must correctly distinguish an implemented finite-action path from a proposed generic idle/delegation path. The negative is that clicking nowhere, leaving the tab or opening a stale story must not be misdescribed as permission to advance time.

**Stop/owner gate:** If evidence cannot discriminate implemented slices, leave exact source/status disputed and Blocked; do not select the more flattering statement.

**Scope exclusions:** no game code, tests, scripts, CI, migration, live DB, hosting, provider calls, unratified permissions, wholesale formatting or unrelated docs rewrite. Do not merge a policy decision as a style fix. This packet alone does not permit executing DOC06.

## Verification and close receipt

When selected, run the actual available link/graph and Change plan/close checks on a full checkout; record exact commands, failure output, current commit and any missing archive/history limits. Compare before/after claim meaning, check known dependent headings and one independent adverse reading. The [documentation-reconciliation skill](../../../../../../.agents/skills/documentation-reconciliation/SKILL.md) applies. Do not mark Done with unverified factual claims or a blocked normative decision hidden in selected prose.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/gameplay/time-and-autonomy.md#pace | product | unchanged because fictional time still advances only through an accepted action, activity, or plan entry | packages/application/src/campaign/clock.ts at e1efd331 | source-observed | an untouched menu or a closed tab does not start fictional time | the pace heading stayed in place |
| docs/product/gameplay/time-and-autonomy.md#first-playable-scope | product | changed: an unanswered decision stays open, and a timed fallback is a later phase | docs/product/gameplay/time-and-autonomy.md at e1efd331 | source-observed | a generic missed-window fallback is not described as accepted | the heading stayed in place |
| docs/technical/engine/chronology-and-activities.md#permission-to-advance | technical | changed: the status names the source-observed gate, the offline tests that were read, and the missing gate unit test | packages/game/test/tick-clock.test.mjs at e1efd331 | source-observed | eligibility none does not advance the clock | the heading stayed in place |
| docs/technical/engine/authority-and-transitions.md#what-is-decided-for-the-first-proof | technical | changed: the opening no longer calls the deliberate-time correction unimplemented | docs/technical/engine/authority-and-transitions.md at e1efd331 | source-observed | group progression and delegated decisions remain separate from this slice | the heading stayed in place |

exception: work/changes/README.md because the queue line is the selection route for this documentation packet
exception: work/changes/ledger/2026-11.md because the closed-work index records this documentation packet
exception: work/changes/archive/2026-11/README.md because the month index lists the archived packet
exception: work/designs/open/documentation-editorial-audit/EDITORIAL-WAVES.md because the wave table points at the archived packet

Close checks: `pnpm wiki:change-guard --mode plan` and `--mode close --base e1efd331`. `python scripts/check_docs.py` was run on the canonical edits before this close. No provider call.
