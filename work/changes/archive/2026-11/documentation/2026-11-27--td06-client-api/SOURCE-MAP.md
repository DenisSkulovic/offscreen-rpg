# TD06 | source and claim map

Inspected frozen main `4b621ec9708361a2304efdcff4d34bb7da2b6c88`. Heading inventory and source anchors below identify the actual owners; source existence is not live qualification. Read-only source checks, no runtime or provider operations.

## T01 | Client stack and interaction

Owned existing headings:

- `docs/technical/client/architecture.md`: 1: React / Next.js engineering target | DECIDED architecture; 5: Who owns the client guarantee; 22: Implementation status (W-program); 40: 0. Final stack decisions (these are instructions, not a library wishlist); 61: 1. Desired data and rendering topology; 100: Data ownership invariants; 109: 2. TanStack Query architecture: exact operating contract; 111: Provider and SSR hydration; 119: Required query keys and cache policies; 138: Snapshot and update policy; 146: Pagination; 150: 3. Command, error and recovery contract; 154: Reload and durable identity: fully decided; 164: 4. End-to-end update transport (selected, not future conjecture); 170: 5. Forms, components and accessibility; 172: React Hook Form rules; 179: Module boundaries; 188: React and user-state mechanics; 194: 6. Security, diagnostics, performance and proof; 196: Authentication/developer policy; 202: Quality proof; 209: 7. Required F1–F15 acceptance contract

- `docs/technical/client/interaction-contracts.md`: 1: Client interaction contracts; 9: Intention; 17: Drafts and forms; 25: Wait honesty


Controlling/evidence anchors: `apps/web/src/shared/api/query-client.ts`; `apps/web/src/server/seed-authorized-query.ts`; `apps/web/src/features/stories/launch/use-story-launch.ts`. Selected transformation and negative in TASKS T01.

## T02 | HTTP and state boundary

Owned existing headings:

- `docs/technical/client/state-and-server-boundary.md`: 1: Client state and server boundary; 9: Topology; 15: Ownership; 28: Commands and hints

- `docs/technical/platform/http-api-and-client-contracts.md`: 1: Cross-route HTTP identity, receipt, and client-read contract; 15: Authenticated actor scope; 35: Frozen operation identity; 65: Accepted response versus committed world; 89: GET truth and SSE hints; 111: Error and uncertainty recovery; 136: Private DTO projection; 158: Review a new route; 175: Service calls are not player routes; 189: Contract dependencies; 200: Unknowns; 213: Evidence read


Controlling/evidence anchors: `apps/web/src/shared/api/story-launch-intent-store.ts`; `apps/web/src/server/seed-authorized-query.ts`; `packages/story-engine/src/stories/view-notification.ts`. Selected transformation and negative in TASKS T02.

## T03 | Book and accessibility

Owned existing headings:

- `docs/technical/client/living-book-poc.md`: 1: Living Book POC | Client implementation target and source boundaries; 7: Source-based starting point (verified GitHub main `7c2fd93a08b718e956a66cdf963ed6ad238a4723`); 21: Proposed package/component boundary, implement only what proves useful; 38: Physical geometry: minimum POC promise; 47: Now ↔ Journal navigation (POC); 57: Data and command invariants; 67: Two bounded implementation outcomes, not one giant frontend rewrite; 69: BOOK01: Book shell and current Now composition; 73: BOOK02: Read-only original-passage Journal; 79: POC test and human acceptance bar; 90: What this spec does not select

- `docs/technical/client/accessibility-and-performance.md`: 1: Client accessibility and performance; 7: Interaction acceptance; 15: Performance acceptance


Controlling/evidence anchors: `apps/web/app/(authenticated)/play/[id]/page.tsx`; `docs/product/experience/living-book-poc.md`. Selected transformation and negative in TASKS T03.

## T04 | Presentation and expressive UI

Owned existing headings:

- `docs/technical/client/presentation-runtime.md`: 1: Presentation runtime | a living, declarative visual environment; 7: Product promise; 15: Principles and non-negotiable boundaries; 27: Stable architecture and dynamic planes; 45: Preferred rendering topology; 72: Component architecture; 92: Presentation lifecycle; 102: Accessibility, security and performance rules; 110: Source-grounded baseline (inspection 2026-11-13; revalidate before PX01); 125: Explicit deferrals and decision gates; 134: Selected presentation language (V1)

- `docs/technical/client/semantic-design-foundation.md`: 1: Semantic design foundation and reusable UI ownership; 5: Audited starting facts (source `main@4e42bd76028ebf13458b799016446cc3f9dae38f`); 9: Ownership and CSS architecture; 28: Contract dependencies; 34: Tokens: primitive scales and semantic roles, not a hardcoded genre palette; 50: Component criteria; 65: Motion and dependency policy; 71: Regression and evidence gates

- `docs/technical/client/scene-direction-production.md`: 1: Storyteller art direction | Bounded author → publication → reader target; 5: Three independently verifiable links; 15: Product authoring policy to establish before production calls; 21: Proposed publication protocol; 34: Exclusions / stop rules; 43: 2026-11-18 deterministic writer; 47: 2026-11-19 optional suggestion


Controlling/evidence anchors: `apps/web/src/features/play/presentation/resolve.ts`; `apps/web/src/features/play/presentation/parse.ts`. Selected transformation and negative in TASKS T04.

## T05 | Notification channel target

Owned existing headings:

- `docs/technical/platform/notifications.md`: 1: Notifications and reaching the player; 5: Who owns the boundary; 21: Recommended first channel; 31: Alternatives; 45: Delivery flow; 59: Contact, privacy and actions; 67: What to prove early


Controlling/evidence anchors: `docs/technical/platform/execution-and-delivery.md`; `packages/story-engine/src/stories/view-notification.ts`. Selected transformation and negative in TASKS T05.
