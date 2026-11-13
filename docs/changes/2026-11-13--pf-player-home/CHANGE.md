# PF04 | Authenticated Stories becomes the player's real home

**State: Done (2026-11-13).** Authenticated `/stories` is a truthful Your-stories home: modest chrome, inviting verified empty, neutral featured kicker, Continue creating drafts, empty ≠ read failure. Parent: [entry program](../../experience/platform-entry-implementation-program.md).

## Cursor first-screen brief

> **Goal:** use existing authenticated /stories as a compelling but truthful personal home, with deliberate zero/one/many/draft/read-failure layouts, stable navigation into Now and creation, and no fabricated “needs you” or earned progress.
>
> **Authority:** [player home blueprint](../../experience/spaces/player-home-blueprint.md), [existing Stories design](../../experience/spaces/stories-library.md), [platform states](../../experience/platform-journeys-and-states.md#orthogonal-state-axes-not-one-platformstatus-mega-enum), [React/Next target](../../engineering/targets/react-next.md).
>
> **Sources:** `apps/web/app/(authenticated)/stories/page.tsx`, `apps/web/src/features/stories/live-story-list.tsx`, `draft-list.tsx`, `stories-library.css`, `apps/web/src/features/stories/README.md`; review current list DTO before showing attention status.
>
> **Keep:** auth gate, request-scoped SSR Query hydration, viewer-scoped Query keys, infinite lists, reliable Draft save/generation/Start and current Play links.

## Desired code-bearing outcome

A modest authenticated shell with readable Your stories title, working Create entry, correct signed-in identity/sign-out controls and clear grouping. One real story can dominate; several are browsable without a grid of full-height cards; drafts are separately labelled **Continue creating**. If there are no verified resources, show an inviting first-story state instead of an empty database message.

The underlying read models may only have real title, storyteller and coarse status. **Do not infer “Needs your decision,” “Since you returned” or “Continuing” from last item position, raw status strings, route timing or client clock.** The current `const [featured, ...rest] = items` + “Return here” is not evidence of actual attention priority. A neutral featured/ordered list is allowed if explicit ranking data are absent, with honest labels.

## Scope

1. Compose a small reusable player-shell vocabulary (header/navigation, story entry, draft entry, optional functional account controls) **only where actual consumers exist**. Preserve distinct public/inside-story shells and no redundant /dashboard.
2. Separate verified empty, pending, failed, stale/offline and authorized populated states for Story and Draft sections; do not render “No stories” at the same time as first-page failure.
3. Support zero/one/many variants without fake “recommended” stories. If list contains a genuine supported status, translate only grounded semantics; otherwise neutral entry label.
4. Keep human story titles, optional true public situation and draft premise readable; no speculative cover images, cards for absent data, raw UUID labels or fake hours progressing.
5. Provide responsive 1440, 768, 375, 320 layouts, keyboard/zoom/accessibility, local focus handling, list pagination and separate drafts; protect long/Cyrillic/nonhuman titles.
6. If no account/usage read route exists, omit dead account/wallet links; sign-out remains reachable. Record any backend public projection needs separately, not as frontend code.

## Exclusions

No new Nest endpoints, profile service, subscription storefront, admin users search, notification system, trusted “seen cursor,” paid provider calls, game rule changes, Query store rewrite, CSS library swap, empty motivational game stats or fake attention score.

## Acceptance and discriminating negatives

**Normal:** zero verified lists -> clear Create action; one story -> obvious Enter; several stories -> accurate neutral listing/pagination; drafts separate -> Continue creation; authenticated navigation works and Query identity remains.

**Negative:** Stories read fails while Drafts succeed -> show partial recoverable failure, not false no stories; session expires -> no previous private titles flash; account A→B -> no A content/art/cache; long title/375px/400% zoom -> no overflow; paused/blocked story cannot be represented as successfully progressing because of local time. A raw list order is not “recently played” unless server proves it.

**Proof:** deterministic list fixtures with actual DTO schemas, targeted Vitest/RTL/MSW, existing Storybook, 1440/375/320 browser views, keyboard/axe, privacy/SSR checks appropriate to the affected route. Run `pnpm --filter @offscreen/web test:fast` at Change closure. Do not run destructive integrated DB tests or claim server semantics from mocks.

**Handoff:** after owner authorizes, Cursor implements only bounded /stories UI/derived view state. Return screenshots across zero/one/many/draft/error, exact tests and data limitations. Any requested rich attention score goes to backend owner separately, not guessed.

## Landed (2026-11-13)

- `/stories` chrome: brand, viewer name, Your stories / Create / preview nav, Sign out; title is **Your stories** (no Welcome hero).
- Featured kicker: “Your story” / “One of your stories” (removed “Return here”); Other lives subsection; verified empty invites Create + `/demo`; story failure is `role=alert` without empty copy.
- Drafts heading **Continue creating**; empty ≠ failure.
- Proof: `pnpm --filter @offscreen/web test:fast` — 45 files / 147 tests passed. No provider spend. Authenticated screenshot skipped (no local session in this agent browser).
