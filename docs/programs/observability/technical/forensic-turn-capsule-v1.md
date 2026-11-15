# Turn Evidence Capsule V1 | One navigable investigation object, without a mega-GameData dump

**Status:** Proposed Wave-5 product/data contract, 2026-11-15. **No persistent table, API or code is authorized by this document.** Extends [evidence model](evidence-model.md), [evidence quality](evidence-claims-and-quality-v1.md), [prompt source maps](storyteller-prompt-source-map-v1.md), [historical reconstruction](reconstruction-algorithm-v1.md), [Admin read model](investigation-read-models-v1.md) and [privacy/retention](replay-retention-and-privacy.md).

## 1. Decide what a "turn" means

**Never identify a turn solely with one LLM call.** Offscreen RPG can have an accepted finite action that runs for fictional time, many activity boundaries, an interruption, an AI consequence, multiple memory rounds, a rejected output, a resumed generation, a historical report, and finally a published passage. Some steps have no provider call at all.

A **forensic turn capsule** is a **read-only composed view** focused on a *causal episode*, normally anchored by an accepted `operationId`, a selected `generationId` or a published `passageId`. It is **not** one mutable table that replaces existing `campaign`, `story_passage`, `generation`, `storyteller_attempt` or canonical document source.

The named capsule exists to give the human a reliable navigation unit across existing source data:

~~~text
Case/Campaign
  -> Causal Episode (accepted command or published scene)
       |-> Admission / actual mechanics and state delta
       |-> Source scene and exact historical root/config
       |-> Provisional capture G / materialization / hold
       |-> Prompt assembly / source decisions
       |-> Actual prepared/sent provider packet and visible rounds
       |-> Validation / charges and uncertainty
       |-> Publication and committed result
       |-> Subsequent player-visible scene
       |-> All missing/expired/redacted evidence explicitly marked
~~~

This diagram is **logical**, not a claim the current backend has all these linkages saved.

## 2. TurnEvidenceCapsuleV1: the single "exploration contract"

~~~ts
type TurnEvidenceCapsuleV1 = Readonly<{
  version: 1;
  id: string; // deterministic scoped identity, never a random per-GET ID
  anchor: {
    storyId: UUID;
    kind: 'operation'|'generation'|'published-passage'|'activity-boundary';
    id: UUID;
    requestedAsOf: StoryAsOfV1 | null;
  };
  chronology: {
    sourceGameSecond: number|null;
    endGameSecond: number|null;
    earliestCommittedSeq: DecimalString|null;
    latestCommittedSeq: DecimalString|null;
    firstObservedWallTime: ISOTime|null;
    lastObservedWallTime: ISOTime|null;
    publishedPassageId: UUID|null;
    sourceNarrativeRevision: number|null;
  };
  cause: {
    authenticatedActorRef: TypedRef|null;
    acceptedCommandRef: TypedRef|null;
    selectedOfferRef: TypedRef|null;
    parentOperationRef: TypedRef|null;
    sourceSceneRef: TypedRef|null;
  };
  stages: readonly {
    stageId: string; // stable stage/attempt/capture identity
    kind: StageKind;
    state: StageState;
    originalSourceRefs: readonly TypedRef[];
    startAt: ISOTime|null;
    endAt: ISOTime|null;
    reasonCode: ClosedReasonCode|null;
    coverage: EvidenceCoverageV1;
  }[];
  stateChanges: readonly {
    committedSeq: DecimalString|null;
    typedDeltaRef: TypedRef|null;
    actualReceiptRef: TypedRef|null;
    beforeDigest: SHA256|null;
    afterDigest: SHA256|null;
    fictionalTimeBefore: number|null;
    fictionalTimeAfter: number|null;
    completeness: 'complete'|'partial'|'not-instrumented';
  }[];
  ai: {
    generationRefs: readonly TypedRef[];
    attempts: readonly TypedRef[];
    effectiveConfigRef: TypedRef|null;
    promptAssemblyRefs: readonly TypedRef[];
    visibleModelRoundRefs: readonly TypedRef[];
    publicationRef: TypedRef|null;
    chargeEvidenceRefs: readonly TypedRef[];
  };
  sourceGraph: {
    nodes: readonly SourceGraphNodeSummary[];
    edges: readonly TypedProvenanceEdge[];
  };
  assertions: readonly EvidenceAssertionV1[];
  coverage: {
    game: EvidenceCoverageV1;
    ai: EvidenceCoverageV1;
    rawContent: EvidenceCoverageV1;
    operationalTelemetry: EvidenceCoverageV1;
    publication: EvidenceCoverageV1;
  };
  links: {
    nextPublishedPassageRef: TypedRef|null;
    previousPublishedPassageRef: TypedRef|null;
    relatedOperationRefs: readonly TypedRef[];
  };
}>;
~~~

