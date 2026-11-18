# UI04 | Replace exposed in-book link row with accessible quiet contents navigation

**State:** Done (2026-11-18). **Kind:** implementation. **Order/dependency:** UI03 is Done at `4ac9406e437a23be888da3a06ebbfd235916ecf1`. UI05 through UI08 stay unselected. Baseline for this packet is that commit. `pnpm repo:brief --json` reported `change: null` before selection.

**Product authority:** [Design system and expressive worlds](../../../../../../docs/product/experience/design-system-and-expression.md).
**Technical authority:** [Semantic design foundation](../../../../../../docs/technical/client/semantic-design-foundation.md).
**Design program:** [Phase 3 initiative](../../../../../designs/open/player-experience-refoundation/phase-3/README.md).
**Existing source ownership:** [Play source map](../../../../../../apps/web/src/features/play/README.md), [Storyteller publication](../../../../../../docs/technical/storyteller/generation-and-publication.md) as applicable. No previous packet is a substitute for reading the current owner.

## Falsifiable outcome

Book navigation becomes a discreet, discoverable and keyboard-complete contents affordance for Stories/Now/Journal, instead of a constant row of app-like tabs across the page.

## Code owners and baseline

`story-frame.tsx`, relevant book CSS, new book-contents component if needed, `history.tsx` focus/return only, Storybook and userEvent tests.

**Source basis:** GitHub `main@4e42bd76028ebf13458b799016446cc3f9dae38f` when designed. Cursor MUST begin with `git rev-parse HEAD`, `git status --short`, `pnpm repo:brief --json`, and the actual current owners. Do not copy a stale symbol path or overwrite other work. Study bounded file/symbol slices, not the entire repository.

## Intended implementation delta

1. Compare native small `details` or button-controlled menu with actual source-driven navigation before adding any dependency. If native cannot correctly handle Escape, focus return, outside click and browser hash, evaluate **one** unstyled primitive (Radix or React Aria) in a tiny isolated proof; adopt only that package if validated.
2. Remove prominent `← Stories | Now | Journal` horizontal link chrome from the reading header. Give an accessible Contents affordance with visible discoverability and reasonable touch target; controls may open a compact menu/sheet, not a permanent rail.
3. Preserve direct `#story-journal` load, Back/Forward, focus to selected leaf, return to Now and source-identity switch. Explicit menu dismissal on navigation and Escape; history remains read-only.
4. Keep Settings and technical details obtainable via quiet separate disclosure; never hide safety recovery where player cannot find it.

## Acceptance: normal and discriminating negative

Normal: desktop keyboard and mobile touch navigate Stories → Now → Journal → Now; opening menu does not mutate game.
Negative: Escape returns focus to trigger; hidden menu items aren't keyboard focusable; stale story A Journal cannot be shown on B; no focus stolen on SSE publication; direct Journal hash works after refresh.

## Explicit non-scope and safety

No new auth route, all-platform nav overhaul, full-screen UX redesign, page curling, external menu dependency without measured justification.

**Universal safety constraints:** Do not alter authorized command identity, current Query/write/frozen retry semantics, provider cost, character/game truth or private read scopes to improve CSS. No paid model calls, DB reset, blind migrations, or live destructive operations. Focus, reduced motion, text selection, responsive reading and system status remain mandatory. If this exact outcome demands a new game/backend contract or substantially larger diff, stop and propose a new Change.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership already keeps navigation distinct from the passage, and this packet does not rewrite that page. | docs/technical/client/semantic-design-foundation.md#component-criteria | A contents control is not a game command. |
| Technical | changed: docs/technical/client/semantic-design-foundation.md#component-criteria records a button-controlled contents menu with Escape, focus return, and no package. | docs/product/experience/design-system-and-expression.md#product-component-vocabulary-to-design-and-then-implement-incrementally | Native details cannot return focus on Escape, so the menu stays local. |
| Code | changed: apps/web/src/features/play/ui/story-frame.tsx and apps/web/src/features/play/ui/story-frame.test.tsx. Negative: a closed menu does not expose Journal to the keyboard, and Escape returns focus to Contents. | apps/web/src/features/play/view.test.tsx | apps/web/src/features/play/history.tsx stays read-only. |
| Related | changed: work/changes/README.md, STATUS.md, and apps/web/src/features/play/README.md record this contents control and leave UI05 unselected. | work/designs/open/player-experience-refoundation/phase-3/README.md | Queue selection is not permission to start UI05. |

## Verification and completion receipt

