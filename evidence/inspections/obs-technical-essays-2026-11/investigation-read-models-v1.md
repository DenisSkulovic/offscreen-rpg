# Investigation read models | One causal truth, humane Support and Developer views

**Status: proposed technical V1 contract, design wave 4, 2026-11-15. No application code, API, new grants or UI authorized.** Sources: [product journeys](../product-vision.md), [Admin investigation product](../admin-investigation-experience.md), [Admin selected privacy target](../../admin/technical/read-models-and-privacy.md), [evidence graph](evidence-model.md), [temporal coverage](temporal-frontiers-and-coverage-v1.md), [forensic access](forensic-access-and-read-contract-v1.md). Source inspected on `main@7e15db38`: `application/admin/diagnostics-reads.ts`, `apps/api/src/modules/admin/controller.ts`, `contracts/src/admin.ts`, `apps/web/src/features/admin/{admin-query-keys,admin-query-provider,player-lookup}.tsx/ts`.

## 1. The current situation and the missing experience

Existing AD05 already supports safe player/campaign/operation status, with closed grant scopes and a functioning Admin React/TanStack Query foundation:
- `adminQueryKeys` keys by staff principal + access epoch; `AdminQueryProvider` clears caches on exit/revocation; preserve that.
- `AdminController` checks `assertLegacyCampaignVisible` and `ai.operation.read` for campaign operation listings/details, returning safe redacted DTOs; preserve these guards.
- `AdminPlayerLookup` queries current Player Summary → campaigns → operation list/detail; a useful base but not a forensic explorer.
- `listCampaignOperations` starts from `storytellerAttempt`, omitting capture/held G that never attempted a provider send; [OBS01](../../../../work/changes/archive/2026-11/observability/2026-11-15--obs01-operation-coverage/CHANGE.md) fixes the first discovery gap.

**What is missing:** a bounded, time-pinned, source-rich **causal view** of an incident, a complete historical game transition view, exact prompt source component provenance and an administrative narrative projection that can safely be used by different roles without reading the same unrestricted raw JSON.

## 2. Five separate read projections, one underlying source graph

### R1. Support Campaign Situation V1 (S1 by default)

One screen answers “What is happening to this campaign now?” with minimal technical sophistication:

~~~ts
type SupportCampaignSituationV1 = {
  version: 1;
  campaignRef: { storyId: UUID; playerScope: SafeScopedRef };
  asOf: { viewVersion: number; narrativeRevision: number;
          observedAt: ISOTime; sourceFreshness: 'fresh'|'stale'|'unavailable' };
  current: {
    passageId: UUID | null;
    gameSecond: number | null;
    state: 'decision-awaiting'|'action-running'|'activity-running'
       |'narration-preparing'|'narration-running'|'publication-blocked'
       |'paused'|'inactive'|'unknown';
    currentCommitment?: SafeCommitmentSummary;
    holds: SafeHoldReasonCode[];
  };
  recentCause: {
    operationId: UUID | null;
    sourceKind: SafeSourceKind | null;
    result: 'admitted'|'settled'|'interrupted'|'waiting'
            |'held'|'failed'|'unknown';
    factualEffects: SafeCommittedEffectSummary | null;
  };
  storyteller: {
    generationId: UUID | null;
    stage: SafeStageCode | null;
    attemptRecorded: boolean | null;
    publication: 'not-started'|'pending'|'published'
                |'blocked'|'stale'|'unknown';
    safeProblem: SafeProblemCode | null;
    providerCharge: 'none-proven'|'settled'|'uncertain'|'not-evaluated';
  };
  evidence: EvidenceCoverageV1;
  availableNextActions: SafeOperatorActionHint[];
};
~~~

All **strings above are *closed enums***; `SafeCommittedEffectSummary` comes from original receipts and only includes permitted player-known facts, not invented descriptions. `providerCharge:'none-proven'` is allowed **only when source records prove no provider dispatch**, not when attempt join happens to be missing. An empty join produces `not-evaluated/unknown`. No stack trace, full prompt, DM plan or model output by default.

