# Protected forensic artifact store | A different custody contract from canonical game documents

**Status:** wave-3 technical design proposal, 2026-11-15. **Not** implemented, migration-ready or permission to deploy storage. Parent [physical schema](physical-evidence-storage-v1.md), [capture/crash protocol](capture-transaction-protocol.md), [retention](replay-retention-and-privacy.md), [sensitive read policy](forensic-access-and-read-contract-v1.md). Direct code inspection: `packages/documents/src/{local-store,s3-store,canonical-json,document-store-config}.ts` and `packages/db/src/schema/{generations,storyteller}.ts` at main `7e15db38`.

## 1. An important correction to the prior abstract storage model

**Do not use existing `DocumentStore` as the protected raw-AI artifact store unchanged.** It is a content-addressed, immutable **canonical game document** interface and has different lifecycle requirements:

| Observed implementation | Useful property | Missing for finite-retention forensic custody |
| --- | --- | --- |
| `LocalDocumentStore` | validates schema, stable SHA-256, durable exclusive writes, verifies stored bytes | No `delete`/`expire`/`hold` operation, no native per-story authorization or encrypted subject namespace |
| `S3DocumentStore` | S3-compatible immutable PUT/GET, verifies byte hash, conditional put | Exposes no delete/retention/hold interface; `PutObject` does not explicitly pass a per-object encryption policy (bucket policy might enforce one, **not inspected**) |
| `DocumentStore` type | strict put/read set for canonical document/manifest, source-passage and packages | **No artifact deletion**, no protected raw-byte API, no streaming/segmented large provider response |
| `maximumStoredObjectBytes` | 1 MiB bound protecting canonical objects | Not automatically suitable for an entire provider packet/stream/tool outputs or a complete incident bundle |
| `canonicalJson` | recursively orders object properties with `localeCompare` and appends newline | Useful current canonical-document codec but **not claimed equivalent to RFC 8785/JCS**, nor a lossless codec for arbitrary JS Date/BigInt/undefined |
| `objectKey`/local hash path | deduplicates same canonical bytes at `objects/sha256/<prefix>/<hash>.json` | Global hash-addressed objects require separate ownership/erasure/refcount/side-channel policy |

**Choice:** create a narrow `ProtectedEvidenceStore` port in the forensic application/infrastructure boundary. It may use the **same local disk for tests** or **same S3/MinIO service and account** with a separate prefix/bucket/security policy, but it must not mix private AI artifacts into a story's canonical world manifest, and must independently support expiry, deletion, classified reads and encryption/key lifecycle.

**Not another microservice.** A single adapter interface and SQL metadata owner inside the existing monolith is enough for V1. Use existing AWS S3 client or local file tools behind the new port only if actual code constraints and tests justify reuse.

## 2. The minimal V1 port and custody states

Conceptual, implementation-specific types will be strict Zod/codecs:

~~~ts
interface ProtectedEvidenceStore {
  stage(input: {
    captureId: UUID; subjectScope: SubjectScope;
    bytes: Uint8Array; codec: ArchiveCodecId;
    classification: EvidenceClassification;
    retentionPolicyId: string;
    expectedPlaintextSha256: SHA256;
  }): Promise<{
    stagedArtifactId: UUID;
    plaintextSha256: SHA256;
    ciphertextDigest: string; // if encryption is used
    plaintextBytes: number;
    storedBytes: number;
    storageVersion: string;
  }>;
  verifyStaged(input: {
    stagedArtifactId: UUID;
    expectedSha256: SHA256;
  }): Promise<'verified'>;
  readAuthorized(input: {
    artifactId: UUID;
    authorization: ServerSideEvidenceReadGrant;
    maxBytes: number;
  }): Promise<Uint8Array>; // authorization is server-validated, never browser-asserted
  tombstoneAndDelete(input: {
    artifactId: UUID;
    deletionDirectiveId: UUID;
    reason: 'retention-expired'|'user-erasure'|'corrupt'|'operator-approved';
  }): Promise<DeletionReceiptV1>;
}
~~~

**Deliberately not a public API:** `readAuthorized` is internal to the Admin/player projection service. An untrusted browser never supplies an accepted `ServerSideEvidenceReadGrant` value by casting JSON. The read use case checks live staff/user permissions and writes purpose/disclosure audit **before releasing bytes**.

