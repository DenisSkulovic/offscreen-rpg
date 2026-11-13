# Decision ENG05 | Shared immutable document storage: settle the open gates

**Status:** **selected design for ENG05**, 2026-11-13. **No code authorized.** Source inspection: [`LocalDocumentStore`](../../../packages/documents/src/local-store.ts), [`DocumentStore` type](../../../packages/documents/src/local-store.ts), [API bootstrap](../../../apps/api/src/main.ts), [worker bootstrap](../../../apps/worker/src/bootstrap/main.ts), [canonical publication](../../../packages/application/src/stories/passage-documents.ts). **Objective:** portable source publication across independent processes, not merely a cloud feature checkbox.

## What we are choosing, and why

**Backend:** an **S3-compatible private object store** as the second adapter behind the existing `DocumentStore` interface, alongside unchanged local filesystem store. Use an established AWS S3-compatible client; no custom object protocol. First integration runs against a **disposable local S3-compatible service** (for example a pinned MinIO or other compatible test image). No paid AWS resources, production bucket or external credentials are assumed.

The existing local CAS has the right core behavior: canonical JSON, SHA-256-addressed objects, a 1 MiB maximum object size, schema validation, hash verification on read, typed `missing/corrupt/too-large/unavailable` errors. **Preserve those exact semantics** rather than creating an alternate serialization or file format.

**Why not PostgreSQL large JSONB:** it already owns mutable gameplay and transactional root references. Shoving every canonical novel-sized passage into it would increase DB load and backup costs without improving the fictional life.

**Why not shared POSIX volumes as the product strategy:** a network filesystem adds failure/locking assumptions and couples workers to a mount rather than expressing a clean object-storage contract.

## Selected implementation architecture

### One immutable object encoding

- `canonicalJson(value)` is the **only** byte encoder, SHA-256 the one identity. Both adapters use the same canonical serializer/schema and object maximum.
- Existing key layout is retained conceptually, `objects/sha256/<first-two-hex>/<hash>.json` under one private bucket/prefix.
- Adapter `put*(value)` validates schema, canonicalizes, enforces max size, computes expected hash, and attempts **create-if-absent** at that key. A preexisting object is treated as idempotent only if the canonical bytes/hash agree; never overwrite a mismatched object.
- Adapter `read*(hash)` fetches exactly the immutable object, validates size/hash/schema and maps missing, corruption and provider outages distinctly; no fallback to model-written prose or mutable alias.
- All methods in the current `DocumentStore` contract continue to exist for source passages, typed documents, rule/world/start manifests and campaign manifests. Keep the local adapter as-is for dev/Chamber.

### Backend and credentials

Add an explicit storage mode selection at the **API and worker bootstrap**:
- `OFFSCREEN_DOCUMENT_STORE=local|s3`, with current behavior preserved when unset (if root is defined, local; otherwise no store).
- For local: `OFFSCREEN_DOCUMENT_ROOT` unchanged.
- For S3: explicit private bucket, region, optional endpoint and path-style setting for local compatible tests. Use the standard SDK credential chain or explicit injected provider; **no access keys in source, logs, or web-visible env**.
- If S3 mode is selected but configuration/connection is invalid, **fail startup**; do not silently fall back to an unrelated local directory and publish an unreadable root.
- Storage is server-internal only. No public bucket/presigned read URLs for canonical documents in this Change. Viewer-scope authorization remains in application/API before resolving hashes.

### SQL root remains the publication boundary

- Stage immutable source objects/manifests **before** the SQL root reference is promoted, just as current local publication does.
- The SQL transaction still gates exact expected root/revision and the one published source passage. S3 does **not** join the transaction.
- On a staged write after which SQL commit fails, object is harmless unreferenced garbage; no player-facing effect.
- On a SQL-committed root with unreadable object, return typed unavailable/corrupt, preserve receipts, and alert through existing diagnostics. Do not produce fictional substitute content.
- Treat current manifest roots and forks as durable references that must be preserved through backup/migration.
- Preserve existing data ownership: **the store is immutable evidence, not an alternate mutable item/clock bank ledger**.

## Ownership, retention and recovery decisions

**Tenant:** one private project bucket/prefix can serve multiple stories because hashes are opaque *identifiers*, not permissions; the service must check story/viewer access **before** using a hash in a public route. Object GET is server-authorized only. If organization-level isolation demands separate buckets later, this is a deployment decision, not part of the first adapter.

**Retention:** **no automatic deletion or GC in ENG05.** Referenced objects stay indefinitely until a future explicit account/story deletion and reachability/retention policy. Unreferenced staged objects are measured/loggable and may be cleaned under a separately proven GC algorithm; deleting by age alone is forbidden.

**Backup/restore:** document the paired restore contract: PostgreSQL root/manifest references and the complete object set must be restored consistently. An SQL backup alone cannot recover narrative text. First adapter Change doesn't need to implement a production backup scheduler, but must provide a reproducible local export/verify demonstration.

**Migration/cutover:** **no implicit migration of existing local objects**. Keep current local mode as default. Switching an existing story to remote mode requires copying every referenced immutable object by hash, verifying all reachable roots/manifests and a separate explicit cutover gate. Without that, do not claim “existing stories work under S3” and do not enable remote mode silently.

**Retry:** bounded retries only for transient transport failures. Missing hash or verified corruption are typed failures, not endless retry loops. An uncertain PUT can be reconciled by reading/verifying the same key; it must not trigger generation of different bytes.

## Disposable acceptance topology (no cloud)

1. Start a local, isolated S3-compatible server with one **throwaway private bucket** and known local credentials.
2. Instantiate three independent adapter processes A, B and C against that bucket, with no shared file directories.
3. A writes a source passage, B verifies its hash/content, C reads the same manifest and referenced objects. Repeat across package/rule manifests.
4. Concurrent same-object PUTs from A/B are idempotent; conflicting bytes for an expected hash are rejected.
5. Stage source, commit SQL root via a **disposable Postgres**, then restart reader and fetch by hash from another process.
6. Simulate pre-commit SQL failure: staged object exists but no current root advances. No phantom published scene.
7. Simulate object deletion/corruption/access denial: explicit typed failure, existing committed gameplay unchanged.
8. No private object content leaks through unauthenticated endpoint, error logs or bucket URL.
9. Local adapter and old fixtures still pass byte-for-byte and schema/format checks.

**Output required:** exact adapter/SDK version, integration command, process-isolation proof, byte/hash equality, failure cases, config matrix and what was not tested. Don't call a single in-process fake a multi-replica deployment proof.

## How ENG05 relates to ENG03

Remote object I/O can be slower than local filesystem. Some `loadStorytellerContext` paths currently execute it under a story write lock. **ENG05 is a storage adapter proof, not permission to enable remote mode for high-throughput live stories.** Before calling hosted scale mature, instrument/fix the ENG03 lock critical sections. The adapter may be implemented/verified locally before ENG03, but *production cutover* needs both storage and lock-latency evidence.

## Why this gate is settled

The old ENG05 packet asked the owner to choose backend, retention, credentials, size budgets, availability and testing topology. All now have selected defaults:
- S3-compatible backend; local disposable integration; no cloud spend;
- canonical byte/hash and max 1 MiB match existing local store;
- private server-only access; SDK credentials; typed failure;
- no automatic GC; legacy local data left untouched until explicit copy/verify;
- two-phase object staging and SQL root CAS preserved.

This is **design-ready for explicit owner code authorization**, not formally Ready because no implementation request or disposal/test-environment approval has been given.
