# UI06 | Apply shared foundation to Welcome/entry and Create journey

**State:** Ready after UI05 (prepared 2026-11-17). **Current Change remains:** none. This is a prepared bounded future implementation unit, **not permission for Cursor to start on its own**. **Order/dependency:** UI01/UI02 and UI05's app-wide role integration.

**Product authority:** [Design system and expressive worlds](../../../../docs/product/experience/design-system-and-expression.md).
**Technical authority:** [Semantic design foundation](../../../../docs/technical/client/semantic-design-foundation.md).
**Design program:** [Phase 3 initiative](../../../designs/open/player-experience-refoundation/phase-3/README.md).
**Existing source ownership:** [Play source map](../../../../apps/web/src/features/play/README.md), [Storyteller publication](../../../../docs/technical/storyteller/generation-and-publication.md) as applicable. No previous packet is a substitute for reading the current owner.

## Falsifiable outcome

Public landing/entry and authenticated story creation share the same platform typography, action/status, form and focus vocabulary without disturbing onboarding, auth, drafts or Storyteller settings.

## Code owners and baseline

`apps/web/app/style.css`, `apps/web/app/page.tsx`, `apps/web/src/features/stories/draft-editor.tsx`, `opening-preview.tsx`, story creation components and existing Storybook/forms tests.

**Source basis:** GitHub `main@4e42bd76028ebf13458b799016446cc3f9dae38f` when designed. Cursor MUST begin with `git rev-parse HEAD`, `git status --short`, `pnpm repo:brief --json`, and the actual current owners. Do not copy a stale symbol path or overwrite other work. Study bounded file/symbol slices, not the entire repository.

## Intended implementation delta

1. Replace only mismatched global `button/p/h1/main` declarations that can affect unrelated pages with scoped semantic roles. Preserve all existing pages and Next routing. Avoid a giant selector rewrite.
2. Apply UI01 roles and UI02 accessible actions/notices to the actual landing/start/draft/preview flows. For form input controls, retain native labels/React Hook Form and existing validation; no generic form engine.
3. Keep creative settings distinct from ordinary form status/price/auth state. Long premise and disabled/pending generation stay legible and truthful.
4. Record at least one cross-space specimen showing the same primary action, focus, error and pending status across entry/create/stories/book.

## Acceptance: normal and discriminating negative

Normal: non-auth demo, new draft, opening preview, edit/submit, saved draft return and authenticated navigation retain their behavior.
Negative: no newly triggered generation/paid call on mount or styling, no lost validation/ARIA labels, no class leak into Admin/Chamber, 320px/200% no clipped form actions.

## Explicit non-scope and safety

No new marketing copy/SEO design, wizard mechanics, paid pricing redesign, account/Auth refactor or visual art-generation system.

**Universal safety constraints:** Do not alter authorized command identity, current Query/write/frozen retry semantics, provider cost, character/game truth or private read scopes to improve CSS. No paid model calls, DB reset, blind migrations, or live destructive operations. Focus, reduced motion, text selection, responsive reading and system status remain mandatory. If this exact outcome demands a new game/backend contract or substantially larger diff, stop and propose a new Change.

## Verification and completion receipt

Current draft/entry tests, Storybook, provider-free browser smoke at narrow/desktop, typecheck/build, explicit screenshot review.

After **actual execution**, update this packet with the implemented exact code paths/SHAs, tests run and their **results**, screenshots or Storybook cases where meaningful, remaining visual/accessibility uncertainties, and reconciled canonical technical/product owner links. Update `apps/web/src/features/play/README.md` if source ownership changes and `STATUS.md` with **proved tier only**. Mark Done/archive only under the repository Change standard after source/tests/acceptance. A pretty mockup alone is not completion.

## Cursor handoff when selected

Select **this one packet** in `work/changes/README.md`, keep other packets unselected, refresh current HEAD, inspect the two owner docs and named code, implement the bounded delta, run smallest useful proof, report blockers truthfully, and stop. Do **not** automatically execute the next packet.