**Immutability** concerns stored body; custody state is a separate indexed SQL lifecycle. Proposed states: `staged, verified, referenced-active, held, expiry-pending, erased, quarantined, missing`. Transitions are durable and idempotent; **`erased` must not coexist with a readable alternate raw SQL copy** if the service promises complete body erasure.

**Important atomicity:** no 2PC between S3 and Postgres. Object stage/hash verification happens off story lock; short SQL transaction links verified artifact to accepted G/attempt/task. A staged object without a committed reference is not published evidence. A SQL pointer without verified custody is never marked ready. Unreferenced staging is eligible for bounded GC only after checking still-uncommitted leases and legal holds.

## 3. The actual archive bytes, not a mysterious debug object

**Two codec families, different promises:**

1. `typed-domain-json.v1`: exact validated data fields (e.g. `StorytellerTask`, `CampaignSettings`, `StoryReplayCheckpoint`) with explicit schemaRef, schema version, build/transform ID and declared handling of dates/large numbers/undefined. The stored byte representation must round-trip back into a semantically identical archived **data contract**, with hash equality and upcaster tests. Avoid exporting functions, closures, live connections, provider auth or hidden runtime handles.
2. `provider-wire-payload.v1`: byte-exact final serialized HTTP body *at the last application-controlled transport boundary* (excluding auth headers), separately linked to the reviewed model request and provider attempt. Hash the actual UTF-8/bytes, not a reconstructed JSON object or a result of a later `JSON.stringify` pass.

**Source equality:** `buildOpenRouterRequest`, `inspectOpenRouterRequest` and `prepareDispatchReview` already produce a packet/body hash. Verify that final transport serialization is exactly the same as reviewed/persisted bytes for an attempt, including projected output schema, `stream`/`max_tokens`, provider-only routing and data order. If mismatch, hold before possible paid send, never rewrite history to make hashes appear equal.

**Limit policy:** a 1 MiB canonical document ceiling is not a forensic pricing policy. Select a measured **per-class maximum** (single prompt, tool observation, full output, checkpoint, sanitized bundle), with bounded chunking and explicit truncation/refusal reason. No silent truncation of a purported byte-exact packet. If a required packet exceeds admitted size, **deny new send before dispatch** or choose an explicitly authorized smaller model request, never pretend a cropped payload was sent.

## 4. Encryption, ownership and hash disclosure

- **Separate storage namespace:** e.g. `forensics/<environment>/<scope-id>/<opaque-artifact-id>`, not `objects/sha256/<public-hash>.json` as an unscoped read path. This is a *suggested logical key scheme*, not a public URL. Environment/tenant/subject identities in physical keys may themselves be sensitive: consider opaque prefixes and avoid leaking them in logs.
- **Scope:** `artifactId` is random/opaque. Subject scope records story/account/draft/G/attempt and classification separately in SQL. A checksum is an integrity witness, not an access token.
- **Encryption:** server/KMS-managed encryption at rest, with explicit bucket/adapter policy and access control. App-layer envelope encryption or per-subject data keys may be warranted if reliable erasure/crypto-shredding is required, but do **not** promise complete erasure from backups solely because a key was disabled. Document key lifecycle and restore behavior.
- **Cross-story dedup:** **off by default for private raw AI bodies**. Shared plaintext hash/object may break erasure when one story deletes and another legitimately retains a reference; it can leak equality through storage metadata or guessed hashes. Shared reusable *public* prompt component blobs are a separate class with explicit owner and policy.
- **Checksum:** record both plaintext SHA (inside trusted metadata only) and stored/ciphertext integrity evidence when applicable; verify on read and quarantine mismatch. A plaintext SHA can be identifying and needs access/retention review.
- **Transport:** TLS to store; least-privilege app credentials; no provider API token/cookie in the archived packet, error payload, OTel span, filesystem path, object metadata or debug export.

A protected store that merely writes to the same public S3 prefix without server-side permission, lifecycle and deletion controls is not “encrypted” by virtue of the word `protected` in the TypeScript interface.

## 5. In-flight protection and loss handling

