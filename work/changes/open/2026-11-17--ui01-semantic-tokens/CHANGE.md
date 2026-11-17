# UI01 | Introduce one semantic token foundation, preserving current UI behavior

**State:** Ready to select; first in series (prepared 2026-11-17). **Current Change remains:** none. This is a prepared bounded future implementation unit, **not permission for Cursor to start on its own**. **Order/dependency:** None. BOOK01/02 already in source; recheck HEAD.

**Product authority:** [Design system and expressive worlds](../../../../docs/product/experience/design-system-and-expression.md).
**Technical authority:** [Semantic design foundation](../../../../docs/technical/client/semantic-design-foundation.md).
**Design program:** [Phase 3 initiative](../../../designs/open/player-experience-refoundation/phase-3/README.md).
**Existing source ownership:** [Play source map](../../../../apps/web/src/features/play/README.md), [Storyteller publication](../../../../docs/technical/storyteller/generation-and-publication.md) as applicable. No previous packet is a substitute for reading the current owner.

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

## Verification and completion receipt

Targeted Vitest/RTL + Storybook roles specimen + web typecheck/build + no-provider viewport smoke; record before/after CSS role map and actual files touched.

After **actual execution**, update this packet with the implemented exact code paths/SHAs, tests run and their **results**, screenshots or Storybook cases where meaningful, remaining visual/accessibility uncertainties, and reconciled canonical technical/product owner links. Update `apps/web/src/features/play/README.md` if source ownership changes and `STATUS.md` with **proved tier only**. Mark Done/archive only under the repository Change standard after source/tests/acceptance. A pretty mockup alone is not completion.

## Cursor handoff when selected

Select **this one packet** in `work/changes/README.md`, keep other packets unselected, refresh current HEAD, inspect the two owner docs and named code, implement the bounded delta, run smallest useful proof, report blockers truthfully, and stop. Do **not** automatically execute the next packet.