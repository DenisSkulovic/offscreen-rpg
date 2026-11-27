# Client accessibility and performance

**Owns:** engineering acceptance for operable controls, motion, and client-side cost of the player UI.  
**Product obligations:** [settings and accessibility](../../product/experience/settings-and-accessibility.md). Visual atmosphere belongs to [presentation runtime](presentation-runtime.md).  
**Status (authority):** selected engineering bar from [architecture](architecture.md) F9 and F15. The thresholds and expected checks below are the target. Proof tiers are separate. A source test, a fixture pass or a static lint pass is not a human keyboard pass, and none of them is a WCAG conformance claim. No new browser testing is asserted by this page.

## Interaction acceptance

Use native labels and fields, keyboard operation, and focus restoration after error. `aria-live` announces genuine state transitions, not every two-second poll. Dialogs and status use valid semantics. Targets and screen-reader operation must be usable. Reduced motion applies when the user asks for it. Proof is Playwright plus axe and a human keyboard pass. A creative scene style does not change keyboard, focus, or error semantics. That split is [Tokens](semantic-design-foundation.md#tokens-primitive-scales-and-semantic-roles-not-a-hardcoded-genre-palette). A retired choice stays retired under [Commands and hints](state-and-server-boundary.md#commands-and-hints).

Error boundaries distinguish authentication, forbidden and transient failure. App Router `loading`, `error` and `not-found` cover the expected scope. Query error reset and Suspense are used only where that boundary is tested.

Do not adopt a new component library merely to make controls accessible. The earlier **W-program markup preservation** rule is explicitly superseded for the later selected [Living Book POC](living-book-poc.md): the book may replace existing `StoryFrame` visual markup, but not the keyboard, focus, source and command safety requirements on this page. The Book's human acceptance bar and its recorded gaps are in [POC test and human acceptance bar](living-book-poc.md#poc-test-and-human-acceptance-bar).

## Performance acceptance

Prefetch the primary snapshot required for useful server HTML. Noncritical panels may stream under a deliberate Suspense boundary. One in-flight next-page fetch per list. Stable list keys. No heavy memoization unless identity or a profile shows a reason.

Private reads use `cache: 'no-store'` and authenticated `Cache-Control: private, no-store`. There is no shared RSC or proxy cache of private story HTML. Query focus and reconnect refetch applies to stale GETs only.

Pending status without a healthy SSE stream may poll at a bounded two-second interval. When SSE is healthy, pending reconciliation backs off to about thirty seconds plus focus and visibility refresh. Repeated errors back off. Invalidation must not become a query storm or a paid mutation.

**Negative:** animating a roll that has not been saved, or a success the server has not committed, fails both this page and the product rules. Regenerating an illustration must not block the scene. Claiming WCAG conformance from a linter, or claiming production performance from an unmeasured local session, is not acceptance.
