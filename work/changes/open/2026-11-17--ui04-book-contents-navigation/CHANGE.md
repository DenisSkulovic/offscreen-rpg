# UI04 | Replace exposed in-book link row with accessible quiet contents navigation

**State:** Ready after UI03; visual affordance remains POC not final (prepared 2026-11-17). **Current Change remains:** none. This is a prepared bounded future implementation unit, **not permission for Cursor to start on its own**. **Order/dependency:** UI03 composition seams; existing hash/back-forward contract must be observed.

**Product authority:** [Design system and expressive worlds](../../../../docs/product/experience/design-system-and-expression.md).
**Technical authority:** [Semantic design foundation](../../../../docs/technical/client/semantic-design-foundation.md).
**Design program:** [Phase 3 initiative](../../../designs/open/player-experience-refoundation/phase-3/README.md).
**Existing source ownership:** [Play source map](../../../../apps/web/src/features/play/README.md), [Storyteller publication](../../../../docs/technical/storyteller/generation-and-publication.md) as applicable. No previous packet is a substitute for reading the current owner.

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

## Verification and completion receipt

RTL/userEvent keyboard and browser URL history tests; Storybook states; 320/375 with 200% text; focused manual tab order check.

After **actual execution**, update this packet with the implemented exact code paths/SHAs, tests run and their **results**, screenshots or Storybook cases where meaningful, remaining visual/accessibility uncertainties, and reconciled canonical technical/product owner links. Update `apps/web/src/features/play/README.md` if source ownership changes and `STATUS.md` with **proved tier only**. Mark Done/archive only under the repository Change standard after source/tests/acceptance. A pretty mockup alone is not completion.

## Cursor handoff when selected

Select **this one packet** in `work/changes/README.md`, keep other packets unselected, refresh current HEAD, inspect the two owner docs and named code, implement the bounded delta, run smallest useful proof, report blockers truthfully, and stop. Do **not** automatically execute the next packet.