# PF05 | Prove public-entry to player-home journeys without backend fiction

**State: Proposed (2026-11-13). Code permission: none.** Dependencies: accepted applicable PF01–PF04; any restricted real-play backend tests require separate authorization. Parent: [entry program](../../experience/platform-entry-implementation-program.md).

## Cursor first-screen brief

> **Goal:** executable deterministic tests and browser evidence confirm that public discovery, scripted preview, safe sign-in return and personal Stories navigation form a coherent, accessible, truthful experience across success, failure and identity changes.
>
> **Authority:** [platform journey atlas](../../experience/platform-journeys-and-states.md), [public blueprint](../../experience/spaces/public-portal-blueprint.md), [preview-to-play](../../experience/flows/preview-to-play.md), [player home](../../experience/spaces/player-home-blueprint.md), [experience validation](../../experience/evidence/validation-plan.md).
>
> **Start:** actual post-PF01–PF04 routes plus `apps/web/app/README.md`, existing Vitest/RTL/MSW/Storybook and Playwright/integration source map; do not open all product docs and current test files blindly.
>
> **Do not:** create a new testing framework, perform destructive DB reset without approval, call image/LLM providers or write real live trial accounts. No backend entitlement change.

## One code-bearing acceptance outcome

A focused deterministic **journey proof suite** for the most important 1–3-minute public and owner-play entry paths. It exercises actual route link destinations and component behavior, not just mocked cards that look finished.

Use a small set of provider-free fixture stories/account states (explicitly labelled simulated), preserve existing owner-scoped authorization semantics in tests, and run browser checks for visual and keyboard continuity. Don't build a generic "test every possible screen" harness or turn the Chamber into public UI.

## Intended verification slices

**A. Anonymous first contact**: / home communicates a unique concrete product promise; Try → /demo. No OAuth/provider/DB requirement. No first-step time-jump gate. No artificial delay or fake story state.

**B. Scripted memory**: choice→work/knowledge→interruption→return follows exact fixture facts. It is labelled scripted and resets on refresh. No model/provider requests. Failed/missing image no impact.

**C. Real-play handoff (stubbed)**: Create CTA while anonymous → permitted sign-in route → safe local intended creation destination when session succeeds. Already-authenticated skips redundant sign-in. Refused/expired access returns safe explanation, not paid operation. Hostile return URL rejected.

**D. Player home**: zero/one/many lives and drafts use real authoritative data fixture shapes; source-backed status only. Independent read failure not silently interpreted as empty. Story link opens correct ID/Now, draft link opens editor, pagination and back work.

**E. Security and trust**: session expiry, wrong viewer identity, stale deep link, disabled grants, provider outage. SSR/Query private scope preserved; never show A's saved story to B, auto-send paid action after auth, or treat an SSE hint as an achieved result.

**F. Responsive and assistive**: 1440/768/375/320, browser zoom to 200/400%, keyboard and screen-reader semantics, reduce motion, no-art/no-JS public fallback. Record real browser screenshot class and axe violations, not merely assert green test counts.

## Negative cases the suite must detect

- Anonymous demo route attempts a paid provider request.
- First visible preview step has zero selectable actions and requires artificial “Advance time.”
- A participant's earlier notice is not reflected in later choices/return summary, or unearned repair progress is invented.
- Login succeeds but lands in generic Stories despite intended create, or a malicious external return URL executes.
- A grant/entitlement is inferred from OAuth identity or “free $3” promised without public policy.
- Story list fetch fails yet UI says “You have no stories.”
- Viewer switch returns prior user's private titles, scene art or inactive command.
- A nonfunctioning “Account,” “Pricing” or “Notifications” navigation item appears.
- Public home is blank because the private API or model provider is down.

Each negative must produce an observable failing assertion or screenshot/a11y observation before closure. Don't write tautological tests that only check that a button rendered.

## Results and exit

Report implemented fixture/journey test paths, exact commands and pass/fail, real browser screenshot set with viewport/device, keyboard/focus findings and what couldn't be verified without the real backend. Code-backed proof of the scripted demo does **not** certify real authenticated model use. Real connected story/allowance/security acceptance belongs to a separate authorized release milestone with the parallel backend team.

**Handoff:** after owner selects Ready, implement focused harness/tests/fixture integration only; report evidence and remaining UX deficiencies. A subsequent human design review can demand visual refinement through new bounded Changes, but PF05 itself isn't a promise that users will prefer the final site.
