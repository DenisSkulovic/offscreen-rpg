# 7. The browser, session and trust perimeter

**Reader question:** when does a player actually see a committed scene, and which actors can access private data? **Baseline:** 584b594. Canonical [client state/server boundary](../technical/client/state-and-server-boundary.md), [authentication](../technical/platform/identities-and-access.md), [platform trust](../technical/platform/security-and-trust-boundaries.md).

## Query cache is a projection, never another story authority

```mermaid
sequenceDiagram
    autonumber
    actor Player
    participant Next as Next server
    participant API as Authenticated Nest
    participant PG as PostgreSQL
    participant Query as Browser TanStack Query
    Player->>Next: Open a private story URL with session
    Next->>API: Request-bound fetch with same viewer cookie
    API->>PG: Read owner-scoped committed snapshot
    PG-->>API: Passage, revision and authorized projection
    API-->>Next: Validated DTO
    Next-->>Player: SSR scene HTML plus hydration state
    Player->>Query: Hydrate viewer and story query key
    Player->>API: Submit one frozen command ID
    API-->>Player: Accepted/pending, not committed scene
    PG-->>API: Later committed-view notification
    API-->>Query: SSE hint with story ID and view version
    Query->>API: GET owner-scoped story snapshot
    API-->>Query: Canonical new scene
    Query-->>Player: Render new committed scene
```

The client contract selects **request-scoped** server QueryClient and **one memory-only viewer-scoped** browser QueryClient, no duplicate story state in Zustand/useState. Only GET provides story truth. The SSE event contains a small invalidation hint, **not** private narrative. A dropped event recovers via GET or bounded pending polling; it never triggers a new POST. Browser code must not import Node-only token/origin configuration.

## Status handling makes retries safe

```mermaid
flowchart TD
    Intent[Freeze command ID, endpoint, body and viewer] --> POST[Send one mutation]
    POST --> Status{HTTP result}
    Status -->|2xx accepted, maybe 202| Pending[Show pending and GET receipt or snapshot]
    Status -->|409 conflict| Refresh[GET latest authoritative snapshot and preserve editable intent]
    Status -->|401| Login[Reauthenticate, do not auto-POST]
    Status -->|403 or 404| Stop[No access or not found]
    Status -->|timeout or 5xx| Ambiguous[Unknown admission outcome]
    Ambiguous --> Reconcile[GET snapshot or receipt first]
    Reconcile -->|same op already accepted| Pending
    Reconcile -->|explicit user recovery allowed| Same[Resend identical frozen envelope]
    Pending --> SSE[SSE hint or scheduled GET]
    SSE --> GET[GET current committed scene]
    GET --> Render[Monotonic viewVersion update]
```

**SELECTED client behavior; code coverage varies.** The contract says mutations have **zero automatic retries**. Recovery of a frozen operation is an explicit, bounded action after checking authoritative state, not a useEffect that repeats irreversible game commands on reconnect. A 409 is not permission to rewrite the request with a new ID and hope.

## Cross-service trust boundary

```mermaid
flowchart LR
    Browser[Browser with Better Auth cookie] -->|public HTTP| API[Nest API]
    API -->|owner scoped token| GA[Private Game Authority]
    Control[Temporal control identity] -->|publish saved result only| GA
    Executor[Storyteller executor identity] -->|task, claim, save only| GA
    Executor -->|bounded versioned read| S3[(Documents)]
    GA --> PG[(Story database)]
    GA --> S3
    Executor -.->|forbidden general SQL writer| PG
    Browser -.->|forbidden direct private API| GA
    Browser -.->|forbidden raw object access| S3
```

**TARGET with gaps.** Today the private GA server authenticates a shared bearer for its limited read/resolution seam; separate control/executor role credentials **are not implemented** at baseline. A software routing boundary does not imply PostgreSQL privilege enforcement unless actual DB roles and negative writes are tested. No user browser request should go directly to GA, PostgreSQL, S3 internals, Temporal or the model provider.

## View isolation between players and story branches

```mermaid
flowchart TD
    Req[Request story B] --> Session{Session valid?}
    Session -->|no| Unauthorized[401 before operation]
    Session -->|yes| Owner{Story belongs to viewer?}
    Owner -->|no| Hidden[404 without leaking B]
    Owner -->|yes| Key[Query key includes viewer and story identity]
    Key --> Revision{Incoming viewVersion newer?}
    Revision -->|no| Ignore[Ignore stale SSE or response]
    Revision -->|yes| Display[Replace authorized projection]
    Display --> Logout[Logout clears private memory cache]
```

This is a compact view of the selected security/client contract, not a standalone audit of browser cache, OAuth configuration, cookie flags or revocation race timing. The client boundary explicitly forbids cross-viewer cached payloads and late hydration from overwriting newer data. The current Nest story hub (apps/api/src/modules/stories/story-update-hub.ts) listens to PostgreSQL notifications, emits small story-update hints and reconnects on LISTEN failure; it is not a Rabbit consumer.

## What to test, not merely trust

- Real same-origin Next rewrite and SSR must hit **the same Nest service** while the browser cookie remains scoped to the forwarded origin. Backend API_INTERNAL_ORIGIN and API_PROXY_ORIGIN are different knobs.
- Owner A can open A's scene; owner B receives the same not-found behavior as a nonexistent story. A browser's stale A query must not render in B's session or after logout.
- A POST that times out and later succeeds must not be replayed by SSE reconnect or hydration. One admitted mechanical outcome and one passage.
- Out-of-order event versions and late GET results cannot roll back the visible committed scene.
- Executor credential cannot call GA publish/start or query raw SQL; control credential cannot act as a browser owner. Not yet proven in kind.
