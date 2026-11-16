# Archive codecs and schema evolution | Preserve original data shapes without freezing the codebase forever

**Status:** wave-3 proposed technical standard, 2026-11-15. Not code- or migration-authorized. Parent [evidence model](evidence-model.md), [protected store](protected-artifact-store-v1.md), [historical reconstruction](reconstruction-algorithm-v1.md), [prompt provenance](storyteller-prompt-source-map-v1.md). Source observed at GitHub `main` `7e15db38`. No production archive, migration, binary comparison or live provider calls performed.

## 1. “Same shape as runtime” is valuable, but needs versioned boundaries

The desirable invariant is:

> **Capture the exact validated source *data contract* as the engine consumed or produced it, preserve its declared type/schema/version and bytes, then attach a separate provenance envelope.**

Do **not** flatten all objects into `{key:string,value:unknown}` log dictionaries. Equally, do not serialize arbitrary live JavaScript objects with `JSON.stringify` and assume they will deserialize into a semantically equivalent object in five years. A runtime value can contain `Date`, `BigInt`, undefined, Buffer, class instances, custom prototypes and resource handles.

**Two independent truths:**
- **Historical payload:** the exact archived bytes and original schema/hash algorithm, immutable after custody.
- **Current reader projection:** a validated, purpose-limited read representation that may be translated from an old version. Its output is *not* the original blob and must never overwrite the original artifact.

If an old value can't be decoded, show `schema-unsupported` rather than running the current Storyteller parser and silently changing its meaning.

## 2. Current code already has multiple serialization/hash dialects

| Source | Actual algorithm | Historical reader contract |
| --- | --- | --- |
| `packages/documents/src/canonical-json.ts` | Recursively sorts JS object entries with `localeCompare`, then `JSON.stringify(normalize(value)) + '\\n'` | **Existing canonical CAS dialect.** Do not rename it RFC 8785/JCS without exact cross-platform conformance proof |
| `storyteller/context-capture.ts::hashContextCapture` | SHA-256 of `JSON.stringify(capture)` | Store algorithm tag `json-stringify-capture.v1`; old capture hashes remain valid as written |
| `storyteller/capture-materialization.ts::taskRequestSha` | SHA-256 of serialized task/request under that stage's existing code | Preserve exact algorithm and input scope; do not substitute hash of some later API object |
| `storyteller/providers/openrouter.ts::inspectOpenRouterRequest` | `buildOpenRouterRequest`, `JSON.stringify(body)`, SHA-256; includes message and user-section hashes | Prepared packet fingerprint; must verify equality at actual last transport serialization boundary |
| `generation.input JSONB` | Postgres stores JSON value, not necessarily original sender's byte-for-byte JSON encoding | Archival **semantic original data shape** may be recovered; **exact original transmitted bytes** cannot be asserted merely from JSONB readback |
| `storyteller.profile JSON definitions` | Repo-imported JSON validated by profile schema | ID/revision + content hash + Git/build/source path, independent of mutable latest code |

**Decision:** publish a small **archive codec registry**, not a single globally replaced hashing function. Existing hash identities keep their originating algorithm ID. New artifacts can adopt a defined canonical JSON scheme for JSON-safe values **after** conformance tests; provider packets remain a distinct raw-wire codec.

## 3. Proposed archive descriptor

~~~ts
type ArchiveDescriptorV1 = Readonly<{
  artifactId: UUID;
  logicalType: string; // e.g. storyteller.task, game.transition, provider.wire
  dataSchemaId: string;        // stable namespace, not TS symbol name alone
  dataSchemaVersion: string;   // explicit, pinned and parseable
  codecId: string;             // e.g. domain-json.v1, canonical-cas.v1, wire-utf8.v1
  hashAlgorithmId: string;     // what exact bytes/hash source? no generic "sha256" alone
  sourceBuildId: string;       // Git commit/build/task compiler/adapter
  originalByteLength: number;  // exact bytes under specified codec
  originalSha256: SHA256;
  storageArtifactRef: string;  // server-only opaque
  sensitivity: EvidenceClassification;
  retentionPolicyId: string;
  coverage: 'complete-original' | 'semantic-only' | 'legacy-partial';
}>;
~~~

**Reader guarantee:** a descriptor with `coverage='complete-original'` must have actual captured source bytes and a validating decode path; `semantic-only` is appropriate to some legacy JSONB where exact historical UTF-8 formatting isn't recoverable; `legacy-partial` is honest when critical source/version fields were not recorded.