**Guided human answer:** “The character’s attempt was accepted and the item transfer was interrupted. The original receipt proves no successful transfer. New narration is still preparing.” Every clause links to an actual source event and status if user opens “Why?”. If a necessary source record is missing, say “Can't determine from recorded evidence” instead of a confident invented explanation.

### R2. Evidence Timeline Page V1 (S1 or restricted source mode)

~~~ts
type EvidenceTimelinePageV1 = {
  version: 1;
  storyId: UUID;
  asOf: { frozenAtTransitionSeq: DecimalString | null; observedAt: ISOTime };
  axis: 'commit'|'fictional'|'wall';
  groups: Array<{
    groupId: UUID;
    kind: 'game-commit'|'ai-operation'|'admin-audit'|'visitor';
    storyTransitionSeq: DecimalString | null;
    sourceGameSecond: number | null;
    recordedWallTime: ISOTime | null;
    causedBy: readonly TypedRef[];
    items: Array<{
      id: UUID; type: SafeStageOrEventKind; result: SafeOutcomeCode;
      sourceRef: TypedRef; parentRef: TypedRef | null;
      summary: string;                 // generated by deterministic safe template
      completeness: EvidenceCoverageV1;
    }>;
  }>;
  nextCursor: OpaqueCursor | null;
  totalKnown?: number;
};
~~~

**Grouping:** the same `settleActivity` SQL commit has one outer group and ordered internal check/effect source steps. An AI G can have many worker/round stage events with separate wall timestamps; it links to game commits via actual cause/published source refs, not by interleaving fake game event numbers. Do not generate an event row for every idle scheduler tick.

**Filtering:** meaningful only / mechanical internals / AI and worker / source changes / errors / provider spending / publication / staff audit **subject to independent grants**. A Support-safe filter must never expose hidden content via counts or labels. `asOf` chooses a stable source frontier; SSE may show a “new events available” indicator, never silently rebase the page while engineer inspects older source.

### R3. Engineering Generation CausalGraph V1 (safe metadata first)

~~~ts
type GenerationCausalGraphV1 = {
  version: 1;
  generationId: UUID;
  storyId: UUID | null;   // actual linked source, never guessed from owner
  taskPurpose: SafeTaskPurpose;
  source: { passageId: UUID | null; revision: number | null;
            operationId: UUID | null; captureId: UUID | null };
  currentStatus: { generation: GenerationState; publication: PublicationState;
                   funding: SafeFundingState; settledChargeMicrousd: string | null };
  nodes: Array<{
    evidenceId: UUID; kind: StageKind;
    state: StageOutcome; sourceRef: TypedRef; sourceRevision: string | null;
    startedAt: ISOTime | null; endedAt: ISOTime | null;
    durationMs: number | null; traceId: string | null;
    failureClass: SafeFailureClass | null;
    coverage: EvidenceCoverageV1;
  }>;
  edges: Array<{ from: UUID; to: UUID;
                 relation: 'causes'|'freezes'|'attempts'
                         |'validates'|'refuses'|'publishes'|'supersedes' }>;
  knownGaps: Array<{expectedStage: StageKind; reason: CoverageReasonCode}>;
};
~~~

**No synthetic historical trace:** nodes are read from source rows and actual recorded stage receipts, not guessed from their possible order. If a task never had a provider attempt, show `provider:not-run` only when task execution mode and source status prove it; otherwise show `not-recorded/unknown`. One G may have several attempt/round IDs; distinct and linked, not blindly deduplicated on request hash.

**Relationship to OTel:** a native node may link to a sampled `traceId` and Grafana span. Absence of OTel spans does not remove a committed business node. Always display operation/attempt/packet status independently from infrastructure traces.

### R4. Prompt Assembly Manifest V1 (restricted metadata)

