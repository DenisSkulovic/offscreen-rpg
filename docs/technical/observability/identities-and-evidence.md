# Evidence graph | Typed, durable, historically faithful data

> **DOC01 P3 canonical technical owner.** Promoted from `docs/programs/observability/technical/evidence-model.md`. Legacy path remains until P5 cutover. Reconcile program decisions (engine/OBS/Admin) claim-by-claim—do not invent acceptance.


**Status: technical target proposal, 2026-11-15.** Product [forensic journeys](../../programs/observability/product-vision.md), actual [source inventory](../../programs/observability/evidence/current-source-inventory-2026-11-15.md), ownership [Engine](../../programs/engine/README.md), [Storyteller](../../programs/storyteller/README.md), [Admin](../admin/topology-and-authorization.md). No code or migration authorization.

## 1. Decision: no mega-GameData blob, no telemetry-as-history

Use **three cooperating contracts**, each with its own reliability and retention:

1. **Authoritative source records:** the game’s persisted story, command, execution, activity, roll, receipt, generation, publication, document root and outbox rows remain owners of *whether the action happened*. Immutable business evidence committed in the same SQL transaction protects causal identity and state changes that are otherwise overwritten.
2. **Versioned evidence envelope + artifact graph:** small SQL-indexed envelopes tell us what work happened and reference immutable, typed CAS artifacts containing the **actual frozen application-level values** consumed/produced. Capture only at meaningful boundaries. This is an append-only *forensic sidecar*, **not** a second command bus or alternate source of game authority.
3. **OpenTelemetry spans / process logs / metrics:** timings, health and troubleshooting signals, linked by operation/generation/artifact IDs. Traces may be sampled and retained briefly; the durable evidence graph must not depend on their existence.

The envelope may point to zero, one or many artifacts. Every edge has an explicit relationship, timestamp/source and recorded coverage. **The same data type that code consumes can be serialized and rehydrated** when versioned stable codecs exist; no production object containing sockets, closures, secrets or nonportable handles should be archived blindly.

## 2. Core identity graph

~~~mermaid
flowchart TD
  P[Player/case subject] --> S[Story and authorized viewer]
  S --> B[Published passage and source revision]
  B --> C[Accepted command and offer]
  C --> X[Mechanical execution and receipt]
  X --> T[Storyteller task G]
  T --> R[Context build and selected artifacts]
  R --> Q[Exact provider dispatch packet]
  Q --> M[Provider attempt and model rounds]
  M --> V[Validation and publication]
  V --> N[New published passage or historical report]
  X --> E[Append-only game events]
  T --> O[Outbox and Temporal workflow/activity]
  O --> M
  S --> D[Canonical root and documents]
  D --> R
  P --> A[Staff case and access audit]
  A --> S
~~~

The drawing is **logical causality**, not an assertion every path exists for every purpose. A quiet activity can have receipt/events but **no model call**. A captured task can be held before dispatch. A valid generation can fail publication. A report can be historical, not controlling. A workflow's own replay is not the player's story replay.

### Required stable IDs

| Identity | Source/meaning | Rule |
| --- | --- | --- |
| `storyId` and current/frozen `passageId` | Owner/campaign/published source | Never use current story revision as a proxy for a historical passage |
| `operationId` | Immutable accepted user/mechanical command or follow-up | Deduplicates business effects; repeated transport may link to same ID |
| `executionId` and execution revision | Finite-action lifecycle | Separate start, pause, interrupted, settled events |
| `activityId` + boundary/segment | Work/routine progress | One segment result/roll/effect exactly once |
| `generationId` (G) | Storyteller task/capture/publication | Preserve same G from provisional capture through promotion where implemented |
| `attemptId` / `modelRoundId` | Provider budget and actual request | Several rounds can belong to one G; uncertain send is not free retry |
| `temporalWorkflowId/runId` + activity attempt | Durable orchestration | Correlation separate from game result identity and possible Temporal Continue-As-New |
| `traceId/spanId` | OpenTelemetry transient timing context | Non-authoritative; might be missing/sampled, can change on async re-entry |
| `artifactId/hash` + `evidenceId` | Immutable frozen values, provenance and schema | Stable content-addressed bytes plus indexed fact about their existence |
| `configRevision/promptPartRevision` | Effective creator/editable instruction at time | Code origin/git hash or DB immutable revision, never mutable “latest” |
| `caseId/purposeGrantId` | Support investigation and access purpose | Links incident and authorized viewer without conferring game authority |

