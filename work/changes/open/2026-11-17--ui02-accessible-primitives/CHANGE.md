# UI02 | Build a tiny shared semantic Action + SystemNotice layer

**State:** Ready after UI01 (prepared 2026-11-17). **Current Change remains:** none. This is a prepared bounded future implementation unit, **not permission for Cursor to start on its own**. **Order/dependency:** UI01 token values and role map must be landed.

**Product authority:** [Design system and expressive worlds](../../../../docs/product/experience/design-system-and-expression.md).
**Technical authority:** [Semantic design foundation](../../../../docs/technical/client/semantic-design-foundation.md).
**Design program:** [Phase 3 initiative](../../../designs/open/player-experience-refoundation/phase-3/README.md).
**Existing source ownership:** [Play source map](../../../../apps/web/src/features/play/README.md), [Storyteller publication](../../../../docs/technical/storyteller/generation-and-publication.md) as applicable. No previous packet is a substitute for reading the current owner.

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

## Verification and completion receipt

RTL/userEvent keyboard and duplicate-submit tests, Storybook/a11y cases, web typecheck/build, source evidence from two consumers.

After **actual execution**, update this packet with the implemented exact code paths/SHAs, tests run and their **results**, screenshots or Storybook cases where meaningful, remaining visual/accessibility uncertainties, and reconciled canonical technical/product owner links. Update `apps/web/src/features/play/README.md` if source ownership changes and `STATUS.md` with **proved tier only**. Mark Done/archive only under the repository Change standard after source/tests/acceptance. A pretty mockup alone is not completion.

## Cursor handoff when selected

Select **this one packet** in `work/changes/README.md`, keep other packets unselected, refresh current HEAD, inspect the two owner docs and named code, implement the bounded delta, run smallest useful proof, report blockers truthfully, and stop. Do **not** automatically execute the next packet.