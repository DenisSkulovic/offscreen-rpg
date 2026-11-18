# DOC07 | Rewrite the product vision and core concepts without changing product intent

**State:** Done (2026-11-18). **Kind:** documentation. **Editorial wave:** S1a. **Order:** after DOC06 status/acceptance classification. **Source basis:** the [editorial audit](../../../../../designs/open/documentation-editorial-audit/AUDIT-2026-11-18.md) and [page register](../../../../../designs/open/documentation-editorial-audit/PAGE-REGISTER.md). Inspected at `123a2f34`. No model call and no database.

## Cursor first-screen brief

**Outcome:** Rewrite the product vision and core concepts without changing product intent. **No executable modifications authorized.** Start at [editorial standards](../../../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md), then these canonical owners:
- [vision.md](../../../../../../docs/product/foundations/vision.md)
- [concepts.md](../../../../../../docs/product/foundations/concepts.md)

**Known defect:** The current vision carries strong earned-life, D&D, sparse-world and world-neutral ideas but mixes early proof goals, implementation context and some unqualified autonomy phrases. Concepts mix durable vocabulary with current result-shape annotations.

## Approved editorial envelope after selection

Compare the complete pilot rewrite against every original claim and preserve earned real-time life, risk/loss, rules, player consent, Storyteller creativity, world neutrality and the small-party first-playable ambition. Rewrite the vision and concepts into claim-led sections; route ticket/status/provider budget detail to existing authoritative owners without removing unique decisions. Adopt only reviewed portions of the pilot, not its implied decisions.

Produce a compact before/after claim inventory, classification (selected target / proposed / illustrative / implemented with evidence), exact changed heading anchors and links, and a counterexample showing what the text must **not** imply. Reinspect source/tests only where a factual realization statement is at issue. A good original paragraph may remain untouched with a documented reason. Preserve unique source detail and repair real inbound references, not cosmetic link quotas.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | changed: `docs/product/foundations/vision.md`, `docs/product/foundations/concepts.md`; clarify selected meaning and proposal boundaries without new permission | `docs/product/foundations/vision.md`, `docs/product/foundations/concepts.md`; dependent claim check | Human ratification required for meaning changes; otherwise claim-equivalence review |
| Technical | unchanged because this product editorial Change does not authorize a new runtime contract | `docs/technical/README.md`; no inferred implementation permission | Source SHA and selected-vs-realization check where relevant |
| Code | unchanged because this is a documentation-only Change: no executable source, tests, configuration, migrations or provider behavior may be changed | Exact source owners may be inspected read-only for factual claims | Negative: executable diff or invented test result blocks close |
| Related | unchanged because no hub/anchor relocation is assumed; update inbound links and `docs/README.md` / owner README only if the approved editing actually moves headings or pages | Reverse semantic graph and inbound links; record reviewed unchanged or repaired path for each material dependent | Link/heading integrity and independent context reading |

## Discriminating acceptance

**Normal:** a fresh reader can determine one selected promise, its status at HEAD (when material), one governing dependency and the revised claim without consulting historic Change diaries. **Negative:** The negative is silently demoting small-party play from the intended initial experience, granting automatic decisions on absence, or treating a proposed full mechanics edition as shipped.

**Stop/owner gate:** Normative changes to first-playable collaboration, risk and paid funding remain owner-controlled. Do not use the pilot as self-ratification.

**Scope exclusions:** no game code, tests, scripts, CI, migration, live DB, hosting, provider calls, unratified permissions, wholesale formatting or unrelated docs rewrite. Do not merge a policy decision as a style fix. This packet alone does not permit executing DOC08.

## Verification and close receipt

When selected, run the actual available link/graph and Change plan/close checks on a full checkout; record exact commands, failure output, current commit and any missing archive/history limits. Compare before/after claim meaning, check known dependent headings and one independent adverse reading. The [documentation-reconciliation skill](../../../../../../.agents/skills/documentation-reconciliation/SKILL.md) applies. Do not mark Done with unverified factual claims or a blocked normative decision hidden in selected prose.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/foundations/vision.md#what-this-page-selects | product | changed: the page now names selected promises, the Proposed/Blocked live boundary, and the illustrative spend figure | docs/product/foundations/vision.md at 123a2f34 | documentation-only | a small group is not demoted, and absence does not grant an automatic choice | the new heading does not replace an existing anchor |
| docs/product/foundations/vision.md#why-build-it | product | changed: the portfolio section now says it does not authorize spend and does not change the pace rule | docs/product/foundations/vision.md at 123a2f34 | documentation-only | the illustrative allowance is not a spend authorization | the heading stayed in place |
| docs/product/foundations/vision.md#earned-life | product | unchanged: the earned-life, risk, consent, and prepared-life paragraphs stay because the pilot drops those unique clauses | docs/product/foundations/vision.md at 123a2f34 | documentation-only | a proposed full mechanics edition is not treated as shipped | the heading stayed in place |
| docs/product/foundations/concepts.md#execution-and-storage-concepts | product | changed: the opening now classifies that section's storage names as labels, and the example as illustrative | docs/product/foundations/concepts.md at 123a2f34 | documentation-only | a storage name does not add a scene lifecycle | the heading stayed in place |

exception: work/changes/README.md because the queue line is the selection route for this documentation packet
exception: work/changes/ledger/2026-11.md because the closed-work index records this documentation packet
exception: work/changes/archive/2026-11/README.md because the month index lists the archived packet
exception: work/designs/open/documentation-editorial-audit/EDITORIAL-WAVES.md because the wave table will point at the archived packet

The pilot in work/designs/open/documentation-editorial-audit/PILOT-VISION-REWRITE.md was reviewed and not adopted as a replacement. It would drop the pause-scope sentence, the developer-fixture distinction, the sparse-world example, transformation applicability, the illustrative allowance limit, prepared local life, and the no-chapter rule. No executable diff. Close checks use base 123a2f34. No provider call.
