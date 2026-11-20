# UI05 | Unify Stories library under semantic UI roles

**State:** Done (2026-11-18). **Order/dependency:** UI01/UI02 and UI04 are Done. No dependency on backend or book animation.

**Product authority:** [Design system and expressive worlds](../../../../../../docs/product/experience/design-system-and-expression.md).
**Technical authority:** [Semantic design foundation](../../../../../../docs/technical/client/semantic-design-foundation.md).
**Design program:** [Phase 3 initiative](../../../../../designs/open/player-experience-refoundation/phase-3/README.md).
**Existing source ownership:** [Play source map](../../../../../../apps/web/src/features/play/README.md), [Storyteller publication](../../../../../../docs/technical/storyteller/generation-and-publication.md) as applicable. No previous packet is a substitute for reading the current owner.

## Falsifiable outcome

Stories list/CTA/status controls consume the same platform tokens and accessible Action/Notice semantics as Play, retaining real story list operations and empty/loading/error states.

## Code owners and baseline

`apps/web/src/features/stories/stories-library.css`, `live-story-list.tsx`, `draft-list.tsx`, Storybook and existing library tests; shared UI source.

**Source basis:** GitHub `main@4e42bd76028ebf13458b799016446cc3f9dae38f` when designed. Cursor MUST begin with `git rev-parse HEAD`, `git status --short`, `pnpm repo:brief --json`, and the actual current owners. Do not copy a stale symbol path or overwrite other work. Study bounded file/symbol slices, not the entire repository.

## Intended implementation delta

1. Inventory existing `--sl-*` role declarations and duplicate CTA classes. Migrate equivalent semantic roles to UI01 tokens, removing only proven redundant code, while keeping layout readable and responsive.
2. Use UI02 Action/Notice where they reduce duplicated semantics across list, empty, pending and error states. Preserve existing data Query/pagination, draft and live story IDs, authentication and routing.
3. Align typographic hierarchy, focus and spacing with the book's platform identity **without making the Stories library a literal book page**.
4. Add before/after Storybook specimen of populated, empty, loading, API error, private scoped list and long Unicode story title.

## Acceptance: normal and discriminating negative

Normal: entry/continue/create actions still navigate as before; focus is visible and source-based story titles retained.
Negative: no story A/B cache leak, no duplicated POST, no dead CTA in empty/error state, no global styles leaking into Demo/Chamber. Mobile title may wrap without horizontal overflow.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership already separates library chrome from the passage, and this packet does not rewrite that page. | docs/technical/client/semantic-design-foundation.md#component-criteria | The Stories home stays a library, not a book leaf. |
| Technical | changed: docs/technical/client/semantic-design-foundation.md#component-criteria records that live and draft lists use the shared Action and SystemNotice. | docs/product/experience/design-system-and-expression.md#product-component-vocabulary-to-design-and-then-implement-incrementally | List query keys, pagination, and story ids stay as they are. |
| Code | changed: apps/web/src/features/stories/live-story-list.tsx and apps/web/src/features/stories/stories-library.css. Negative: another viewer's cached title does not appear, an error state has no Enter story control, and library CSS has no bare element rule. | apps/web/src/features/stories/draft-list.tsx | Quiet and panel colors stay local. Duplicate CTA rules go only after the shared control replaces them. |
| Related | changed: work/changes/README.md, STATUS.md, and apps/web/src/features/stories/README.md record this library unification and leave UI06 unselected. | work/designs/open/player-experience-refoundation/phase-3/README.md | Queue selection is not permission to start UI06. |

## Explicit non-scope and safety

No search, filter, story renaming or deletion features; no change to schemas/list Query; no final premium art polish.

**Universal safety constraints:** Do not alter authorized command identity, current Query/write/frozen retry semantics, provider cost, character/game truth or private read scopes to improve CSS. No paid model calls, DB reset, blind migrations, or live destructive operations. Focus, reduced motion, text selection, responsive reading and system status remain mandatory. If this exact outcome demands a new game/backend contract or substantially larger diff, stop and propose a new Change.

## Verification and completion receipt

Plan guard returned ok before the list edit. Base SHA `a00d94bcd073df94aea8e4cb2ffd4c609be9106c`.

