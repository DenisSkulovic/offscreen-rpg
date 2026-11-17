# UI03 | Extract stable book reading composition without changing story authority

**State:** Ready after UI02 (prepared 2026-11-17). **Current Change remains:** none. This is a prepared bounded future implementation unit, **not permission for Cursor to start on its own**. **Order/dependency:** UI02 primitives and UI01 semantic foundation.

**Product authority:** [Design system and expressive worlds](../../../../docs/product/experience/design-system-and-expression.md).
**Technical authority:** [Semantic design foundation](../../../../docs/technical/client/semantic-design-foundation.md).
**Design program:** [Phase 3 initiative](../../../designs/open/player-experience-refoundation/phase-3/README.md).
**Existing source ownership:** [Play source map](../../../../apps/web/src/features/play/README.md), [Storyteller publication](../../../../docs/technical/storyteller/generation-and-publication.md) as applicable. No previous packet is a substitute for reading the current owner.

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

## Verification and completion receipt

Existing story-frame/history/view tests plus new structural tests; 320/375/768/1440 and large type; typecheck/build; human source-backed walkthrough of no topbar/sidebar.

After **actual execution**, update this packet with the implemented exact code paths/SHAs, tests run and their **results**, screenshots or Storybook cases where meaningful, remaining visual/accessibility uncertainties, and reconciled canonical technical/product owner links. Update `apps/web/src/features/play/README.md` if source ownership changes and `STATUS.md` with **proved tier only**. Mark Done/archive only under the repository Change standard after source/tests/acceptance. A pretty mockup alone is not completion.

## Cursor handoff when selected

Select **this one packet** in `work/changes/README.md`, keep other packets unselected, refresh current HEAD, inspect the two owner docs and named code, implement the bounded delta, run smallest useful proof, report blockers truthfully, and stop. Do **not** automatically execute the next packet.