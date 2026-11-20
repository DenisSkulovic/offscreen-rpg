# UI03 | Extract stable book reading composition without changing story authority

**State:** Done (2026-11-18). **Kind:** implementation. **Order/dependency:** UI02 is Done at `4265e7d6190d7a5f504fbdd7935fe4ecbf1c4b63`. The merge that kept the REAL packets is `0f99c70400293dbf2f3d5df4fab223d0478aae27`. UI04 through UI08 stay unselected. Baseline for this packet is that merge. `pnpm repo:brief --json` reported `change: null` before selection.

**Product authority:** [Design system and expressive worlds](../../../../../../docs/product/experience/design-system-and-expression.md).
**Technical authority:** [Semantic design foundation](../../../../../../docs/technical/client/semantic-design-foundation.md).
**Design program:** [Phase 3 initiative](../../../../../designs/open/player-experience-refoundation/phase-3/README.md).
**Existing source ownership:** [Play source map](../../../../../../apps/web/src/features/play/README.md), [Storyteller publication](../../../../../../docs/technical/storyteller/generation-and-publication.md) as applicable. No previous packet is a substitute for reading the current owner.

## Falsifiable outcome

Current `StoryFrame` expresses stable ReaderSurface, NarrativeFlow and DecisionGroup responsibilities with smaller testable book composition pieces, while exact current prose/choice IDs/offer commands and Journal read-only status remain unchanged.

## Code owners and baseline

`apps/web/src/features/play/ui/story-frame.tsx`, `story-frame.css`, `narrative-passage.tsx`, `intention-choice.tsx`, `history.tsx`; selectively `apps/web/src/shared/ui` for reused surface; Play source tests/Storybook.

**Source basis:** GitHub `main@4e42bd76028ebf13458b799016446cc3f9dae38f` when designed. Cursor MUST begin with `git rev-parse HEAD`, `git status --short`, `pnpm repo:brief --json`, and the actual current owners. Do not copy a stale symbol path or overwrite other work. Study bounded file/symbol slices, not the entire repository.

## Intended implementation delta

1. Divide presentation concerns into focused components **only where they improve testability**: stable BookSurface, NarrativeFlow (published text), and DecisionGroup (all current options). Keep `PlayScene` as sole Query/command owner.
2. Book is recognizably the same across story worlds. No physical page count, no hardcoded two-leaf split, no rigid right-hand illustration. Desktop can use a spacious flowing reading surface; mobile is one naturally extending leaf.
3. Keep current action/recovery/wait/campaign components mounted with their proper meaning and one legitimate offer. Historical reader never receives current choice callbacks.
4. Use UI01 roles in the book but do not let scene V1 change the page's text contrast or system semantics. A no-direction story must look intentional; optional visuals may be absent.
5. Keep existing hash Now/Journal semantics and focus path intact pending UI04.

## Acceptance: normal and discriminating negative

Normal: very long passage (including 6000-char paragraph), current 6-option set, original saved history and waiting/recovery all display in book.
Negative: no prose cropped, no split hidden options or nested scroll jail, no duplicated historical current buttons, no extra POST when page rerenders or when switching Now/Journal. A → B story identity switch never paints A's content in B.

## Explicit non-scope and safety

No physical paginator, page-flip dependency, rich prose markup, narrative-summary generator, engine/server changes, full art direction or brand polish.

**Universal safety constraints:** Do not alter authorized command identity, current Query/write/frozen retry semantics, provider cost, character/game truth or private read scopes to improve CSS. No paid model calls, DB reset, blind migrations, or live destructive operations. Focus, reduced motion, text selection, responsive reading and system status remain mandatory. If this exact outcome demands a new game/backend contract or substantially larger diff, stop and propose a new Change.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership already keeps the book distinct from commands, and this packet does not rewrite that page. | docs/technical/client/semantic-design-foundation.md#component-criteria | Composition is not a new story command. |
| Technical | changed: docs/technical/client/semantic-design-foundation.md#component-criteria records BookSurface, NarrativeFlow, and DecisionGroup as the book composition, with history still read-only. | docs/product/experience/design-system-and-expression.md#product-component-vocabulary-to-design-and-then-implement-incrementally | Final art direction stays unselected. |
| Code | changed: apps/web/src/features/play/ui/story-frame.tsx composes the book leaf, the published passage, and the current options. Negative: a 6000-character paragraph stays fully present, and switching story identity removes the previous prose without a POST. | apps/web/src/features/play/ui/narrative-passage.tsx | apps/web/src/features/play/history.tsx stays free of current choice callbacks. |
| Related | changed: work/changes/README.md, STATUS.md, and apps/web/src/features/play/README.md record this composition and leave UI04 unselected. | work/designs/open/player-experience-refoundation/phase-3/README.md | Queue selection is not permission to start UI04. |

