# UI08 | Implement restrained, accessible motion with an easy off-switch

**State:** Done (2026-11-18). **Order/dependency:** UI07 is Done. The three cues are contents open, read-view navigation, and a new published passage. No motion library.

**Product authority:** [Design system and expressive worlds](../../../../../../docs/product/experience/design-system-and-expression.md).
**Technical authority:** [Semantic design foundation](../../../../../../docs/technical/client/semantic-design-foundation.md).
**Design program:** [Phase 3 initiative](../../../../../designs/open/player-experience-refoundation/phase-3/README.md).
**Existing source ownership:** [Play source map](../../../../../../apps/web/src/features/play/README.md), [Storyteller publication](../../../../../../docs/technical/storyteller/generation-and-publication.md) as applicable. No previous packet is a substitute for reading the current owner.

## Falsifiable outcome

A small coherent motion grammar signals real publication or navigation without implying fabricated progress or hijacking content; reduced-motion and no-effect paths are first-class.

## Code owners and baseline

`apps/web/src/shared/design/` motion token roles, `StoryFrame`/book menu and validated presentation motion CSS, related Storybook/test cases.

**Source basis:** GitHub `main@4e42bd76028ebf13458b799016446cc3f9dae38f` when designed. Cursor MUST begin with `git rev-parse HEAD`, `git status --short`, `pnpm repo:brief --json`, and the actual current owners. Do not copy a stale symbol path or overwrite other work. Study bounded file/symbol slices, not the entire repository.

## Intended implementation delta

1. Use CSS/native transitions initially for three *semantically justified* actions: book contents open/close, read-view navigation and newly **published** passage arrival. Scene ambience remains subtle and behind reader.
2. Gate arrival by verified **source identity change**; not on refetch, initial hydration, optimistic 202, pending generation, scrolling, closing Journal or browser Back.
3. Reduced motion cancels/shortens all effects; focus, text selection, choices and status are never transformed into stale/cloned DOM.
4. Measure actual need before optional Motion for React; if a dependency is necessary, isolate its purpose, output bundle evidence, reduced-motion proof and removal plan. **No 3D page-turn package** in this Change.

## Acceptance: normal and discriminating negative

Normal: a truly new published passage may get one modest arrival cue; book menu movement assists orientation.
Negative: same-source SSE/GET refetch produces zero repeated animation, pending 202 never looks completed, choices never become clickable only after an animation, reduced motion has no drift/pulse.

## Explicit non-scope and safety

No large decorative transition suite, synthetic clocks, blanket glowing buttons, page-curl physics or auto-scrolling while user reads.

**Universal safety constraints:** Do not alter authorized command identity, current Query/write/frozen retry semantics, provider cost, character/game truth or private read scopes to improve CSS. No paid model calls, DB reset, blind migrations, or live destructive operations. Focus, reduced motion, text selection, responsive reading and system status remain mandatory. If this exact outcome demands a new game/backend contract or substantially larger diff, stop and propose a new Change.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership already lets a user safety preference override creative motion, and this packet does not rewrite that page. | docs/technical/client/semantic-design-foundation.md#motion-and-dependency-policy | No page-turn package and no art approval. |
| Technical | changed: docs/technical/client/semantic-design-foundation.md#motion-and-dependency-policy records the three CSS cues and the reduced-motion off switch. | docs/product/experience/design-system-and-expression.md#experience-acceptance | The same passage id does not replay arrival. |
| Code | changed: apps/web/src/features/play/ui/narrative-flow.tsx gates the published-passage cue on a new passage id. Negative: a same-id refresh leaves the arrival mark off and the choice stays enabled. | apps/web/src/features/play/ui/story-frame.tsx | No command identity change. No motion dependency. |
| Related | changed: work/changes/README.md and STATUS.md record this motion slice and leave DIR01 unselected. | work/designs/open/player-experience-refoundation/phase-3/README.md | Queue selection is not permission to start DIR01. |

## Verification and completion receipt

Plan guard returned ok before the source edits. Base SHA `0e55160a8e4e05a3b8691fc29c239007a43d9dca`.