**Design sketch only:** typed refs/schemas to be finalized from actual Postgres and contract owners. The central promise is **one click goes to the actual source and historic value**. The capsule metadata should be small enough for a normal Admin timeline. Its `rawContent` is *not* an embedded string dump: each protected artifact is fetched individually after separate authorization.

## 3. The same shape that ran must survive

User-requested “same GameData/TurnData/ContextData objects” should be interpreted precisely:

- A game stage's **original validated source DTO** (`gameActionReceipt`, `gameActivityEvent`, `StorytellerTask` v17, `campaignSettings` revision, etc.) is preserved under a pinned schema/codec when required for replay.
- The capsule **references those objects** with stable IDs, hashes, versions, access class and source field pointers. It does not flatten their fields into generic `unknown` diagnostics.
- Separate provenance tells **how each input got there, when it was captured, what transformed it, and which next stage actually consumed it**.
- When an original runtime object was never archived before being overwritten, the capsule reports `not-recorded/unknown`. Do not reconstruct it using today's game state.
- When a packet was archived but later legally expired, preserve only allowable metadata and the correct `expired` state, not the original body under another name.
- An in-memory JS object with Date/BigInt/undefined/runtime handles cannot be archived losslessly via generic JSON; each original DTO uses a [versioned archive codec](archive-codecs-and-evolution-v1.md).

**Do not persist the entire assembled capsule on every turn.** That would duplicate source rows and protected content, create enormous migration pressure and make provenance itself stale. Its *indexable relationships* and genuinely missing immutable source decisions are persistent; the readable capsule is a **composable read model**.

## 4. Build from actual existing source data before inventing a new ledger

| Capsule section | Current authoritative inputs | Known gaps |
| --- | --- | --- |
| Cause | `storyResolution`, `campaignCommand`, `gameActionExecution`, `storyPassage.response` | Game cross-stage join not unified for Support |
| Mechanics | `gameActionReceipt`, `gameRoll`, `gameActivityEvent`, `worldObligationEvent` | No universally complete historical before/after deltas |
| Story/scene | `storyPassage`, `storyDocumentCommit`, canonical `DocumentStore` root | Old full actor/items/holds may be overwritten; hidden sources need classified access |
| Context | `generation.input`, `storyteller_context_capture`, `contextManifest` | Specific candidate/omission/source transforms not all persisted |
| Dispatch | `storytellerDispatchReview.packet/packetSha256`, `storytellerAttempt` | [OBS00](../../../changes/open/2026-11-15--obs00-live-provider-custody/CHANGE.md) default worker wrapper/authority may make reviewed packet ≠ executed request |
| Agent/memory | `storytellerMemoryExploration.snapshot`, pending request/output and tool observations | Not one stage/round source graph; some fields may expire |
| Validation | `generation.output`, `repairCandidate`/diagnostic, model output schema | Not every actual validator reason emitted durably at boundary |
| Publication | `storytellerPublication`, published passage/root and hold | Can be stale/blocked despite output success; history needs actual publication fence decision |
| Cost | `storytellerOperation/Attempt`, funding/allocation/source usage | Unknown vs zero must be preserved; no provider output means not proof of no charge |
| Operational duration | Runtime JSON logs, future OTel spans, outbox/Temporal | Short retention/sampling means partial operational history |

**Do not require the capsule to resolve every stage for a cheap scripted turn.** A valid cheap path may have no provider rounds or memory exploration. The absence must be **source-proven not-run** or visibly unknown.

## 5. The real original context, unfolded for humans

The **Context Explorer** inside the capsule has three layers:

**Layer 1: Composition overview**
- source: game authority, task purpose, profile/personality, player settings, world/rules, scene, actor/clock/receipt, continuity/memory, tool evidence, output schema;
- each section's identity, content hash, version, byte share, inclusion status and omitted reason;
- source graph (captured from / selected / loaded / overridden / pruned / emitted to final provider message);
- if raw body is still retained, show a **Request body available** affordance; never preload private text for S1 Support.

**Layer 2: Historical values and meaningful change**
- what configuration field actually was effective *at admission* vs at actual dispatch;
- what world fact/item holder/narrative note was captured vs what happened after a concurrent change;
- which original rule package/root/profile/source build applied;
- does a later generation differ because prompt text changed, settings changed, selected sources changed, or provider route/recipe changed?