**Time axes are explicitly separate:** DB commit order or event sequence; narrative `revision`; fictional `gameSecond`; real UTC wall timestamps; model/worker monotonic duration; source document revision. A “later” fictional report may be **committed today** about an earlier fictional time. Do not merge them into one sortable “turn number.”

## 3. EvidenceEnvelopeV1: small, indexable, purpose-scoped

The following is an illustrative **contract sketch**, not executable schema code. Names should converge with actual package owners before implementation. No runtime import of a generic catch-all object is authorized.

~~~ts
type EvidenceEnvelopeV1 = Readonly<{
  version: 1;
  id: UUID;
  storyId: UUID | null;
  subject: { kind: 'story' | 'draft' | 'generation' | 'activity' | 'admin-case'; id: string };
  kind:
    | 'game.command.admitted'
    | 'game.transition.committed'
    | 'game.passage.published'
    | 'ai.task.captured'
    | 'ai.context.assembled'
    | 'ai.round.prepared'
    | 'ai.round.dispatched'
    | 'ai.round.settled'
    | 'ai.validation.completed'
    | 'ai.publication.decided'
    | 'admin.evidence.accessed';
  causal: {
    operationId: UUID | null;
    generationId: UUID | null;
    attemptId: UUID | null;
    parentEvidenceId: UUID | null;
    traceId: string | null;
    temporalWorkflowId: string | null;
    temporalRunId: string | null;
  };
  boundary: {
    passageId: UUID | null;
    narrativeRevision: number | null;
    gameSecond: number | null;
    storyViewVersion: number | null;
    documentRootHash: SHA256 | null;
    settingsRevision: number | null;
  };
  observedAt: ISODateTime;       // wall time, not authoritative commit order
  committedSequence: number | null; // only if committed under authoritative writer
  outcome: 'completed' | 'failed' | 'held' | 'uncertain' | 'not-run';
  visibility: 'player' | 'support-safe' | 'engineering-restricted' | 'trust-only';
  artifactRefs: readonly ArtifactRefV1[];
  completeness: {
    expected: readonly string[];
    recorded: readonly string[];
    unavailable: readonly { kind: string; reason: string }[];
  };
  producer: {
    service: string; buildId: string; schemaVersion: string;
    environment: 'local' | 'staging' | 'production';
  };
}>;
~~~

**Do not replicate all story input in this SQL row.** The row is a search/index/correlation handle with fixed typed fields. A separate edge table carries many-to-many relationships such as `derived-from`, `selected-from`, `loaded-from`, `omitted-due-to`, `validated-against`, `supersedes`, `published-as` and `replayed-from`; each edge must point to a valid source/target or an explicitly recorded unavailable external reference. Unknown edge types fail closed instead of giving a generic untrusted graph scripting surface.

**Integrity:** envelope is append-only once committed except tightly defined terminal state receipts. If one lifecycle needs updates, use a minimal identity row plus ordered immutable state transitions, not overwrite the only evidence of earlier states. Prefer the **existing** operation/attempt state owner for current status; evidence transitions explain how it got there.

## 4. ArtifactRefV1: byte-precise typed input/output

~~~ts
type ArtifactRefV1 = Readonly<{
  artifactId: UUID;
  type:
    | 'game.pre-state.v1'
    | 'game.transition-input.v1'
    | 'game.transition-result.v1'
    | 'storyteller.task-input.v17'
    | 'storyteller.context.v1'
    | 'storyteller.context-manifest.v1'
    | 'storyteller.provider-packet.v1'
    | 'storyteller.provider-output.v1'
    | 'storyteller.validation-report.v1'
    | 'storyteller.prompt-provenance.v1'
    | 'replay.checkpoint.v1';
  codec: 'canonical-json.v1' | 'raw-provider-bytes.v1';
  schemaRef: string; // exact immutable schema version / validation owner
  sha256: SHA256;      // checksum of canonical stored plaintext bytes
  byteLength: number;
  storageRef: string;  // server-only opaque CAS pointer
  sensitivity: 'public-story' | 'player-private' | 'staff-restricted' | 'secret-forbidden';
  createdAt: ISODateTime;
  expiresAt: ISODateTime | null; // null only when a specific policy allows it
  availability: 'ready' | 'pending' | 'missing' | 'deleted' | 'quarantined';
}>;
~~~