Implemented files: apps/web/src/features/play/ui/passage-arrival.ts, apps/web/src/features/play/ui/narrative-flow.tsx, apps/web/src/features/play/ui/narrative-passage.tsx, apps/web/src/features/play/ui/story-frame.tsx, apps/web/src/features/play/ui/story-frame.css, apps/web/src/features/play/ui/motion-language.test.tsx, apps/web/src/shared/design/tokens.css, apps/web/src/stories/story-frame.stories.tsx. Owners: docs/technical/client/semantic-design-foundation.md, STATUS.md, work/changes/README.md, work/designs/open/player-experience-refoundation/phase-3/README.md, work/changes/ledger/2026-11.md.

apps/web/src/features/play/README.md was not edited. No command handler changed. No motion package was added.

Proof: `vitest run` completed motion-language.test.tsx (4), story-frame.test.tsx (7), book-contents.test.tsx (3), story-frame-presentation.test.tsx (4), and tokens.test.ts (3). `pnpm --filter @offscreen/web typecheck` completed. ESLint on the touched TypeScript files reported no errors. Storybook `Experience/StoryFrame` Published arrival at 320px kept the document scroll width at 320. First paint left `data-passage-enter` false and the Ask choice enabled. A new passage id set the mark and left the choice enabled. A same-id refresh did not start another animation. The Journal link set `data-read-view="enter"`. No model call.

Reduced motion remains a stylesheet off switch. A physical reduced-motion setting was not toggled in the browser. The finished arrival mark can stay on the title; it does not restart the animation.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership | product | unchanged: the heading already lets a user safety preference override creative motion, and this packet does not edit that page | docs/product/experience/design-system-and-expression.md inspected at 0e55160a8e4e05a3b8691fc29c239007a43d9dca | reviewed | The reduced-motion block sets animation to none on the menu, the leaf, and the passage mark | The product page already links the technical owner. No route moved. |
| docs/technical/client/semantic-design-foundation.md#motion-and-dependency-policy | technical | changed: the heading now records the three CSS cues, the passage-id gate, and the reduced-motion off switch | docs/technical/client/semantic-design-foundation.md and apps/web/src/features/play/ui/passage-arrival.ts over 0e55160a8e4e05a3b8691fc29c239007a43d9dca | fixture-tested | A same passage id left the arrival mark off, and a held command did too | No motion package was added |
| docs/technical/client/semantic-design-foundation.md#ownership-and-css-architecture | technical | unchanged: the ownership rules were not rewritten | docs/technical/client/semantic-design-foundation.md over 0e55160a8e4e05a3b8691fc29c239007a43d9dca | reviewed | Scene inline style still cannot assign reader ink, focus, or action | The contract edge to the product heading remains |
| docs/technical/client/architecture.md#who-owns-the-client-guarantee | technical | unchanged: that page was not edited and still gives the client the same guarantee | docs/technical/client/architecture.md over 0e55160a8e4e05a3b8691fc29c239007a43d9dca | reviewed | The arrival cue does not submit a choice | No map edit |
| docs/technical/client/presentation-runtime.md#principles-and-non-negotiable-boundaries | technical | unchanged: atmosphere is still not system status, and that page was not edited | docs/technical/client/presentation-runtime.md over 0e55160a8e4e05a3b8691fc29c239007a43d9dca | reviewed | Drift and choice pulse are cancelled in the reduced-motion block | No map edit |
| docs/technical/client/accessibility-and-performance.md#interaction-acceptance | technical | unchanged: the page already requires keyboard, focus, and reduced motion, and it was not edited | docs/technical/client/accessibility-and-performance.md over 0e55160a8e4e05a3b8691fc29c239007a43d9dca | reviewed | The Ask choice stayed enabled while the arrival mark was on | The inventory from UI07 still records that a physical keyboard ring was not automated |
| STATUS.md | evidence | changed: the visual-system note now records the three cues as fixture-tested and leaves DIR01 through DIR03 without this program's code | STATUS.md over 0e55160a8e4e05a3b8691fc29c239007a43d9dca | reviewed | The note does not claim a motion package or a model call | The status page still points at work/changes/README.md |

## Cursor handoff when selected

Select **this one packet** in `work/changes/README.md`, keep other packets unselected, refresh current HEAD, inspect the two owner docs and named code, implement the bounded delta, run smallest useful proof, report blockers truthfully, and stop. Do **not** automatically execute the next packet.