## Verification and completion receipt

Plan guard returned ok before the composition edit. Base SHA `0f99c70400293dbf2f3d5df4fab223d0478aae27`.

Implemented files: apps/web/src/features/play/ui/book-surface.tsx, apps/web/src/features/play/ui/narrative-flow.tsx, apps/web/src/features/play/ui/decision-group.tsx, apps/web/src/features/play/ui/book-composition.test.tsx. Wired through apps/web/src/features/play/ui/story-frame.tsx and apps/web/src/features/play/ui/story-frame.css. Storybook specimen: apps/web/src/stories/story-frame.stories.tsx. Owners: docs/technical/client/semantic-design-foundation.md, apps/web/src/features/play/README.md, STATUS.md, work/changes/README.md, work/designs/open/player-experience-refoundation/phase-3/README.md, work/changes/ledger/2026-11.md.

`apps/web/src/features/play/history.tsx` and `apps/web/src/features/play/view.tsx` were not edited. PlayScene remains the query and command owner. Now and Journal still use `#story-frame-now` and `#story-journal`.

Proof: `vitest run` passed book-composition.test.tsx (3), story-frame.test.tsx (7), story-frame-presentation.test.tsx (4), and storybook-isolation.test.ts (2). `pnpm --filter @offscreen/web typecheck` passed. ESLint on the touched TypeScript files reported no errors. Storybook `Experience/StoryFrame` Long leaf at 320px and 200% type showed a 6000-character paragraph, overflow visible, max-height none, scroll gap 0, column-count auto, and option ids one through six. The desktop story showed one book leaf at 672px, with the journal leaf hidden and holding zero choices. No model call.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership | product | unchanged: the heading already keeps the book distinct from commands, and this packet does not edit that page | docs/product/experience/design-system-and-expression.md inspected at 0f99c70400293dbf2f3d5df4fab223d0478aae27 | reviewed | Switching from Harbor A to Marsh B removed the harbor prose and issued zero fetch calls | The product page already links the technical owner. No route moved. |
| docs/technical/client/semantic-design-foundation.md#component-criteria | technical | changed: the heading now names BookSurface, NarrativeFlow, and DecisionGroup as the implemented book composition | docs/technical/client/semantic-design-foundation.md and apps/web/src/features/play/ui/story-frame.tsx over 0f99c70400293dbf2f3d5df4fab223d0478aae27 | fixture-tested | A 6000-character paragraph stayed in the document, and the journal leaf contained no current choice | apps/web/src/features/play/README.md points at the three composition files |
| docs/technical/client/semantic-design-foundation.md#ownership-and-css-architecture | technical | unchanged: the ownership rules and the constrained-by row were not rewritten | docs/technical/client/semantic-design-foundation.md over 0f99c70400293dbf2f3d5df4fab223d0478aae27 | reviewed | The heading still says a scene field cannot recolor errors, selection, or commands | The contract edge to the product heading remains |
| docs/technical/client/architecture.md#who-owns-the-client-guarantee | technical | unchanged: that page was not edited and still gives the client the same guarantee | docs/technical/client/architecture.md over 0f99c70400293dbf2f3d5df4fab223d0478aae27 | reviewed | The architecture row does not turn the book leaf into a game command | No map edit |
| docs/technical/client/presentation-runtime.md#principles-and-non-negotiable-boundaries | technical | unchanged: fictional atmosphere is still not system status, and that page was not edited | docs/technical/client/presentation-runtime.md over 0f99c70400293dbf2f3d5df4fab223d0478aae27 | reviewed | The desktop story stayed one column and did not add a page count | No map edit |
| docs/technical/client/accessibility-and-performance.md#interaction-acceptance | technical | unchanged: the page already requires keyboard, focus, and error semantics, and it was not edited | docs/technical/client/accessibility-and-performance.md over 0f99c70400293dbf2f3d5df4fab223d0478aae27 | reviewed | Now and Journal still switch by hash, and that switch issued zero fetch calls | No map edit |
| STATUS.md | evidence | changed: the visual-system note now records the book composition as fixture-tested and leaves UI04 through DIR03 without this program's code | STATUS.md over 0f99c70400293dbf2f3d5df4fab223d0478aae27 | reviewed | The note does not call the palette final and does not claim UI04 is implemented | The status page still points at work/changes/README.md |

## Cursor handoff when selected

Select **this one packet** in `work/changes/README.md`, keep other packets unselected, refresh current HEAD, inspect the two owner docs and named code, implement the bounded delta, run smallest useful proof, report blockers truthfully, and stop. Do **not** automatically execute the next packet.