# Change W16: Authenticated Nest SSE committed-version hints and PostgreSQL notifier

**State: Specified / Proposed.** All technology, behavior and security decisions are governed by the **[selected React/Next target](../../engineering/targets/react-next.md)**; this packet is **not yet active or authorized for application changes**. **Audited source:** `470a5df069470bf758eb1a560c515846ce781637` (source-read only; revalidate current branch/worktree before execution). **Future executor:** Cursor, one selected packet at a time.

**Depends on:** W02; W17 consumes its immutable public hint contract.  
**Destination:** [F1–F15 selected architecture](../../engineering/targets/react-next.md), **F2 F6 F11**. **Source evidence:** [November 12 target-to-code audit](../../engineering/audits/react-next-gap-2026-11-12.md), **G30**.

## Code outcome and owners

**Measurable code/test/config change:** Authenticated Nest SSE committed-version hints and PostgreSQL notifier.  
**Start at:** `apps/api/src/modules/stories/controller.ts`, API boot/auth, `packages/application/src/stories` published transition boundaries, `packages/db` notification bridge, `packages/contracts/src/stories.ts` (event schema), deployment proxy notes.

## Binding technical design

Implement **GET /api/stories/:id/updates** as authenticated **Server-Sent Events** with current owner/story permission on connection and periodic/reconnect revocation check. Send minimal typed `{eventId, storyId, viewVersion, kind}` invalidation hints *after* committed state, never hidden plans, narration, private logs or complete snapshots. Bridge worker/API processes using PostgreSQL transactional `NOTIFY`/dedicated `LISTEN` connection; event hints are lossy and not a durable replay. Bound per-user/story open streams, heartbeat around 15s, idle disconnect/cleanup, slow-consumer/backpressure policy, reverse proxy buffering disabled, connection-limit observations. Retry/reconnect always GET current snapshot; never infer state from missing/reordered hints. No runtime provider calls from subscribe or emit. A separate SSE endpoint on Nest is a narrowly necessary frontend transport, not gameplay feature scope.

## Bounded implementation steps

1. Define versioned public Zod SSE envelope, auth/owner checks and an in-process stream broker with bounded connection policy.
2. Publish committed-story-version notifications in correct transaction ordering and connect dedicated PostgreSQL listener to Nest SSE broadcasting.
3. Add heartbeat, disconnect/re-auth, malformed/duplicate/missed notification, proxy config and provider-free integration tests; expose instrumentation without private payload.

## Acceptance and verification

- **Normal outcome:** Authenticated owner subscribes, a committed version increment emits a hint, the client can GET the new authorized projection.
- **Discriminating negative case:** Another owner/anonymous cannot subscribe or infer existence; missed notification doesn't block later GET; stream emits no private narrative and never dispatches a workflow/provider; reconnect cleans resources.
- **Safe proof and evidence:** Focused Nest/DB integration, network streaming/proxy proof under explicitly safe local services, no live Storyteller.
- **Must preserve / exclude:** No WebSocket, Redis PubSub, RabbitMQ, new durable event log, new gameplay event semantics or billing changes.

## Handoff and stop rule

Cursor must apply this design and [frontend engineering skill](../../../.agents/skills/frontend-engineering/SKILL.md) without choosing replacement libraries, new gameplay behavior, a different UI design or another state authority. Typecheck/build and the smallest truthful normal+negative tests should run when explicitly authorized and safe. Inspect destructive integration scripts before any disposable DB reset. If source contradicts an approved invariant, report evidence rather than silently reinterpret the target. Return files/diff, tests actually run, failures, performance/side effects when relevant and next dependency. No automatic provider spend or deployment.