| State | Correct behavior |
| --- | --- |
| Packet accepted for model send but protected stage unavailable | **Do not send**. G/attempt remains prepared/held; already committed mechanics remain |
| Packet staged and verified; SQL link commit fails | No send; staged orphan eligible for safe GC after lease/hold check |
| SQL links artifact; worker crashes before dispatch | The same attempt and packet may be resumed under current retry/uncertain gates; never invent new G |
| Dispatch marked possible; process crashes at socket | Provider receipt/billing **uncertain** without external proof; no automatic free resend |
| Protected artifact read checksum mismatch | Quarantine and report corrupt source; never silently substitute latest packet |
| Artifact retention expires during active unresolved/uncertain G | **Retention cannot erase data required for in-flight recovery** without an explicit resolution/hold policy. Mark lifecycle conflict, apply bounded incident hold or stop future dispatch according to agreed policy |
| Erasure directive arrives for story with provider work pending | Deny new sensitive work, coordinate cancellation/settlement and safe deletion; never leave a background worker able to regenerate/read deleted private context |
| Unreferenced staging GC | Check transaction/lease state and all owners; safe orphan deletion, never delete referenced/held artifact |
| Protected read audit store unavailable | Deny exceptional staff disclosure; allow separately authorized public player playback if lawful and source available |
| Story/account scope revoked while browser cached packet | No new server read, short client cache/SSO revocation. Bytes already delivered cannot be retroactively erased |

**No implicit “admit then retry new packet forever.”** Use existing `storytellerAttempt`/funding uncertainty truth; capture-rearm is pre-provider and cannot be used to bypass possible spend.

## 6. Erasure and backup are real workflows

A successful body purge needs:

1. A source/subject inventory of all copies, including `generation.input/output`, dispatch packet, memory round request/output, CAS/private doc/source, diagnostic export, read cache, local QA artifacts, logs, staging and backups/replicas.
2. A scoped deletion directive with purpose and legal-hold check, idempotent operation ID, actor and revocation of artifact access.
3. Provider packet/raw AI content removed from active SQL rows **only after** compatible decoders and terminal-status/cost/publish dependencies have moved to safe references. Existing `generation.input NOT NULL` is a concrete migration blocker; old generation states cannot simply be set null.
4. Protected CAS object deletion with version-aware provider semantics (S3 versioning/delete markers/object lock/lifecycle may keep versions), verified absence or disclosed eventual-destruction status.
5. Derived indexes/cache/CDN/session artifacts invalidated; historical replay returns `expired/deleted` coverage, never current-body substitute.
6. Backup restore/replica purge policy and test: restore cannot silently resurrect accessible deleted content. An erasure ledger may need to reapply tombstones to restored data before it is exposed.
7. Minimal retained hashes/audit records only when lawful, with no raw body reappearing in diagnostic tickets.
8. A reconciliation job reporting pending/failed deletions without leaking sensitive object names.

A delete API response is **not proof every replica/backup is gone**. Distinguish `access-disabled`, `primary-object-deleted` and `backup-purge-complete`; show a truthful operator status and documented backup retention window.

## 7. Resource and reliability gates

- Measure production-like prompt/output sizes at 10/100/2000 scene synthetic contexts, and actual compression/encryption overhead. The archive must not become a 100× multiplier over the provider bill.
- Index artifact metadata by G/attempt/retention/subject; do not index/search unbounded raw private text by default. Lazy single-artifact read for Admin.
- Local adapter must be developer/test-only with explicit filesystem permissions and cleanup; production default should be a managed or well-configured private object store, *after* reliability/security testing.
- Never keep a story-row lock across object PUT/GET/DELETE, KMS or OTel exporter.
- Retention job is authorized infrastructure code with rate limits and full audit, not another Storyteller/Temporal game execution workflow.
- Separate infrastructure health `artifact.pending/failed/quarantined/delete_lag` from game `action/hold` and provider `attempt/charge` semantics.

## 8. Rejected shortcuts

1. Reuse `DocumentStore` unchanged and assume immutable blobs can expire later. **No delete API, no per-body protected access.**
2. Name a JSONB row “encrypted artifact” and ignore old raw SQL copies and backups.
3. Store the sensitive packet hash in a user-visible URL and treat knowing it as sufficient.
4. Deduplicate private prompt bodies globally without subject-retention ownership.
5. Call `JSON.stringify` after the model request completed and claim byte-perfect historical transport.
6. Truncate large context without recording that the model did **not** receive the omitted text.
7. Emit raw provider messages as OTel `gen_ai` content events in a general collector by default.
8. Permanently store everything simply because disk is currently inexpensive.
9. Delete a generation's raw input while pending/out-of-order work still needs to parse it.

**Design gate:** owner/product/legal selects retention tiers, supported access/erasure SLA and storage budget. Engineering then proves store stage/verify/link/expiry and actual old SQL copy migration under disposable DB and object-store tests. No provider sends, migrations or deployment permitted by this document.
