# Admin technical source baseline | verified code and missing capabilities

**Inspection:** GitHub `DenisSkulovic/offscreen-rpg`, Admin design branch before technical work, descended from `main` commit `adb118f2dc9249555013718d57bcc2b7b599266c`, 2026-11-14. **Method:** connector reads of the named source files, source-adjacent READMEs and existing technical targets. No source checkout, runtime tests or provider requests. Subsequent Cursor work may change `main`; **reinspect exact files at implementation start**.

This audit distinguishes *observed code* from the *desired target*. Historical maps and design prose do not prove that a runtime permission exists.

## Evidence map

| Owner / observed source | What the code currently supports | Implication for Admin design |
| --- | --- | --- |
| [Nest composition](../../../apps/api/src/app.ts) | `createApp` registers player identity, drafts, openings, stories and optional Chamber/QA controllers; common `/api` middleware and origin checks | No discovered `/api/admin` module or staff policy; add a separate composition boundary |
| [Better Auth options](../../../apps/api/src/modules/auth/auth.ts) | GitHub OAuth, DB-backed Better Auth, seven-day player session, encrypted OAuth tokens and basic rate limit | **Authentication exists**, but staff assurance, staff principal and shorter privileged session are not implemented |
| [Identity resolver](../../../apps/api/src/modules/auth/identity.ts) | `requireUser` returns `{id,name,email}` from player session; `/api/me` returns this shape | It does not prove staff identity or privileges; no administrative actor may be derived from an email match |
| [Auth database schema](../../../packages/db/src/schema/auth.ts) | `user`, `session`, `account`, `verification` and `rate_limit` tables | Staff principal, sessions, grants, approvals and audit are additional data domains |
| [Stories controller](../../../apps/api/src/modules/stories/controller.ts) | All normal story handlers use `IdentityService` and player `ownerId`; StoryError maps to HTTP | Admin cannot bypass owner scope by fabricating a player identity or running a user controller as target |
| [Story read owner](../../../packages/application/src/stories/reads.ts) | Owner-scoped snapshot/history reads and typed public projection; document content may be private | Reuse domain truth selectively, but create **purpose-built minimized staff projections** |
| [Story storage](../../../packages/db/src/schema/stories.ts) | `story.ownerId`, revisions, passages and documented source relations | Present code is owner-centric; multi-participant memberships are product target, **not current DB truth** |
| [Campaign state](../../../packages/db/src/schema/campaign.ts) | Authoritative campaign mechanics, clock, holds and evolving world state | Staff reads may surface restricted summary; no generic state editing |
| [Storyteller records](../../../packages/db/src/schema/generations.ts), [storyteller schema](../../../packages/db/src/schema/storyteller.ts) | Generation state, attempts, publication and internal exploration/review records | AI diagnostics require explicit redaction of raw inputs/outputs and truthful coverage |
| [Usage accounting](../../../packages/application/src/storyteller/window-accounting.ts), [usage schema](../../../packages/contracts/src/usage-policy.ts) | Versioned platform/account/story windows with reservations and uncertain allocation states | Technical provider allocation is **not** a commercial subscription or customer credit ledger |
| [Story public events](../../../packages/application/src/stories/public-events.ts) | Source-linked, owner-scoped event feed, with `coverage: since-enabled` possible | A complete historical Admin timeline cannot be claimed without coverage/retention evidence |
| [Next route map](../../../apps/web/app/README.md), [authenticated layout](../../../apps/web/app/(authenticated)/layout.tsx) | Public and player routes, request-time `requireViewer`, player Query provider | Operator UI requires a separate `/control` gate, not extending player `/stories` menus |
| [SSR reader](../../../apps/web/src/server/viewer.ts), [Nest reader](../../../apps/web/src/server/nest-reader.ts) | Player-scoped cookie forwarding, Zod validation and no-store server fetch | Reuse transport patterns but **do not** reuse `requireViewer` as an Admin permission gate |
| [Query provider](../../../apps/web/src/features/session/authenticated-query-provider.tsx), [React target](../../engineering/targets/react-next.md) | TanStack Query frontend baseline with viewer-specific isolation and auth broadcast | Admin cache must be keyed by staff principal/session authorization epoch, separately cleared on revocation |
| [Conditional Chamber](../../../apps/api/src/app.ts), [Chamber target](../../engineering/targets/chamber-laboratory.md) | Developer tools conditionally registered, rather than always active in player production | Do not expose Chamber fault hooks as a public/Admin production back door |
| [Integration harness](../../../tools/api-integration/README.md) | Real Nest/DB/browser tests exist; focused runner **resets designated disposable test DB** | Test plan must distinguish pure tests, disposable DB integration and forbidden production/provider actions |

## Important absences and limitations

These are **absence from inspected baseline**, not proof of nonexistence in future work:
- No dedicated authenticated staff principal, internal invitation/role packages, policy checker, Admin audit/action system or control routes were observed.
- No verified real payment provider integration, subscriptions/refunds, customer-success or Trust operations were found in the inspected API composition. The usage-policy contract is not proof of revenue billing.
- Multiplayer is a game aspiration; current `story.ownerId` and owner-scoped application methods are **not** generalized membership semantics.
- Storyteller diagnostics tables contain potentially private JSON and internal materials. Safe raw prompt exposure is not supported by simply serializing those rows.
- Player `/api/me` is not an Admin login; player Query identity and Next route protection alone do not prove access to staff resources.
- Source metadata alone cannot establish global stop effectiveness, financial reconciliation accuracy or real operating capacity at thousands of users.
- The current branch may lag Cursor's uncommitted local work, so implementation Change source anchors are **revalidation hints**, not guaranteed current line numbers.

## Target decisions derived from the audit

1. Keep the **existing modular monolith**, Nest/App Router/PostgreSQL, domain application owners and Zod contract boundary; avoid premature microservices or generic IAM engines.
2. Add dedicated Admin actors, authorization, read projections and action/audit boundaries. Existing player controllers stay player-only.
3. Treat present `story.ownerId` as a **legacy single-owner relationship** in staff read summaries, not proof of multiplayer membership, transferable ownership or payer identity.
4. Surface only verified states, missing/unknown/coverage when the source is not authoritative, and never invent a commercial subscription from `usagePolicy` JSON.
5. Require real test evidence for session isolation, no-leak, failed-provider ambiguity, idempotent interventions and emergency stop before any live usage.

## Source revalidation trigger

Before Cursor receives the first Admin code packet: compare `main` and the design branch; inspect `apps/api/src/app.ts`, auth/identity, schema/migration files, `packages/application/src/stories/reads.ts`, `apps/web/app/README.md`, Query provider, and the API integration runner. Explicitly resolve any changed app composition, auth library, provider admission, or database migration sequence. Never cherry-pick a large outdated design branch over Cursor's active files without review.
