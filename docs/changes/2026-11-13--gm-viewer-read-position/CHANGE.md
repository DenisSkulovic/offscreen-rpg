# GM06 | A truthful per-viewer story return baseline

**State:** Proposed, **not Ready**. **Approval:** no code authorized. **Kind:** authenticated read-position write/read contract + client acknowledgment + tests. **Parent:** [mechanics program](../../experience/mechanics-evolution-program.md). **Dependency:** GM05 stable public ordered event projection, selected viewer/identity behavior and UX07 return design.

## Cursor first-screen brief

> **Current-source map:** [application read/identity](../../../packages/application/src/stories/README.md), [React Query story identity](../../../docs/engineering/targets/react-next.md#2-tanstack-query-architecture-exact-operating-contract), [session/client](../../../docs/technical/client-and-identity.md). Inspect only actual read/ack paths when designing.
> **UX target:** [reliable since-last-visit](../../experience/flows/return-and-memory.md#reliable-since-last-visit) and [copy contract](../../experience/system/interaction-copy.md#return-digest-labels).
> **Known trap:** a server timestamp recording **page request, SSE delivery, background prefetch or hidden tab** is not proof the player viewed any passage. Cross-device acknowledgment and retroactive recaps require separate semantics.
> **Scope:** proposed only; one viewer-specific acknowledged **seen baseline**, not reading-comprehension telemetry.

## Product claim we want to earn

A signed-in player returns to Story A, and the UI can honestly summarize **public committed events since a known prior open/viewing checkpoint**. Until this exists, use **Recent developments**; do not label it “Since you last visited” based on a guess or most recent login.

We should avoid pretending to know whether someone genuinely read a line of prose. The first supported contract might better be **“Since you last opened this story”** than “Since you read it.” Copy must match actual recorded behavior.

## Narrow contract

- Store a **per-viewer, per-story monotonic acknowledged public-event sequence/cursor**, with scope and provenance. Only identity-authorized users can read/update their own baseline.
- Acknowledgment refers to the highest **fully received/rendered/public** event sequence under a foreground/in-view policy. It does not set the story clock or alter canonical event history.
- On return, snapshot the previous baseline **before** accepting any new acknowledgment. Render a sourced digest for committed events in (previous, current] only; current decision/active work are always shown separately.
- A hidden tab, background Query prefetch, speculative navigation, SSE receipt or server HTML generation **must not** advance the baseline.
- A failed acknowledgment may leave a conservative older baseline (repeat a known summary) rather than falsely skip unseen events. Idempotent repeats should not create new time or duplicate spending.
- Multi-device semantics need an explicit choice: a **shared per-viewer baseline** means visiting on device B can change what device A later calls recent. A device-specific reading cursor is a distinct feature. Pick one knowingly.

## UX status distinctions

| Data condition | Copy |
| --- | --- |
| Reliable prior viewer baseline and new public events | “Since you last opened this story…” with exact source-backed changes |
| No reliable baseline | “Recent developments” |
| Baseline exists, no new public committed events | “No new recorded developments since your last visit.” |
| Latest GET failed/offline | “Latest changes could not be checked. Showing your last verified story.” |
| A new passage exists but user is reading older content | “A new development is available”; don't force scroll or mark it read prematurely |
| Different viewer on same shared story | Viewer B has their own baseline; no leakage of A's read position |

## Source/baseline

[Current story lifecycle](../../../docs/technical/story-lifecycle.md), [public event/chronology target](../../experience/flows/return-and-memory.md), [client and identity](../../../docs/technical/client-and-identity.md).

Main 3be49cc, 2026-11-13; a complete viewer-seen cursor is not proven by the initial source audit. Reinspect actual latest source and decide whether a new table or use of existing membership metadata is justified. Do not overload story revision or mark a fetched page automatically read.

## Code scope and exclusions

One typed read/ack API, a minimal persistent per-viewer/story cursor, session/auth enforcement, monotonic conflict behavior, a client hook composed with existing Query (not a second cache) and focused tests. Data migration is conditional and requires explicit approval and rollback plan. No unapproved destructive test DB reset, provider calls, analytics tracking, cross-user read receipts, arbitrary content search or notifications.

## Acceptance and negative proof

**Normal:** viewer A opens Story X, sees public events through sequence 10; later events 11–13 commit while away; next open returns a digest of 11–13 **before** acknowledging the new baseline. Viewer B sees their own appropriate range. Repeated acknowledgment of 10 or 13 is idempotent.

**Negative:** a server SSR prefetch does not mark as viewed; hidden-tab refresh doesn't acknowledge; stale device tries to lower cursor and is rejected/no-op; user cannot acknowledge an event not authorized/present; lost ACK doesn't cause false disappearance; identity A→B cannot reuse A's cursor; cursor never changes time, receipts or provider budget; an optional private event must not enter public digest.

**Proof:** deterministic cursor and identity integration tests when authorized, React visibility/focus and stale Query tests, real browser two-session scenario; no paid provider. The team must write down whether 'opened' or 'seen' is the exact claimed semantic.

## Ready gate

Only after GM05 event ordering/identity and the user-facing copy are stable. Cursor must not approximate the contract using localStorage timestamps and call it a persistent server-backed return.