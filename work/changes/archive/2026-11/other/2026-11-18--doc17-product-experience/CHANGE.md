# DOC17 | Make the player experience contract coherent across Book, navigation and accessibility

**State:** Done (2026-11-18). **Kind:** documentation. **Editorial wave:** S3. **Sequence:** after DOC07 and DOC10. **Baseline:** [70-page register](../../../../../designs/open/documentation-editorial-audit/PAGE-REGISTER.md) and [content audit](../../../../../designs/open/documentation-editorial-audit/AUDIT-2026-11-18.md). Inspected at `585606a6`. No model call and no database.

## Cursor first-screen brief

**Problem:** Nine product experience owners span player trust, Now/Journal/Stories, Living Book, style control and accessibility; current prototype/BOOK milestone notes can read as permanent design constraints.

**Canonical review set:**
- [docs/product/experience/design-system-and-expression.md](../../../../../../docs/product/experience/design-system-and-expression.md)
- [docs/product/experience/entry-and-onboarding.md](../../../../../../docs/product/experience/entry-and-onboarding.md)
- [docs/product/experience/living-book-poc.md](../../../../../../docs/product/experience/living-book-poc.md)
- [docs/product/experience/navigation-and-stories.md](../../../../../../docs/product/experience/navigation-and-stories.md)
- [docs/product/experience/play-and-decisions.md](../../../../../../docs/product/experience/play-and-decisions.md)
- [docs/product/experience/presentation.md](../../../../../../docs/product/experience/presentation.md)
- [docs/product/experience/principles.md](../../../../../../docs/product/experience/principles.md)
- [docs/product/experience/return-and-journal.md](../../../../../../docs/product/experience/return-and-journal.md)
- [docs/product/experience/settings-and-accessibility.md](../../../../../../docs/product/experience/settings-and-accessibility.md)
- [docs/technical/client/semantic-design-foundation.md](../../../../../../docs/technical/client/semantic-design-foundation.md)

Read [editorial standard](../../../../../designs/open/documentation-editorial-audit/EDITORIAL-STANDARD.md), [waves](../../../../../designs/open/documentation-editorial-audit/EDITORIAL-WAVES.md) and exact current owners, not the whole initiative as a coding prompt.

## Designed editing work

1. Audit the nine product pages for duplicated ownership of current passage, saved journal, command identity, error/uncertain status and scene expression. Keep one canonical claim for each; use precise claim-local links from the others.
2. Separate selected reader/system safety and source-faithful published prose from visual calibrations, final-art decisions and proposed storyteller scene direction.
3. Give concrete first visit, denied/waiting/error, lost connection, stale offer, return/journal and 320px/zoom/reduced-motion cases. Remove dated W/BOOK status diary only after capturing evidence links.

Work in the named document sections, with a before/after claim ledger, exact target-vs-realized classifications and reasoned no-edit findings. A split requires mapping all inbound headings and repairing links in the same execution slice. A reader must learn **who owns the promise, which implementation claims are evidenced, and why dependent text would need review**. Never optimize a word-count quota, change executable source or auto-ratify unselected proposals.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | changed: `docs/product/experience/design-system-and-expression.md`, `docs/product/experience/entry-and-onboarding.md`, `docs/product/experience/living-book-poc.md`, `docs/product/experience/navigation-and-stories.md`, `docs/product/experience/play-and-decisions.md`, `docs/product/experience/presentation.md`, `docs/product/experience/principles.md`, `docs/product/experience/return-and-journal.md`, `docs/product/experience/settings-and-accessibility.md`; editorial clarification with existing selected meaning preserved | `docs/product/experience/design-system-and-expression.md`, `docs/product/experience/entry-and-onboarding.md`, `docs/product/experience/living-book-poc.md`, `docs/product/experience/navigation-and-stories.md`, `docs/product/experience/play-and-decisions.md`, `docs/product/experience/presentation.md`, `docs/product/experience/principles.md`, `docs/product/experience/return-and-journal.md`, `docs/product/experience/settings-and-accessibility.md` and governing claim anchors | Owner review when normative meaning would change |
| Technical | unchanged because client/runtime contracts in `docs/technical/client/semantic-design-foundation.md` are governing reference material for the product rewrite | `docs/technical/client/semantic-design-foundation.md` and affected source maps/inbound links | Exact tested status only with inspected SHA; preserve selected target |
| Code | unchanged because the authorized outcome edits Markdown only: no executable sources, tests, migrations, configuration or provider operation can change | Read actual code only to verify dated realization statements | Negative: executable diff or unsupported test claim blocks completion |
| Related | unchanged because no new canonical route is assumed; change `docs/README.md` and relevant product/technical README if actual headings or paths move | All known reverse claim edges, inbound routes and archive citations | Reasoned dependent disposition and real link/heading checks |

