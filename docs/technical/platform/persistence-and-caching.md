# Persistence and caching

This page owns the selected architecture and normative guarantees. Present-tense rules specify the end state; the Current state section and [Change sequence](../../../work/changes/README.md#cache-platform-redesign) distinguish implementation and evidence.

PostgreSQL owns transactional game and financial authority, immutable object storage owns canonical bytes, and Temporal owns durable execution. See [who owns the durable record](./data-and-persistence.md#who-owns-the-durable-record). Drizzle and connection lifecycle belong to @offscreen/db; [domain schema ownership and managed execution](database-infrastructure.md) define the persistence package boundary; queries and transactions belong to domain owners including @offscreen/story-engine. No generic repository per table: locks, joins, isolation, revision fences and atomic transitions are meaningful domain behavior.

## Read models

Player snapshots are runtime-validated projections built in a read-only repeatable-read transaction. Pagination retains ownership predicates and bounds. Commands reacquire authoritative rows and recheck revisions. The projection identity covers every field that can change output, including narrative/gameplay version, current generation/publication and public accounting totals. SQL supplies owner-scoped identity before lookup; population uses the identity observed within the actual build transaction, never merely the preflight identity.

## Redis boundary

Redis is optional disposable acceleration. Cache loss, eviction, restart and failover do not alter command semantics, permissions, spending, settlement, timers, publication, outbox or durable state. Optional degraded Redis does not fail readiness. No generic write-behind, ORM query caching, business distributed locks, cached command preconditions, sole copies of records or cached authorization. Browser/API story responses remain no-store. The existing local Kind implementation (dated realization) uses owned-identity create/CAS patches until the selected native replacement is integrated. The owner-accepted [native Redis infrastructure target](redis-native-infrastructure.md) supersedes that implementation direction: fresh-only Helm install, compatible no-op, refusal otherwise. Neither path establishes hosted authentication, TLS or multi-operator safety. [Kubernetes Redis](../../runbooks/kubernetes-redis.md) owns the disposable lab procedure, not production proof.

## Package ownership and public API

The dependency-free neutral port is @offscreen/cache-port (DO01); @offscreen/cache owns richer reusable mechanisms and depends on that port, not Contracts, DB, Documents, object storage, Story Engine or game schemas. Memory-only consumers use narrow exports without loading Redis. Deployable composition roots own runtime config, lifetime, diagnostics and shutdown. Domain owners choose identity, validation, freshness, authorization and origin budgets. Storage decorators live with the storage interface owner.

The cache package groups core contracts, adapters, strategies, resilience, codecs and runtime by responsibility; explicit subpath exports for core/codecs/memory/Redis. No empty architectural scaffolding. Typed defineCache definitions bind namespace, schema version, explicit strategy, codec and policy to an injected runtime. Byte store returns discriminated hit (bytes and absolute expiry), miss or bypass (bounded reason); writes return stored/skipped/bypassed. Cached null is distinct from miss. Legacy ReadCache is a bounded migration bridge, not the long-term API. Cache exceptions and telemetry callback failure cannot discard a successful authoritative result. Authoritative loader failure remains an error. Explicit function wrappers and interface decorators are preferred; implicit language-level @Cacheable and universal interception are deferred.

## Identity, consistency and freshness

Keys comprise environment prefix, registered namespace, schema version and SHA-256 of a canonical length-delimited tuple of bounded opaque identity components. Include owner/tenant, entity, storage scope and object kind as required. Never include prose, credentials, private plans or email. Authorization precedes lookup and coalescing; hashing is not authorization. Version schema changes in keys; no global flush for correctness.

| Strategy | Identity | Rule |
| --- | --- | --- |
| Immutable | Content hash or committed checkpoint | Same authorized identity implies same verified content; expiration reclaims resources |
| Versioned | SQL preflight and observed build identity | Lookup preflight, populate actual observed identity |
| Expiring | Authorized identity and observation time | Freshness bounded from source observation, not cache write or tier promotion |

No default strategy. Loader returns value plus observed identity, observation time where applicable. Never populate requested identity if it differs from actual identity. Downward TTL jitter (15% default) cannot extend freshness; no stale-on-error by default. Refresh-ahead/stale-while-revalidate are later explicit expiring-policy extensions, never current story projections. Negative caching disabled by default; later opt-in only for authoritative absence, never forbidden, transient or corrupt data. Mutable expiring shared population requires monotonic revision/compare fence or is skipped. Delete is reclamation, not consistency. Pub/sub invalidation is deferred.

## Stores and serialization

JSON codec accepts runtime validator and encodes UTF-8; bytes codec preserves exact bytes. Validate every hit, including immutable hash and schema at domain boundary. Enforce payload bounds before decoding and writing. Envelope has explicit format version, absolute expiry, observation metadata as needed; Redis writes atomically with SET PX. Reject malformed or expired envelopes. L1 promotion preserves L2 expiry, not a renewed TTL. Copy mutable buffers on ingress/egress; typed object reuse requires explicit immutability.

L1 is process-local weighted LRU, with aggregate byte and count budgets, expired-entry removal, recency promotion, oversize rejection, injected clock and eviction accounting. Weight is serialized size plus conservative overhead, not exact V8 heap. L2 is optional shared Redis. L1 miss falls through to L2 then origin; tier writes independent; failed L2 does not prevent L1 reuse. No automatic memory mirrors for all domains. Deterministic fake and disabled stores share the contract.

## Concurrency and origin protection

Single-flight registers leader before invoking loader, coalesces identical authorized keys per process, removes only matching pending entry on settlement, and propagates source failure to remaining waiters. Cancellation detaches individual waiter, not shared work. Bound active distinct keys and waiters. Loader cancellation is cooperative; retain capacity until actual underlying settlement even after caller deadline. Clear/invalidate fence late local writes via generation and entry identity, without unbounded tombstones.

Origin bulkhead uses workload-specific concurrency, bounded FIFO wait capacity/deadline and typed retryable overload; domain transport owns mapping. Cache outage bypasses cache, not bulkhead. No cache-level retries of arbitrary source operations. Per-process limits multiply across replicas. At 95% hits, full cache loss may multiply origin traffic 20x before protection; measure cold paths.

Distributed refresh leases are conditional on measured cross-Pod duplicate work, only for immutable/versioned loads. Acquire SET NX PX with random token, release atomically via compare-and-delete; bounded jittered recheck then bounded origin fallback. Expired lease holders cannot delete successors. Duplicate computation is acceptable; no business exclusivity, payment or provider fencing claim. No mandatory leases or cluster deployment.

## Connection lifecycle and resilience

Configured Redis progresses connecting -> ready -> degraded -> ready, or terminal closed; unconfigured is disabled. Optional startup returns after bounded wait; recover automatically without application restart. One reconnect owner with bounded exponential backoff/jitter, no accumulating timers. Disable offline queue; bound SDK queue and actual outstanding commands. Use SDK abort support where applicable; caller timeout is not proof of cancellation of a sent command. Retain pending capacity until settlement or connection destruction; no blind replay. On shutdown stop admissions/reconnect, bounded drain then destroy if required. Never reconnect after close.

Breaker opens after five consecutive connectivity/timeout failures for five seconds; one half-open probe, success resets, failure reopens. Unready bypass and validation/admission errors are not connectivity failures. Memory pressure/write rejection is an acceleration failure only. Invalid configuration fails explicitly; never log raw SDK messages or secret URLs.

Starting defaults (not measured benchmarks): startup 500 ms; operation 100 ms (75–100 ms tuning range); reconnect 250 ms–15 s jittered; 256 max outstanding Redis commands per process; offline queue disabled; 5 s breaker cooldown; one probe; aggregate L1 32 MiB; default entry 256 KiB, hard 1 MiB, story snapshot 512 KiB; 15% downward jitter; negative caching disabled. Preserve existing story TTL during migration. Validate bounds, tune from metrics; account for overhead and replica multiplication.

## Workload policies

| Workload | Cache | Authority/freshness |
| --- | --- | --- |
| Current story snapshot | Redis, optional L1 after measurement | Owner-scoped SQL preflight and repeatable-read built identity |
| Historical checkpoints | Memory, optional Redis | Authorized committed immutable revision |
| Document JSON and reference shelf objects | Bounded memory, optional Redis | Verified hash and authorized pinned root |
| Library trie | Operation-local memoization unless measurement warrants more | Immutable hash and traversal bounds |
| Lexical derived index | Local weighted LRU/single-flight, optional rebuildable artifact | Story/root/revision/schema; validate identity |
| Generated image bytes | Browser/CDN/object storage delivery | Immutable asset version and authorization |
| Media metadata | Optional versioned memory/Redis | Authoritative asset revision |
| Model catalogs/admin analytics | Explicit bounded expiring cache | Domain-approved freshness and permissions |
| Billing, grants, commands, workflow | No generic cache | Durable authority |

Object storage owns physical byte I/O; Documents owns canonical JSON and hash validation. After LIB05, an injected decorator accelerates only explicitly eligible immutable byte reads. Post-write durability verification, conditional-write checks, exists, list, writes and deletion always use origin. Cached corruption reloads origin; authoritative corruption fails closed. Authorization/root membership precede lookup; branch/shelf visibility cannot be inferred from hash presence. Keep operation-local trie reuse unless justified otherwise.

Lexical index remains a domain-owned derived artifact, not canon. Failed durable artifact reads fall back to build; failed artifact writes do not discard valid builds. Clear/invalidate fence late local repopulation. Preserve identity, stats and fork isolation.

Do not put large media binaries in Redis by default: 10,000 x 1.5 MiB images consume ~14.6 GiB before overhead; 2 KiB metadata each ~19.5 MiB. CDN/browser delivery uses immutable asset versions and authorization-aware signed delivery for private content, never public reuse of private bytes. No image generator implementation in this program.

## Observability and operations

Bounded metric labels: registered namespace, tier, operation, outcome, failure category. Capture hit/miss/bypass, cache and origin latency, bytes/weight, eviction, coalesced waiters, origin load, saturation, validation failure, breaker transitions, reconnect and degraded duration. No raw keys, IDs, hashes, prompts, payloads or credentials. Inject telemetry; failures harmless.

Dev uses deterministic adapters and optional isolated Redis. Lab uses disposable capped Redis with eviction/probes; test independent consumers, cold misses, eviction, initial outage, restart, queue pressure and origin failures. Production requires authentication, TLS/network isolation, memory caps, monitoring and managed or equivalent failover according to SLO. No immediate sharding; separate disposable cache from future coordination/rate-limit pools. Never flush shared Redis or touch foreign environments. No deployment authority follows from this specification.

## Current state

This section records what source contains and what evidence exists. The guarantees above are the selected contract; nothing here upgrades source existence into a live, distributed or database acceptance claim. Native Redis infrastructure is owned by [redis-native-infrastructure](redis-native-infrastructure.md) and is not restated or extended here.

### Source realization (what exists)

Cache package (`@offscreen/cache`, neutral port `@offscreen/cache-port`, DO01):

- **Typed core and codecs (CACHE01).** `createCacheAdapter` (`packages/cache/src/cache-adapter.ts`, reexported by `index.ts`) sits beside a typed core exporting `CacheStore` byte outcomes, policy validation, canonical length-prefixed SHA-256 keys, JSON and bytes codecs, and deterministic disabled/fake stores. `createCacheAdapter` still serves legacy JSON get/set and also returns `store`. Legacy `ReadCache` remains for existing tests as a bounded migration bridge.
- **Redis lifecycle and store (CACHE02, CACHE08, CACHE11).** A recoverable Redis connection (one reconnect owner, bounded startup settle without microtask spin, listeners before connect, generation-fenced handlers, fresh clients after failed or disconnected generations, terminal close that cannot resurrect); a v1 byte envelope store with PX remaining lifetime; a 256-command admission cap; and a breaker that opens after five connectivity or timeout failures for five seconds with one probe. Envelope decode rejects non-canonical or oversize base64 before allocation, and `readCache` checks `maxEntryBytes` before codec decode. Redis connection, config, store and circuit breaker live under `packages/cache/src/redis/`; envelope encode/decode owns `redis/envelope.ts`; one shared command executor owns admission, outstanding capacity, deadline abort and actual-settlement slot release; `cache-adapter.ts` composes `legacy-read-cache.ts` and `redis/adapter-commands.ts`.
- **Strategies, single-flight and bulkhead (CACHE03, CACHE08, CACHE10).** `bindCache` for immutable, versioned and expiring strategies (in `packages/cache/src/cache-aside/bind-cache.ts`, reexported from `./strategies`), bounded single-flight (`createSingleFlight`, exported from `@offscreen/cache/strategies`) and an origin bulkhead. Single-flight drops the per-key generation counter, removes aborted waiters, keeps capacity until settlement, bounds active generations by `maxActiveKeys`, and uses scalar `activeGenerations` and Set waiters.
- **Memory and tiered stores (CACHE05, CACHE08, CACHE10).** A weighted in-process store and a tiered store (`createTieredStore`, `packages/cache/src/tiered-store.ts`, memory barrel reexport) over the `CacheStore` contract. Tier `set` returns stored when either tier stored, otherwise a deterministic L1-then-L2 outcome without renewed expiry. Memory and strategy modules do not import Redis.
- **Navigation-only moves (CACHE09, CACHE10, CACHE11).** `createDisabledStore` owns `packages/cache/src/core/disabled-store.ts`; package tests use behavior-based `src/*.test.ts` names. Public export keys, wire format, limits and runtime guarantees were unchanged by these moves.

Consumers:

- **Story snapshot (CACHE04).** API bootstrap wires story snapshot reads through `bindCache` with versioned consistency on the byte `CacheStore` (`createStorySnapshotCache`). Owner-scoped SQL preflight still runs before lookup, and population uses the repeatable-read built identity. Story Engine and Documents import `@offscreen/cache`.
- **Documents (CACHE06A).** Optional cache for immutable `readValidated` document bytes; off unless injected.
- **Lexical index (CACHE06B).** Reuse in a 32 MiB weighted LRU with single-flight, copy isolation and nonfatal durable writes; this is separate from the earlier entry-count LRU and single-flight.
- **Library trie.** Documents keeps operation-local trie memoization.

### Independently useful storage candidates

These are immutable-document mechanisms, usable without the Redis story-snapshot path, and are distinct from the experimental story projection:

- **Library trie.** `createLibraryTrieEdit` (`packages/documents/src/library-trie.ts`) provides copy-on-write editing over an immutable `LibraryTrieStore`; reuse stays operation-local unless measurement warrants more (see Workload policies).
- **S3 document store.** `S3DocumentStore` (`packages/documents/src/s3-store.ts`) is an S3-compatible `DocumentStore` over `@offscreen/object-storage` with the same canonical JSON, SHA-256 and 1 MiB contract as the local store, keyed by content hash. It is the origin the optional immutable-read decorator would accelerate; physical byte I/O stays with object storage.
- **Story snapshot and lexical reuse** are story-specific cache consumers whose identity, freshness and fork isolation remain owned by Story Engine, not by the reusable cache package.

Existence of these modules is source evidence only; it does not qualify any application path that uses them.

### Evidence tiers and limits

- **Source tests with fakes (exact existing evidence, not newly run here).** Package tests use injected clients and fakes: `redis-store.test.ts`, `redis-connection.test.ts`, `single-flight.test.ts`, `cache-boundary-regressions.test.ts`, `tiered-store.test.ts` and siblings under `packages/cache/src/`. Last recorded counts: 93/93 at CACHE08 and CACHE09, 106/106 at CACHE10 after the CACHE11 refresh, and 98/98 at CACHE11. These are source-only and are not distributed Redis proof. Source-only story-engine regression tests pass.
- **Not run.** The disposable SQL `stories-core` fixture is not run, so CACHE04 is not distributed or database proof; CACHE04 is source Done with SQL acceptance transferred to VER08. Live Redis/memory acceptance remains VER07 and SQL origin/story-snapshot acceptance remains VER08, both NOT-RUN. No live PASS exists. A fixture or fake-client PASS therefore does not certify cross-Pod restart, failover or multi-replica behavior. Lab Redis is not proof of game traffic. No benchmark is established.
- **Superseded harness.** CACHE07 is superseded; its distributed harness under `packages/cache/test/distributed/` no longer owns Docker lifecycle. VER06 source Done moved owned Redis create/fault/cleanup to `tools/verification/resources/redis/` and registered the `pnpm verify package cache` source profile; the legacy harness `--live` refuses before Docker or worker start. Harness unit tests cover refusal, runner-owned handle faults, bounded IPC and scenario verdicts without starting Docker.
- **Native Redis.** Installation, lifecycle and its evidence belong to [redis-native-infrastructure](redis-native-infrastructure.md); this page adds no live proof for it. Prior statements here about the local Kind implementation are dated realization (see Redis boundary), not current installation proof.

See [verification programmes](verification-programmes.md#cache-programme-selected-2026-11-25). The [parallel implementation contract](../../../work/undertakings/storyteller-workshop/CACHE-PARALLEL.md) freezes those interfaces.

## Engineering references

- [Redis Node.js production usage](https://redis.io/docs/latest/develop/clients/nodejs/produsage/)
- [AWS Builders' Library caching challenges](https://aws.amazon.com/builders-library/caching-challenges-and-strategies/)
- [Azure cache-aside](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside)
- [Redis distributed locks](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/) (refresh suppression only)
- [CloudFront private content](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html)

### Physical Redis isolation

Separate Redis instances only where an identified workload needs distinct eviction policy, resource budget or failure isolation. Package boundaries alone do not justify separate pools. Named-pool provisioning is not currently selected; future demand must be designed against the native Redis lifecycle rather than reviving INF60's retired custom create-only CLI.

**VER07 disposition (2026-11-26):** Deferred to [platform backlog](../../../work/changes/backlog/platform-operations/2026-11-25--ver07-cache-mechanism-programme/CHANGE.md); all mechanism, load and fault acceptance remains outstanding, no current dispatch readiness. VER08 depends on VER07 source realization. Disposable Redis application proof is independent of native platform provisioning.

**VER08 disposition (2026-11-26):** Deferred to [platform backlog](../../../work/changes/backlog/platform-operations/2026-11-25--ver08-cache-sql-origin-programme/CHANGE.md); authorization-before-lookup, built-revision identity and race safety, cached/uncached parity, outage fallback and SQL amplification oracles retained, live NOT RUN. VER07 source remains prerequisite. No dispatch; refresh current Story Engine, cache and database contracts before owner-selected promotion. Deferral does not relax authority or security requirements.
