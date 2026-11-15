# Physical evidence storage V1 | PostgreSQL indices + immutable protected artifacts

**Status: proposed physical model for technical review, 2026-11-15. No migrations/code authorized.** Build on [source writer audit](../evidence/mutation-writer-audit-2026-11-15.md), [typed graph](evidence-model.md), [context provenance](context-provenance.md), [retention](replay-retention-and-privacy.md) and [atomic capture](capture-transaction-protocol.md). This is a **design sketch with explicit constraints and alternatives**, not a demand to create every table or move existing raw SQL data immediately.

## 1. Selected physical separation

Use the existing Postgres/Drizzle modular monolith for **business authority, ordered compact evidence and searchable references**, plus a **separate encrypted immutable forensic artifact namespace** backed by the current DocumentStore abstraction or a narrowly adapted storage interface. Do **not** write forensic artifacts into the story's canonical world-document root. A prompt archive is not a player-authored world section.

~~~text
Game authority in existing SQL
  story, campaign, story_passage, receipts, rolls, activity, obligations,
  campaign_settings, generation, storyteller_attempt, publication, outbox
          |  SAME SHORT SQL TRANSACTION
          v
Small source-typed evidence records / per-story commit sequence
  evidence_frontier -> story_transition -> story_transition_item
          |             |
          |             +--> edges to actual existing business records
          |
          +--> durable intent / artifact descriptor (not player prose)
                         |
             staged/verified protected CAS artifacts
                         |
            governed access/read models & retention
                         |
           Support / Developer / Player replay projections

Operational OTel spans, logs and metrics link by IDs, but are not required
for reconstruction of a committed game transition.
~~~

**One-owner rule:** source rows already persist a valid immutable receipt/task/packet. New forensic rows should reference them, not blindly duplicate bodies. An archived raw packet may initially resolve through `storyteller_dispatch_review.packet` as an existing storage adapter, with explicit source version and retention limitations.

## 2. Proposed SQL entities, not accepted DDL

### 2.1 Per-story commit frontier

`story_evidence_cursor`:

| Field | Purpose |
| --- | --- |
| `story_id UUID PK/FK` | exact story, current single-owner scope; future membership not assumed |
| `last_transition_seq BIGINT NOT NULL DEFAULT 0` | latest committed forensic transition sequence |
| `schema_version` | internal counter contract; explicit historical coverage start |
| `activated_at TIMESTAMPTZ` | **first actually instrumented frontier**, not story creation timestamp |

**Lock order:** caller already owns story `FOR UPDATE` → update `story_evidence_cursor` in that **same** transaction → write transition and subevents → continue existing authoritative business update. No per-write `SELECT MAX(seq)` scans, global sequence allocation or separate asynchronous allocator. The update's row lock serializes only writers to that story and is released with the business commit.

Use `UPDATE ... SET last_transition_seq = last_transition_seq + 1 RETURNING` for the first meaningful transition in the transaction; all later semantic subevents in that atomic group reuse the same sequence and use `within_commit_order`. A missing cursor on legacy stories must be initialized deliberately under story lock with `coverageStart='since-enabled'`. Do **not** backdate genesis to pretend entire history was recorded.

**Trade-off:** an extra SQL row write and insert are expected at each meaningful state mutation. It is bounded, but *not* assumed free. Benchmark row locks/p95 before selecting the exact physical counter (cursor row vs a new `story` column). Do not increment for uncommitted proposals or no-op worker wake.

### 2.2 Committed story transition

`story_transition` (illustrative physical fields):

~~~text
id UUID PRIMARY KEY
story_id UUID NOT NULL
transition_seq BIGINT NOT NULL CHECK > 0
atomic_group_id UUID NOT NULL
kind TEXT NOT NULL CHECK IN selected closed taxonomy
operation_id UUID NULL
causing_generation_id UUID NULL
source_passage_id UUID NULL
before_narrative_revision INT NOT NULL
after_narrative_revision INT NOT NULL
before_game_second BIGINT NULL
after_game_second BIGINT NULL
before_state_sha256 CHAR(64) NULL
after_state_sha256 CHAR(64) NULL
delta_type TEXT NOT NULL
delta_schema_version INT NOT NULL
delta_payload JSONB NULL    -- narrow, strict, <= selected measured ceiling
delta_artifact_id UUID NULL -- for a larger immutable typed delta, if supported
coverage TEXT NOT NULL CHECK IN ('complete','partial','unverified')
created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()

