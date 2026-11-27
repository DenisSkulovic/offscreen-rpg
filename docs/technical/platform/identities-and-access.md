# Identity and access

**Owns:** sessions, invitations, membership checks and what an authenticated viewer may read or command.
**Does not own:** the React/Next F1–F15 target, Query, forms or SSE. That binding design is [client architecture](../client/architecture.md). A dated file under `evidence/inspections/` is not the implementation contract. Shared-play rules are [proposed](../../../work/designs/open/shared-play/README.md), not selected here. Return and journal behavior is [product return](../../product/experience/return-and-journal.md). Scene media honesty is [product presentation](../../product/experience/presentation.md).

## Who owns the boundary

| Boundary | Owner |
| --- | --- |
| Sessions, invitations, and membership | This page, [Authentication and sessions](#authentication-and-sessions) |
| Entitlement | [Distinct authorities](./spending-and-entitlements.md#distinct-authorities) |
| Funding allowance | [Distinct authorities](./spending-and-entitlements.md#distinct-authorities) |
| Task recipe | [Distinct authorities](./spending-and-entitlements.md#distinct-authorities) |
| Usage window | [Distinct authorities](./spending-and-entitlements.md#distinct-authorities) |
| Creative setting | [Settings with distinct meanings](../../product/storyteller/profiles-and-settings.md#settings-with-distinct-meanings) |
| Notification delivery | [Delivery flow](./notifications.md#delivery-flow) |
| Selected topology | [Runtime shape](./topology.md#runtime-shape) |
| Compatibility | [First hosted deployment](./deployment-and-compatibility.md#first-hosted-deployment) |

Identities and membership stay on this page. Entitlement, funding allowance, and task recipe stay distinct on [Distinct authorities](./spending-and-entitlements.md#distinct-authorities).

## Authentication and sessions

Better Auth owns PostgreSQL-backed sessions and GitHub OAuth. Its official Node handler is mounted directly in Nest's Express server before body parsing, without a community Nest integration wrapper. The API uses ESM. The [development guide](../../../docs/runbooks/local-development.md) describes the implemented identity checks and remaining live-provider validation. Invitation handling remains a separate future product area. [Better Auth Express integration](https://better-auth.com/docs/integrations/express).

Local and lab sign-in use the same Better Auth GitHub provider. `IdentityService.requireUser()` reads that session. Anonymous requests are unauthorized. The runtime does not accept `POC_OPEN_ACCESS`, does not insert a fixed local player, and does not enable email/password. GitHub client ID, client secret, and `BETTER_AUTH_SECRET` are required. The canonical local browser origin is `http://127.0.0.1:3000`, with callback `http://127.0.0.1:3000/api/auth/callback/github`. Those values live in the ignored root `.env`. The lab install copies them into Secret `game-runtime` and fails closed when one is missing. The GitHub scope is `user:email`.

SSE is not an authentication mechanism. The [client transport contract](../client/architecture.md#4-end-to-end-update-transport-selected-not-future-conjecture) owns invalidation hints. Source-observed 2026-11-16: `useStoryLiveUpdates` and `story-update-stream.ts` open one EventSource per viewed story and invalidate the scoped Query snapshot; GET stays authoritative (W16/W17). That is not a production-hosting or missed-event live proof. Coverage is in [STATUS](../../../STATUS.md#capability-coverage).

OAuth is an identity connection flow, not the application's complete access model. Let the library handle provider callbacks, state/PKCE where applicable and session lifecycle. Do not implement token exchange or password recovery ourselves. Use secure, HttpOnly cookies with an appropriate SameSite policy, trusted origins and CSRF protection on cookie-authenticated mutations. Do not put session tokens in localStorage or query strings.

Session validation and story authorization are separate. Every command and snapshot read checks membership and character control. SSE connections revalidate on reconnect and terminate or lose access when membership/session is revoked; a connection established yesterday does not authorize data forever. Keep membership enforcement inside application operations used by both HTTP and integrations.

Staff console entry is a separate step-up on that same Better Auth session, not a staff credential by itself. `createAdminSessions.enter` accepts the session only when its creation time is a finite instant no older than fifteen minutes, including the exact boundary. A missing, non-finite, or future creation time is denied with `step_up_required` and an `admin.session.enter_denied` audit before a staff principal is selected or a staff token is minted. The denial does not echo the timestamp. The API rejects a non-finite parsed creation time with the same denial before forwarding the proof; the application check stays authoritative if a caller reaches `enter` directly.

Invitations use expiring, revocable random tokens stored hashed. Redemption requires a signed-in user and occurs atomically against capacity and invitation state. Never auto-link accounts just because an untrusted provider returns a matching email. Notification channel account linking is a separate flow from signing in.

Preserve a safe internal return destination through sign-in: a pending invitation or the story opened from a notification. Do not accept arbitrary redirect URLs. Keep invitation secrets out of provider redirect parameters, telemetry and referrers; use an opaque server-side pending reference where needed. After authentication, recheck invite expiry, roster capacity and current access before redemption. The same user redeeming twice should reach the existing membership rather than consume another slot.

An expired session during a choice sends the user through sign-in and back to the current scene. Never automatically submit the old choice after login; its deadline or meaning may have changed. Keep unsent text as a local draft only where appropriate. Clearing an expired session is different from leaving the shared story.

Apply account and IP rate limits to account entry, story creation and expensive commands, with stronger per-story/funding limits before inference. Bound submitted text and payload size. OAuth proves a provider identity; it does not make unlimited free generation safe to fund. The demo needs a global allowance even before commercial tiers exist. Membership checks on this page are not a privacy export and not a right to another person's data. The unratified request matrix is [Player data lifecycle](../../../work/designs/backlog/player-data-lifecycle/README.md#eight-unresolved-decisions).

## Boundaries that stay next door

Next.js is not a second backend for story tables. Do not put authenticated story responses in a public or cross-user cache. A `202` acknowledges a persisted command receipt, not a finished narration. WebSockets do not authorize an absent player and are not the selected story-update transport. A 2026 platform note that suggested one shared situation and one current intent per character is not an accepted multiplayer rule.

The cross-boundary map of the browser, the API, this session, admission, staff, documents, the worker, and a provider is [Platform trust boundaries](./security-and-trust-boundaries.md#boundary-map). The sentences above stay the rule.

## Terminal pairing authorization boundary

The terminal token is a distinct, browser-approved, revocable 7-day credential with one scope, player-story. The terminal starts with a CSPRNG verifier challenge and a five-minute one-time pairing; a signed-in player explicitly types the matching user code on the existing Web origin and approves. A SQL transaction binds the pairing to that user and mints one 32-byte bearer returned once to the verifier holder; SQL stores only hashes, expiration, status and owner, never the token, code, or verifier. Simultaneous and replayed exchanges are refused, and pairing creation is rate-limited with SQL-backed counters under trusted client-IP derivation. `StoryPlayerIdentity` accepts that bearer only for the Nest stories HTTP controllers (including SSE reauthorization) and terminal-token introspection/revocation. Global Better Auth `IdentityService`, Admin, Drafts, and internal GA continue to require their existing credentials. No wildcard bearer acceptance, no credential in query strings, and no Origin middleware bypass. The CLI credential file is mode 0600 and refuses symlinks. [CL01](../../../work/changes/archive/2026-11/experience/2026-11-22--cl01-terminal-player-client/CHANGE.md).
