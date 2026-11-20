# DOC19 | Separate selected persistence and delivery contracts from implementation inventory

**State:** Done (2026-11-18). **Kind:** documentation. **Editorial wave:** S4. **Sequence:** after DOC13 and DOC18; refresh current HEAD, working tree and exact headings before choosing Ready. **Baseline:** [70-page register](../../../../../designs/open/documentation-editorial-audit/PAGE-REGISTER.md) and [content audit](../../../../../designs/open/documentation-editorial-audit/AUDIT-2026-11-18.md), originally against `f3e3bfe`. No implied execution permission or code modification.

## Cursor first-screen brief

**Problem:** Platform persistence combines numerous 'Implemented' record inventories with planned contracts; caching and queue/delivery sections have different sources and recovery behavior.

**Canonical review set:**
- [docs/product/gameplay/continuity.md](../../../../../../docs/product/gameplay/continuity.md)
- [docs/technical/platform/data-and-persistence.md](../../../../../../docs/technical/platform/data-and-persistence.md)
- [docs/technical/platform/persistence-and-caching.md](../../../../../../docs/technical/platform/persistence-and-caching.md)
- [docs/technical/platform/execution-and-delivery.md](../../../../../../docs/technical/platform/execution-and-delivery.md)

Read [editorial standard](../../../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md), [waves](../../../../../designs/open/documentation-editorial-audit/EDITORIAL-WAVES.md) and exact current owners, not the whole initiative as a coding prompt.

## Designed editing work

1. Restructure data-and-persistence around canonical identity, versioned/append-only source, transaction and projection contracts; keep exact existing schemas and proof links without a long release diary.
2. Distinguish Postgres commits from caches, outbox/Temporal signals, replay and reconstructable read projections. Give duplicate-delivery and stale-cache negative traces.
3. Remove duplicated engine ownership explanations; link exact engine/Storyteller result admission and effective cost ownership instead of claiming platform cache is narrative truth.

Work in the named document sections, with a before/after claim ledger, exact target-vs-realized classifications and reasoned no-edit findings. A split requires mapping all inbound headings and repairing links in the same execution slice. A reader must learn **who owns the promise, which implementation claims are evidenced, and why dependent text would need review**. Never optimize a word-count quota, change executable source or auto-ratify unselected proposals.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because the technical editorial work does not revise selected player promises in `docs/product/gameplay/continuity.md` | `docs/product/gameplay/continuity.md` and governing claim anchors | Owner review when normative meaning would change |
| Technical | changed: `docs/technical/platform/data-and-persistence.md`, `docs/technical/platform/persistence-and-caching.md`, `docs/technical/platform/execution-and-delivery.md`; claim-led structure, factual proof status and precise examples, no new runtime behavior | `docs/technical/platform/data-and-persistence.md`, `docs/technical/platform/persistence-and-caching.md`, `docs/technical/platform/execution-and-delivery.md` and affected source maps/inbound links | Exact tested status only with inspected SHA; preserve selected target |
| Code | unchanged because the authorized outcome edits Markdown only: no executable sources, tests, migrations, configuration or provider operation can change | Read actual code only to verify dated realization statements | Negative: executable diff or unsupported test claim blocks completion |
| Related | unchanged because no new canonical route is assumed; change `docs/README.md` and relevant product/technical README if actual headings or paths move | All known reverse claim edges, inbound routes and archive citations | Reasoned dependent disposition and real link/heading checks |

## Acceptance and negative proof

**Normal:** fresh reader can isolate the governing claim, relevant current source evidence, one normal path and adverse branch without inferring proposed behaviors are already available. **Negative:** A duplicated Temporal event creates a second committed result, or a stale cache snapshot overrides a canonical SQL version.

**Stop:** No migrations, source changes, live DB access or invented proof; unsupported source behavior must be reported as discrepancy. Unresolved material claim stays Proposed/Blocked, not quietly edited into accepted canon. No gameplay code or infrastructure changes are authorized. Don't start the next packet automatically.