UNIQUE(story_id, transition_seq)
UNIQUE(story_id, atomic_group_id)
INDEX(story_id, transition_seq DESC)
INDEX(operation_id) WHERE operation_id IS NOT NULL
INDEX(causing_generation_id) WHERE causing_generation_id IS NOT NULL
~~~

**Integrity:** exactly one of inline validated delta vs immutable artifact is required for `complete` replay (or explicit zero-delta state transition kind). Required source type/codec/hash and sensitivity are defined by the *typed transition kind*, not a permissive arbitrary object. Constraints prevent a row claiming complete when no replayable delta exists. `source_passage_id` is informative and need not represent a later historical report's in-fiction source as the current published passage.

**Important:** SQL timestamps and global `bigserial` are not a total causal order. Per-story committed sequence is allocated inside the writer transaction. `within_commit_order` is the meaningful order of subevents *inside* one transaction; a timestamp on each subevent is diagnostic, not a replacement for ordering.

### 2.3 Typed within-commit events and source edges

`story_transition_item`:

~~~text
transition_id UUID FK story_transition
within_commit_order SMALLINT NOT NULL CHECK >= 0
kind TEXT CLOSED ENUM
source_kind TEXT CLOSED ENUM
source_id TEXT NOT NULL  -- stable existing receipt/roll/activity/world/passage ID
source_revision TEXT NULL
result_digest CHAR(64) NULL
delta_fragment_ref UUID NULL
PRIMARY KEY (transition_id, within_commit_order)
UNIQUE (transition_id, source_kind, source_id, source_revision) where safe
~~~

One `settleActivity` may process up to 24 boundaries, and within each boundary more than one scheduled check. The items capture **exact sequence of material source consequences** with immutable `gameRoll`/`gameActivityEvent` references, optionally ordered delta fragments. An “atomic group” can include a story passage/root update, actor/time and hold transfer. Never emit a second event just because a duplicate Temporal Activity ran and returned the same source receipt.

`evidence_edge` (if needed) indexes typed DAG relationships `cause`/`freezes`/`depends-on`/`selected-from`/`loaded-from`/`omitted`/`produces`/`attempted-by`/`published-as`/`supersedes`, with source and target *stable typed references*. Favor existing key joins when an extra edge provides no query value; **do not create a graph database**. A flat join/index may be sufficient for V1.

### 2.4 Protected artifact catalog

`forensic_artifact` indexes a **private reference**, not raw body, with:

| Field group | Required properties |
| --- | --- |
| Identity | opaque `artifact_id UUID`, validated `artifact_type`/schemaRef/codec; separate content SHA and byte length |
| Owner | subject kind/id; story/account/draft/G scope where applicable, visibility/disclosure class, tenant/environment |
| Storage | `storage_kind='existing-sql'|'protected-cas'`, typed existing-source reference or private CAS key; verified hash |
| Capture | stage/provenance source ID, build/compiler version, capture time, state `staged|ready|blocked|missing|expired|deleted` |
| Retention | policy class/version, `retain_until`, legal hold reference (not a boolean that anyone toggles), encryption/key reference |
| Protection | content classification, app-layer permission, deletion state, checksum verification timestamp |
| Accounting | compressed/stored byte lengths; capture cost estimate; **no full plaintext in catalog** |

**Unique behavior:** an artifact can have multiple subject references only when authorization/erasure rules can still be enforced. Content-addressed dedup **does not** make two story owners authorized to see each other's bytes. Either disable cross-story private dedup initially, or introduce per-owner references and encryption-key strategy with a tested reference/erasure model.

`forensic_artifact_link` attaches artifact to source story/G/attempt/transition and role (`task-input`, `context-before-pack`, `actual-provider-packet`, `provider-output`, `checkpoint`, `validation`, `replay-test-bundle`). Query by these typed indexed relationships; no search by arbitrary raw player text or blob hash.

