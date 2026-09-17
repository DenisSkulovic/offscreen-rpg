# Frontend, identity and shared play

## React and Next.js

Use Next.js App Router for the public site, account entry and authenticated application shell. Its server/client component model supports rendering initial content on the server while keeping interactive regions in the browser. Public explanatory pages can be prerendered; live story data is private and dynamic. [Next.js server and client components](https://nextjs.org/docs/app/getting-started/server-and-client-components).

Next.js is a reasonable choice, not a requirement created by the game. React with Vite and a router would be simpler if the entire product were a client application. We choose Next for the combined public experience and application, accepting that caching and server/client boundaries must be explicit.

NestJS owns domain commands, authentication and authorization. Next server components can call the API with the user's session; they must not become a second backend updating the same story tables. Place web, `/api` and `/api/auth` behind one origin. Route the SSE path directly to the API through an ingress that supports long-lived responses.

Never use a public or cross-user cache for authenticated story responses. Set explicit private/no-store behavior for those reads and verify it at the reverse proxy as well as in the framework. A service worker should cache the static shell, not silently retain private story API responses after logout.

## UI tools and ownership of state

Recommended initial toolkit: Tailwind CSS for styling; selected shadcn/ui controls for dialogs, menus and forms; TanStack Query for API snapshots and mutations; Zod schemas for runtime contracts. Add React Hook Form if creation/settings forms become sufficiently complex. Keep animations restrained and respect reduced-motion preferences.

shadcn/ui supplies source components we can own and change; use it as control primitives, not a reason to turn the story into a generic admin dashboard. TanStack Query owns fetched server data, not the authoritative game state. [shadcn/ui](https://ui.shadcn.com/docs/new), [TanStack React libraries](https://tanstack.com/libraries/react).

Use local React state for draft text, selected tabs and modal visibility. Do not start with Redux, a second client entity store and a graph of synchronized caches. Render a committed story snapshot plus local pending-input state. A submitted intention can appear as pending; an optimistic preview must not claim that the character has already succeeded, spent money or escaped.

The primary screen needs the current scene, contextual actions, progression/decision timing, pause state and accessible chronology. Use a readable fallback when imagery is absent. Announce new developments accessibly without announcing every countdown second. Mobile layout and an interruption-free reading experience are first-version concerns.

## Authentication and sessions

Better Auth owns PostgreSQL-backed sessions and GitHub OAuth. Its official Node handler is mounted directly in Nest's Express server before body parsing, without a community Nest integration wrapper. The API uses ESM. The [development guide](../development.md) describes the implemented identity checks and remaining live-provider validation. SSE and invitation handling remain later integration work. [Better Auth Express integration](https://better-auth.com/docs/integrations/express).

OAuth is an identity connection flow, not the application's complete access model. Let the library handle provider callbacks, state/PKCE where applicable and session lifecycle. Do not implement token exchange or password recovery ourselves. Use secure, HttpOnly cookies with an appropriate SameSite policy, trusted origins and CSRF protection on cookie-authenticated mutations. Do not put session tokens in localStorage or query strings.

Session validation and story authorization are separate. Every command and snapshot read checks membership and character control. SSE connections revalidate on reconnect and terminate or lose access when membership/session is revoked; a connection established yesterday does not authorize data forever. Keep membership enforcement inside application operations used by both HTTP and integrations.

Invitations use expiring, revocable random tokens stored hashed. Redemption requires a signed-in user and occurs atomically against capacity and invitation state. Never auto-link accounts just because an untrusted provider returns a matching email. Notification channel account linking is a separate flow from signing in.

Preserve a safe internal return destination through sign-in: a pending invitation or the story opened from a notification. Do not accept arbitrary redirect URLs. Keep invitation secrets out of provider redirect parameters, telemetry and referrers; use an opaque server-side pending reference where needed. After authentication, recheck invite expiry, roster capacity and current access before redemption. The same user redeeming twice should reach the existing membership rather than consume another slot.

An expired session during a choice sends the user through sign-in and back to the current scene. Never automatically submit the old choice after login; its deadline or meaning may have changed. Keep unsent text as a local draft only where appropriate. Clearing an expired session is different from leaving the shared story.

Apply account and IP rate limits to account entry, story creation and expensive commands, with stronger per-story/funding limits before inference. Bound submitted text and payload size. OAuth proves a provider identity; it does not make unlimited free generation safe to fund. The demo needs a global allowance even before commercial tiers exist.

## HTTP commands and SSE updates

Use a small REST API with shared runtime schemas and generated/documented HTTP contracts. Illustrative operations are create story, accept invitation, start, submit intent, pause, resume, read snapshot and page chronology. No GraphQL requirement. A `202` acknowledges a persisted command receipt, not completed execution. Return its identifier and pending status; the client reconciles through the receipt and current snapshot while Temporal processes it.

For example, `POST /api/stories/:storyId/decisions/:decisionId/intents` carries `characterId`, `optionId` (or permitted text), `decisionVersion` and `submissionVersion`, with an idempotency header. The server returns an operation/submission reference and current decision version. Use explicit error codes for expired choice, stale version, forbidden actor and exhausted allowance so the UI can explain the actual problem. Transport errors alone do not tell a client whether its command committed; retry using the same key or read the operation status.

The minimal HTTP surface must also cover saving a versioned draft, requesting/reading preview generation, starting a reviewed candidate, reading a command receipt, updating reading progress and registering/revoking a device subscription. Each mutation declares whether it is a synchronous database edit or an asynchronous receipt; do not make the frontend infer this from a spinner. The [lifecycle contract](story-lifecycle.md) governs draft/start and recovery operations.

Updates use SSE because the server mainly tells browsers that a committed revision or decision status changed. The browser still sends commands through ordinary authenticated HTTP. EventSource supports event IDs and reconnection, but durable replay is our responsibility. [MDN SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events).

Publish small authorized update envelopes with story ID, `viewVersion` and change kind. Do not send hidden plans, full model traces or raw database rows. On receipt, update or refetch the snapshot. Order by that visible-state version, not narrative revision, and never replace a newer snapshot with an older HTTP response. An unchanged narrative can still have newly ready players, a completed pause or an image available.

A transport update such as `story.changed` or `decision.changed` is a notice about committed application data. It is different from a fictional event in the narration, a Temporal Signal or an Activity invocation. Give each payload a schema version and stable identifier; do not expose workflow internals as the public API merely because both are called events.

For the first version, reconnect by fetching a fresh authorized snapshot; do not require a separate durable SSE event history. Establish the stream before the snapshot read and buffer subsequent invalidation hints, then refetch if any have a newer view version. Periodic lightweight version checks repair missed live signals. SSE event IDs can indicate a gap, but are not a promise to replay every message.

The snapshot includes the visible situation, lifecycle/control state, current decision/interval, server time, timing projections, pending receipts visible to that member and allowed actions with reasons when unavailable. Read these coherently in one short transaction or use an equivalent version-checked read. The UI estimates countdowns from server time and resynchronizes; the displayed zero is never the authority for accepting a command. Revalidate actions on the server even if they were shown moments ago.

Initially use PostgreSQL LISTEN/NOTIFY for compact live-change hints between Activity workers and API instances. Issue the notification with the state transaction so it becomes visible after commit. Each API listener uses a dedicated connection and authorizes which connected clients may receive the resulting update. Send IDs/revisions, not private narrative content. Monitor listener health and notification backlog; long listener transactions must not obstruct delivery. [PostgreSQL NOTIFY](https://www.postgresql.org/docs/current/sql-notify.html).

These hints are not durable replay. Reconnect and periodic revision checks repair missed messages using PostgreSQL snapshots; user browsers never connect to the database. If fan-out volume later warrants Redis Pub/Sub, it replaces this hint transport only. Temporal Task Queues distribute workflow/Activity work, not browser broadcasts, and a second background queue would not solve that distinction.

Configure proxy buffering, heartbeat intervals and idle timeouts for SSE. Next.js supports self-hosted streaming, but the entire hosting path must preserve it. If a selected host cannot, change transport/hosting deliberately rather than assuming streaming works through every proxy. [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting).

WebSockets become useful if we introduce chat, rich presence or high-frequency bidirectional interactions. They do not solve deadline races or authorization. Presence is optional information, never authority to choose for an absent player.

## Multiplayer policy proposal

The product has not yet selected its shared-decision rules. The recommended first implementation is one active shared situation with a decision collecting at most one current intent per eligible character. Allow editing an intent until the decision is sealed. Seal when everyone required is ready or at the deadline, then resolve the set together and use permitted defaults for missing players.

An intent submission should carry the decision version and actor's submission version rather than invalidate every other player's button whenever a friend responds. Narrative changes invalidate the decision itself. This avoids unnecessary conflicts while retaining clear concurrency checks.

Owner-controlled start/pause/resume is a simple initial proposal, not an established requirement. Individual notification preferences remain personal. Do not silently grant a paid user control over another person's character. Likewise, group model quality and spend should be selected for the story, not vary according to who clicked last.

Before implementing resolution, settle whether players can see unsealed intentions, whether everyone must explicitly ready, and how conflicting intentions are adjudicated. None requires a network lockstep game engine. All require explicit product behavior and the transactional execution described in [execution](execution.md).

## Returning and reading the story

Persist a member's last displayed chronology sequence, updated monotonically across devices. Opening a push notification is not proof the new passage was read, and loading a story list must not mark all its stories read. When the current scene/recap is actually displayed, acknowledge the appropriate sequence. Browser cache keys include the viewer and are cleared on logout/account switch.

On return, show the current situation immediately with recent committed entries or an existing recap. If a richer recap needs inference, generate it separately with a budget; it must not delay a currently available decision. Bind each recap to its source range and viewer. If the story advances during generation, label the recap's coverage and show newer entries rather than pretending it includes them.

Chronology pagination uses stable sequence cursors and a captured upper bound for a reading session, so new passages do not cause duplicate/missing pages. Old choices render as history. A bookmark into a deleted or inaccessible story gives an access-appropriate message without exposing the former content.

## Scene media

An illustration is an asynchronous presentation artifact, not part of deciding whether the story advances. Bind its operation and attachment to a scene/candidate identity plus an expected presentation revision. A delayed mountain image may attach to its historical passage but must not overwrite the current apple scene. Publishing the attachment increments the view version without invalidating narrative generation.

Use private object storage for generated story media, accessed through an authorized endpoint or short-lived URLs. Do not put permanent public URLs into private snapshots and call the story private. A failed image leaves a readable text scene. No arbitrary uploads or model-supplied remote image fetches are needed for the first slice.
