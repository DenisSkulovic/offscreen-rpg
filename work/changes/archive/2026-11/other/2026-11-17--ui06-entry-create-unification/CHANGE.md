# UI06 | Apply shared foundation to Welcome/entry and Create journey

**State:** Done (2026-11-18). **Order/dependency:** UI01, UI02, and UI05 are Done.

**Product authority:** [Design system and expressive worlds](../../../../../../docs/product/experience/design-system-and-expression.md).
**Technical authority:** [Semantic design foundation](../../../../../../docs/technical/client/semantic-design-foundation.md).
**Design program:** [Phase 3 initiative](../../../../../designs/open/player-experience-refoundation/phase-3/README.md).
**Existing source ownership:** [Play source map](../../../../../../apps/web/src/features/play/README.md), [Storyteller publication](../../../../../../docs/technical/storyteller/generation-and-publication.md) as applicable. No previous packet is a substitute for reading the current owner.

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

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership already keeps platform actions and system status apart from a scene, and this packet does not rewrite that page. | docs/technical/client/semantic-design-foundation.md#component-criteria | Landing and creation share the platform action. They do not become a book leaf. |
| Technical | changed: docs/technical/client/semantic-design-foundation.md#component-criteria records that Welcome and creation use the shared Action and SystemNotice while field labels stay native. | docs/product/experience/design-system-and-expression.md#product-component-vocabulary-to-design-and-then-implement-incrementally | Draft save, validation, and auth handlers stay as they are. |
| Code | changed: apps/web/src/features/stories/draft-editor.tsx and apps/web/app/style.css. Negative: opening the editor issues no POST, field labels stay attached, and the global button rule does not match an Action. | apps/web/src/features/public-portal/public-portal.tsx | Creative Storyteller settings stay a fieldset. Sign-in stays its own button. |
| Related | changed: work/changes/README.md, STATUS.md, and apps/web/src/features/stories/README.md record this entry and create foundation and leave UI07 unselected. | work/designs/open/player-experience-refoundation/phase-3/README.md | Queue selection is not permission to start UI07. |

## Explicit non-scope and safety

No new marketing copy/SEO design, wizard mechanics, paid pricing redesign, account/Auth refactor or visual art-generation system.

**Universal safety constraints:** Do not alter authorized command identity, current Query/write/frozen retry semantics, provider cost, character/game truth or private read scopes to improve CSS. No paid model calls, DB reset, blind migrations, or live destructive operations. Focus, reduced motion, text selection, responsive reading and system status remain mandatory. If this exact outcome demands a new game/backend contract or substantially larger diff, stop and propose a new Change.

## Verification and completion receipt

Plan guard returned ok before the entry and create edit. Base SHA `fa35d9b34c4bebb4521ffd82312eea29f581f543`.

Implemented files: apps/web/src/features/stories/draft-editor.tsx, apps/web/src/features/stories/draft-editor.test.tsx, apps/web/src/features/public-portal/public-portal.tsx, apps/web/src/features/public-portal/public-portal.css, apps/web/src/features/public-portal/public-portal.test.tsx, apps/web/src/features/platform-entry/platform-entry-journey.test.tsx, apps/web/app/style.css, apps/web/src/shared/ui/controls.css, apps/web/src/stories/entry-create-status.stories.tsx. Owners: docs/technical/client/semantic-design-foundation.md, apps/web/src/features/stories/README.md, STATUS.md, work/changes/README.md, work/designs/open/player-experience-refoundation/phase-3/README.md, work/changes/ledger/2026-11.md.

apps/web/src/features/play/README.md was not edited. Field labels, field alerts, draft save, and sign-in stayed on their existing handlers. The global button rule now skips `.action`.

Proof: `vitest run` completed draft-editor.test.tsx (7), public-portal.test.tsx (4), and platform-entry-journey.test.tsx (6). `pnpm --filter @offscreen/web typecheck` completed. ESLint on the touched TypeScript files reported no errors. Storybook `Platform/Entry journeys` public portal and `Platform/Entry and create status` showed the shared primary action, a disabled pending save, and an error notice. At 320px and 200% text the landing document scroll width stayed 320, and the specimen scroll width stayed 320. Opening the editor issued no POST. No model call.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/experience/design-system-and-expression.md#visual-hierarchy-and-ownership | product | unchanged: the heading already keeps platform actions and system status apart from a scene, and this packet does not edit that page | docs/product/experience/design-system-and-expression.md inspected at fa35d9b34c4bebb4521ffd82312eea29f581f543 | reviewed | The landing and the draft form did not become a book leaf | The product page already links the technical owner. No route moved. |
| docs/technical/client/semantic-design-foundation.md#component-criteria | technical | changed: the heading now records that Welcome and creation use Action and SystemNotice while field labels stay native | docs/technical/client/semantic-design-foundation.md and apps/web/src/features/stories/draft-editor.tsx over fa35d9b34c4bebb4521ffd82312eea29f581f543 | fixture-tested | Opening the editor issued no POST, and the story title label was still attached | apps/web/src/features/stories/README.md points at the editor |
| docs/technical/client/semantic-design-foundation.md#ownership-and-css-architecture | technical | unchanged: the ownership rules were not rewritten, and the new exceptions stay class-scoped | docs/technical/client/semantic-design-foundation.md over fa35d9b34c4bebb4521ffd82312eea29f581f543 | reviewed | The global button rule does not match .action, and style.css has no .chamber selector | The contract edge to the product heading remains |
| docs/technical/client/architecture.md#who-owns-the-client-guarantee | technical | unchanged: that page was not edited and still gives the client the same guarantee | docs/technical/client/architecture.md over fa35d9b34c4bebb4521ffd82312eea29f581f543 | reviewed | Draft save still uses the existing mutation, and sign-in stays its own button | No map edit |
| docs/technical/client/presentation-runtime.md#principles-and-non-negotiable-boundaries | technical | unchanged: atmosphere is still not system status, and that page was not edited | docs/technical/client/presentation-runtime.md over fa35d9b34c4bebb4521ffd82312eea29f581f543 | reviewed | The save failure stays a SystemNotice alert and does not start a generation | No map edit |
| docs/technical/client/accessibility-and-performance.md#interaction-acceptance | technical | unchanged: the page already requires keyboard, focus, and error semantics, and it was not edited | docs/technical/client/accessibility-and-performance.md over fa35d9b34c4bebb4521ffd82312eea29f581f543 | reviewed | The pending save is disabled and aria-busy, and the field label remains | No map edit |
| STATUS.md | evidence | changed: the visual-system note now records the entry and create foundation as fixture-tested and leaves UI07 through DIR03 without this program's code | STATUS.md over fa35d9b34c4bebb4521ffd82312eea29f581f543 | reviewed | The note does not claim an auth refactor or a new form engine | The status page still points at work/changes/README.md |

## Cursor handoff when selected

Select **this one packet** in `work/changes/README.md`, keep other packets unselected, refresh current HEAD, inspect the two owner docs and named code, implement the bounded delta, run smallest useful proof, report blockers truthfully, and stop. Do **not** automatically execute the next packet.