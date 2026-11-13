# ENG05 | A canonical document root is readable across independent API and worker replicas

**Design decision update (post-ENG wave, Nov 13):** This packet is now **design-ready for explicit owner authorization**, while remaining formally Proposed. The open storage backend, credential, retention, test-topology and cutover choices are resolved in [the selected ENG05 contract](../../engine-architecture/decisions/eng05-shared-cas-contract.md). **Mode:** private S3-compatible adapter, disposable local service, existing CAS canonical hash/1 MiB limit, no automatic GC or legacy data copy, local remains default. Current remote adapter must not be enabled for live stories until lock-latency/cutover evidence exists. The earlier “must first choose backend” gate below is superseded by this decision; unperformed *code tests* are still exit gates, not design blockers.

**State:** Proposed, **design-ready for explicit owner authorization of the bounded local adapter proof**; not yet formally Ready or Implementing. **Kind:** storage-port/adapter + durability/fault tests, no game-rule changes. **Authority:** [release/storage design](../../engine-architecture/evolution-and-release.md) and [scale design](../../engine-architecture/scale-and-load.md).

## Cursor first-screen brief

> **Goal:** independently deployed API and worker instances can publish/read the **same verified immutable object hash**, without relying on one container's local filesystem. SQL remains the single authoritative published-root pointer.
>
> **Start:** `packages/documents/src/local-store.ts` and `schema.ts`; `packages/application/src/stories/passage-documents.ts`; API/worker bootstrap ``OFFSCREEN_DOCUMENT_ROOT`` configuration; source-backed publication tests.
>
> **Known trap:** S3-compatible object storage does not participate in a PostgreSQL transaction. Stage/verify objects first; commit only their reference in SQL; test orphan cleanup, corruption and missing-store recovery. A hash is an identifier, **not permission to read** a private story.

## One bounded result

A storage-neutral `DocumentStore` adapter contract has a second shared-backend implementation (e.g., S3-compatible as selected by deployment). The local adapter remains for tests/Chamber. The same committed story root can be read by three independently started containers/clients, and both adapters preserve exact canonical JSON/hashes/versioned manifests.

No code changes to game rules, dice, Storyteller creative policies or public UI. Use one selected adapter with a fake/local S3 test server first; don't provision paid production storage by default.

## Acceptance and negative proof

- Write verified source passage/manifests from replica A, promote SQL root, read and hash-check from B and C.
- Duplicate `put` of identical bytes/hash is idempotent; collision/inconsistent bytes are rejected.
- A staged object whose SQL commit fails remains unreferenced and cannot appear as published canon.
- A SQL root pointing to missing/corrupt object fails explicitly and does not fabricate story text.
- Cross-user private file reads are denied at the application/viewer scope regardless of guessable hash.
- Retry after network timeout does not create a second root or published passage.
- Backup/restore and GC reachability across committed roots/forks are documented, with an independently testable plan.
- Local adapter and old stories remain readable without migration when their objects are available.

## Blockers and exclusions

**Selected now:** private S3-compatible backend, existing 1 MiB canonical object budget, server-only credentials/authorization, indefinite retained objects with **no auto-GC**, typed failure semantics, disposable local S3-compatible testing and no automatic legacy cutover; see [selected contract](../../engine-architecture/decisions/eng05-shared-cas-contract.md). **Still excluded:** generic BlobService framework, production cloud provisioning/spend, local folder posed as shared distributed store, distributed SQL/object transaction, multi-region active-active and production cutover of existing local stories.

**Ready gate:** design contract and local topology are **chosen**. The owner may now explicitly authorize this one code Change and safe disposable local S3/Postgres tests; Cursor rechecks current source and required dependency versions first. **Production enablement/legacy root migration remain a separate gate**, not part of adapter implementation. Cursor stops if publication-root semantics need widening beyond the agreed adapter.