**Layer 3: Restricted forensic body**
- exact validated archived task/input and original serialized provider packet for a given **attempt/round**;
- original source section display with record ID, revision/hash, editor/commit when real, schema, actual content;
- source body and model response loaded **only after** a case/purpose/grant check with durable disclosure audit;
- machine-readable copy/export is **separate** from viewing, approved and expiring; no automatic Cursor AI ingestion of private customer content.

**No “read the model's thoughts.”** The user can view external model outputs, explicit tool calls, tool observations and app-side decision rules. Internal unexposed reasoning does not exist as a capturable source.

## 6. Causal episode is not necessarily contiguous wall time

One accepted action can wait overnight, then settle and publish a scene. The capsule links **multiple actual worker/Temporal attempts** under a single operation/G while preserving their independent timestamps/attempt IDs.

A historical report may describe something at an earlier fictional time but publish now; keep separate `sourceGameSecond` and `publishedCommitSeq`. A player choosing a new action creates a new episode; it does not mutate the historic capsule.

A retry may generate a new provider **attempt** under existing funding/uncertainty rules but never a new game **receipt** for the already earned action. A provisional ENG03 capture promotes the **same G**; no fabricated second generation identity merely to improve the UI.

## 7. Stable identities and lazy assembly

**Capsule ID:** deterministic from `(environment, storyId, anchorKind, anchorId, projectionContractVersion)`, not generated per GET. Source stage IDs come from actual receipt/attempt/capture/event IDs. Do not use SA01's fresh random fixture span IDs as primary keys.

**Read budget policy:** fetch source metadata first (bounded SQL joins, no raw bodies), then lazy expansion of:
1. related G/attempts/receipts;
2. source component manifest;
3. selected historical diff/checkpoint;
4. optional raw protected packet/sections;
5. optional OTel trace link.

Each expanded node has independent permission/retention/size limits and can explicitly return partial or unavailable without invalidating the whole capsule. Pagination and graph depth are bounded; multi-thousand-scene history must not force full transcript reads.

**Cache key:** `viewer/staffPrincipal + accessEpoch + environment + case/purpose + disclosureTier + story + anchor + projectedFrontier + schemaVersion`. An S1-safe capsule must never share a cache entry with S3 raw content. SSE invalidation updates **live** status but doesn't silently rebase a pinned old capsule.

## 8. Query assertions and test scenarios

1. Open one settled finite action: full accepted cause, exact receipt, after-state and later G linked; game clock cannot be overwritten by a new current clock in historical inspector.
2. Open an interrupted action: no fake successful receipt/roll/item transfer; correct cause and hold.
3. Open an activity lasting hours: several real boundary events; no invented completion from projected dueAt.
4. Open a provider-disabled turn: source-proven `provider:not-run`, no fake round/charge; still inspect task/context when captured.
5. Open one repaired provider turn: exact different request/packet per attempt, originally reviewed SHA and actual transport equality where proven; no false “one G == one packet”.
6. Open context missing a memory note: distinguish not-enumerated, selected/loaded/pruned, included/uncited, cited but semantically wrong, and publication refusal.
7. Compare two G with same profile display name but different build/hash: show original source and actual effective settings.
8. Case staffer revokes grant: subsequent S3 packet/section fetch denied; existing S1 metadata remains scoped and safe.
9. Raw packet expired, published passage still retained: story replay works, exact packet body honestly unavailable.
10. Historic report with old fictional source time: display publication chronology separately, never backdate the report into an earlier visible scene.
11. A two-hour Temporal wait crosses different OTel traces: capsule still joins by durable operation/G and marks trace gaps.
12. Legacy pre-instrumentation POC story: show surviving source evidence with explicit `not-recorded` for arbitrary historical mechanical state; no pretend full replay.

## 9. Product decision and execution gate

**Recommended first capsule mode:** **S1 metadata-only causal episode**. It can be prototyped from OBS01 operation coverage and existing source rows, and enriched by OBS02 real stage receipts. **S3 Context Explorer** follows OBS03 provenance capture and separately approved grants. **Complete game-state time travel** waits on OBS04+ broader writer coverage and verified checkpoints. Player published-scene playback may launch before full state replay, under a separate player read contract.

A full `TurnEvidenceCapsuleV1` schema should be finalized **after** one real provider-disabled source-evidence episode has proven which references are stable and which claims the original data can support. Do not generate a giant table or all-purpose API response directly from this design sketch.