~~~ts
type PromptAssemblyManifestV1 = {
  version: 1; generationId: UUID; attemptId: UUID | null; roundId: string | null;
  sourceTaskRef: TypedRef;
  sourceProfileRef: {id:string;revision:number;contentHash:SHA256;origin:'code'|'preset'};
  capturedSettingsRevision: number | null;
  compilerBuildId: string;
  preparedTaskSha256: SHA256 | null;
  preparedPacketSha256: SHA256 | null;
  transportPacketSha256: SHA256 | null;
  exactTransportMatch: 'verified'|'mismatch'|'not-checked';
  components: Array<{
    key: string; origin: TypedRef; originRevision: string;
    contentSha256: SHA256; decision: 'used'|'overridden'|'omitted'|'not-evaluated';
    finalMessageIndex: number|null; finalJsonPointer: string|null;
    sizeBytes: number|null; reason: SafeReasonCode|null;
  }>;
  sourceDecisions: SourceSelectionDecisionV1[];
  coverage: EvidenceCoverageV1;
  protectedContent: { available: boolean; contentAccessRequestRequired: true };
};
~~~

**Key usability feature:** sorted by *user-visible conceptual purpose*, not opaque source table name: “Game authority”, “Storyteller personality”, “Current scene”, “Continuity memory”, “World/rules”, “Tool evidence”, “Output schema”. Each component can expand to origin, version, actor/editor if actually known, and exact final request field pointer. Compare G1/G2 to see changed source/omission, not just long text diff.

**No raw body in this metadata response.** S3 raw packet/body read is **a separate audited endpoint** after purpose/grant review. The existing `ai.operation.read` does not become permission to request a confidential model prompt simply because the component name is visible.

### R5. Historical State / Player Replay, two independent readers

- **Engineering `HistoricalStateAtV1`**: selected complete transition sequence, verified checkpoint/delta (where instrumented), before/after fields, root and actor/hold/time, explicit gaps, independent private field permissions.
- **Player `StoryPlaybackWindowV1`**: original published passage and chosen response, source-backed player-visible effects, scene sequence/perspective and honest coverage. No game command/GM06 visit ACK, RNG or provider call.

Do **not** share an Admin response body containing private fields with the player page even if the UI component is shared. Player experience has a separate source-authenticated projection and API.

## 3. Explicit causal “Why?” explanations without model hallucination

Build **typed explanation templates** from source provenance:

| Source evidence pattern | Deterministic explanation |
| --- | --- |
| `gameActionExecution.state='interrupted'` + matching event/cause + no `gameActionReceipt` | “The accepted action was interrupted; no successful completion was recorded.” |
| `storyteller_context_capture.state='held'` and G provisional | “The next scene could not be prepared. No model attempt is recorded for this provisional capture.” |
| `generation.succeeded` + `storytellerPublication.stale` | “Storyteller produced an output, but it could not publish against the required source.” |
| `storytellerAttempt.state='uncertain'` | “A request may have reached the provider. Final cost is not yet confirmed.” |
| `storyPassage.sourceGenerationId=G` + publication `published` | “This generation produced the published scene.” |
| `sourceSelection:loaded-then-pruned` + final packet proof | “This source was loaded but excluded from the request due to a recorded context limit.” |
| Only an expired private packet remains as hash/metadata | “The original request body is no longer retained under this policy.” |

