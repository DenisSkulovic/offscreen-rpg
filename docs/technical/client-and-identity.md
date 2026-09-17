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

Recommended candidate: Better Auth with PostgreSQL-backed sessions and one OAuth provider, then add another if useful. The documented NestJS integration is community-maintained and currently describes Fastify support as beta; start with Express and verify callback handling, cookies, logout and SSE authorization in a small integration test. [Better Auth NestJS integration](https://better-auth.com/docs/integrations/nestjs).

OAuth is an identity connection flow, not the application's complete access model. Let the library handle provider callbacks, state/PKCE where applicable and session lifecycle. Do not implement token exchange or password recovery ourselves. Use secure, HttpOnly cookies with an appropriate SameSite policy, trusted origins and CSRF protection on cookie-authenticated mutations. Do not put session tokens in localStorage or query strings.

Session validation and story authorization are separate. Every command and snapshot read checks membership and character control. SSE connections revalidate on reconnect and terminate or lose access when membership/session is revoked; a connection established yesterday does not authorize data forever. Keep membership enforcement inside application operations used by both HTTP and integrations.

Invitations use expiring, revocable random tokens stored hashed. Redemption requires a signed-in user and occurs atomically against capacity and invitation state. Never auto-link accounts just because an untrusted provider returns a matching email. Notification channel account linking is a separate flow from signing in.

Apply account and IP rate limits to account entry, story creation and expensive commands, with stronger per-story/funding limits before inference. Bound submitted text and payload size. OAuth proves a provider identity; it does not make unlimited free generation safe to fund. The demo needs a global allowance even before commercial tiers exist.

## HTTP commands and SSE updates

Use a small REST API with shared runtime schemas and generated/documented HTTP contracts. Illustrative operations are create story, accept invitation, start, submit intent, pause, resume, read snapshot and page chronology. No GraphQL requirement. A `202` can acknowledge an accepted asynchronous command; return an operation identifier the client can reconcile.

For example, `POST /api/stories/:storyId/decisions/:decisionId/intents` carries `characterId`, `optionId` (or permitted text), `decisionVersion` and `submissionVersion`, with an idempotency header. The server returns an operation/submission reference and current decision version. Use explicit error codes for expired choice, stale version, forbidden actor and exhausted allowance so the UI can explain the actual problem. Transport errors alone do not tell a client whether its command committed; retry using the same key or read the operation status.

Updates use SSE because the server mainly tells browsers that a committed revision or decision status changed. The browser still sends commands through ordinary authenticated HTTP. EventSource supports event IDs and reconnection, but durable replay is our responsibility. [MDN SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events).

Publish small authorized update envelopes with story ID, public revision/cursor and change kind. Do not send hidden plans, full model traces or raw database rows. On receipt, update or refetch the snapshot. Order by server revision, ignore duplicates and never replace a newer snapshot with an older HTTP response.

A transport update such as `story.changed` or `decision.changed` is a notice about committed application data. It is different from a fictional event in the narration and from a worker job such as `resolve-decision`. Give each payload a schema version and stable identifier; do not expose an internal queue message as the public API merely because both are called events.

On reconnect, either replay authorized retained updates from a cursor or return a fresh snapshot when history is unavailable. Subscribe before taking the snapshot and buffer subsequent updates, or use an equivalent watermark protocol to avoid missing a change between the read and subscription. Periodic lightweight revision checks repair missed live signals.

Across API instances, Redis Pub/Sub can fan out invalidation hints, but it has at-most-once delivery. Retain the durable truth in PostgreSQL and recover through snapshots/cursors. A BullMQ job consumed by one worker is not a broadcast to every connected browser. [Redis Pub/Sub semantics](https://redis.io/docs/latest/develop/pubsub/).

Configure proxy buffering, heartbeat intervals and idle timeouts for SSE. Next.js supports self-hosted streaming, but the entire hosting path must preserve it. If a selected host cannot, change transport/hosting deliberately rather than assuming streaming works through every proxy. [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting).

WebSockets become useful if we introduce chat, rich presence or high-frequency bidirectional interactions. They do not solve deadline races or authorization. Presence is optional information, never authority to choose for an absent player.

## Multiplayer policy proposal

The product has not yet selected its shared-decision rules. The recommended first implementation is one active shared situation with a decision collecting at most one current intent per eligible character. Allow editing an intent until the decision is sealed. Seal when everyone required is ready or at the deadline, then resolve the set together and use permitted defaults for missing players.

An intent submission should carry the decision version and actor's submission version rather than invalidate every other player's button whenever a friend responds. Narrative changes invalidate the decision itself. This avoids unnecessary conflicts while retaining clear concurrency checks.

Owner-controlled start/pause/resume is a simple initial proposal, not an established requirement. Individual notification preferences remain personal. Do not silently grant a paid user control over another person's character. Likewise, group model quality and spend should be selected for the story, not vary according to who clicked last.

Before implementing resolution, settle whether players can see unsealed intentions, whether everyone must explicitly ready, and how conflicting intentions are adjudicated. None requires a network lockstep game engine. All require explicit product behavior and the transactional execution described in [execution](execution.md).
