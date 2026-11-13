# UX01 | a scene-first story shell, not an admin dashboard

**State:** Proposed. **Approval and owner:** UX destination proposed 2026-11-13; code **not authorized**. Owner chooses if/when; Cursor is the implementation executor.  
**Kind:** frontend behavior / layout refactor / focused component tests.  
**Parent:** [Experience implementation program](../../experience/implementation-program.md), M1. **Dependency:** existing React/Next architecture intact; no UX packet required.

## Cursor first-screen brief

> **Current-source map:** [App Router map](../../../apps/web/app/README.md), [web owner route](../../../apps/web/README.md); inspect `apps/web/app/style.css`, `app/(authenticated)/layout.tsx` and one Play route.  
> **Governing target:** [navigation/spatial model](../../experience/spaces/information-architecture.md#spatial-model), [responsive composition](../../experience/spaces/information-architecture.md#reading-first-desktop-composition-target), [component strategy](../../experience/system/component-strategy.md#four-levels-of-implementation).  
> **Known trap:** current auth/SSR Query provider is inside authenticated route group. A new “beautiful” root client layout can leak private content, duplicate providers or make public demo hydrate unnecessarily.  
> **Scope/permission:** **Proposed only. No code now.** When explicitly authorized, implement shared story-facing navigation/layout tokens and focused verification. No engine/provider/database work.

## Target alignment and contrary designs

Build the shell in which a readable **Now** stage has primacy. Top-level spaces have understandable labels; irrelevant modules are absent. Wide view may have compact navigation and one restrained context area, narrow view a single narrative column. **Do not** copy the current JSX layout as a spec. Reject generic SaaS side-nav plus dashboards, decorative fake inventory HUD and chat-bubble shell. A purely typography-first minimal shell is an alternate candidate; prefer it over a context shelf until a real situation benefits from the shelf.

**Selected design criterion:** within a first viewport, a user sees story identity, actual narrative/status and a clear next interaction, without needing to dismiss a settings panel. Shell is stable in quiet and busy conditions.

## Outcome and motivation

One source/test delta establishes:
1. A small **story identity + player navigation** composition, with Now and Journal first; World/You are conditional or safely deferred pending projections.
2. A narrative-first responsive max-width region (readable at 320/375/768/1440 px and browser zoom), no permanent two-sided administrative chrome.
3. Semantic color, typography, spacing, focus and surface tokens. Atmosphere can follow content; do **not** choose fonts or themes because the old UI has them.
4. Accessible control primitives **only where needed** by actual navigation. Do not mass-import a component library.

Do not include reimplementation of Play commands, screens, Storyteller settings or the Chamber workbench.

## Authority and current-source evidence

- [Experience thesis](../../experience/foundations/experience-thesis.md#design-north-star-the-living-page).
- [Information architecture](../../experience/spaces/information-architecture.md).
- [Next/SSR security baseline](../../engineering/targets/react-next.md#1-desired-data-and-rendering-topology).
- GitHub main snapshot `8c91618aa44ac6a5aa800cf6b986c2bf596a9a0d`, 2026-11-13; **no screenshots or run verification**. Re-inspect actual source, recently landed W-series work, and tree/branch at execution. If a route's data boundary moved, stop and re-scope rather than following this outdated path.

## Code scope and exclusions

Expected owner candidates: `apps/web/app/style.css`, `apps/web/app/(authenticated)/layout.tsx`, selective existing player route composition, new source-local presentational components in `apps/web/src` and focused Storybook/test fixtures. **Preserve** SSR, server-only session verification, one Query provider, route-specific 401/404/5xx handling, normal public routes, existing URL semantics, all command idempotence.

**Exclusions:** no re-theme of Chamber (separate dev tool), no artificial changing status in layout, no new global state store, no route hierarchy migration, no provider/model calls, no unapproved dependency install, no ubiquitous portal/modal framework.

## Acceptance and negative proof

**Normal:**
- At 1440 px, original context reads as a game: current prose and meaningful action area are visually central; tiny amount of navigation.
- At 375 px and 200%/400% zoom, same key content remains in reading order and keyboard reachable.
- A scene with no image, title with long non-Latin words, and no inventory still look deliberate.
- Now → Journal → Now returns to correct story and useful scroll/focus, without starting in-world time.
- Public `/demo` remains outside private app Query/auth provider where appropriate.

**Negative:**
- Switching Story A→B must not display A's narrative/sidebar in B's shell, even during transition.
- 401/404/503 must retain separate recovery and not masquerade as empty story.
- Story shell cannot poll/advance a fictional clock from browser presence.
- Navigation must not make a Play POST or provider generation.
- Screen reader and keyboard can enter/leave all exposed menus; focus ring never hidden by art or sticky chrome.

**Verification:** fast web component tests, Storybook fixtures, manual screenshots in mobile/wide and keyboard/focus walk. Use `pnpm --filter @offscreen/web test:fast` as focused check. Any live Nest/DB/provider work is outside this packet and needs separate authorization.

## Handoff and next action

Before marking **Ready**, owner must review the target layout thesis, source mapping, precise files and at least one representative static/Storybook composition. Cursor may use CSS grid/flex, native HTML and a restrained primitive only as needed, preserving the chosen React architecture. Return diff, rendered evidence, negative cases, and explicit unresolved aesthetic questions. This is the foundation, **not permission to “improve the entire UI.”**
