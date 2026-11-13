# PF05 | Prove public-entry to player-home journeys without backend fiction

**State: Done (2026-11-13).** Provider-free journey suite + Storybook Platform/Entry journeys covering PF01–PF04 surfaces. Parent: [entry program](../../experience/platform-entry-implementation-program.md). Evidence: [platform-entry-journey-proof-2026-11-13](../../experience/evidence/platform-entry-journey-proof-2026-11-13.md).

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

## Landed (2026-11-13)

- `src/features/platform-entry/platform-entry-journey.test.tsx` — slices A–F (portal CTA, Greywake memory, safe next, stories failure ≠ empty, Query isolation, no-art portal).
- Storybook `Platform/Entry journeys` (portal, demo D0, sign-in create intent, empty/one/many/failed lists).
- Evidence note under `docs/experience/evidence/`.
- Proof: `test:fast` 159 passed. No live OAuth, no provider spend, no DB reset.
