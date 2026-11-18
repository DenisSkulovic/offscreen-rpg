# WIKI12 | Classify retrieved headings by real section authority and source realization

**State:** Done (2026-11-18).

## First-screen handoff for Cursor

**Why:** In WIKI-INDEX.json at 781c2fc, docs/technical/observability/identities-and-evidence.md#turn-evidence-capsule is labelled selected-technical/normative even though the section says proposed read contract and authorizes no API. route.mjs uses proposal regex on pageOpening(pageText), then inherits page authority for every heading.

**Exact primary owners:**
- [scripts/repo-tools/wiki-core/route.mjs](../../../../../../scripts/repo-tools/wiki-core/route.mjs)
- [scripts/repo-tools/wiki-core/route-self-test.mjs](../../../../../../scripts/repo-tools/wiki-core/route-self-test.mjs)
- [scripts/repo-tools/wiki-core/markdown.mjs](../../../../../../scripts/repo-tools/wiki-core/markdown.mjs)
- [scripts/repo-tools/wiki-find.mjs](../../../../../../scripts/repo-tools/wiki-find.mjs)

Implement/revise **only** the designed knowledge-system outcome below. The technical/source owners above are navigation routes; verify exact exports and selected headings at current HEAD. When a source path differs, stop and repair this plan before applying a larger diff.

## Intended work

1. Implement a conservative section-local authority determination with explicit status/selected/proposed/illustrative inheritance only when safe. Keep normative authority separate from realized implementation/proof status.
2. Preserve exact source path#heading, SHA and dirty provenance. Mixed or unknown sections must report uncertainty rather than silently become normative or disappear.
3. Add negative controls: chosen paragraph that mentions another proposal remains selected; proposal nested under selected page remains proposal; status evidence is not gameplay authority; ordinary product page with an example remains product. **Whole-page negative:** `docs/technical/observability/retention-and-access.md` says `technical/product recommendation; not approved` but the portable index currently labels its H1 `selected-technical/normative`; fix that, too. **Conditional target:** scene-direction-production selected *design investigation* must not be inferred as authorized paid production.
4. Ensure portable WIKI-INDEX and wiki:find agree on authority metadata. If schema changes, version or migrate explicitly and update route self-tests; do not fork a second source index.

Do not invent product policy, treat proposal as selected, require external services, mass rewrite the wiki, copy another registry, or automatically select another packet. A duplicate page/link/score can be worse than a missing one.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no game product promise is altered; the query result must not confer permission | `docs/product/README.md` and relevant selected claims as noneditable authority | Before/after product meaning unchanged; explicit owner review for any exception |
| Technical | unchanged because evidence and staff technical contracts stay as written; this Change only labels how they are retrieved | `docs/technical/README.md` and governing selected/proposed headings | No inferred new runtime behavior; negative classification proof |
| Code | changed: scripts/repo-tools/wiki-core/route.mjs and route-self-test.mjs, with the existing shared Markdown parser if strictly necessary; negative: proposed capsule cannot rank as a selected grant | scripts/repo-tools/wiki-core/route.mjs and nearest existing test/maintainer module only | Real focused fixtures, no provider/DB/deploy |
| Related | changed: .agents/references/documentation-navigation-standard.md and docs/README.md only to explain section-level authority semantics when actually needed | Exact reverse contract links and relevant index/README; archive only as history | Inbound link integrity, no duplicated owner, meaningful semantic review |

## Acceptance and falsification

**Normal:** a fresh agent obtains the right governing claim, correct authority status, relevant dependent and accurate source/proof boundary with bounded reading. **Negative:** Turn Evidence Capsule or the proposed multi-day Storyteller evaluation becomes a normative result in search while the text explicitly withholds acceptance.

**Checks and evidence:** Provider-free route-self-test, portable snapshot export fixture, manual check of selected, proposal, mixed and status sections with exact expected labels. Record actual commands and results, input revision, skipped tests and novel unknowns. Run existing `pnpm wiki:change-guard --mode plan` and `--mode close` for the selected packet in the full checkout. A clean route or 'Done' label cannot substitute for semantic acceptance.

