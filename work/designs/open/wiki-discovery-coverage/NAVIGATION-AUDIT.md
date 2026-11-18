# Navigation and retrieval audit | post-DOC24 snapshot

**Snapshot:** 781c2fc, clean lean export (SNAPSHOT.json). **Methods:** parse all 81 maintained docs Markdown files with Python markdown-it-py 4.2.0, resolve relative document targets and construct the graph of 70 non-README product/technical pages; inspect \`WIKI-INDEX.json\`, \`scripts/repo-tools/wiki-core/{route,markdown,search,model}.mjs\`, the doc indexes and representative full text. This is an **independent static audit**, not a successful run of repository \`pnpm wiki:health\`; the lean ZIP has no node_modules, and running Node failed on missing \`unified\`. The built-in portable index was exported from the repository with the reported metrics below, but its scores are not re-executed here.

## Quantified findings

| Diagnostic | Current observed value | Meaning and caveat |
| --- | ---: | --- |
| Full portable snapshot | 262 indexed pages, 1,871 sections, 2,351 internal links inspected | Includes maintained agent/source/work pages, not just canonical product/tech |
| Canonical snapshot | 81/81 canonical Markdown pages reachable from docs root | A structural result; **not** authority or semantic completeness |
| Snapshot excluded links | 133 | Lean profile intentionally omits archive/evidence/research-legacy. These are not 133 broken repository links. |
| Portable index broken links | 0 | As reported in \`WIKI-INDEX.json\`; link proof only |
| Non-README product and technical pages | 70 | 28 product, 42 technical |
| Direct cross-page link occurrences among the 70 | 433 | Link occurrences; not distinct dependent claims |
| Distinct directed page edges | 312 | Only ordinary graph links, not necessarily dependencies |
| Links to other canonical pages with a #fragment | 185/433 (43%) | Exact headings improve retrieval but 57% link only to another page |
| Cross-page links on lines 1–20 | 273/433 | Introductory routing dominates, although some are useful explanations |
| Pages with no cross-page canonical link after line 20 | 19/70 | Improved from prior audit's 35, but still a diagnostic to inspect |
| Structured \`Contract dependencies\` tables | 2 pages | \`engine/chronology-and-activities.md\`, \`client/semantic-design-foundation.md\`; intentional WIKI10 pilot is **not** complete risk coverage |
| \`acceptance-scenarios.md\` cross-canonical links | 0 | 3,037 words / 235 lines, several acceptance and proposed-fallback claims; links to research are not counted in this metric |
| \`worlds-and-characters.md\` inbound canonical edge | 0 | Hub route exists; neighboring product claims fail to point here as the world-neutrality owner |
| \`docs/technical/README.md\` direct coverage | 35/42 substantive pages | Seven reachable indirectly, including operationally consequential capture, retention, caching and protocol |
| \`docs/product/README.md\` direct coverage | 20/28, missing eight Admin pages | Admin topic hub routes the eight; not orphaned, but query route is longer |
| Non-H1 sections larger than 5k characters | 25 of 576 | \`wiki:read\` defaults to 5,000 chars with honest continuation. Requiring multiple reads can still cause omission. Six exceed 10k. |
| Multiple H1 in one substantive page | 1 | \`gameplay/acceptance-scenarios.md\`: the long-life benchmark begins as second H1. Its two modes warrant authority and split review. |

## Critical evidence: authority is classified per page, not per selected claim

In \`scripts/repo-tools/wiki-core/route.mjs\`, \`authorityOf(rel, kind, pageText)\` calls \`PROPOSAL_PAGE.test(pageOpening(pageText))\`; each heading inherits the **same page authority**. The portable index therefore labels \`docs/technical/observability/identities-and-evidence.md#turn-evidence-capsule\` as **\`selected-technical\` in the \`normative\` lane**. Yet that exact section starts: “Status: proposed read contract ... No table, API or code is authorized by this section.”

**It also misses at least one entire proposal page.** `docs/technical/observability/retention-and-access.md` begins "**Status: technical/product recommendation ... not approved for implementation**", yet its portable-index H1 is labelled **selected-technical / normative**. The page-level regex only recognizes narrower spellings such as "technical recommendation". This makes keyword tweaks a fragile fix; explicit local status and unknown honesty matter. `docs/technical/client/scene-direction-production.md` is labeled selected-technical despite being a **conditional** technical target with a missing approved provider-writer seam; selected design and approved execution are different axes.

Other mixed-authority examples:
- \`docs/product/storyteller/behavior-and-quality.md#multi-day-evaluation-family\` is marked \`ratified-product\` although its introduction says Proposed/Blocked evaluation, not accepted mandatory proof.
- \`docs/product/gameplay/time-and-autonomy.md#bounded-plans-for-absence\` inherits \`ratified-product\` although the queue is proposed.
- \`docs/technical/client/scene-direction-production.md\` has proposed production protocol sections despite an otherwise selected-system context.

**Impact:** a coding agent requesting top normative sections can be given a subsection with a misleading authority label. The *text* may disclaim the error, but the route metadata invites premature confidence. Do not solve this by moving every proposed paragraph away from a mixed page. Make section-level authority explicit, with accepted target vs current realization as separate dimensions, and fail to UNKNOWN when an unrecognized qualifier matters.

A grep of heading-nearby words finds ~60 **review candidates**, not 60 proven authority errors: many simply describe a proposed *other* thing. Any classifier must be tested on these negative controls instead of keyword matching blindly.

## Strong present capabilities worth retaining

- Snapshot export says 81/81 reached and 0 broken in profile; historical omissions are expressly distinguished.
- \`wiki:read\` supports \`--outline\`, bounded reads, \`--from-line\` and \`--char-offset\`; its “TRUNCATED” notice prevents false claim that the whole section was read.
- \`wiki:find\` separates proposal and normative lanes in concept, has source/dirty provenance and top-N results.
- Product and technical topic hubs route major questions, and source-adjacent READMEs answer actual symbol ownership.
- WIKI10 typed reverse-claim dependencies work for the two seeded selected neighborhoods.
- WIKI11 closes against declared impacts and known dependencies, but cannot detect a relationship nobody wrote down.

## Retrieval-design weak spots beyond counts

1. **No guaranteed per-section authority:** see critical defect above.
2. **Low claim-precision:** majority of direct canonical links lack target anchors, and generic “companions” do not say how an upstream change threatens a dependent.
3. **Long governing sections:** examples: \`platform/data-and-persistence.md#durable-records\` about 18.9k characters; \`storyteller/context-and-memory.md#a-concrete-workspace\` about 17.3k; \`engine/mechanics-and-capabilities.md#prepared-local-opportunities\` about 13.2k. Default \`wiki:read\` returns only the first 5k with explicit continuation, increasing read steps.
4. **Topic-index questions under-represented:** the technical hub does not directly link \`platform/persistence-and-caching.md\`, \`observability/retention-and-access.md\`, \`observability/capture-and-provenance.md\`, or \`lab/experiment-protocol.md\`. They remain reachable, so the failing property is *task-route quality*, not reachability.
5. **Acceptance scenarios disconnected from canonical rules:** its links go to research/examples rather than at the concrete governing risk cases. That can favor imaginative examples over selected authority.
6. **Two ADRs only:** \`docs/decisions/\` records modular engine and React/Next, while significant selected choices in Storyteller, persistent documents, spending, time and staff design are mostly explained in canonical contracts, not independently indexed as decisions. This is a **rationale discoverability** question, not a demand to create fake retrospective approvals.

## Do not optimize the wrong target

Adding a dozen “See also” links may improve degree but not authority-claim recall. Splitting each 5k-character section could damage coherence. Converting a future concept into a selected doc “to fill a gap” would be worse than admitting an open question. Evaluate tasks by correct owner, exact claim/exception, status, affected dependents, bounded read cost and absence of fabricated implementation or policy.
