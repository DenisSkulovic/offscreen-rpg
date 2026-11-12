# Change W17: EventSource Query invalidation with reconnect and polling safety fallback

**State: Specified / Proposed.** All technology, behavior and security decisions are governed by the **[selected React/Next target](../../engineering/targets/react-next.md)**; this packet is **not yet active or authorized for application changes**. **Audited source:** `470a5df069470bf758eb1a560c515846ce781637` (source-read only; revalidate current branch/worktree before execution). **Future executor:** Cursor, one selected packet at a time.

**Depends on:** W03 W05 W16. Uses existing W15 Query provider and typed read adapters.  
**Destination:** [F1–F15 selected architecture](../../engineering/targets/react-next.md), **F3 F4 F6 F10**. **Source evidence:** [November 12 target-to-code audit](../../engineering/audits/react-next-gap-2026-11-12.md), **G18 G30**.

## Code outcome and owners

**Measurable code/test/config change:** EventSource Query invalidation with reconnect and polling safety fallback.  
**Start at:** `apps/web/src/features/play` query/refresh controller, `apps/web/src/lib/story-transport.ts` or feature API, new story update subscription helper, `packages/contracts/src/stories.ts` event schema.

## Binding technical design

In the client **one `EventSource` per actively viewed authorized story** with cookie auth on same origin, explicit cleanup on viewer/story change, hidden-tab policy and bounded error/reconnect handling. Parse/validate SSE envelopes; treat each event as a hint to **`queryClient.invalidateQueries`** exactly the scoped story key, never write untrusted event fields as current state. Dedupe events/viewVersion, abort/ignore stale response after A→B. On stream connect/reconnect/focus run a fresh authorized GET; while SSE healthy use **30-second safety GET polling** for unresolved status; if SSE fails, fall back to bounded **2-second visible pending GET** with backoff on repeated server faults. No automatic mutation, paid model invocation or local store. On logout/session switch close and clear Query. A missed event must converge to current snapshot by timer/focus/read.

## Bounded implementation steps

1. Implement typed EventSource manager and integrate with W05 TanStack Query refresh policy, conditional on unresolved current story.
2. Reconcile event hint -> invalidate -> GET -> W03 version-aware Query data, with no extra canonical store.
3. Controlled EventSource/visibility/failure/reordered hints/Strict Mode tests plus real Nest SSE consumer test after W16.

## Acceptance and verification

- **Normal outcome:** Story state updates shortly after committed signal with one authorized GET and no unnecessary constant 2s polling when stream healthy.
- **Discriminating negative case:** Old story hint cannot invalidate wrong user/resource; duplicate SSE or reconnect cannot create request storm; disconnect does not make UI permanently stale; event never POSTs.
- **Safe proof and evidence:** Provider-free MSW EventSource simulator and real HTTP streaming test, request count/cleanup evidence.
- **Must preserve / exclude:** No WebSocket, new message bus, optimistic game state, independent SSE entity store or UI redesign.

## Handoff and stop rule

Cursor must apply this design and [frontend engineering skill](../../../.agents/skills/frontend-engineering/SKILL.md) without choosing replacement libraries, new gameplay behavior, a different UI design or another state authority. Typecheck/build and the smallest truthful normal+negative tests should run when explicitly authorized and safe. Inspect destructive integration scripts before any disposable DB reset. If source contradicts an approved invariant, report evidence rather than silently reinterpret the target. Return files/diff, tests actually run, failures, performance/side effects when relevant and next dependency. No automatic provider spend or deployment.
