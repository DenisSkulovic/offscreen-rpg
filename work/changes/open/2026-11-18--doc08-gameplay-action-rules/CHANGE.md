# DOC08 | Clarify player action, commitment, rules and accepted-time semantics

**State:** Proposed (unselected). **Kind:** documentation. **Editorial wave:** S1b. **Order:** after DOC05 and DOC07. **Source basis:** the [editorial audit](../../../designs/open/documentation-editorial-audit/AUDIT-2026-11-18.md) and [page register](../../../designs/open/documentation-editorial-audit/PAGE-REGISTER.md), originally inspected at `f3e3bfe`; refresh HEAD, dirty files and real headings before editing. **Current change remains:** none until explicitly selected.

## Cursor first-screen brief

**Outcome:** Clarify player action, commitment, rules and accepted-time semantics. **No executable modifications authorized.** Start at [editorial standards](../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md), then these canonical owners:
- [actions-and-commitments.md](../../../../docs/product/gameplay/actions-and-commitments.md)
- [rules.md](../../../../docs/product/gameplay/rules.md)
- [time-and-autonomy.md](../../../../docs/product/gameplay/time-and-autonomy.md)
- [selected-architecture.md](../../../../docs/technical/engine/selected-architecture.md)
- [mechanics-and-capabilities.md](../../../../docs/technical/engine/mechanics-and-capabilities.md)

**Known defect:** Write stable definitions for offer, player decision, admission, work/clock time, committed effect and retry without exposing implementation aliases as product requirements. Separate D&D-style chosen rule foundations from aspirational expansion, and keep human/inapplicable-body variants intelligible.

## Approved editorial envelope after selection

Make each product owner claim-led with one normal example and one negative: immediate consequence, long accepted work, no-action quiet interval, interruption, and inapplicable-world mechanic. Link exact governing claims rather than restating technical fences; leave gameplay policy and realization status separate.

Produce a compact before/after claim inventory, classification (selected target / proposed / illustrative / implemented with evidence), exact changed heading anchors and links, and a counterexample showing what the text must **not** imply. Reinspect source/tests only where a factual realization statement is at issue. A good original paragraph may remain untouched with a documented reason. Preserve unique source detail and repair real inbound references, not cosmetic link quotas.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | changed: `docs/product/gameplay/actions-and-commitments.md`, `docs/product/gameplay/rules.md`, `docs/product/gameplay/time-and-autonomy.md`; clarify selected meaning and proposal boundaries without new permission | `docs/product/gameplay/actions-and-commitments.md`, `docs/product/gameplay/rules.md`, `docs/product/gameplay/time-and-autonomy.md`; dependent claim check | Human ratification required for meaning changes; otherwise claim-equivalence review |
| Technical | changed: `docs/technical/engine/selected-architecture.md`, `docs/technical/engine/mechanics-and-capabilities.md`; reconcile selected technical or evidence wording only | `docs/technical/engine/selected-architecture.md`, `docs/technical/engine/mechanics-and-capabilities.md`; no inferred implementation permission | Source SHA and selected-vs-realization check where relevant |
| Code | unchanged because this is a documentation-only Change: no executable source, tests, configuration, migrations or provider behavior may be changed | Exact source owners may be inspected read-only for factual claims | Negative: executable diff or invented test result blocks close |
| Related | unchanged because no hub/anchor relocation is assumed; update inbound links and `docs/README.md` / owner README only if the approved editing actually moves headings or pages | Reverse semantic graph and inbound links; record reviewed unchanged or repaired path for each material dependent | Link/heading integrity and independent context reading |

## Discriminating acceptance

**Normal:** a fresh reader can determine one selected promise, its status at HEAD (when material), one governing dependency and the revised claim without consulting historic Change diaries. **Negative:** The negative is a Storyteller narration granting money or moving a clock without admitted action, or a nonhumanoid character gaining unlimited capability merely because Strength is inapplicable.

**Stop/owner gate:** If examples imply new action or consent rights, stop for owner ratification. Mechanical source edits are forbidden.

**Scope exclusions:** no game code, tests, scripts, CI, migration, live DB, hosting, provider calls, unratified permissions, wholesale formatting or unrelated docs rewrite. Do not merge a policy decision as a style fix. This packet alone does not permit executing DOC09.

## Verification and close receipt

When selected, run the actual available link/graph and Change plan/close checks on a full checkout; record exact commands, failure output, current commit and any missing archive/history limits. Compare before/after claim meaning, check known dependent headings and one independent adverse reading. The [documentation-reconciliation skill](../../../../.agents/skills/documentation-reconciliation/SKILL.md) applies. Do not mark Done with unverified factual claims or a blocked normative decision hidden in selected prose.

## Reconciliation ledger (fill at execution)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/gameplay/actions-and-commitments.md (exact #heading at execution) | product | pending: actual claim-level review needed | no source behavior changed; record docs SHA | not run: Proposed | The negative is a Storyteller narration granting money or moving a clock without admitted action, or a nonhumanoid character gaining unlimited capability merely because Strength is inapplicable. | pending impacted links |

**Next executor step when owner selects:** update the new packet to Ready only after checking source/current authority, then implement this one documentation outcome, verify and archive; never auto-select DOC09.
