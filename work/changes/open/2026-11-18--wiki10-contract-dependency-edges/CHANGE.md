# WIKI10 | Establish contextual contract links and typed reverse-impact edges

**State:** Proposed; not selected. **Decision gate:** [impact architecture](../../../designs/open/documentation-impact-system/TARGET-ARCHITECTURE.md) accepted, WIKI09 Done. **Dependency:** do not overlap HK06 graph ownership; extend existing wiki-core.

## Cursor first-screen brief

Read [audit](../../../designs/open/documentation-impact-system/AUDIT-2026-11-18.md), [semantic edge design](../../../designs/open/documentation-impact-system/TARGET-ARCHITECTURE.md#2-two-kinds-of-links-two-different-jobs), existing docs/technical/engine/chronology-and-activities.md, docs/product/gameplay/time-and-autonomy.md, docs/technical/client/semantic-design-foundation.md and docs/product/experience/design-system-and-expression.md. Inspect existing exact headings and links before adding anything. Use scripts/repo-tools/wiki-core/model.mjs, markdown.mjs, paths.mjs; preserve current wiki:health graph schema compatibility or version it.

## Outcome

A maintained claim can identify its **governing dependency and review consequence** at the exact relevant section, enabling deterministic reverse lookup without treating generic hyperlinks as mandatory co-review edges. A first small audit cohort demonstrates meaningful inline links and typed dependency edges; no new game rule is invented.

## Planned specification and implementation delta | proposed planned-impact.v1

| Plane | Intended edit / reasoned no-op | Related owners and proof |
| --- | --- | --- |
| **Product docs** | **change navigation only:** add truly useful in-context pointers at selected claim sites where they clarify who governs behavior; **unchanged normative meaning** because this is relation mapping, not ratification | docs/product/gameplay/time-and-autonomy.md and docs/product/experience/design-system-and-expression.md, after heading audit; no false technical-above-product edge |
| **Technical docs** | **change navigation/dependency metadata:** limited heading-scoped “Contract dependencies” tables on dependent technical pages, and inline references where an exact claim uses another contract. **Unchanged runtime guarantees:** these are citations, not new policy | docs/technical/engine/chronology-and-activities.md and docs/technical/client/semantic-design-foundation.md; review related Play/presentation and accessibility boundaries for real dependencies before editing |
| **Code/tools** | **change:** parse typed edges through existing wiki-core Markdown infrastructure, expose reverse index + diagnostics; preserve untyped navigation; add tests | scripts/repo-tools/wiki-core/model.mjs, markdown.mjs, paths.mjs, self-test.mjs (actual owners to confirm at HEAD) |
| **Related docs/maps** | **review:** docs/product/README.md, docs/technical/README.md and any touched source-map only if route changes; no blanket link counts | directed graph, broken anchor test, negative no-consequence test |
| **Development docs** | **change:** document edge vocabulary, correct authority direction, no need to author redundant dependency tables for independent pages | .agents/references/documentation-navigation-standard.md or existing closest owner; not a second registry |

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

## Reconciliation ledger | fill only after execution

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Wiki dependency/navigation authoring contract | developer docs/technical navigation | changed: claim-scoped typed links, normative gameplay claims unchanged | pending executed paths + SHA | not run | see-also false-positive fixture | pending |