Implemented files: apps/web/src/features/stories/live-story-list.tsx, apps/web/src/features/stories/draft-list.tsx, apps/web/src/features/stories/stories-library.css, apps/web/src/features/stories/live-story-list.test.tsx, apps/web/src/stories/stories-library.stories.tsx. Owners: docs/technical/client/semantic-design-foundation.md, apps/web/src/features/stories/README.md, STATUS.md, work/changes/README.md, work/designs/open/player-experience-refoundation/phase-3/README.md, work/changes/ledger/2026-11.md.

apps/web/src/features/play/README.md was not edited. List query keys, pagination, story ids, and routes stayed in place. The unused `.stories-library__cta`, `.stories-library__enter`, and `.stories-library__more` rules were removed after Action replaced them. Quiet and panel colors stayed local. The library is not a book leaf.

Proof: `vitest run` completed live-story-list.test.tsx (5), draft-list.test.tsx (1), tokens.test.ts (3), and storybook-isolation.test.ts (2). `pnpm --filter @offscreen/web typecheck` completed. ESLint on the touched TypeScript files reported no errors. Storybook `Platform/Stories library` showed populated, empty, loading, API error, private scoped list, and a long Unicode title. At 320px the Unicode title wrapped to 6 lines and the document scroll width stayed 320. The empty story linked to `/demo` and had no Enter story control. The error story exposed the load-failure alert and no Enter story control. The scripted preview and Chamber stories did not mount `.stories-library`. No model call.

The browser Tab key in this session stayed on the library shell, so the focus ring was not seen on screen. The shared `.action:focus-visible` rule remains the focus treatment.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership | product | unchanged: the heading already keeps platform controls and system status apart from a scene, and this packet does not edit that page | docs/product/experience/design-system-and-expression.md inspected at a00d94bcd073df94aea8e4cb2ffd4c609be9106c | reviewed | The Stories home did not become a book leaf | The product page already links the technical owner. No route moved. |
| docs/technical/client/semantic-design-foundation.md#component-criteria | technical | changed: the heading now records that live and draft lists use Action and SystemNotice and stay a library | docs/technical/client/semantic-design-foundation.md and apps/web/src/features/stories/live-story-list.tsx over a00d94bcd073df94aea8e4cb2ffd4c609be9106c | fixture-tested | Another viewer's cached title did not appear, and a failed load had no Enter story control | apps/web/src/features/stories/README.md points at the list files |
| docs/technical/client/semantic-design-foundation.md#ownership-and-css-architecture | technical | unchanged: the ownership rules were not rewritten, and library CSS stays class-scoped inside apps/web | docs/technical/client/semantic-design-foundation.md over a00d94bcd073df94aea8e4cb2ffd4c609be9106c | reviewed | stories-library.css has no bare element rule and no Demo or Chamber selector | The contract edge to the product heading remains |
| docs/technical/client/architecture.md#who-owns-the-client-guarantee | technical | unchanged: that page was not edited and still gives the client the same guarantee | docs/technical/client/architecture.md over a00d94bcd073df94aea8e4cb2ffd4c609be9106c | reviewed | The list still uses the viewer-keyed infinite query rather than a second cache | No map edit |
| docs/technical/client/presentation-runtime.md#principles-and-non-negotiable-boundaries | technical | unchanged: atmosphere is still not system status, and that page was not edited | docs/technical/client/presentation-runtime.md over a00d94bcd073df94aea8e4cb2ffd4c609be9106c | reviewed | Load failure stays a SystemNotice alert and does not invent an empty library | No map edit |
| docs/technical/client/accessibility-and-performance.md#interaction-acceptance | technical | unchanged: the page already requires keyboard, focus, and error semantics, and it was not edited | docs/technical/client/accessibility-and-performance.md over a00d94bcd073df94aea8e4cb2ffd4c609be9106c | reviewed | The error state uses an alert and the shared Action focus rule was not replaced | No map edit |
| STATUS.md | evidence | changed: the visual-system note now records the Stories library as fixture-tested and leaves UI06 through DIR03 without this program's code | STATUS.md over a00d94bcd073df94aea8e4cb2ffd4c609be9106c | reviewed | The note does not claim search, rename, or a book-page library | The status page still points at work/changes/README.md |

## Cursor handoff when selected

Select **this one packet** in `work/changes/README.md`, keep other packets unselected, refresh current HEAD, inspect the two owner docs and named code, implement the bounded delta, run smallest useful proof, report blockers truthfully, and stop. Do **not** automatically execute the next packet.