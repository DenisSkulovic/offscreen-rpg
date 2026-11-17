# Client accessibility and performance

**Owns:** engineering acceptance for operable controls, motion, and client-side cost of the player UI.  
**Product obligations:** [settings and accessibility](../../product/experience/settings-and-accessibility.md). Visual atmosphere belongs to [presentation runtime](presentation-runtime.md).  
**Status:** selected engineering bar from [architecture](architecture.md) F9 and F15. A static lint pass is not a WCAG claim.

## Interaction acceptance

Use native labels and fields, keyboard operation, and focus restoration after error. `aria-live` announces genuine state transitions, not every two-second poll. Dialogs and status use valid semantics. Targets and screen-reader operation must be usable. Reduced motion applies when the user asks for it. Proof is Playwright plus axe and a human keyboard pass.

Error boundaries distinguish authentication, forbidden and transient failure. App Router `loading`, `error` and `not-found` cover the expected scope. Query error reset and Suspense are used only where that boundary is tested.

Do not adopt a new component library merely to make controls accessible. The earlier **W-program markup preservation** rule is explicitly superseded for the later selected [Living Book POC](living-book-poc.md): the book may replace existing `StoryFrame` visual markup, but not the keyboard, focus, source and command safety requirements on this page.

## Performance acceptance

Prefetch the primary snapshot required for useful server HTML. Noncritical panels may stream under a deliberate Suspense boundary. One in-flight next-page fetch per list. Stable list keys. No heavy memoization unless identity or a profile shows a reason.

Private reads use `cache: 'no-store'` and authenticated `Cache-Control: private, no-store`. There is no shared RSC or proxy cache of private story HTML. Query focus and reconnect refetch applies to stale GETs only.

Pending status without a healthy SSE stream may poll at a bounded two-second interval. When SSE is healthy, pending reconciliation backs off to about thirty seconds plus focus and visibility refresh. Repeated errors back off. Invalidation must not become a query storm or a paid mutation.

**Negative:** animating a roll that has not been saved, or a success the server has not committed, fails both this page and the product rules. Regenerating an illustration must not block the scene. Claiming WCAG conformance from a linter, or claiming production performance from an unmeasured local session, is not acceptance.