**Existing source reuse:** the first implementation can avoid storing the same artifact body twice. An artifact reference to `generation.input` or `storyteller_dispatch_review.packet` must record that the backing record has a **different data retention and security guarantee**. Do not claim a CAS hash/TTL exists for a raw SQL source. Movement to CAS later requires dual-read compatibility, immutable hash verification and active-attempt migration proof.

### 2.5 Prompt and configuration provenance tables

Forensic `prompt_assembly` keyed by exact `(generation_id, attempt_id, round_id or request_sha)` with:
- frozen task artifact ref and **actual dispatch packet ref/hash**;
- prompt compiler ID/version + Git build; provider adapter/output-schema projection version;
- recipe, model, route and policy versions;
- metadata coverage (`exact-packet|partial|metadata-only`).

Child `prompt_component` indexed by parent `assembly_id` and ordered component ordinal:
- component stable key; purpose; source kind/id/revision/content SHA; source build/git/file;
- optional `campaign_settings.revision`, prompt-registry revision or profile definition hash;
- effective/overridden/omitted/loaded/final-included status; selector reason and transform version;
- message/JSON pointer or byte span into **actual** provider bytes, where mechanically provable;
- optional protected source body artifact ID.

**No invented author metadata:** repository-backed code prompt gets Git source and content hash; current JSON profile definitions get path/revision/build; player edits get real `campaignCommand` and `campaignSettings` ancestry. An editor/approver ID is recorded only if an actual authenticated edit happened.

### 2.6 Access and custody

`forensic_access_intent` or extended `admin_audit_event` owns:
- staff identity/session, grant version and case/purpose;
- scoped target reference and disclosure class/fields;
- authorization decision, justification and timestamp;
- `authorization_policy_version`, if elevated approval required;
- outcome **requested/authorized/exported/denied/error**, not a fake claim that network bytes were consciously read;
- reference to released artifact version, never full content in audit row.

Do not introduce a second unauthenticated audit log from the frontend. Protected data release must go through one server-side Admin use case and a write-ahead audit intent that commits *before* the restricted body is returned.

## 3. Exact artifact codec and same-shape requirement

The user's desired “retain the same runtime object shape” is **correct for contract-bearing data**, with a necessary nuance: an in-memory JS object may contain Date, BigInt, undefined, Buffer, Map, functions or temporary handles that standard JSON does not preserve.

**Selected approach:** one canonical archive codec per known public/private domain type, not a universal `JSON.stringify(anything)`:

~~~text
type identity + schema version + codec version
  -> validate a strict stable Zod (or equivalent) archived representation
  -> canonicalize permitted JSON values using deterministic key/number rules
  -> explicitly normalize Date timestamps, large integers, missing/null, bytes
  -> serialize exact canonical archive bytes and sha256
  -> decode + validate into the same public/domain *data* type
  -> check semantic equality and hash on replay
~~~

- **Plain JSON sources** (`storytellerTaskSchema`, `campaignSettingsSchema`, `gameActionReceipt` after parsing) are stored as their exact validated data fields. Canonical JSON hashing may follow RFC 8785/JCS **where applicable**; do not force JS Date/BigInt through a lossy representation.
- **Transport wire bytes** are a distinct codec `raw-provider-request-bytes.v1`, captured at the last serialization boundary **before actual send**. Exact UTF-8 bytes, order, headers *excluding secrets*, schema projection/model parameters and dispatch policy are recorded separately. The hash of `inspection.body` is not automatically proof it equals outbound bytes unless tested against the same serializer.
- **Checkpoint** payload is a strict `StoryReplayCheckpointV1` containing the actually authorized state fields. Do not reuse `campaignStateFileSchema` unchanged if it contains generic `z.json()` fields without game-specific validation and actor perspective metadata. It can supply an efficient initial projection, but final archived schema should be strict and typed.
- **Large CAS input** remains a reference to the exact immutable manifest/passage/object hash, not a mutable “latest” alias; retain enough reference and ownership for later read.
- **Secrets** are categorically forbidden even if the codec could serialize them; provider keys/OAuth tokens/session secrets/passwords never enter forensic artifacts.

**Tests:** encode/decode round-trip all active v17 task variants, game activity/campaign state, JSON unsafe types, nested arrays/order, Unicode, empty vs missing field, and schema evolution to one new version. Old evidence must remain readable with a tested versioned adapter; historical bytes must not be rewritten in-place to pretend they were produced by the new schema.