**Inferences** (“Likely a stale cache”, “The model didn't pay attention”) can be shown as analyst notes only if clearly labelled inference, with alternative explanations. Never issue a synthesized reason that contradicts recorded source. Real LLM-generated support explanations, if added later, must cite verified typed facts and be separately evaluated/authorized; no model call in ordinary S1 read by default.

## 4. Query ownership and what remains on server

Build a single **Forensic Read Application** composition layer over existing source stores:
- `StorySnapshot`/`campaign/reads`: current authoritative status;
- game receipts/event/roll/obligation/campaign settings/root rows: actual mechanics;
- `generation`, `storytellerContextCapture`, `storytellerAttempt`, `storytellerDispatchReview`, `storytellerMemoryExploration`, `storytellerPublication`: actual AI status/cost/context source;
- new evidence-stage and game-transition rows only **where they add missing history**, not whole-data duplication;
- existing Admin session/grant/case/audit as access owners;
- protected artifact retrieval only on authorized deep drilldown.

**Read algorithm:** authorize staff/persona and scope → choose as-of/coverage → bounded SQL query on indexed source IDs → construct verified source graph and one small DTO → return strict allowlisted projection. Large CAS blobs are **never** loaded for an ordinary Support list. If a user expands a protected panel, the server performs **new** permission/case/retention checks, audits disclosure then retrieves the exact artifact, limited by bytes and schema.

**Pagination and performance:** initial S1 summary aims for a small fixed number of queries, not an N+1 attempt lookup for each campaign. Event timeline cursor uses `storyId + lastExclusiveCommitSeq + filter/projection version + grant scope`. Generation timeline cursor uses stable `(updatedAt,generationId)` tie-break where source permits; no time-only cursors dropping equal-timestamp G. Graph depth and page size bound references and access; no arbitrary SQL JSON query UI.

## 5. React/Next implementation constraints from current Admin source

- Preserve `AdminQueryProvider` separate cache, `staffPrincipalId + accessEpoch` prefix and exit/revocation flush. **Extend** query key with case/purpose + story/G + disclosure tier + as-of sequence + filter version.
- Avoid SSR/prefetch of raw S3 content. A hidden “Prompt” tab must not contain raw model packets in HTML or React hydration. Load on explicit panel activation after independent server approval.
- UI historical view state is **pinned** by selected source frontier/graph revision; TanStack Query/SSE may invalidate live status but cannot silently replace a chart the engineer is studying.
- Cross-filter state (selected passage/G/source/effect) belongs in URL/local UI state as typed IDs, not a mutable copy of canonical story. URL must not contain raw prompt, auth token, private source text or signed artifact URL.
- For very large timelines and graphs, fetch small windows/expand bounded nodes, virtualize rendering and show source-limited aggregation; no eager 1000-packet responses.
- Staff grants are **not UI-only feature flags**. Controller enforces exact capability/subject/env/case; hidden navigation is not security.
- Accessibility: every graph/timeline node has text label, status and source, keyboard navigation; a plain chronological table can be an alternate accessible view rather than relying entirely on a canvas.

## 6. Prototype with existing data before new schema

A **source-only** S1 status prototype is feasible with AD05 and OBS01 source union. This is the correct first UI proof. Later an engineering graph prototype can use actual G/attempt/packet/source references plus OBS02 stage receipts. Do not build a polished graph on mock data and label it “customer-ready”.

**First six source fixtures for read-model validation:**
1. No attempt, captured G held: visible safe cause and no raw data.
2. Ordinary successful provider-disabled G published: source-linked one passage.
3. Activity earned 2/5 progress, narrative pending: no invented final payout.
4. Model output succeeded but publication stale: no new public scene.
5. Source note eligible/loaded/pruned with provenance: component tree proves exclusion, not generic “memory missing”.
6. Raw packet expired and case grant revoked: metadata coverage safe, protected body denied.

## 7. Failure and security proof gates

| Failure | Required read behavior |
| --- | --- |
| CAS unavailable | Return safe partial source graph + precise content-unavailable coverage, never empty “no action” |
| OTel/Tempo unavailable | Business event chronology still works, traces marked unavailable |
| Legacy POC no state sequence | Published-scene history may work; arbitrary historic actor state marked not-instrumented |
| Unknown source schema | Metadata source/hash retained where lawful, raw body denied/unavailable rather than guessed |
| Cross-story reused G/owner | Scoped query rejects links, no unauthorized count/existence leak |
| Deleted/expired artifact | Metadata says expired/deleted under policy; no raw SQL fallback leaking it |
| Same actor old Admin session after revoke | All new S2/S3 reads fail, cache cleared, SSE/private transport closed |
| Multiple G at same timestamp | Stable cursor shows all with source identity, no silent skips |
| Attempt with unknown charge | `uncertain`/unknown, never €0 as default |
| Replay old narrative | Zero game/time/visit-ACK/provider mutation |
| Prompt injection inside archived content | Render as inert escaped data, never source instructions for coding assistant |

**Gate before code:** source identities, existing Admin staff permissions and early OBS00/OBS01/OBS02/OBS03 status rechecked on current main; owner accepts one specific read projection and S1 vs S3 access model; provider-disabled proof. Do not introduce blanket “developer can query any table” endpoints.
