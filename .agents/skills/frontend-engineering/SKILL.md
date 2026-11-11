---
name: frontend-engineering
description: Review or design React 19 and Next.js App Router implementation decisions in Offscreen RPG, including server/client boundaries, state, effects, async races, accessibility and UI verification. Coding-agent expertise, not in-game AI behavior.
---

# React / Next.js frontend engineering

**Trigger:** A real `apps/web` feature or high-risk React/Next.js diff, especially scene state, saved choice, pending narration, historical data, forms, accessibility or rendering performance. Use `player-experience-design` separately to settle *what the player should experience*. This skill is about building that experience correctly.

**For an area-wide React/Next.js renewal:** start from the agreed [target-driven renewal process](../../rules/target-driven-renewal.md), define the intended render/state/data/auth/accessibility/testing architecture before scoring existing components, and audit source against that target. Keep visual art direction as a separate but compatible design track. For a narrow bug, use the current technical contract directly.

## Read narrowly

Open the affected product/technical heading, then route through `apps/web/src/features/` and the corresponding transport/API contract. Read the installed framework versions. Consult source knowledge in `docs/engineering/coding-agent-knowledge.md`; first-party details: [React effects](https://react.dev/learn/you-might-not-need-an-effect), [state snapshots](https://react.dev/learn/state-as-a-snapshot), [Next.js Server/Client](https://nextjs.org/docs/app/getting-started/server-and-client-components), [Vercel interface guidelines](https://vercel.com/design/guidelines), [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/).

## Professional decision reference (select, don't preload)

For a consequential state/fetch/async design or review, read the relevant section of [frontend state and asynchronous correctness](../../knowledge/frontend-state-and-async.md). For broader feature/module architecture (layering, boundaries, server versus browser owner), consult [architecture decision space](../../knowledge/architecture-decision-space.md). Name **at least one credible alternative** and which identity/lifetime/usage facts favor the chosen approach. If the change primarily affects browser/API semantics (status, retries, pagination, caching), consult [API and network contracts](../../knowledge/api-and-network-contracts.md) instead; for session/privacy changes use [security and trust](../../knowledge/security-and-trust.md). A developer need not load all four manuals. On a small existing-component fix, the manual may be unnecessary. Do not turn this into a mandatory 15-KB context load for each JSX edit.

## Diagnostic lenses

- **Client vs server:** Keep secrets, owner checks and data access server-side. A `'use client'` module pulls its imports into the client graph. Browser state is presentation, not authoritative campaign state.
- **State:** Derive display-only values in render rather than synchronizing redundant state with Effects. Respect state snapshots and immutable updates; use stable keys to preserve/reset the *intended* component identity.
- **Async correctness:** A late response, duplicate click, route change or stale revision must not overwrite a newer authoritative snapshot. Prefer the existing `story-transport` and server revision fences. Cleanup subscriptions/listeners; use cancellation or result identity checks for concurrent fetches.
- **UI states:** Model unavailable, loading, pending, blocked, failed, uncertain and completed distinctly. Do not fake success while generation is pending, make refresh re-dispatch a paid call, or enable a choice that server policy has held. Show actionable recovery.
- **Interaction:** Native labels, controls, keyboard, focus visibility/restoration, scroll, touch target and reduced motion. Test long narrative paragraphs, narrow phone widths, empty/large inventories and rapidly changing statuses.
- **Performance:** First inspect measured rerender/data-fetch behavior, then memoize where useful. Don't add cache layers or client hydration for speculative speed. Keep expensive lists virtualized only when representative sizes justify it.

## Design and review output

Give: `component/route owner | server/client data flow | state transition sketch | race/failure case | UI/a11y acceptance | narrow test + visual inspection`. The execution slice should name the smallest relevant components and avoid rewriting entire pages without a spec. Do not claim accessibility or visual quality from TypeScript compilation alone.

**Practical acceptance example:** a player selects an authorized choice; the UI disables duplicates and shows accepted pending state; a stale earlier response cannot replace a newer published passage; a real uncertain-provider state offers no fabricated retry. Test both normal response ordering and reversed resolution order. Distinguish intended UI projection from runtime state/permission.