## Acceptance and negative proof

**Normal:** fresh reader can isolate the governing claim, relevant current source evidence, one normal path and adverse branch without inferring proposed behaviors are already available. **Negative:** Scene styling recolors system danger/focus, generated synopsis replaces original published passage, or an uncertain submit is presented as success.

**Stop:** Do not set an unratified final palette, art direction or accessibility exception; human visual approval remains separate. Unresolved material claim stays Proposed/Blocked, not quietly edited into accepted canon. No gameplay code or infrastructure changes are authorized. Don't start the next packet automatically.

**Completion evidence:** exact before/after semantic equivalence for selected behavior, revised paths#headings, source/revision for all 'implemented' claims, impact-graph review with explicit unchanged reasons, independent adverse reading, `pnpm wiki:health`, `pnpm wiki:change-guard --mode plan` and `--mode close` plus current docs link checker (only if commands actually executed). A green structural result is not sufficient.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/experience/principles.md#who-owns-each-reader-promise | product | changed: one canonical claim for passage, history, command, uncertainty, and scene expression | docs/product/experience/principles.md at 585606a6 | documentation-only | the three adverse readings below stay on their owner pages | the new heading does not replace an existing anchor |
| docs/product/experience/living-book-poc.md#reader-jobs-and-non-negotiable-outcomes | product | changed: the BOOK01 shell diary now points at STATUS and the client shell record | docs/product/experience/living-book-poc.md at 585606a6 | documentation-only | final visual design stays unaccepted | the reader jobs stayed in place |
| docs/product/experience/living-book-poc.md#poc-journal-intentionally-modest | product | unchanged: a preview stays a preview, and this POC includes no synopsis | docs/product/experience/living-book-poc.md at 585606a6 | documentation-only | a generated synopsis does not replace the original passage | the heading stayed in place |
| docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership | product | changed: scene styling leaves system danger, focus, and command identity alone | docs/product/experience/design-system-and-expression.md at 585606a6 | documentation-only | scene styling does not recolor system danger or focus | no final palette was selected |
| docs/product/experience/play-and-decisions.md#denied-waiting-error-lost-connection-and-a-stale-offer | product | changed: denied, waiting, error, lost connection, stale offer, and uncertain submit stay distinct | docs/product/experience/play-and-decisions.md at 585606a6 | documentation-only | an uncertain submit is not presented as success | the new heading does not replace choice honesty |
| docs/product/experience/play-and-decisions.md#choice-honesty | product | unchanged: the UI still organizes authorized choices and does not invent action authority | docs/product/experience/play-and-decisions.md at 585606a6 | documentation-only | command identity stays on this heading | the heading stayed in place |
| docs/product/experience/return-and-journal.md#reading-a-long-life | product | changed: a generated recap points at the saved original passage | docs/product/experience/return-and-journal.md at 585606a6 | documentation-only | a generated synopsis does not replace the original passage | the heading stayed in place |
| docs/product/experience/presentation.md#product-promises | product | changed: scene expression stays here and final art stays unaccepted | docs/product/experience/presentation.md at 585606a6 | documentation-only | an illustration does not replace the published passage | the heading stayed in place |
| docs/product/experience/navigation-and-stories.md#three-navigation-contexts | product | changed: Now, Journal, and commands point at their owners | docs/product/experience/navigation-and-stories.md at 585606a6 | documentation-only | this page still owns the map of spaces | the three contexts stayed in place |
| docs/product/experience/entry-and-onboarding.md#first-contact | product | changed: a first visit points at the distinct creation states | docs/product/experience/entry-and-onboarding.md at 585606a6 | documentation-only | a first visit does not present an uncertain opening as a saved life | the heading stayed in place |
| docs/product/experience/settings-and-accessibility.md#accessibility-obligations | product | changed: 320px, enlarged text, and reduced motion point at the existing cases | docs/product/experience/settings-and-accessibility.md at 585606a6 | documentation-only | fiction still has no accessibility exception | no new waiver was added |
| docs/technical/client/semantic-design-foundation.md#ownership-and-css-architecture | technical | unchanged: scene decoration still leaves system status and commands on platform roles | docs/technical/client/semantic-design-foundation.md at 585606a6 | documentation-only | the product hierarchy edit did not change the client contract | no heading on that page was edited |

exception: work/changes/README.md because the queue line is the selection route for this documentation change
exception: work/changes/ledger/2026-11.md because the closed-work index records this documentation change
exception: work/changes/archive/2026-11/README.md because the month index lists the archived change
exception: work/designs/open/documentation-editorial-audit/EDITORIAL-WAVES.md because the wave table will point at the archived change

No executable diff. Close checks use base 585606a6. No provider call.
