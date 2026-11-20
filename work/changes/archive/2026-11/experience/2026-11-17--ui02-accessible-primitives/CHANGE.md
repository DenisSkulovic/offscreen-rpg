# UI02 | Build a tiny shared semantic Action + SystemNotice layer

**State:** Done (2026-11-18). **Kind:** implementation. **Order/dependency:** UI01 is Done at `a3d79338bbc1ff86039ef627159dde93dd07da4b`. UI03 through UI08 stay unselected. Baseline for this packet is that commit. `pnpm repo:brief --json` reported `change: null` before selection.

**Product authority:** [Design system and expressive worlds](../../../../../../docs/product/experience/design-system-and-expression.md).
**Technical authority:** [Semantic design foundation](../../../../../../docs/technical/client/semantic-design-foundation.md).
**Design program:** [Phase 3 initiative](../../../../../designs/open/player-experience-refoundation/phase-3/README.md).
**Existing source ownership:** [Play source map](../../../../../../apps/web/src/features/play/README.md), [Storyteller publication](../../../../../../docs/technical/storyteller/generation-and-publication.md) as applicable. No previous packet is a substitute for reading the current owner.

## Falsifiable outcome

One accessible shared Action (navigation vs action) and SystemNotice contract replaces duplicated control/status semantics in at least two existing real consumers without moving gameplay commands.

## Code owners and baseline

New `apps/web/src/shared/ui/` and tests/stories; selected uses in `apps/web/src/features/play/ui/`, `apps/web/src/features/stories/`; existing Play `intention-choice.tsx` retains commit/explore identity.

**Source basis:** GitHub `main@4e42bd76028ebf13458b799016446cc3f9dae38f` when designed. Cursor MUST begin with `git rev-parse HEAD`, `git status --short`, `pnpm repo:brief --json`, and the actual current owners. Do not copy a stale symbol path or overwrite other work. Study bounded file/symbol slices, not the entire repository.

## Intended implementation delta

1. Introduce **Action** roles for real button/link controls with explicit semantic variants (primary/secondary/quiet/critical), disabled/pending, accessible labels, focus ring and no button-as-div. A navigation action is a link; a mutation is a button: do not blur that distinction with permissive polymorphic props.
2. Introduce **SystemNotice** (neutral/attention/error/success) with textual message, optional caller-provided action, no fake spinner/progress/time. Use `role=status` or `alert` only where warranted, not on every render.
3. Integrate in **two bounded consumers** such as Storybook/Stories CTA and Play's static error/recovery presentation. Preserve `resolution.submitChoice`/`control.submit` and the full existing retry/409/202/frozen-intent flow. If a control has special server authority, adapt its styling via wrapper, don't replace owner.
4. Storybook shows focus/disabled/pending/error, keyboard, reduced motion and width/text-scale states.

## Acceptance: normal and discriminating negative

Normal: shared Action works as real link or button with correct focus; notices preserve truthful pending/error content.
Negative: book page navigation makes zero POSTs; an action that's disabled stays disabled even if a scene directive says `luminous`. No duplicate submit on Enter/Space. 401/409 recovery remains reachable.

## Explicit non-scope and safety

No generic DataTable, Modal, Card zoo, global form rewrite, icon pack adoption, package-wide UI replatforming or replacement of mutation hooks.

**Universal safety constraints:** Do not alter authorized command identity, current Query/write/frozen retry semantics, provider cost, character/game truth or private read scopes to improve CSS. No paid model calls, DB reset, blind migrations, or live destructive operations. Focus, reduced motion, text selection, responsive reading and system status remain mandatory. If this exact outcome demands a new game/backend contract or substantially larger diff, stop and propose a new Change.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership already keeps system status and commands distinct from scene decoration. This packet does not rewrite that promise. | docs/technical/client/semantic-design-foundation.md#component-criteria | A shared control is not a new game command. |
| Technical | changed: docs/technical/client/semantic-design-foundation.md#component-criteria records that Action and SystemNotice are the implemented shared controls, and that a scene cannot enable a disabled action. | docs/product/experience/design-system-and-expression.md#product-component-vocabulary-to-design-and-then-implement-incrementally | Final art direction stays unselected. |
| Code | changed: apps/web/app/(authenticated)/stories/page.tsx, apps/web/src/features/stories/opening-preview.tsx, and apps/web/src/features/play/view.tsx. Negative: a disabled action stays disabled when marked luminous, and a navigation action renders a link that does not POST. | apps/web/src/features/play/README.md | Intention choice, frozen retry, and resolution submit stay in their current owners. |
| Related | changed: work/changes/README.md, STATUS.md, and apps/web/src/features/play/README.md record this selected control layer and leave UI03 unselected. | work/designs/open/player-experience-refoundation/phase-3/README.md | Queue selection is not permission to start UI03. |

## Verification and completion receipt

Plan guard returned ok before code edits. Base SHA `a3d79338bbc1ff86039ef627159dde93dd07da4b`.