Plan guard returned ok before the menu edit. Base SHA `4ac9406e437a23be888da3a06ebbfd235916ecf1`.

Native `details` cannot return focus on Escape or close on an outside click, so the menu is a local button. No menu package was added.

Implemented files: apps/web/src/features/play/ui/book-contents.tsx, apps/web/src/features/play/ui/book-contents.test.tsx, apps/web/src/features/play/ui/story-frame.tsx, apps/web/src/features/play/ui/story-frame.css, apps/web/src/features/play/ui/story-frame.test.tsx, apps/web/src/features/play/view.test.tsx. Owners: docs/technical/client/semantic-design-foundation.md, apps/web/src/features/play/README.md, STATUS.md, work/changes/README.md, work/designs/open/player-experience-refoundation/phase-3/README.md, work/changes/ledger/2026-11.md.

`apps/web/src/features/play/history.tsx` was not edited. The Details disclosure stays outside the menu. `#story-frame-now` and `#story-journal` still select the leaf.

Proof: `vitest run` passed book-contents.test.tsx (3), story-frame.test.tsx (7), story-frame-presentation.test.tsx (4), and view.test.tsx (8). `pnpm --filter @offscreen/web typecheck` passed. ESLint on the touched TypeScript files reported no errors. Storybook `Experience/StoryFrame` Desktop decision showed a collapsed Contents button and no Stories, Now, or Journal links. Opening it showed those three links in a 176px menu. At a 320px viewport the menu stayed inside the 293px leaf and the trigger was 44px tall. Escape closed the menu and returned focus to Contents. Choosing Journal set `#story-journal`, hid Now, showed the journal leaf, and closed the menu. No model call.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership | product | unchanged: the heading already keeps navigation distinct from the passage, and this packet does not edit that page | docs/product/experience/design-system-and-expression.md inspected at 4ac9406e437a23be888da3a06ebbfd235916ecf1 | reviewed | Opening Contents issued zero fetch calls and did not select an intention | The product page already links the technical owner. No route moved. |
| docs/technical/client/semantic-design-foundation.md#component-criteria | technical | changed: the heading now records the button-controlled contents menu and that no menu package was added | docs/technical/client/semantic-design-foundation.md and apps/web/src/features/play/ui/book-contents.tsx over 4ac9406e437a23be888da3a06ebbfd235916ecf1 | fixture-tested | A closed menu had no Journal link, and Escape returned focus to Contents | apps/web/src/features/play/README.md points at the contents file |
| docs/technical/client/semantic-design-foundation.md#ownership-and-css-architecture | technical | unchanged: the ownership rules and the constrained-by row were not rewritten | docs/technical/client/semantic-design-foundation.md over 4ac9406e437a23be888da3a06ebbfd235916ecf1 | reviewed | The heading still says a scene field cannot recolor errors, selection, or commands | The contract edge to the product heading remains |
| docs/technical/client/architecture.md#who-owns-the-client-guarantee | technical | unchanged: that page was not edited and still gives the client the same guarantee | docs/technical/client/architecture.md over 4ac9406e437a23be888da3a06ebbfd235916ecf1 | reviewed | The architecture row does not turn Contents into a game command | No map edit |
| docs/technical/client/presentation-runtime.md#principles-and-non-negotiable-boundaries | technical | unchanged: fictional atmosphere is still not system status, and that page was not edited | docs/technical/client/presentation-runtime.md over 4ac9406e437a23be888da3a06ebbfd235916ecf1 | reviewed | A passage update left focus on Contents | No map edit |
| docs/technical/client/accessibility-and-performance.md#interaction-acceptance | technical | unchanged: the page already requires keyboard, focus, and error semantics, and it was not edited | docs/technical/client/accessibility-and-performance.md over 4ac9406e437a23be888da3a06ebbfd235916ecf1 | reviewed | Escape and an outside click both close the menu | No map edit |
| STATUS.md | evidence | changed: the visual-system note now records the contents menu as fixture-tested and leaves UI05 through DIR03 without this program's code | STATUS.md over 4ac9406e437a23be888da3a06ebbfd235916ecf1 | reviewed | The note does not claim a menu package or that UI05 is implemented | The status page still points at work/changes/README.md |

## Cursor handoff when selected

Select **this one packet** in `work/changes/README.md`, keep other packets unselected, refresh current HEAD, inspect the two owner docs and named code, implement the bounded delta, run smallest useful proof, report blockers truthfully, and stop. Do **not** automatically execute the next packet.