## 4. How to create checkpoints without lock-held remote I/O

**Do not call CAS while holding `story FOR UPDATE`.** An initial *genesis* strict state projection may be captured in the Start transaction if bounded. Subsequent checkpoints should be derived **off-lock** from a known complete predecessor + immutable committed deltas at a closed sequence, then staged into protected CAS and indexed in short SQL transaction with exact source frontier/hash.

Proposed `story_replay_checkpoint`:

~~~text
checkpoint_id UUID PRIMARY KEY
story_id UUID NOT NULL
through_transition_seq BIGINT NOT NULL
narrative_revision INT NOT NULL
game_second BIGINT NULL
document_root_hash CHAR(64) NULL
state_schema_version TEXT NOT NULL
artifact_id UUID NOT NULL REFERENCES forensic_artifact
state_digest CHAR(64) NOT NULL
build_id TEXT NOT NULL
status 'building'|'verified'|'failed'|'superseded'
created_at TIMESTAMPTZ
verified_at TIMESTAMPTZ NULL
UNIQUE(story_id, through_transition_seq, state_schema_version)
INDEX(story_id, through_transition_seq DESC) WHERE status='verified'
~~~

The worker builds from **an immutable closed frontier**; it must not read mutable current `campaign` and claim it is old. If the old frontier is missing a delta, the checkpoint becomes failed/partial. A generation or game thread can continue while checkpoint construction runs. The checkpoint is **derived**, never a new game authority or a paid Storyteller task.

**Sizing gate:** every 25 transitions is a proposed starting experiment, **not** a production default. Measure checkpoint size, cumulative query speed, cache/storage cost, and long-story seek at 20/200/2,000 scenes. Keep only enough checkpoints to meet user-facing seek latency and retention policy, without pruning the sole deltas needed for exact reconstruction.

## 5. Index, query and retention strategy

| Query | Required efficient index/path |
| --- | --- |
| Story timeline as of X | `story_transition(story_id, transition_seq DESC)` plus bounded continuation |
| Event → exact source proof | `story_transition_item(source_kind, source_id)` or existing indexed source table, then parent |
| Accepted operation → all stages | indexed `operation_id`, then existing `storyResolution`/`generation`/attempt and evidence links |
| Generation → context/model rounds/publication | indexed `generation_id` + `attempt_id` + `prompt_assembly`/artifact refs; existing rows remain truth |
| Affected field across a story | optional bounded type/path-coded delta index, not a general JSONB-GIN on all sensitive content |
| Support case → scoped evidence | existing `adminCaseLink`, independent grant check, then source refs |
| Retention/cleanup | `forensic_artifact(retain_until,status)` with subject scope and legal hold relation; separate GC queue |
| Protected prompt read | exact artifact ID, owner/grant/case purpose verified, **no globally searchable body** |

Avoid `storyId` as a Prometheus metric label (high cardinality) while keeping it in the **native SQL key/index** for legitimate forensic reads. Operational telemetry can include sanitized trace IDs that link to native evidence, with access checks when pivoting back into Admin.

**Partitioning:** not required at day one. If measured volume justifies it, partition large append-only `story_transition` by retention/tenant strategy that does not break a per-story ordered index. Do not pre-emptively split hot and cold stores or add a message bus. PostgreSQL + bounded CAS is adequate for a first serious test.

## 6. Retention conflict in the *current* schema: an implementation blocker

**Already retained raw bodies in SQL:**
- `generation.input` contains frozen Storyteller task/context/request;
- `generation.output` and repair candidates may contain narrative/response content;
- `storyteller_dispatch_review.packet` contains full prepared provider request body;
- `storyteller_memory_exploration.snapshot` and pending model request/output can contain tool and model content;
- `storyPassage` / immutable canonical CAS contain player story narrative.

Therefore, an artifact catalog with `retain_until=30 days` **cannot make the raw input disappear** if an older source row continues to store the same bytes indefinitely. A claim of “30-day raw model context retention” would be materially false.

**Required staged plan:**