**Canonical hashes:** `originalSha256` is computed over the exact archived **plaintext logical bytes** before encryption, not normalized ciphertext or some lossy later migration. Keep a separate cipher/storage checksum if encryption requires it. Do not expose raw hashes as public locators or authorize lookup by guessed digest.

## 4. Registry of first-class source types (starting set)

The repository's existing strict Zod/data owners should be reused by a versioned codec adapter. Illustrative IDs, not permission to change public contract exports:

| Archive logical type | Existing owning schema/source | History requirement |
| --- | --- | --- |
| `game.accepted-command.v1` | `campaignCommand` / `storyControl` / `storyResolution` with exact operation ID | Source request and authority; actual accepted vs rejected |
| `game.finite-action.v1` | `gameActionExecution`, `gameActionReceipt`, `gameActionExecutionEvent` | Frozen plan/offer/roll/effects and interrupted vs succeeded; no reroll |
| `game.activity-boundary.v1` | `gameActivity`, `gameRoll`, `gameActivityEvent` | Ordered within-commit check/progress/effects; one outer commit |
| `game.world-obligation.v1` | `worldObligation`, `worldObligationEvent` | Due/event/condition/hold transition and source origin |
| `game.story-transition.v1` | proposed narrow `StoryTransitionV1` | Before/after typed changed values, hashes, commit sequence |
| `game.checkpoint.v1` | proposed `StoryReplayCheckpointV1` informed by `campaignStateFileSchema` | Complete replay-eligible current state and source manifest |
| `story.published-passage.v1` | `storyPassage` + canonical `sourcePassage` and `storyDocumentCommit` | Exact historically visible content/perspective and publication source |
| `storyteller.task.v15/v16/v17` | `storytellerTaskSchema` accepts older task versions; `generation.input` | Frozen task/profile/context/request/recipe, with original input schema ref |
| `storyteller.context-capture.v1` | pending/committed/interrupted strict capture variants and captured hash | Exact frozen source and same-G provenance; source-kind discriminant |
| `storyteller.context-assembly.v1` | proposed source decision/provenance manifest | Actual candidate→load→prune→included path; versioned compiler decisions |
| `storyteller.provider-wire.v1` | `buildOpenRouterRequest` last transport serialization | **Exact** provider-visible application request bytes; excludes credentials |
| `storyteller.model-output.v1` | provider outcome, `generation.output` / repair candidate | Actual external returned bytes/parsed candidate, uncertainty and diagnostics |
| `storyteller.memory-round.v1` | `storytellerMemoryExploration` snapshot/pending requests/tool read artifacts | Distinct round/attempt IDs and visible tool observations |
| `storyteller.publication.v1` | `storytellerPublication` / source-fence result | Published vs stale/blocked and resulting passage identity |

**Do not mix source semantic schema with viewer DTO schema.** `StorytellerTask` is private and may contain hidden world facts; `StorySnapshot` and `AdminStorytellerOperationV1` are derived, redacted projections. A source archive decoder does not imply staff/user authorization to view its fields.

## 5. V1 codecs and exact preservation

### Domain JSON codec

1. Validate input with *the exact owning historical schema*, using a registry entry keyed by explicit schema ID/version.
2. Convert only supported JSON-data types. For Date/BigInt etc. either source schema already specifies ISO/decimal strings or encode with explicit type tags **without colliding with user-authored values**. Never silently coerce.
3. Canonicalize deterministically under the declared codec; RFC 8785/JCS is a candidate for strictly conforming I-JSON data, **not** automatically for all JS objects or existing `canonicalJson` files.
4. Retain original archive bytes, content SHA and schema/codec/build fingerprint.
5. Decode the same codec, validate original historical schema, assert semantic equality on the archived data shape.
6. Project into current read DTO with a **separate** versioned adapter that records transformation provenance; never rewrite original byte contents.

### Provider wire codec

1. Build and freeze application-level model packet for a specific attempt/round.
2. Serialize **once** into exact byte buffer from the actual adapter used by the HTTP client. Redact auth separately; body should be defined credential-free.
3. Persist/verify identical buffer before send and reference by same attempt ID; compare pre-send SHA and stored review SHA to same hash scope.
4. The byte buffer is the archive. Parsing it to JSON later for human inspection is an **additional view**, not original byte custody.
5. Streaming responses can record verified raw segments/parsed final output/usage with order and truncation status, but cannot claim the provider's unseen internal stream or reasoning.

