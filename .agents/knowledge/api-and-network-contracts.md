# API and network contracts: design the promise, not just the endpoint

**For:** API architect, backend/frontend engineer, network/platform specialist, reviewer and test strategist. **Trigger:** designing or changing a client/server interface, pagination, caching, long-running operations, streaming, third-party integrations, proxies, API compatibility or transport behavior. This is **coding-agent expertise**, not a new Offscreen RPG API specification.

**Route:** [what is the contract](#1-begin-with-the-observable-promise) · [interface styles](#2-choose-rest-rpc-graphql-or-events-by-what-the-client-needs) · [HTTP semantics](#3-method-status-identity-and-retry-semantics) · [data compatibility](#4-serialization-validation-pagination-and-evolution) · [transport/proxy](#5-networks-proxies-and-caches-are-part-of-the-system) · [sync/async/streaming](#6-communication-and-delivery-shapes) · [verification](#7-professional-design-receipt-and-contract-proof).

## The central model

An API is a **promise between independently evolving consumers and providers**. A schema is one part. Meaning also includes resource identity, ownership, time, consistency, errors, retry behavior, version negotiation, trust and operational limits.

A TypeScript type can be correct while the wire response is unusable. An HTTP 200 may mean "job accepted" rather than "business result settled." A correct backend may appear broken because a proxy cached the wrong authenticated response. An attractive REST layout can be worse than a typed command when the operation is naturally action-oriented.

### 1. Begin with the observable promise

Identify what the caller intends and what it can legitimately infer after each response:

| Question | Why it changes the contract |
| --- | --- |
| What outcome does the caller need? | Read a current projection, create an intent, wait for a result, subscribe to updates |
| What resource/operation identity survives retries? | Different requests can represent the same business intent; not every retry is a new command |
| What has committed by the response time? | Enqueued, accepted, persisted, externally confirmed and published are different stages |
| Who is authorized to view or change which properties? | Authn and JSON shape don't imply object/property permission |
| How long can work last? | A synchronous response may not fit remote-provider or background work |
| What consistency/freshness can the client assume? | Published snapshot versus eventual search/analytics projection |
| What changes across versions? | Client/server deploys and old browser tabs coexist |
| What breaks under failure? | Caller retry, proxy timeout, partial response, lost event, stale cache |

**Example:** "Select a Storyteller option" may be a command that accepts an intent and returns an authoritative pending state, followed by later publication. It is *not* naturally described as "update narrative text" if the application must check permissions, action eligibility, time and eventual generation.

## 2. Choose REST, RPC, GraphQL or events by what the client needs

These are **communication interface designs**, not architecture rankings.

| Style | Good reasons to choose it | Conditions against it |
| --- | --- | --- |
| Resource-oriented HTTP/REST | Stable resource identities, standard GET/cache semantics, ordinary CRUD/read and shared clients | Complex multi-step commands may become awkward fake CRUD |
| Action/command HTTP | Business operations have distinct admission/transition semantics | Hidden side effects and unbounded command names make an API hard to understand |
| Typed RPC/gRPC | Internal high-frequency service calls, strong schema/codegen needs and streaming | Browser compatibility, operational complexity, external consumers and debugging |
| GraphQL | Many clients need independently shaped read graphs; field-level selection is valuable | Complexity of nested authorization, N+1, query-cost control, schema governance |
| Event subscription/webhook | Consumers react independently to committed facts; push is important | Duplicate/reordered delivery, subscriber state and debugging |
| Bulk snapshot/export | Large, repeatable data extraction or sync | Memory, pagination consistency, async export identity and retention |
| Simple function in same process | No independent consumer/reliability boundary | Cross-process needs may emerge later; don't split early |

**False choice:** REST does not require mapping every SQL table 1:1 to routes. A resource-oriented model can expose an operation resource, such as `/exports/{id}` or `/stories/{id}/resolutions/{operationId}`. GraphQL doesn't remove backend cost; its graph still requires authorization, batching and bounded query complexity.

**Decision axis:** consumers, shape variability, lifecycle, latency, cacheability, deployment coupling, independent evolution, tracing and operational cost. Start with existing infrastructure if it satisfies those, not with an API fashion contest.

## 3. Method, status, identity and retry semantics

[HTTP RFC 9110](https://www.rfc-editor.org/rfc/rfc9110) distinguishes **safe** methods (defined as essentially read-only) from **idempotent** methods (same intended effect for repeated identical requests). GET and HEAD are safe; PUT and DELETE have idempotent semantics. A POST can be made application-idempotent through an explicit operation protocol, but **the method alone does not grant that guarantee**.

### Semantic contract examples

| Observed response | What it can reasonably mean | What it must not silently mean |
| --- | --- | --- |
| `200 OK` | Request returned successful representation or result according to endpoint contract | Every later background step completed |
| `201 Created` | A resource was created; identify it, usually via Location and response | Related external systems all settled |
| `202 Accepted` | Processing accepted; completion may occur later | Accepted request finished successfully |
| `204 No Content` | Operation succeeded with no body | An unobserved provider result was generated |
| `304 Not Modified` | Conditional cache validation says previous representation usable | Business data can never change again |
| `400/422` | Malformed or semantically invalid request according to policy | Caller should always retry identically |
| `401 vs 403` | Authentication challenge vs refused authorization in typical API use | Exact object existence can safely be disclosed |
| `404` | Not found or intentionally hidden resource | Client definitely owns a related resource |
| `409` | Conflict with existing state/operation | Only generic "try again" UX is possible |
| `412` | Precondition (e.g. If-Match) failed | No further concurrency strategy is needed |
| `429` | Too many requests/resource budget exceeded | Blind immediate retry is sensible |
| `5xx / transport timeout` | Server/intermediary or communication failure | Irreversible business effect definitely did not happen |

The status is a **protocol observation**, not a complete business state. The response body should include stable codes and allowed next actions when the domain requires them. Don't return internal stack traces or private owner data.

### Conditional writes and optimistic concurrency

A client edits version V7 while someone else publishes V8. A blind PUT replacing the entire object overwrites V8. An HTTP precondition such as `If-Match` with a strong representation ETag can reject the stale write with 412, but the server must make the check against the **actual authoritative state**. In applications using a domain-specific version, the same invariant may be enforced in a typed command payload and transaction.

Choose based on consumers, cache/representation semantics, expected revision granularity and whether multiple resources participate in one business operation. A matching ETag alone doesn't atomically coordinate an unrelated payment or workflow.

### Retry and idempotency

**One intended business operation can have many transport attempts.** If a client repeats a POST after a timeout, it needs stable operation identity, parameter-fingerprint match, current state and result lookup. A naive "find ID then insert" can race. The API's method doesn't replace the SQL/provider idempotency protocol.

Don't automatically retry non-idempotent operations absent proof of never-dispatched state or a provider/application idempotency contract. Cancellation of a fetch is not rollback of an accepted command.

**Deep reading:** [HTTP RFC 9110 methods and conditionals](https://www.rfc-editor.org/rfc/rfc9110.html#section-9), [study: HTTP semantics](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/CS/CS230-computer-networks/CS230-L03-http-the-protocol-that-runs-the-web.md).

## 4. Serialization, validation, pagination and evolution

### A TypeScript interface is not wire validation

At boundaries validate data at runtime and distinguish:
- Missing vs null vs optional vs default. These can change update semantics.
- Integers beyond JS safe range, exact money units/rounding and decimal serialization.
- Timestamp as UTC instant, local business date, duration or timezone-aware schedule.
- Discriminated event/command versions and future unrecognized variants.
- Public projection vs internal record; Zod shape doesn't automatically authorize exposure.
- Error fields and unknown values; careless permissive decoding may turn invalid provider data into accepted semantics.

**Compatibility** depends on consumers' use, not merely shape. Adding a required field, narrowing an enum, changing meanings, changing a default, removing a property, changing pagination order or turning an immediate result into eventual pending state can be breaking even if TypeScript compiles in one monorepo revision.

**Options:** additive field with old-consumer tolerance; optional server migration; dual-read/write during rolling deploy; endpoint version; explicit new command contract. Choose by client update cadence, persistent clients, deploy/rollback sequence and data semantics. Don't version every tiny edit reflexively or preserve compatibility forever without cost accounting.

### Pagination is a consistency design

| Strategy | Fits | Hidden consequence |
| --- | --- | --- |
| Offset/limit | Small stable lists, explicit pages, moderate data | Inserts/deletes reorder pages; deep offset can be expensive |
| Cursor/keyset | Large ordered datasets and scrolling | Cursor must preserve filter/sort identity; stable total order; deleted anchor |
| Snapshot-based export | Must visit a consistent dataset | Snapshot lifetime, memory/DB load, expiry and retries |
| Watermark incremental sync | Repeated updates over time | Late/out-of-order changes, tombstones and reconciliation |

**A short page isn't necessarily the last.** The API must define continuation semantics, uniqueness/order, filters, limit bounds, resource visibility and whether updates can cause duplicates or gaps. An E2E test should deliberately mutate the dataset between pages if consistency is the guarantee.

### Stable error contracts

Provide codes that let clients distinguish validation, authorization, conflict, hold, retryable infrastructure failure, unknown external outcome and completed action. Include safe correlation/operation IDs when appropriate. Error taxonomy should reflect **what the user can safely do next**, not just developer convenience.

## 5. Networks, proxies and caches are part of the system

A user-visible request may travel through browser, DNS, TLS, CDN, reverse proxy, Next.js app, Nest API, database and a separate workflow. A "request" is not necessarily one TCP connection or one trace.

### Network and proxy design decisions

- TLS may terminate before the origin; trace the trust boundary for original scheme/host/client IP.
- `X-Forwarded-*` is only trustworthy from explicitly configured proxies, not from arbitrary clients.
- A proxy may buffer response streams, rewrite headers, enforce timeouts or cache representations.
- HTTP/2 multiplexing and HTTP/3 transport affect performance/connection behavior, not permission or business semantics.
- Retries can happen at several layers. A client, proxy and server each retrying independently creates amplification.
- Load balancing distributes work; it cannot create downstream capacity. Health checks should distinguish "process alive" from "ready to serve."
- CDN caches can accidentally expose personalized content unless cache keys, response directives and authorization vary appropriately.
- One global p50 latency figure can conceal queueing, DB pool waiting, CDN misses and slow provider tails.

### Cache policy is an API promise

`Cache-Control`, `ETag`, `Vary` and personalized response semantics determine when a cached response can be used. The correct policy depends on whether the representation is public/static, authenticated/user-specific, immutable revision or current mutable view.

A cache key is a declaration of **which responses may be treated as equal**. If two principals are not authorized to see the same value, don't make them share an improperly keyed public cache. See [security manual](security-and-trust.md) and [durable operations caching](durable-operations.md) for the authorization/invalidation dimensions.

**Deep study:** [proxies/load balancers/CDNs](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/CS/CS230-computer-networks/CS230-L09-proxies-load-balancers-and-cdns.md), [HTTP protocol](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/CS/CS230-computer-networks/CS230-L03-http-the-protocol-that-runs-the-web.md).

## 6. Communication and delivery shapes

| Need | Plausible starting mechanism | Main decision axis |
| --- | --- | --- |
| Immediate bounded response | HTTP request/response | Latency, idempotency, user wait |
| Long-running command | 202 + operation/status resource + durable worker | Deadlines, retries, recovery and cancellation |
| Server push to browser | SSE | Server-to-client stream, reconnection, last event ID, proxy buffering |
| Bidirectional low-latency interaction | WebSocket | Session lifecycle, backpressure, ordering, reconnect/resync |
| Independent service consumers | Queue/event bus | Repeated/late delivery, schema evolution, consumer state |
| Bulk read/export | Async job + downloadable artifact | Snapshot identity, progress, retention, authorization |
| Third-party callback | Verified webhook + inbox/reconciliation | Duplicate/replay/out-of-order delivery, ownership |

**SSE isn't a durable command ledger.** A reconnecting browser may miss events; it should be able to resynchronize from authoritative state. **WebSocket isn't automatically required for any "real-time" application.** Compare directionality, message frequency, client support, auth lifecycle and operating overhead.

### Timeouts are budgets, not correctness decisions

A finite timeout limits how long the caller waits. It does not declare the business operation failed. Consider an overall deadline versus per-hop timeout, retries, backoff/jitter, connection pool queueing, request cancellation, and who is allowed to retry. A five-second client timeout and a thirty-second provider operation require explicit **pending/uncertain** semantics, not generic 500 handling.

### Backpressure and fairness

Bound per-request size, fan-out, concurrency, queue depth and expensive work by meaningful tenant/account scope. Request rate is not the same as concurrent occupancy or cumulative resource cost. A streaming endpoint needs slow-consumer policy; a background queue needs backlog/retention and cancellation policy.

## 7. Professional design receipt and contract proof

A strong API-design proposal names:

1. Consumer scenario and desired observable outcome.
2. Candidate interface styles and chosen resource/command identity.
3. Authority, authentication/authorization and public/private projection.
4. Sync/async semantics and what each status **actually** establishes.
5. Retry/idempotency, preconditions and ordering guarantees.
6. Wire shape, serialization, compatible evolution and error taxonomy.
7. Proxy/cache/streaming implications and operational limits.
8. Minimal evidence: one happy path, one denial/conflict, one stale/repeated/late case.

**Three tests that invalidate plausible wrong implementations:** (a) same idempotency key, different parameters returns a conflict; (b) stale expected revision cannot overwrite newer state; (c) browser reconnect after dropped SSE still obtains current authoritative projection rather than missing a transition.

**Local owners:** [client and identity](../../docs/technical/client-and-identity.md), [data](../../docs/technical/data.md), [story lifecycle](../../docs/technical/story-lifecycle.md), [API workspace](../../apps/api/README.md), [web workspace](../../apps/web/README.md), [application guide](../../packages/application/README.md).

**Primary reference:** [HTTP RFC 9110](https://www.rfc-editor.org/rfc/rfc9110), [MDN HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP). **Deep study:** [Frontend–backend contract](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/SE/SE310-web-apis-and-security/SE310-L01-the-frontend-backend-contract.md), [third-party integrations](https://github.com/DenisSkulovic/the-modern-software-engineer/blob/main/book/SE/SE325-backends-in-the-wild/SE325-L05-surviving-third-party-integrations.md).

**Scope:** This manual enriches design judgment. It does not authorize application code changes, new endpoints, traffic tests or live provider calls.
