# UI01 | Introduce one semantic token foundation, preserving current UI behavior

**State:** Done (2026-11-18). **Kind:** implementation. **Order/dependency:** None. UI02 through UI08 stay unselected. Baseline `43d5ddfc068aced3825e25692ec1b2bb14259e2a`.

**Product authority:** [Design system and expressive worlds](../../../../../../docs/product/experience/design-system-and-expression.md).
**Technical authority:** [Semantic design foundation](../../../../../../docs/technical/client/semantic-design-foundation.md).
**Design program:** [Phase 3 initiative](../../../../../designs/open/player-experience-refoundation/phase-3/README.md).
**Existing source ownership:** [Play source map](../../../../../../apps/web/src/features/play/README.md), [Storyteller publication](../../../../../../docs/technical/storyteller/generation-and-publication.md) as applicable. No previous packet is a substitute for reading the current owner.

## Falsifiable outcome

One centrally owned, reusable token vocabulary supplies platform semantic roles plus stable reader roles; Play and Stories can consume it without independently defining competing foundational color/focus/spacing values.

## Code owners and baseline

`apps/web/app/style.css`; new `apps/web/src/shared/design/tokens.css`; `apps/web/src/features/play/ui/story-frame.css`; `apps/web/src/features/stories/stories-library.css`; Storybook preview and focused tests.

**Source basis:** GitHub `main@4e42bd76028ebf13458b799016446cc3f9dae38f` when designed. Cursor MUST begin with `git rev-parse HEAD`, `git status --short`, `pnpm repo:brief --json`, and the actual current owners. Do not copy a stale symbol path or overwrite other work. Study bounded file/symbol slices, not the entire repository.

## Intended implementation delta

1. Define a **minimal semantic registry** as in the client owner: platform canvas/ink/muted/focus/status/action/border; reader paper/ink/edge/measure/leading; spacing/type/elevation/motion scales. Record ownership and contrast logic in a short source README.
2. Load foundation once in Next root and Storybook. Keep existing appearance **visually conservative**: map old `--sf-*`/`--sl-*` defaults to semantic roles where meaning agrees; do not replace every hardcoded value just for a diff.
3. Retain `story-viewport` source-scoped CSS variables as **creative** tokens; they must not override `--ui-danger`, `--ui-focus`, text selection, system notices or reader ink. Remove only proven duplicate declarations.
4. Add small source/Storybook tests for fallback roles, cascade scope, contrast-critical states and no stylesheet leak into public demo/Chamber.

## Acceptance: normal and discriminating negative

Normal: same Now prose/choices and Stories CTA are legible before/after token migration; clear focus and waiting/error states.
Negative: malicious/corrupt V1 scene backdrop or neon accent **cannot recolor system errors or reader ink**. No Storyteller style document creates a global custom property. 320px/200% does not crop choices.

## Explicit non-scope and safety

No final palette, redesigned buttons, Tailwind, CSS-in-JS, arbitrary theme presets, public runtime schema, Query or command changes, or separate `packages/ui`.

**Universal safety constraints:** Do not alter authorized command identity, current Query/write/frozen retry semantics, provider cost, character/game truth or private read scopes to improve CSS. No paid model calls, DB reset, blind migrations, or live destructive operations. Focus, reduced motion, text selection, responsive reading and system status remain mandatory. If this exact outcome demands a new game/backend contract or substantially larger diff, stop and propose a new Change.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership already forbids a scene from recoloring system danger, focus, or command identity. This packet implements that rule and does not rewrite the product promise. | docs/technical/client/semantic-design-foundation.md#ownership-and-css-architecture is constrained by that heading | Owner already selected the hierarchy. A neon scene is not a new palette approval. |
| Technical | changed: docs/technical/client/semantic-design-foundation.md#tokens-primitive-scales-and-semantic-roles-not-a-hardcoded-genre-palette records the implemented role names and the lock that a scene inline style cannot assign reader ink, focus, action, or system status. | docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership | Source proof is the token registry plus the viewport allowlist. Final art direction stays unselected. |
| Code | changed: apps/web/app/style.css, apps/web/src/features/play/ui/story-frame.css, apps/web/src/features/play/ui/story-frame.tsx, and apps/web/src/features/stories/stories-library.css. Negative: a hostile fixture that supplies neon narrative ink, focus, and accent cannot set reader ink, focus, danger, or command color on the viewport. | apps/web/src/features/play/README.md | Existing choice id and backdrop plane stay. Default hex values stay on the agreeing local aliases. |
| Related | changed: work/changes/README.md, STATUS.md, and apps/web/src/features/play/README.md record that this packet is the selected token foundation and that later UI packets remain unselected. | work/designs/open/player-experience-refoundation/phase-3/README.md | Queue selection is not art acceptance and not permission to start UI02. |

## Verification and completion receipt

No provider call was made. Baseline `43d5ddfc068aced3825e25692ec1b2bb14259e2a`.

