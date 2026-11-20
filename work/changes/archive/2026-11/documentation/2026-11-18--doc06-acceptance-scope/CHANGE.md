# DOC06 | Separate ratified first-playable acceptance from illustrative scenarios

**State:** Done (2026-11-18). **Kind:** documentation. **Editorial wave:** S0. **Order:** after DOC05 for time status wording. **Source basis:** the [editorial audit](../../../../../designs/open/documentation-editorial-audit/AUDIT-2026-11-18.md) and [page register](../../../../../designs/open/documentation-editorial-audit/PAGE-REGISTER.md). Inspected at `54c32884`. No model call and no database.

## Cursor first-screen brief

**Outcome:** Separate ratified first-playable acceptance from illustrative scenarios. **No executable modifications authorized.** Start at [editorial standards](../../../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md), then these canonical owners:
- [acceptance-scenarios.md](../../../../../../docs/product/gameplay/acceptance-scenarios.md)
- [vision.md](../../../../../../docs/product/foundations/vision.md)

**Known defect:** The goblin walkthrough and long-life benchmarks are useful product illustrations, but 'first playable should demonstrate' currently blends solo proof, small-party ambition, shared conflict rules and delegated missed-window decisions.

## Approved editorial envelope after selection

Preserve all valuable scenario narratives; clearly mark scenario assumptions, selected must-pass acceptance, unsettled shared-decision and delegation protocols, and longer-term stress benchmarks. Consider separating the second long-life H1 into a dedicated page only after inbound-link inventory. Maintain the small-group first-playable ambition as vision even if particular multiplayer scheduling policies remain open.

Produce a compact before/after claim inventory, classification (selected target / proposed / illustrative / implemented with evidence), exact changed heading anchors and links, and a counterexample showing what the text must **not** imply. Reinspect source/tests only where a factual realization statement is at issue. A good original paragraph may remain untouched with a documented reason. Preserve unique source detail and repair real inbound references, not cosmetic link quotas.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | changed: `docs/product/gameplay/acceptance-scenarios.md`, `docs/product/foundations/vision.md`; clarify selected meaning and proposal boundaries without new permission | `docs/product/gameplay/acceptance-scenarios.md`, `docs/product/foundations/vision.md`; dependent claim check | Human ratification required for meaning changes; otherwise claim-equivalence review |
| Technical | unchanged because this product editorial Change does not authorize a new runtime contract | `docs/technical/README.md`; no inferred implementation permission | Source SHA and selected-vs-realization check where relevant |
| Code | unchanged because this is a documentation-only Change: no executable source, tests, configuration, migrations or provider behavior may be changed | Exact source owners may be inspected read-only for factual claims | Negative: executable diff or invented test result blocks close |
| Related | unchanged because no hub/anchor relocation is assumed; update inbound links and `docs/README.md` / owner README only if the approved editing actually moves headings or pages | Reverse semantic graph and inbound links; record reviewed unchanged or repaired path for each material dependent | Link/heading integrity and independent context reading |

## Discriminating acceptance

**Normal:** a fresh reader can determine one selected promise, its status at HEAD (when material), one governing dependency and the revised claim without consulting historic Change diaries. **Negative:** The negative is Cursor inferring it may auto-choose on behalf of an absent player, or that a scripted multiplayer example authorizes a new response-window policy.

**Stop/owner gate:** The exact release acceptance boundary for small-group live play requires owner ratification; mark that subsection Proposed/Blocked instead of silently defining it.

**Scope exclusions:** no game code, tests, scripts, CI, migration, live DB, hosting, provider calls, unratified permissions, wholesale formatting or unrelated docs rewrite. Do not merge a policy decision as a style fix. This packet alone does not permit executing DOC07.

## Verification and close receipt

When selected, run the actual available link/graph and Change plan/close checks on a full checkout; record exact commands, failure output, current commit and any missing archive/history limits. Compare before/after claim meaning, check known dependent headings and one independent adverse reading. The [documentation-reconciliation skill](../../../../../../.agents/skills/documentation-reconciliation/SKILL.md) applies. Do not mark Done with unverified factual claims or a blocked normative decision hidden in selected prose.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/foundations/vision.md#first-playable-target | product | changed: the small-group ambition stays, and the exact live acceptance is Proposed/Blocked | docs/product/foundations/vision.md at 54c32884 | documentation-only | a scripted friend invite does not authorize a response-window policy | the heading stayed in place |
| docs/product/gameplay/acceptance-scenarios.md#what-the-first-playable-build-should-demonstrate | product | changed: the walkthrough remains, and the must-pass live boundary is Proposed/Blocked | docs/product/gameplay/acceptance-scenarios.md at 54c32884 | documentation-only | a missed window does not invent a choice for an absent player | the heading stayed in place |
| docs/product/gameplay/worlds-and-characters.md#shared-play-product-target-unsettled-mechanics | product | changed: the sentence now quotes the small-group ambition instead of a solo milestone | docs/product/gameplay/worlds-and-characters.md at 54c32884 | documentation-only | a UI prototype is not acceptance of shared rules | the heading stayed in place |
| docs/product/gameplay/time-and-autonomy.md#first-playable-scope | product | changed: the timing scope follows the small-group target and leaves the live boundary Proposed/Blocked | docs/product/gameplay/time-and-autonomy.md at 54c32884 | documentation-only | closing the browser does not authorize a new choice | the heading stayed in place |
| docs/technical/engine/chronology-and-activities.md#permission-to-advance | technical | unchanged: the pace contract and the clock gate stay as DOC05 recorded them | docs/technical/engine/chronology-and-activities.md at 54c32884 | documentation-only | eligibility none still does not advance the clock | the heading stayed in place |

exception: work/changes/README.md because the queue line is the selection route for this documentation packet
exception: work/changes/ledger/2026-11.md because the closed-work index records this documentation packet
exception: work/changes/archive/2026-11/README.md because the month index lists the archived packet
exception: work/designs/open/documentation-editorial-audit/EDITORIAL-WAVES.md because the wave note records that this packet superseded the earlier solo milestone note
exception: work/designs/open/documentation-editorial-audit/REDLINE-SAMPLES.md because the redline question records the same superseded note
exception: work/designs/open/time-and-autonomy/vision-reconciliation.md because the invite-friend row now matches the restored ambition

Close checks: `pnpm wiki:change-guard --mode plan` and `--mode close --base 54c32884`. No provider call. The long-life second heading was not split. No executable diff.
