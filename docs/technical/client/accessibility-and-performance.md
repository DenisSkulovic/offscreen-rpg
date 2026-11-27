# Client accessibility and performance

**Owns:** engineering acceptance for operable controls, motion, and client-side cost of the player UI.  
**Product obligations:** [settings and accessibility](../../product/experience/settings-and-accessibility.md). Visual atmosphere belongs to [presentation runtime](presentation-runtime.md).

The bar below comes from [architecture](architecture.md) F9 and F15. Each requirement is stated once, then its evidence is graded in [Evidence tiers](#evidence-tiers). A source test, a fixture pass or a static lint pass is never a human keyboard pass and never a WCAG conformance claim. This page asserts no new browser testing.

## Evidence tiers

| Tier | Meaning | Where it stands today |
| --- | --- | --- |
| **Selected requirement** | The bar a player-facing change must meet. | [Interaction acceptance](#interaction-acceptance) and [Performance acceptance](#performance-acceptance). |
| **Source-present check** | An automated check that exists in `apps/web` and proves only what its fixture renders. | `vitest-axe` runs in jsdom on StoryFrame decision and quiet states, the public portal, route recovery and the design-system evidence (`story-frame.test.tsx`, `ux-evidence.test.tsx`, `route-recovery.test.tsx`, `design-system-evidence.test.tsx`). Focus lands on the retry control after a recoverable error. CSS keeps a `prefers-reduced-motion: reduce` branch and forced colors do not hide a choice. Pending refetch timing is unit-tested (`story-pending-refresh.test.ts`). |
| **Measured or NOT RUN** | Human or browser-level proof. | NOT RUN. No Playwright suite exists under `apps/web`, no human keyboard or screen-reader pass is recorded, and no production performance measurement exists. The Living Book's own human gaps are in [POC test and human acceptance bar](living-book-poc.md#poc-test-and-human-acceptance-bar). |

## Interaction acceptance

**Selected requirement.** Controls use native labels and fields, work from the keyboard, and restore focus after an error. `aria-live` announces genuine state transitions, not every two-second poll. Dialogs and status use valid semantics. Targets and screen-reader operation must be usable, and reduced motion applies when the user asks for it. A creative scene style never changes keyboard, focus or error semantics ([Tokens](semantic-design-foundation.md#tokens-primitive-scales-and-semantic-roles-not-a-hardcoded-genre-palette)). A retired choice stays retired ([Commands and hints](state-and-server-boundary.md#commands-and-hints)).

Error boundaries distinguish authentication, forbidden and transient failure. App Router `loading`, `error` and `not-found` cover the expected scope. Query error reset and Suspense are used only where that boundary is tested.

No component library is adopted merely to make controls accessible. The earlier **W-program markup preservation** rule is superseded for the selected [Living Book POC](living-book-poc.md): the book may replace existing `StoryFrame` visual markup, but not the keyboard, focus, source and command safety requirements here.

**Expected checks.** Playwright plus axe, and a human keyboard pass. Today only the jsdom axe and focus checks listed above are source-present; the browser and human checks are NOT RUN.

## Performance acceptance

**Selected requirement.**

- The primary snapshot needed for useful server HTML is prefetched. Noncritical panels may stream under a deliberate Suspense boundary.
- One in-flight next-page fetch per list, stable list keys, and no heavy memoization unless identity or a profile shows a reason.
- Private reads use `cache: 'no-store'` and authenticated `Cache-Control: private, no-store`. There is no shared RSC or proxy cache of private story HTML. Focus and reconnect refetch applies to stale GETs only.
- Pending status without a healthy SSE stream may poll at a bounded two-second interval. With a healthy stream, pending reconciliation backs off to about thirty seconds plus focus and visibility refresh. Repeated errors back off. Invalidation must not become a query storm or a paid mutation.

**Source-present.** `playStorySnapshotQueryOptions` (`apps/web/src/shared/api/story-snapshot-query.ts`) sets focus and reconnect refetch, no background interval, and a pending-only interval chosen by `pendingStoryRefetchMs(liveStreamHealthy)`. Snapshot, history and receipt readers pass `cache: 'no-store'`. This shows the policy is coded, not that it performs.

**Expected measurement, NOT RUN.** No latency, query-count or bundle budget has been measured. Claiming production performance from an unmeasured local session is not acceptance.

## What fails acceptance

Animating a roll that has not been saved, or a success the server has not committed, fails this page and the product rules. Regenerating an illustration must not block the scene. Claiming WCAG conformance from a linter fails the evidence tiers above.