**Completion evidence:** exact before/after semantic equivalence for selected behavior, revised paths#headings, source/revision for all 'implemented' claims, impact-graph review with explicit unchanged reasons, independent adverse reading, `pnpm wiki:health`, `pnpm wiki:change-guard --mode plan` and `--mode close` plus current docs link checker (only if commands actually executed). A green structural result is not sufficient.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/data-and-persistence.md#who-owns-the-durable-record | technical | changed: canonical SQL identity, versioned or append-only source, and the transaction stay on this page, with caches, delivery, admission, publication, and spending linked | docs/technical/platform/data-and-persistence.md at 9bb6ea44 | documentation-only | a platform cache does not carry engine result admission or Storyteller publication | new heading; selected contracts stayed |
| docs/technical/platform/data-and-persistence.md#durable-records | technical | changed: Implemented subsections are labeled realization records and the selected family list stays | docs/technical/platform/data-and-persistence.md at 9bb6ea44 | documentation-only | the inventory adds no migration | heading stayed; tier link STATUS.md#capability-coverage |
| docs/technical/platform/data-and-persistence.md#implemented-execution-notices | technical | changed: the notice row stays here and queue, outbox, and Temporal delivery stay linked | docs/technical/platform/data-and-persistence.md at 9bb6ea44 | documentation-only | a duplicated Temporal or delivery event does not create a second committed result | execution-and-delivery.md#commands-and-durable-delivery |
| docs/technical/platform/data-and-persistence.md#interaction-contract-component | technical | changed: engine result admission and Storyteller publication stay linked from this heading | docs/technical/platform/data-and-persistence.md at 9bb6ea44 | documentation-only | offer rows on this page do not admit a roll or publish a passage | mechanics-and-capabilities.md#admitted-action-and-time; generation-and-publication.md#what-publication-is-allowed-to-do |
| docs/technical/platform/data-and-persistence.md#story-snapshot-and-chronology | technical | changed: duplicate delivery and a stale cache leave the committed SQL version in place | docs/technical/platform/data-and-persistence.md at 9bb6ea44 | documentation-only | a duplicated Temporal or delivery event does not create a second committed result; a stale cache snapshot does not override the canonical SQL version | execution-and-delivery.md#commands-and-durable-delivery; persistence-and-caching.md#redis-boundary |
| docs/technical/platform/data-and-persistence.md#selected-document-store | technical | changed: the 2026-11-16 source note is labeled a realization record and the selected contract stays | docs/technical/platform/data-and-persistence.md at 9bb6ea44 | documentation-only | the note is not a hosted cutover and adds no migration | heading stayed; tier link STATUS.md#capability-coverage |
| docs/technical/platform/data-and-persistence.md#story-isolation-and-indexes | technical | changed: cache keys stay an isolation rule and the cache mechanism stays linked | docs/technical/platform/data-and-persistence.md at 9bb6ea44 | documentation-only | a stale cache snapshot does not override the canonical SQL version | persistence-and-caching.md#redis-boundary |
| docs/technical/platform/data-and-persistence.md#profiled-storyteller-storage | technical | changed: effective spending stays linked from the accounting note | docs/technical/platform/data-and-persistence.md at 9bb6ea44 | documentation-only | notes and publication status on this page do not set effective spending | spending-and-entitlements.md#distinct-authorities |
| docs/technical/platform/data-and-persistence.md#planned-story-records | technical | unchanged: the selected record families stay on this heading | docs/technical/platform/data-and-persistence.md at 9bb6ea44 | documentation-only | the family table stays a selected target | heading stayed in place |
| docs/technical/platform/persistence-and-caching.md#persistence-and-caching | technical | changed: this page owns caches, and canonical SQL identity stays linked | docs/technical/platform/persistence-and-caching.md at 9bb6ea44 | documentation-only | a stale cache snapshot does not override the canonical SQL version | data-and-persistence.md#who-owns-the-durable-record |
| docs/technical/platform/persistence-and-caching.md#redis-boundary | technical | changed: the existing stale-content rule gains the canonical-version sentence and a cross-link | docs/technical/platform/persistence-and-caching.md at 9bb6ea44 | documentation-only | a stale cache snapshot does not override the canonical SQL version | data-and-persistence.md#story-snapshot-and-chronology |
| docs/technical/platform/persistence-and-caching.md#current-state | technical | changed: the cache-port description is labeled a realization record | docs/technical/platform/persistence-and-caching.md at 9bb6ea44 | documentation-only | the section adds no cache policy | heading stayed; rule stays redis-boundary |
| docs/technical/platform/execution-and-delivery.md#story-execution-with-temporal | technical | changed: this page owns queue, outbox, and Temporal delivery, and Implemented sections are labeled realization records | docs/technical/platform/execution-and-delivery.md at 9bb6ea44 | documentation-only | a duplicated Temporal or delivery event does not create a second committed result | data-and-persistence.md#who-owns-the-durable-record; STATUS.md#capability-coverage |
| docs/technical/platform/execution-and-delivery.md#commands-and-durable-delivery | technical | changed: a duplicate start still locates the existing result, with the committed-row cross-link | docs/technical/platform/execution-and-delivery.md at 9bb6ea44 | documentation-only | a duplicated Temporal or delivery event does not create a second committed result | data-and-persistence.md#story-snapshot-and-chronology |
| docs/product/gameplay/continuity.md#six-kinds-of-record | product | unchanged: player record kinds stay on the product page | docs/product/gameplay/continuity.md at 9bb6ea44 | documentation-only | a derived summary does not replace the current canonical record | heading stayed in place |
| docs/technical/platform/spending-and-entitlements.md#distinct-authorities | technical | unchanged: effective spending stays on this heading | docs/technical/platform/spending-and-entitlements.md at 9bb6ea44 | documentation-only | Storyteller text still cannot change effective policy | heading stayed in place |

exception: work/changes/README.md because the queue line is the selection route for this documentation change
exception: work/changes/ledger/2026-11.md because the closed-work index records this documentation change
exception: work/changes/archive/2026-11/README.md because the month index lists the archived change
exception: work/designs/open/documentation-editorial-audit/EDITORIAL-WAVES.md because the wave table will point at the archived change

No executable diff. Close checks use base 9bb6ea44. No provider call.
