# WIKI10 | Establish contextual contract links and typed reverse-impact edges

**State:** Done (2026-11-18). **Decision gate:** the [impact architecture](../../../../../designs/open/documentation-impact-system/TARGET-ARCHITECTURE.md) was accepted, and WIKI09 is Done. **Dependency:** this packet extends wiki-core and does not replace the HK06 inventory.

## Cursor first-screen brief

Read [audit](../../../../../designs/open/documentation-impact-system/AUDIT-2026-11-18.md), [semantic edge design](../../../../../designs/open/documentation-impact-system/TARGET-ARCHITECTURE.md#2-two-kinds-of-links-two-different-jobs), existing docs/technical/engine/chronology-and-activities.md, docs/product/gameplay/time-and-autonomy.md, docs/technical/client/semantic-design-foundation.md and docs/product/experience/design-system-and-expression.md. Inspect existing exact headings and links before adding anything. Use scripts/repo-tools/wiki-core/model.mjs, markdown.mjs, paths.mjs; preserve current wiki:health graph schema compatibility or version it.

## Outcome

A maintained claim can identify its **governing dependency and review consequence** at the exact relevant section, enabling deterministic reverse lookup without treating generic hyperlinks as mandatory co-review edges. A first small audit cohort demonstrates meaningful inline links and typed dependency edges; no new game rule is invented.

## Planned specification and implementation delta | proposed planned-impact.v1

| Plane | Intended edit / reasoned no-op | Related owners and proof |
| --- | --- | --- |
| **Product docs** | **change:** docs/product/gameplay/time-and-autonomy.md#pace and docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership gain one navigation pointer. The rule sentences stay as written | No new product promise | negative: no reversed authority edge |
| **Technical docs** | **change:** docs/technical/engine/chronology-and-activities.md#permission-to-advance and docs/technical/client/semantic-design-foundation.md#ownership-and-css-architecture gain one constrained-by row. Runtime guarantees stay as written | Those two headings | fixture |
| **Code/tools** | **change:** scripts/repo-tools/wiki-core/model.mjs and scripts/repo-tools/wiki-core/markdown.mjs parse the table, and scripts/repo-tools/wiki-core/self-test.mjs covers reverse lookup; negative: a see-also link creates no edge | scripts/repo-tools/wiki-core/paths.mjs stays the resolver | fixture |
| **Related docs/maps** | **change:** .agents/references/documentation-navigation-standard.md names the edge vocabulary | docs/product/README.md and docs/technical/README.md stay the routers | no second registry |
| **Development docs** | **change:** .agents/references/documentation-navigation-standard.md records dependent-to-governing direction | No second registry | the standard is the home |

## Functional contract

Use a bounded table (claim-local or page-level with exact source heading) whose **relation** is depends-on / constrained-by / co-change and whose **rationale** says why changing the target triggers review. Dependent -> governing direction is mandatory. Technical claims can be constrained by product intent, never the other way round by authority. Related, see-also, examples, evidence and completed Change links remain ordinary nonbinding Markdown links. Parse current local Markdown anchors through the existing slug resolver, preserve provenance path/line, reject invalid type/path/heading and false proposal-to-canon promotion. Reverse lookup reports candidate dependent headings, never “proof of consistency.”

Build two small representative relation neighborhoods: time/accepted execution and selected reader/scene safety rules. Inspect first and keep only defensible edges; do not invent artificial dependencies to make a graph look dense. A product-to-technical link can describe the implementation path without making implementation the source of product authority. Seed additional families only as independently accepted follow-up, not a hidden expansion of WIKI10. **Do not register Admin authority-and-governance as a binding dependency while that page describes the permission catalog as proposed; use it as a negative ratification test instead.**

## Acceptance and negative

- **Normal:** changing a ratified product time claim identifies the technical execution section that is constrained by it, with reason; changing selected product reader-safety rule identifies the technical semantic-design constraints.
- **Negative:** plain “See also” and a test/evidence citation trigger no blocking relation; malformed edge, reversed product authority, proposed Admin policy claimed as binding, archived source claimed as binding or missing anchor yields clear error/unknown.
- **Graph:** deterministic reverse lookup, cycle deduplication, one-hop default, optional escalated hop visibly labeled; never silently truncate 30 affected headings without warning.
- **Proof:** self-tests and wiki:health after adding accepted real links on full checkout; count baseline vs after and manually inspect relation truth. No blanket prose rewrite.

## Exclusions and safety

No model or vector service; no general wiki migration; no product rule changes, schema/API changes, runtime permission adjustments, paid calls or source code refactors. HK06 owns artifact classification and HK07 owns source Git freshness, so do not duplicate them.

## Proof

`node scripts/repo-tools/wiki-core/self-test.mjs` exited 0. `pnpm wiki:health` reported 81 of 81 canonical pages reachable and 0 broken paths against baseline `f5c96645`. Reverse lookup of Pace and of visual hierarchy each returned one dependent. Model calls were not used.

Known status disagreement, left untouched: docs/technical/engine/authority-and-transitions.md says the deliberate-time correction is prepared but not implemented, while the chronology introduction says the execution gate is implemented. This packet does not rewrite either sentence.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Pace | product | changed: docs/product/gameplay/time-and-autonomy.md#pace gained a navigation pointer to the execution gate. The pace rule sentences are the same | docs/product/gameplay/time-and-autonomy.md at f5c96645 | source-observed | a product-to-technical constrained-by row is rejected | the pointer is the map |
| Visual hierarchy and ownership | product | changed: docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership gained a navigation pointer. The hierarchy rules are the same sentences | docs/product/experience/design-system-and-expression.md at f5c96645 | source-observed | scene color does not become a product rule | the pointer is the map |
| Permission to advance | technical | changed: docs/technical/engine/chronology-and-activities.md#permission-to-advance gained one constrained-by row to Pace. The gate behavior is the same | docs/technical/engine/chronology-and-activities.md at f5c96645 | fixture-tested | a missing governing heading is rejected | the contract table is the map |
| Ownership and CSS architecture | technical | changed: docs/technical/client/semantic-design-foundation.md#ownership-and-css-architecture gained one constrained-by row. No CSS behavior was added | docs/technical/client/semantic-design-foundation.md at f5c96645 | fixture-tested | a see-also link creates no edge | the contract table is the map |
| Contract edge parser | development harness | changed: scripts/repo-tools/wiki-core/markdown.mjs extracts the table and scripts/repo-tools/wiki-core/model.mjs builds the reverse index, covered by scripts/repo-tools/wiki-core/self-test.mjs | those three files at f5c96645 | fixture-tested | a see-also link creates no edge and a cycle is visited once | N/A |
| Edge vocabulary | development harness | changed: .agents/references/documentation-navigation-standard.md now names depends-on, constrained-by, and co-change | .agents/references/documentation-navigation-standard.md at f5c96645 | source-observed | an empty lookup is not treated as safety | that section is the map |
| Selection route | development harness | changed: the queue selects this packet and the design route says WIKI10 is current | work/changes/README.md and work/designs/open/documentation-impact-system/README.md at f5c96645 | source-observed | WIKI11 stays proposed | the queue is the map |

exception: .agents/references/change-work-unit-standard.md because WIKI09 edited that standard and this packet does not
exception: .agents/rules/documentation.md because WIKI09 edited that rule and this packet does not
exception: .agents/skills/change-workflow/SKILL.md because WIKI09 edited that skill and this packet does not
exception: .agents/skills/change-workflow/assets/CHANGE.md because WIKI09 edited that template and this packet does not
exception: .agents/skills/documentation-reconciliation/SKILL.md because WIKI09 edited that skill and this packet does not
exception: scripts/repo-tools/wiki-core/change-guard.mjs because WIKI09 owns the plan-mode guard and this packet does not
exception: scripts/repo-tools/wiki-core/change-guard-self-test.mjs because WIKI09 owns those plan fixtures and this packet does not
exception: work/changes/archive/2026-11/README.md because WIKI09 was archived there and this packet does not
exception: work/changes/archive/2026-11/other/2026-11-18--wiki09-change-impact-contract/CHANGE.md because that archived packet belongs to WIKI09
exception: work/changes/ledger/2026-11.md because the WIKI09 ledger row was recorded with that archive
exception: work/changes/open/2026-11-18--wiki09-change-impact-contract/CHANGE.md because the open copy was moved by the WIKI09 archive
exception: work/designs/README.md because WIKI09 recorded design acceptance there and this packet does not
exception: work/designs/open/documentation-impact-system/DELIVERY-AND-VALIDATION.md because WIKI09 renamed the execution heading and this file only repairs that anchor