**Principle:** capture **the value as the corresponding runtime contract sees it**, before mutation or pruning, at the named stage; no field renaming to arbitrary diagnostic key-value bags. Preserve fields, order where semantic, schema version and binary/JSON encoding rules. The evidence envelope and provenance records are **additive**, not invasive mutations of that source value.

- For provider sends, archive the **actual serialized request bytes** after policy/format projection, not a re-created JSON object that might reorder messages or silently omit a model parameter. Record request schema, route/model/endpoint policy, content hash, exact byte length and dispatch attempt identity. Secrets such as API tokens and auth headers are excluded from capture.
- For in-memory Zod objects, persist validated canonical serializable values with a **versioned lossless codec** for JSON-safe type semantics. Define explicit handling for Date/BigInt, undefined vs absent, byte buffers and ordered map/list; do not pretend vanilla JSON stringify always preserves runtime meaning. Store an independent `schemaRef`/reader version and test archival round trips.
- For mutable campaign state, use **before/after typed projections and field-level transition evidence** at authoritative commits, not full 200-KB state copies after every clock tick. The saved transition should contain original intended effect, actual admitted effect, changed keys, prior/new values where permitted and applied rule version. Stable item/character IDs remain in the original game schema.
- For encrypted or redacted fields, store a **protected artifact** or a typed omission marker, not a blank value that implies the user submitted nothing. A ciphertext cannot be used as a directly readable support projection.
- Content-addressing can deduplicate identical immutable blocks across turns, but **sharing bytes must never share authorization**. Artifacts require subject-level access/reference ownership; a guessed hash must not grant content access.

## 5. Every node must carry an explanation of “where did this come from?”

For meaningful field/source assembly, record separate structured `EvidenceDerivationV1`:

~~~ts
type EvidenceDerivationV1 = Readonly<{
  targetEvidenceId: UUID;
  targetPath: string;  // JSON Pointer into typed artifact, e.g. /context/profile/tone
  source: {
    kind: 'sql-record' | 'canonical-cas' | 'prompt-registry'
      | 'code-constant' | 'player-config' | 'experiment-assignment'
      | 'validator-result' | 'model-visible-output' | 'derived';
    logicalId: string;
    revision: string;
    artifactId: UUID | null;
    sourcePath: string | null;
    originBuildId: string | null; // code/static content provenance
  };
  transform: {
    ruleId: string;
    ruleVersion: string;
    transformBuildId: string;
    reasonCode: string;
    parametersArtifactId: UUID | null;
  };
  decision: 'used' | 'selected' | 'fetched' | 'pruned' | 'rejected' | 'not-applicable';
  reason: string | null; // bounded, closed vocabulary + safe human summary
}>;
~~~

This record is the crucial difference between **“prompt text retained”** and **“we can explain exactly how the prompt existed.”** A nested field can have more than one provenance parent (e.g. default config overridden by a player setting). A source with no stable revision is **not proven reproducible** and must be labelled as such.

Record **ineligible** and **not-selected** items only where the selector actually considered them and bounded candidate metadata exists. Do not fabricate negative evidence for every possible document in the universe. For each required source, capture its inclusion/exclusion decision.

## 6. Data-capture checkpoint matrix

