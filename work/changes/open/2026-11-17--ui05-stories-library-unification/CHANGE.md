# UI05 | Unify Stories library under semantic UI roles

**State:** Ready after UI02, may execute after UI04 in linear sequence (prepared 2026-11-17). **Current Change remains:** none. This is a prepared bounded future implementation unit, **not permission for Cursor to start on its own**. **Order/dependency:** UI01/UI02; no dependency on backend or book animation.

**Product authority:** [Design system and expressive worlds](../../../../docs/product/experience/design-system-and-expression.md).
**Technical authority:** [Semantic design foundation](../../../../docs/technical/client/semantic-design-foundation.md).
**Design program:** [Phase 3 initiative](../../../designs/open/player-experience-refoundation/phase-3/README.md).
**Existing source ownership:** [Play source map](../../../../apps/web/src/features/play/README.md), [Storyteller publication](../../../../docs/technical/storyteller/generation-and-publication.md) as applicable. No previous packet is a substitute for reading the current owner.

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

## Explicit non-scope and safety

No search, filter, story renaming or deletion features; no change to schemas/list Query; no final premium art polish.

**Universal safety constraints:** Do not alter authorized command identity, current Query/write/frozen retry semantics, provider cost, character/game truth or private read scopes to improve CSS. No paid model calls, DB reset, blind migrations, or live destructive operations. Focus, reduced motion, text selection, responsive reading and system status remain mandatory. If this exact outcome demands a new game/backend contract or substantially larger diff, stop and propose a new Change.

## Verification and completion receipt

Existing list-state tests, Storybook a11y/viewport evidence, web build/typecheck and CSS role-diff notes.

After **actual execution**, update this packet with the implemented exact code paths/SHAs, tests run and their **results**, screenshots or Storybook cases where meaningful, remaining visual/accessibility uncertainties, and reconciled canonical technical/product owner links. Update `apps/web/src/features/play/README.md` if source ownership changes and `STATUS.md` with **proved tier only**. Mark Done/archive only under the repository Change standard after source/tests/acceptance. A pretty mockup alone is not completion.

## Cursor handoff when selected

Select **this one packet** in `work/changes/README.md`, keep other packets unselected, refresh current HEAD, inspect the two owner docs and named code, implement the bounded delta, run smallest useful proof, report blockers truthfully, and stop. Do **not** automatically execute the next packet.