1. **Retention-inventory proof:** classify **every** SQL JSONB, document CAS, local index cache, export, backup and possible observability vendor copy containing private prompt/response material. Identify owner, legal purpose, decoder, in-flight task dependency and cleanup path.
2. **Access-first:** restrict raw reads behind capability/purpose/audit even while the original rows still store it. Never expose `generation.input` in AD05 or “Debug JSON” endpoints merely because it already exists.
3. **New-write boundary:** for new captures, converge on protected immutable artifact references and stable schema decoders, while existing generation/publication code can still read its required complete task. This may require an additive pointer or retrieval facade, plus explicit lifecycle states and migration/race tests. Do **not** simply delete fields from active task input.
4. **Expiry enforcement:** only after every consumer can decode the referenced active content safely and in-flight/uncertain provider tasks are handled, implement retention/erasure of raw SQL bodies and protected CAS. Preserve minimal metadata/hashes **only where lawful**, and mark lost body coverage. Old tasks may remain on their legacy retention policy until explicitly migrated or deleted.
5. **Backup/derived cleanup:** account for replication, PITR snapshots, local debug exports, temp files and copied diagnostic bundles. TTL on one table does not enforce a whole-system promise.

**Product trade-off:** to replay published scenes for years, retain published story/canon as product data. To re-open the *exact historic private model prompt* after 30 days, either extend its allowed retention or honestly show metadata-only. Both guarantees can coexist with separate data classes, but never with contradictory backdoors in SQL.

## 7. Backpressure, safety and physical compatibility gates

- Compact transition/evidence writes are part of the **same game SQL commit**. If required row insertion fails, roll back the **new** authoritative transition rather than silently commit untraceable data. If settling a previously accepted due action is held by evidence storage, retain the accepted action and a typed operator-visible incident; never reroll or double-charge.
- A large remote protected artifact write is **never** inside a long story-row lock. Stage off-lock, verify hash, then promote/finalize through a short SQL fence; failed stage creates an explicit incomplete/held marker.
- A provider **new paid send** cannot proceed without durable packet identity and required protected content custody, subject to agreed policy. An already committed mechanical effect cannot be undone because the model archive is unavailable.
- Raw SQL JSONB duplication and arbitrary `SELECT *` in Admin are forbidden. Every artifact has strict maximum size, classification and stage/budget. Cap values from **measurement**, not fabricated production traffic.
- **Deletion model:** story-referenced evidence must support subject-level purge/erasure while respecting explicit minimal security audit/legal holds; choose FK cascade/restrict behavior deliberately. Existing `storyPassage` has restrictive relations while current `campaign` has cascade on story delete, so a naïve single `ON DELETE CASCADE` everywhere would be inconsistent.
- **Consistency:** cross-source link verification must prove identity/owner/root/sequence, not merely equal hashes; archive code can never grant game authority or interpret provider output as a receipt.
- **Ops/retention metadata** never substitutes for access: `artifact_id`/`sha256` alone is not an authorization token.

## 8. Proof plan before DDL

1. Run a one-game disposable-DB write path and measure actual extra SQL statements/bytes per meaningful transition, hot-lock duration and p95 latency under injected CAS delay.
2. Simulate 3 boundaries inside one activity transaction and prove subevent order plus rollback.
3. Show a real `storyteller_dispatch_review.packet` SHA and independently captured provider *last serializer* SHA matching; include a negative where serializer would change bytes.
4. Deliberately fail artifact staging, SQL pointer insert, outbox notice and GC, then recover without false committed evidence or duplicate provider spend.
5. Replay one 20-scene recorded story with a settings edit, item transfer, interruption and late historical report; every checkpoint/delta verifies source digest.
6. Verify a v17 raw task can still execute while its new protected artifact is staged/migrated; then prove a deleted expired raw packet **cannot** be fetched from *any* source path, while the legitimate published story still plays.
7. Inspect all sensitive read API/SQL paths, including cached Admin responses and exports, under revoked/expired staff session.
8. Produce storage growth estimates from **measured** p50/p95 bytes per generation and per transition, including indexes/backups/replicas and retention windows.

**Decision record:** adopt this shape only after a package- and schema-level review of where actual existing task/dispatch data can be referenced. One extra table is justified by a missing invariant or query, not by the attractiveness of an “enterprise” schema diagram. No schema is Ready for migration at present.