| Boundary | Capture before/after | Atomicity | Durable source |
| --- | --- | --- | --- |
| HTTP command acceptance | user intent digest, actor/offer/revision, admitted command ID; separate request trace | Acceptance outcome inside game transaction, request timing telemetry best-effort | `campaign_command` / `story_resolution` + compact evidence |
| Mechanical admission and settlement | selected plan + rules/entropy/time input; actual receipt, changed mechanics, event IDs, holds | **same SQL commit** as effects; do not add provider I/O to story lock | `game_action_execution` / `game_action_receipt` / `game_activity_event` / `game_roll` plus transition provenance |
| Time/interrupt | chosen boundary, pace/revision, required-item holder and controlled obligation, interrupt cause | same transaction as state change | existing game/action/world events + typed delta |
| Task/context capture | exact G, frozen actor/world/story/scene/root/config/selection; eligible source hashes | short authoritative SQL stage; immutable CAS materialized after lock | `generation`/`storyteller_context_capture` + provenance |
| Context assembly | each source selected/loaded/omitted/final-included, prompt blocks and reasons | protected artifact prepared **before** potential provider dispatch | immutable evidence artifact + structured derivation graph |
| Provider dispatch | **actual** packet bytes, model/output schema, route, attempt and budget ceiling | attempt/intention and packet reference durable before send; dispatch status separately settled | `storyteller_attempt`/`dispatch_review` and protected packet artifact |
| Model/tool round | externally visible request/output, tool call/observation, tokens/latency reported, error/unknown | separate committed lifecycle receipts; never treat uncertain as free repeat | `storyteller_memory_exploration`/`attempt` + new evidence artifacts |
| Output validation | exact candidate, diagnostics, acceptance/rejection and schema versions | persist outcome before publication; never fabricate success | `generation.output`/repair diagnostics + validation report |
| Publication | source fence and plan/document validation outcome, new passage/offer/root, stale refusal | **same SQL commit** as published source and story revision | `storyteller_publication` / `story_passage` / `story_document_commit` |
| Admin/private evidence access | actor, purpose, resource, fields disclosed, result, approval/expiry | secure durable audit before disclosure, no generic response-body dump | `admin_audit_event` or governed evidence-access record |

For **production paid dispatch**, the complete exact provider request and the identity/metadata needed to explain it should be durable **before** transmitting it. If protected artifact storage is unavailable, fail/hold new paid dispatch (not an already committed mechanical outcome) rather than perform an untraceable spend. The model request can still fail after dispatch, leaving a truthful uncertain status.

For **ordinary gameplay**, losing a best-effort OpenTelemetry exporter must not change business behavior. Keep the critical compact evidence in the owning SQL transaction; never introduce a remote telemetry RPC inside a story `FOR UPDATE` lock. CAS must be staged outside the lock, content-verified and referred to atomically when promoting/publishing.

## 7. Read and reconstruction

**Reconstruction request:** `reconstruct({storyId,asOf:passageId|eventSequence|operationId, mode:'published'|'mechanical'|'ai-execution',viewerPurpose})` is a **read-only, source-validated service**. It resolves graph, typed artifacts, historically pinned versions, missing/retained flags and access control, yielding a human-display projection rather than handing raw tables to React.

Reconstruction output must show:
- `coverage`: complete / partial / cannot-replay, specific missing node and why.
- `authority`: committed game facts vs candidate/projection vs model output vs derived presentation.
- `asOf`: exact committed frontier and fictional time, not newest source mixed into an older turn.
- `diff`: actual changed fields/events, links to before/after artifacts where retained.
- `evidence`: unique source IDs and schema/build revision; no “likely” inference disguised as source.

**Forbidden:** interpreting a log line as authority; re-running dice to fill missing receipts; using current profile `latest` to explain an older task; treating provider request hash as proof the provider was billed; exposing contents from a different story just because a CAS hash matches; letting a sampled trace make an otherwise complete operation appear to never exist.

## 8. Open technical decisions before execution

- Physical schema placement: reuse some existing rows vs additive `evidence_*` tables. Maintain one owner and avoid pointless double ledgers.
- Stable codec/upcaster versioning for current Zod task/input/output/compiled OpenRouter packets, with binary safety.
- Minimal consistent state delta and checkpoint data; which transitions currently overwrite facts without recording prior values?
- How to stage immutable protected evidence CAS without remote calls under a story lock; transactional references and orphan cleanup.
- How to govern recoverability of raw provider text, tenant erasure and access without making a POC into a compliance mirage.
- What exact DB indexes/cardinality will satisfy common forensic lookups at thousands of stories?
- Required capture budget and overload behavior by event class, proven in a source-grounded load experiment.

**Exit gate:** an injected failure between every capture stage must leave no false published story, no unaccounted provider attempt, no duplicate game effect and an explicit evidence-coverage state. Do not claim **complete retrospective fidelity** until that exact negative matrix is tested against disposable SQL/CAS/Temporal.
