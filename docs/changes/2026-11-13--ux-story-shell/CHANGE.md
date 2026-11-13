# UX01 | a scene-first story shell, not an admin dashboard

**State:** Done (2026-11-13). **Approval and owner:** Owner authorized UX01; foundation landed; visual polish deferred by owner.  
**Kind:** frontend behavior / layout refactor / focused component tests.  
**Parent:** [Experience implementation program](../../experience/implementation-program.md), M1. **Dependency:** existing React/Next architecture intact; no UX packet required.

## Cursor first-screen brief

> **Current-source map:** [App Router map](../../../apps/web/app/README.md), [web owner route](../../../apps/web/README.md); inspect `apps/web/app/style.css`, `app/(authenticated)/layout.tsx` and one Play route.  
> **Governing target:** [selected Living Stage blueprint](../../experience/spaces/living-stage-blueprint.md#stage-anatomy-and-default-order), [mobile composition](../../experience/spaces/living-stage-blueprint.md#small-screen-deliberate-reflow-not-desktop-compression), [component strategy](../../experience/system/component-strategy.md#four-levels-of-implementation).  
> **Known trap:** The authenticated route-group layout owns the private session/Query provider **and wraps the Chamber and Stories**, so do not put player-only navigation chrome there by default. Existing global CSS also affects the public demo and Chamber. **A full Journal route is not yet guaranteed**; no dead navigation.  
> **Scope/permission:** **Authorized for UX01 only.** Implement shared story-facing navigation/layout tokens and focused verification. No engine/provider/database work. No UX02 migration of full Play content.

## Target alignment and contrary designs

Build the shell in which a readable **Now** stage has primacy. Top-level spaces have understandable labels; irrelevant modules are absent. Wide view may have compact navigation and one restrained context area, narrow view a single narrative column. **Do not** copy the current JSX layout as a spec. Reject generic SaaS side-nav plus dashboards, decorative fake inventory HUD and chat-bubble shell. A purely typography-first minimal shell is an alternate candidate; prefer it over a context shelf until a real situation benefits from the shelf.

**Selected design criterion:** within a first viewport, a user sees story identity, actual narrative/status and a clear next interaction, without needing to dismiss a settings panel. Shell is stable in quiet and busy conditions.

## Outcome and motivation

One source/test delta establishes:
1. A small **story identity + player navigation** composition; Now works immediately, and Journal appears only if it opens existing read-only history or UX07 has built its destination. World/You are contextual Details, not mandatory tabs. If a true story name is unavailable, use known current passage context without fabricating identity.
2. A narrative-first responsive max-width region (readable at 320/375/768/1440 px and browser zoom), no permanent two-sided administrative chrome.
3. **Feature-scoped** color, typography, spacing, focus and surface tokens. Existing global `body`/`main`, `.play-layout` and `.play-sidebar` styles may affect public/Chamber routes: preserve their behavior unless a localized change is reviewed. Do not choose fonts or themes because the old UI has them.
4. Accessible control primitives **only where needed** by actual navigation. Do not mass-import a component library.

Do not include reimplementation of Play commands, screens, Storyteller settings or the Chamber workbench.

## Authority and current-source evidence

- [Experience thesis](../../experience/foundations/experience-thesis.md#design-north-star-the-living-page).
- [Information architecture](../../experience/spaces/information-architecture.md).
- [Next/SSR security baseline](../../engineering/targets/react-next.md#1-desired-data-and-rendering-topology).
- GitHub main snapshot `8c91618aa44ac6a5aa800cf6b986c2bf596a9a0d`, 2026-11-13; **no screenshots or run verification**. Re-inspect actual source, recently landed W-series work, and tree/branch at execution. If a route's data boundary moved, stop and re-scope rather than following this outdated path.

## Code scope and exclusions

Expected owner candidates: `apps/web/app/style.css` (only **safe scoped CSS**), focused player-only `StoryFrame`/existing Play composition and Storybook/tests. Avoid modifying `app/(authenticated)/layout.tsx` simply to insert story-specific chrome: that shared provider/layout is also used by the Chamber and other private routes. **Preserve** SSR, server-only session verification, one Query provider, route-specific 401/404/5xx handling, normal public routes, existing URL semantics, all command idempotence.

**Exclusions:** no re-theme of Chamber (separate dev tool), no artificial changing status in layout, no new global state store, no route hierarchy migration, no provider/model calls, no unapproved dependency install, no ubiquitous portal/modal framework.

## Acceptance and negative proof

**Normal:**
- At 1440 px, a **StoryFrame fixture** demonstrates the selected single-stage hierarchy and minimal navigation. UX01 establishes primitives and frame; **UX02** migrates full existing Play content into it.
- At 375 px and 200%/400% zoom, same key content remains in reading order and keyboard reachable.
- A scene with no image, title with long non-Latin words, and no inventory still look deliberate.
- A Journal affordance, **if shown**, opens real available read-only history with reliable return/focus and no fictional time. If no functional destination exists in this slice, omit it until UX07. No dead tab.
- Public `/demo` remains outside private Query/auth provider. Chamber and existing creation forms must not be visually or behaviorally broken by the CSS/layout changes.

**Negative:**
- Switching Story A→B must not display A's narrative/sidebar in B's shell, even during transition.
- 401/404/503 must retain separate recovery and not masquerade as empty story.
- Story shell cannot poll/advance a fictional clock from browser presence.
- Navigation must not make a Play POST or provider generation; nor may it leak previous viewer/story content, duplicate Query provider, or link to an unimplemented destination.
- Screen reader and keyboard can enter/leave all exposed menus; focus ring never hidden by art or sticky chrome.

**Verification:** fast web component tests, Storybook fixtures, manual screenshots in mobile/wide and keyboard/focus walk. Use `pnpm --filter @offscreen/web test:fast` as focused check. Any live Nest/DB/provider work is outside this packet and needs separate authorization.

## Handoff and next action

Owner authorized code 2026-11-13. Implementation landed a scoped `StoryFrame` fixture (not full Play migration). Evidence: `pnpm --filter @offscreen/web test:fast` **113/113**; Storybook `Experience/StoryFrame`; renders in [evidence/renders](../../experience/evidence/renders/). **Pending:** design critique of screenshots before UX02. UX02 is **not** authorized.
