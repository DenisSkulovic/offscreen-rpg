# UI08 | Implement restrained, accessible motion with an easy off-switch

**State:** CONDITIONAL; do not execute without UI07 review of actual usability (prepared 2026-11-17). **Current Change remains:** none. This is a prepared bounded future implementation unit, **not permission for Cursor to start on its own**. **Order/dependency:** UI07 evidence and owner approval of the intended 2–3 purposeful effects; no dependency on a motion library.

**Product authority:** [Design system and expressive worlds](../../../../docs/product/experience/design-system-and-expression.md).
**Technical authority:** [Semantic design foundation](../../../../docs/technical/client/semantic-design-foundation.md).
**Design program:** [Phase 3 initiative](../../../designs/open/player-experience-refoundation/phase-3/README.md).
**Existing source ownership:** [Play source map](../../../../apps/web/src/features/play/README.md), [Storyteller publication](../../../../docs/technical/storyteller/generation-and-publication.md) as applicable. No previous packet is a substitute for reading the current owner.

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

## Verification and completion receipt

Source-identity and reduced-motion unit tests, Storybook controlled-motion specimen, browser keyboard/perf evidence; document any added dependency and rollback.

After **actual execution**, update this packet with the implemented exact code paths/SHAs, tests run and their **results**, screenshots or Storybook cases where meaningful, remaining visual/accessibility uncertainties, and reconciled canonical technical/product owner links. Update `apps/web/src/features/play/README.md` if source ownership changes and `STATUS.md` with **proved tier only**. Mark Done/archive only under the repository Change standard after source/tests/acceptance. A pretty mockup alone is not completion.

## Cursor handoff when selected

Select **this one packet** in `work/changes/README.md`, keep other packets unselected, refresh current HEAD, inspect the two owner docs and named code, implement the bounded delta, run smallest useful proof, report blockers truthfully, and stop. Do **not** automatically execute the next packet.