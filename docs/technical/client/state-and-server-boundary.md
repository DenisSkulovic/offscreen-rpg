# Client state and server boundary

**Owns:** who holds story truth, the query cache, server-rendered HTML and a command after reload.  
**Status: selected client architecture, owner decision 2026-11-12.** The stack decision and F1–F15 list live in [architecture](architecture.md). This page is the boundary contract. Implementation extent is not "the whole target is shipped" merely because the decision is recorded.  
**Does not own:** player-facing copy ([experience](../../product/experience/play-and-decisions.md)) or game authority ([engine](../engine/authority-and-transitions.md)).

## Topology

A Next server request creates a **new QueryClient for that request**. It is never process-global. The server prefetches critical reads through request-bound Nest calls, validates them, and passes only the intended private projection through `HydrationBoundary`. The browser holds one memory-only QueryClient for the authenticated session. Its `queryFn` uses the same key and result schema through same-origin `/api`. Cookies, server origins and Node-only code do not cross into a client import.

Private Server Components load and compose. Interactive story and list components read the hydrated query cache. The HTML must contain meaningful scene text before hydration, without a second mount fetch that owns the same story. Blindly passing fresh server `initialData` into an already mounted query entry is forbidden, because it need not replace older cache data.

## Ownership

1. Nest owns truth. TanStack Query caches authorized projections. It does not own mechanics, billing or invented in-progress results.
2. Query owns remote data. Do not also store that story in `useState`, context, Zustand or a parallel snapshot store.
3. React Hook Form owns unsaved edits. A background refresh must not reset dirty values.
4. User intent is distinct from request transport. Mutation status is not the durable operation ledger.
5. Local UI (tabs, expanded panels, menus) stays local and resets at its declared entity or offer boundary.
6. The URL owns selection. Query keys include viewer and resource identity. Navigating from story A to story B must never show A as B while B is loading.

Every private key begins with `['viewer', viewerId, ...]`. Session cookies, tokens, unredacted text and mutable object identity do not go in a key. The browser cache is memory-only (`gcTime` five minutes). There is no service worker, IndexedDB or persisted query client for private payloads. GET retry is at most one bounded retry on genuine network or 502/503/504. Never retry 400, 401, 403, 404, 409, 429 or a malformed contract. Mutation retry is zero.

One validated story snapshot is canonical for Play. Updates reconcile monotonically by `viewVersion`, then `resolution.version` when it applies. `dataUpdatedAt` is cache freshness, not domain authority. There are no optimistic committed outcomes.

## Commands and hints

Freeze the intent envelope at the click: viewer, resource, kind, operation id, endpoint, request version, body, created time. A repeated attempt carries that exact id, endpoint and frozen JSON. Do not POST from an effect on mount or reconnect. `202` means accepted or pending, never published. `409` reloads authoritative state and keeps local editable input. `401` reauthenticates without resending. A 5xx or timeout stays ambiguous until a GET or receipt reconciliation.

For resolution and Start, a minimal nonsecret operation envelope may live in `sessionStorage` for 24 hours, keyed by viewer, story and operation id. Do not store secrets, private narrative, prompt bodies or the query cache there. On reload, GET the authoritative story or receipt first. Never POST automatically. Only an explicit recovery control may reissue the identical frozen envelope.

Authenticated SSE carries committed invalidation hints (`eventId`, `storyId`, `viewVersion`, `kind`) after commit. It carries no private narrative. The client invalidates the matching query and fetches. A missed event recovers from GET. If the stream is down, pending status may poll. SSE does not spend money. WebSockets, Redis pub/sub and RabbitMQ are not this transport.

**Negative:** a hydrated HTML snapshot and a diverging client store are two owners and are forbidden. A later-arriving response must not roll back a newer story revision. A stale SSE hint or a late hydration payload does not re-enable a choice the newer snapshot has retired. Logout clears the memory cache. Another user's cached content must not render on back navigation. Chamber does not share privileged browser state with the player session. The frozen command stays in [Intention](interaction-contracts.md#intention). Scene style stays in [Tokens](semantic-design-foundation.md#tokens-primitive-scales-and-semantic-roles-not-a-hardcoded-genre-palette).