## Reconciliation ledger (fill only after real execution)

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| `scripts/repo-tools/wiki-core/route.mjs` section authority (schema v2) | development tooling; not product or technical authority | changed: each heading is labeled from its own status line or explicit self-label, including a status line that follows an Owns line, then inherits a settled parent; realization stays a separate field | `scripts/repo-tools/wiki-core/route.mjs`, `scripts/repo-tools/wiki-core/route-self-test.mjs`, `scripts/repo-tools/wiki-find.mjs`; inspected SHA `b3113814` | fixture-tested: `node scripts/repo-tools/wiki-core/route-self-test.mjs` passed | A heading that only mentions another proposal stays selected. A nested proposal stays in the proposal lane. An Owns line followed by Status: proposed stays proposal. Status evidence stays status and selected false. An ordinary product example stays product. Mixed status stays uncertain and is still returned. | Portable index and wiki:find both read this section record's authority and lane. No second index. |
| `docs/technical/observability/retention-and-access.md` whole page | technical recommendation, not an approved contract | unchanged: the page text is still an unapproved recommendation; the retrieval label changed from selected-technical/normative to proposal | `docs/technical/observability/retention-and-access.md`; inspected SHA `b3113814` | source-observed and fixture-tested on the same status spelling | No heading on that page is `selected-technical` or in the normative lane. The H1 is `proposal`. | No product or technical sentence was rewritten. |
| `docs/technical/observability/identities-and-evidence.md#turn-evidence-capsule` | proposed read contract; the page target stays selected technical | unchanged: the section still authorizes no table, API, or code; the label is now proposal, while the page H1 stays selected-technical with realization `unimplemented` | `docs/technical/observability/identities-and-evidence.md#turn-evidence-capsule`; inspected SHA `b3113814` | source-observed: `findSections` keeps that anchor out of `normative` and in `proposalLane` | The Owner map and the decision section mention a proposal and remain `selected-technical`. The capsule does not rank as selected or normative. | Same route record feeds `wiki:find` and the portable `authority`/`lane` projection. |
| `docs/technical/client/scene-direction-production.md` H1 and `### Proposed publication protocol` | conditional technical target; design investigation, not a production grant | unchanged: the page still withholds provider-writing approval; the H1 label is `uncertain` / `not-paid-production`, and the protocol heading is `proposal` | `docs/technical/client/scene-direction-production.md`; inspected SHA `b3113814` | source-observed | No heading on that page is in the normative lane, and none has realization `implemented`. Selected design is not labeled as authorized paid production. | Retrieval note only. The conditional page link in `docs/README.md` was already conditional. |
| `docs/product/storyteller/behavior-and-quality.md#multi-day-evaluation-family` and `#selected-solo-proof-boundary` | product behavior; multi-day family is Proposed/Blocked, solo proof is selected | unchanged: product sentences were not edited; labels follow those sentences | `docs/product/storyteller/behavior-and-quality.md`; inspected SHA `b3113814` | source-observed | Multi-day is `proposal`. The solo proof mentions Proposed/Blocked and stays `ratified-product`. | No gameplay rule moved. |
| `docs/product/gameplay/time-and-autonomy.md` routine example and bounded-plans heading | selected time rules, with one explicit proposed queue | unchanged: the page text was not edited | `docs/product/gameplay/time-and-autonomy.md`; inspected SHA `b3113814` | source-observed | The routine section contains an example and mentions the proposed first solo policy, and it stays `ratified-product`. The bounded-plans heading, whose first sentence is the proposed queue, stays `proposal`. | No gameplay rule moved. |
| `.agents/references/documentation-navigation-standard.md` retrieval bullet and `docs/README.md#documentation` opening | agent navigation, not game authority | changed: one short explanation that find labels are section-local and that uncertain or status hits are not grants | `.agents/references/documentation-navigation-standard.md`, `docs/README.md#documentation`; inspected SHA `b3113814` | source-observed against the route behavior above | The new sentences do not promote a proposal, a status page, or scene-direction production to a selected grant. | These two routes now describe schema v2 labels. No canonical owner was duplicated. |

**Stop rules:** any need to enlarge source or product authority, use paid provider, migrate DB, or claim new permissions requires a separate owner decision. No self-authorization and no automatic next packet.