- `pnpm wiki:change-guard --mode plan` reported ok before the token edits.
- Vitest: `tokens.test.ts`, `story-frame-presentation.test.tsx`, `story-frame.test.tsx`, and `storybook-isolation.test.ts` — 16 tests green.
- `pnpm --filter @offscreen/web typecheck` green. ESLint on the touched TypeScript files reported no warnings.
- Browser, Storybook `Experience/Design tokens`: hostile viewport style contained only chrome, stage, option, vignette, and texture variables. Passage color was rgb(28, 25, 21). Book paper was rgb(247, 241, 230). Book focus variables resolved to `#1d4e89`. Six choices at 320px and 200% text wrapped without horizontal overflow.
- Browser, `http://127.0.0.1:3000/demo`: unpresented book kept those same ink and paper colors. Choosing "Read the sealed notice" advanced the passage. At 320px CSS width the two choices wrapped inside the screen. Public home text stayed rgb(243, 233, 217) and did not become book paper.
- A `.stories-library` probe resolved ink `#f3e9d9`, muted `#b9c2c2`, edge `#33434a`, action `#d7b87c`, focus `#8ec8ff`. `/stories` returned a Nest timeout because the API process was not running. That is not a stylesheet failure.
- Web production build completed: `pnpm --filter @offscreen/web build` compiled and generated the static pages, including `/` and `/demo`. No provider call was made.
- Close diff base is `3d673471`, not the earlier `43d5ddfc`. Three documentation commits landed on main during this execution and are outside UI01.

Source paths for this execution: apps/web/src/shared/design/tokens.css, apps/web/src/shared/design/README.md, apps/web/src/shared/design/tokens.test.ts, apps/web/src/stories/design-tokens.stories.tsx, apps/web/src/features/play/ui/story-frame-presentation.test.tsx, apps/web/src/features/stories/README.md, docs/technical/client/semantic-design-foundation.md, apps/web/src/features/play/README.md, STATUS.md, work/designs/open/documentation-impact-system/AUDIT-2026-11-18.md.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership | product | unchanged: the heading already forbids a scene from recoloring danger, focus, or command identity, and this packet does not edit that page | docs/product/experience/design-system-and-expression.md inspected at 43d5ddfc068aced3825e25692ec1b2bb14259e2a; enforcement is apps/web/src/features/play/ui/story-frame.tsx in the working tree over that SHA | fixture-tested | A hostile narrative ink of #39ff14 was absent from the viewport style and the book passage stayed rgb(28, 25, 21) | The product page already links the technical owner. No route moved. |
| docs/technical/client/semantic-design-foundation.md#tokens-primitive-scales-and-semantic-roles-not-a-hardcoded-genre-palette | technical | changed: the heading now records the implemented role names and the viewport properties a scene may set | docs/technical/client/semantic-design-foundation.md and apps/web/src/shared/design/tokens.css over 43d5ddfc068aced3825e25692ec1b2bb14259e2a | fixture-tested | tokens.css contains no demo or chamber selector, and the viewport assignment list excludes reader ink, focus, action, and system status | apps/web/src/features/play/README.md and apps/web/src/features/stories/README.md point at the token file |
| docs/technical/client/semantic-design-foundation.md#ownership-and-css-architecture | technical | unchanged: the ownership rules and the constrained-by row were not rewritten | docs/technical/client/semantic-design-foundation.md over 43d5ddfc068aced3825e25692ec1b2bb14259e2a | reviewed | The heading still says a scene field cannot recolor errors, selection, or commands | The contract edge to the product heading remains |
| docs/technical/client/architecture.md#who-owns-the-client-guarantee | technical | unchanged: the existing token link still describes the same split, and that page was not edited | docs/technical/client/architecture.md over 43d5ddfc068aced3825e25692ec1b2bb14259e2a | reviewed | The architecture row does not grant a scene permission to restyle a command | No map edit |
| docs/technical/client/presentation-runtime.md#principles-and-non-negotiable-boundaries | technical | unchanged: fictional atmosphere is still not system status, and that page was not edited | docs/technical/client/presentation-runtime.md over 43d5ddfc068aced3825e25692ec1b2bb14259e2a | reviewed | A threatening accent is still not the error state | No map edit |
| docs/technical/client/accessibility-and-performance.md#interaction-acceptance | technical | unchanged: the page already says a creative scene does not change keyboard, focus, or error semantics | docs/technical/client/accessibility-and-performance.md over 43d5ddfc068aced3825e25692ec1b2bb14259e2a | reviewed | The sentence was not widened into a new interaction rule | No map edit |
| STATUS.md | evidence | changed: the visual-system note now records the token registry as fixture-tested and leaves UI02 through DIR03 without this program's code | STATUS.md over 43d5ddfc068aced3825e25692ec1b2bb14259e2a | reviewed | The note does not call the palette final and does not claim UI02 is implemented | The status page still points at work/changes/README.md |

## Cursor handoff when selected

Select **this one packet** in `work/changes/README.md`, keep other packets unselected, refresh current HEAD, inspect the two owner docs and named code, implement the bounded delta, run smallest useful proof, report blockers truthfully, and stop. Do **not** automatically execute the next packet.