### Canonical game-doc codec

Use the existing `canonicalJson`/hash path **as-is** for old canonical documents and manifests. New archival wrappers may reference original root/object SHA instead of copying bodies. If changing this codec in the future, add a new codec ID and dual reader; never recompute old root hashes under a different algorithm and overwrite those references.

## 6. Upcasters are read adapters, not history rewrite engines

~~~text
raw artifact + schemaRef + codecRef
  -> verify ORIGINAL hash and size
  -> decode original value under pinned historical schema
  -> validate old authority/source IDs and classification
  -> select explicit ordered READ-ONLY upcaster (if needed)
  -> produce current Forensic Read DTO + transformation receipt
  -> authorize field-level viewer projection
~~~

Rules:
- Never re-run game effects, validator policy, RNG, AI prompt or provider round in a historic read. Upcaster translates representation only.
- A missing old codec cannot be “repaired” by assuming it matches today's `storytellerTaskSchema`. Return `legacy-codec-unavailable` or `schema-unsupported`.
- Changing a field's semantics (e.g. “current character quantities” vs “earned result”) cannot be silently transformed to new meaning. Preserve original and describe incompatibility.
- An original source `raw.` JSONB may offer only semantic shape, not exact historical wire bytes. Mark `coverage='semantic-only'`.
- Upcasters are tested against frozen fixture corpora committed by schema version, not built from a newer guessed source.
- Decoder exceptions are bounded diagnostics, never echoed with original private JSON to Support/OTel.

## 7. Compatibility with deployments and in-flight jobs

**A model operation admitted under build B may resume under B+1.** Therefore:
- `generation.input` and provisional captures must remain parseable until the execution/recovery path is intentionally retired; keep v15/v16/v17 fixtures.
- `storytellerContextCapture` sourceKind handling must remain strict; multiple consequence variants require purpose+source-kind decoding and cannot be flattened into an ambiguous loose union.
- A prompt or output-schema change must carry a new immutable compiler/build identity; `promptVersion='storyteller.v17'` alone isn't sufficient if code changed without a numeric bump.
- Old prepared packet sent after a deployment must be compared to original captured identity. Do not rebuild with latest compiler and silently send different text under the old attemptId.
- Retention expiry cannot delete raw in-flight task/round content still needed for valid recovery or pricing reconciliation. Hold/disposition is explicit and bounded.

**Schema retirement:** requires a migration-read matrix proving oldest supported in-flight task and archived replay bytes; a no-longer-supported old source is either lawfully purged or marked read-limited, never silently rewritten.

## 8. Adversarial fixtures

- Same logical JSON object with reordered source keys hashes identically **only under the declared canonical-domain codec**; raw-provider-wire bytes retain their actual distinct serializations.
- Two identical prompt text blocks from different source IDs remain distinguishable in provenance, even if content hash matches.
- Original `canonicalJson` hash with newline and property sorting remains stable; hypothetical JCS result does not replace it.
- Date/BigInt/undefined/unicode/multiline text/null/absent fields round-trip or fail with explicit unsupported-type before capture.
- Malicious user-controlled objects with keys suggesting archive type tags cannot spoof typed metadata.
- Old v15 task + newer v17 code returns accurate read-only view without mutation or prompt recompile; unsupported version fails typed.
- Deleting raw body leaves legitimate minimal metadata and player-published source independently readable under its lifecycle, while exact packet view reports expired.
- Original normalized source `generation.input` is labelled semantic-only when raw original transmission bytes were never saved.
- Provider packet body is compared byte-for-byte with the last transport serializer and distinct provider attempts/rounds are not collapsed by identical text hash.
- Cross-tenant same-content dedup does not bypass story authorization or deletion.
- Unknown source/schema/plugin fields fail closed when they would affect authority, not silently pass through a `z.any()`.

## 9. Implementation gate

Before authoring a code-bearing archive Change, Cursor must:
- enumerate actual schema versions and serializers for the selected first **one** purpose;
- prove semantic archive round-trip with frozen fixtures and no output/task behavior change;
- prove final packet exact byte equality separately, without paid send;
- select backward-compatible storage pointer approach for `generation.input NOT NULL` and in-flight tasks;
- document source/retention/subject classification and admin access tests;
- measure bytes/write and read overhead under realistic constrained input.

**Recommended first-purpose candidate:** a single provider-disabled consequence G plus one prepared synthetic packet and one old v16 fixture. Do **not** build a universal archive for every historical source kind in the first Change.