Implemented files: apps/web/src/shared/ui/action.tsx, apps/web/src/shared/ui/system-notice.tsx, apps/web/src/shared/ui/controls.css, apps/web/src/shared/ui/controls.test.tsx, apps/web/src/shared/ui/README.md, apps/web/src/stories/shared-controls.stories.tsx. Consumers: apps/web/app/(authenticated)/stories/page.tsx, apps/web/src/features/stories/opening-preview.tsx, apps/web/src/features/play/view.tsx. Comment-only token note: apps/web/src/shared/design/tokens.css and apps/web/src/shared/design/README.md. Owners: docs/technical/client/semantic-design-foundation.md, apps/web/src/features/play/README.md, apps/web/src/features/stories/README.md, STATUS.md, work/changes/README.md, work/designs/open/player-experience-refoundation/phase-3/README.md, work/changes/ledger/2026-11.md.

`resolution-recovery.tsx` and `intention-choice.tsx` were not edited. Generate, Start, frozen retry, and `refetchSnapshot` keep their existing handlers. Preview choice chips stay disabled and are not Actions. The Stories chrome nav stays `next/link`.

Proof: `vitest run` passed controls.test.tsx (4), opening-preview.test.tsx (5), view.test.tsx (8, including the refresh control that increased GET and left PUT at 0), tokens.test.ts (3), and storybook-isolation.test.ts (2). `pnpm --filter @offscreen/web typecheck` passed. ESLint on the touched TypeScript files reported no errors. Storybook `Experience/Shared controls` at http://127.0.0.1:6006/iframe.html?id=experience-shared-controls--action-and-notice showed Hold disabled with `data-surface=luminous` (the browser refused the click), Starting story busy and disabled, zero progressbar nodes, critical ink rgb(240, 180, 174), attention/error/success borders on the status tokens with inherited text color, and a Create a story anchor click that issued zero fetch calls. The long label at 32px inside a 320px column was 173px tall and did not overflow. No model call.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership | product | unchanged: the heading already keeps system status and commands distinct from scene decoration, and this packet does not edit that page | docs/product/experience/design-system-and-expression.md inspected at a3d79338bbc1ff86039ef627159dde93dd07da4b | reviewed | A luminous data-surface did not clear the disabled attribute | The product page already links the technical owner. No route moved. |
| docs/technical/client/semantic-design-foundation.md#component-criteria | technical | changed: the heading now names Action and SystemNotice as the implemented shared controls | docs/technical/client/semantic-design-foundation.md and apps/web/src/shared/ui/action.tsx over a3d79338bbc1ff86039ef627159dde93dd07da4b | fixture-tested | A navigation action rendered an anchor and the click issued zero fetch calls. Enter and Space each activated a button once. | apps/web/src/features/play/README.md and apps/web/src/features/stories/README.md point at the shared controls |
| docs/technical/client/semantic-design-foundation.md#tokens-primitive-scales-and-semantic-roles-not-a-hardcoded-genre-palette | technical | changed: the heading now says SystemNotice and the critical Action paint danger and success, and a scene still cannot assign those roles | apps/web/src/shared/ui/controls.css and apps/web/src/shared/design/tokens.css over a3d79338bbc1ff86039ef627159dde93dd07da4b | fixture-tested | tokens.css still has no element selector, and the error notice text color stayed the inherited ink | The token README states the same paint boundary |
| docs/technical/client/semantic-design-foundation.md#ownership-and-css-architecture | technical | unchanged: the ownership rules and the constrained-by row were not rewritten | docs/technical/client/semantic-design-foundation.md over a3d79338bbc1ff86039ef627159dde93dd07da4b | reviewed | The heading still says a scene field cannot recolor errors, selection, or commands | The contract edge to the product heading remains |
| docs/technical/client/architecture.md#who-owns-the-client-guarantee | technical | unchanged: that page was not edited and still gives the client the same guarantee | docs/technical/client/architecture.md over a3d79338bbc1ff86039ef627159dde93dd07da4b | reviewed | The architecture row does not turn a shared control into a game command | No map edit |
| docs/technical/client/presentation-runtime.md#principles-and-non-negotiable-boundaries | technical | unchanged: fictional atmosphere is still not system status, and that page was not edited | docs/technical/client/presentation-runtime.md over a3d79338bbc1ff86039ef627159dde93dd07da4b | reviewed | Refresh scene still calls refetchSnapshot and does not submit a choice | No map edit |
| docs/technical/client/accessibility-and-performance.md#interaction-acceptance | technical | unchanged: the page already requires keyboard, focus, and error semantics, and it was not edited | docs/technical/client/accessibility-and-performance.md over a3d79338bbc1ff86039ef627159dde93dd07da4b | reviewed | A pending action exposes aria-busy and no progress animation role | No map edit |
| STATUS.md | evidence | changed: the visual-system note now records Action and SystemNotice as proved and leaves UI03 through DIR03 without this program's code | STATUS.md over a3d79338bbc1ff86039ef627159dde93dd07da4b | reviewed | The note does not call the palette final and does not claim UI03 is implemented | The status page still points at work/changes/README.md |

## Cursor handoff when selected

Select **this one packet** in `work/changes/README.md`, keep other packets unselected, refresh current HEAD, inspect the two owner docs and named code, implement the bounded delta, run smallest useful proof, report blockers truthfully, and stop. Do **not** automatically execute the next packet.