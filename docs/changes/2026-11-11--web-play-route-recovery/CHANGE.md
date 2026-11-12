# Change W07: Next route, Query boundary, keyboard and accessible failure recovery

> **Cursor first look (current source ≠ selected target):** [App Router error map](../../../apps/web/app/README.md) → the **one** owning symbol. **Primary contract:** [F9](../../engineering/targets/react-next.md#f9-accessible-resilient-interaction).  
> **Pre-investigated trap:** 401/404/503, pending/uncertain are distinct. Do not catch Next `redirect`/`notFound` as generic errors.  
> **Context rule:** read remaining scope/negative test in this packet; **not** the full audit, target, old minutes or adjacent Change folders.


**State: Done.** Owner authorized via continue after W10. All technology, behavior and security decisions are governed by the **[selected React/Next target](../../engineering/targets/react-next.md)**. **Audited source:** post-W10 `main` (`9d66cc3`). Full Playwright+@axe-core/playwright browser suite remains W14.

**Depends on:** W01 W02 W15 W03 W04; W17 is optional only for final streaming-specific states.  
**Destination:** [F1–F15 selected architecture](../../engineering/targets/react-next.md), **F1 F2 F9 F10**. **Source evidence:** [November 12 target-to-code audit](../../engineering/audits/react-next-gap-2026-11-12.md), **G24 G32**.

## Code outcome and owners

**Measurable code/test/config change:** Next route, Query boundary, keyboard and accessible failure recovery.  
**Start at:** `apps/web/app/play/[id]/page.tsx` and route `loading/error/not-found`, `apps/web/app/stories/error.tsx`, Play/query error components, `apps/web/app/style.css` (minimal semantic fixes).

## Binding technical design

Use explicit Next App Router `loading.tsx`/`error.tsx`/`not-found.tsx`, Query `QueryErrorResetBoundary` and carefully placed React Suspense for independent reads. Runtime protocol error statuses remain typed: 401 sign-in, owner-hidden 404, 5xx transient retry, 409 conflict, timeout uncertain and domain pending distinct. Client controls expose busy/disabled/alert/status truthfully; a Query refetch error cannot fabricate a failed business effect. Keyboard/focus restoration after error, route change and form validation; reduced motion and no live-region spam on refresh. Retain existing markup/layout/branding except necessary accessible mechanics. Add **@axe-core/playwright** checks and human keyboard walkthrough for meaningful flows.

## Bounded implementation steps

1. Specify route error classification and initial vs background Query loading states, implement only useful route/query boundaries.
2. Integrate 401/404/503, pending/uncertain and keyboard focus/recovery with typed Query error reset.
3. Add Playwright/axe and RTL accessible state tests including auth expiry, long content, narrow viewport, delayed status and popup-less recovery.

## Acceptance and verification

- **Normal outcome:** Initial server HTML, error boundary and keyboard controls remain comprehensible and retryable with valid focus sequence.
- **Discriminating negative case:** 503 never appears as deleted story; 401 never auto-replays a paid command; retry after uncertain remains explicit, no stale private content on back navigation.
- **Safe proof and evidence:** RTL/axe/Playwright+human keyboard evidence, not just TypeScript or static JSX.
- **Must preserve / exclude:** No redesign of layout, typography, branding, gameplay UX or unrelated global CSS.

## Handoff and stop rule

Cursor must apply this design and [frontend engineering skill](../../../.agents/skills/frontend-engineering/SKILL.md) without choosing replacement libraries, new gameplay behavior, a different UI design or another state authority. Typecheck/build and the smallest truthful normal+negative tests should run when explicitly authorized and safe. Inspect destructive integration scripts before any disposable DB reset. If source contradicts an approved invariant, report evidence rather than silently reinterpret the target. Return files/diff, tests actually run, failures, performance/side effects when relevant and next dependency. No automatic provider spend or deployment.
