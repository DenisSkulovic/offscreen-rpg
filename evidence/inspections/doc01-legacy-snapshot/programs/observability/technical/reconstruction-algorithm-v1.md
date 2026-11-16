# Historical state reconstruction V1 | Recreate what was recorded, not what might happen

**Status: proposed replay/read model, 2026-11-15. No code, data migration, player UX or provider calls authorized.** Source [transition writer audit](../evidence/mutation-writer-audit-2026-11-15.md), [physical storage](physical-evidence-storage-v1.md), [capture protocol](capture-transaction-protocol.md), [replay product modes](replay-retention-and-privacy.md).

## 1. Explicit temporal dimensions

A forensic “moment” has several independent coordinates:

| Axis | Meaning | Authoritative for |
| --- | --- | --- |
| `storyTransitionSeq` | Monotonic per-story **SQL committed causal sequence** for all *meaningful* internal state transitions, established only after instrumentation | Reconstruct exact mechanical state “after commit #N” |
| `passage.sequence` and `passageId` | Narrative revision/published scene identity | Show which story scene was visible; not every mechanic advanced passage |
| `gameSecond` | Fictional world time | What the character had earned/executed in-world |
| `committedAt` | SQL wall-clock commit observation | Operational ordering display and real incident search; may not be strict cross-node global ordering |
| `providerDispatchedAt/settledAt` | Real external attempt lifecycle | Cost/status, not fictional effects or narrative publication |
| `sourceGameSecond / publishedAt` (historical reports) | An event happened at one fictional point, but its report became visible later | Distinguish retrospective note from a controlling current scene |
| `traceId/spanId` | A sampled/optional short-run performance observation | Latency and service topology, not historical source state |

**The canonical seek key is `(storyId, storyTransitionSeq)` for fully instrumented mechanical replay.** Passing arbitrary wall time through a SQL `created_at <= ?` filter is not reliable enough to reconstruct causality, especially when multiple mutations share a transaction or reports publish late. Use wall time only to *find the nearest committed frontier*, with explicit ambiguity/freshness.

**Time boundaries:** when a long activity runs, game time may advance due to eligible work while the latest published passage remains unchanged. A replay must show “2 of 3 units earned, work not yet finished” if that is what committed at that frontier. It cannot jump to a later receipt just because its fictional time appears close.

## 2. Reconstructable snapshot: one strict data contract

Proposed `StoryReplayCheckpointV1` stores the **typed original game state data** essential to validation, independent of any current browser display schema. Reuse active game/contracts Zod schemas and explicit version references; do not build a generalized scripting engine.

~~~ts
type StoryReplayCheckpointV1 = Readonly<{
  version: 1;
  storyId: UUID;
  throughTransitionSeq: bigintAsDecimalString;
  sourceNarrativeRevision: number;
  sourcePassageId: UUID;
  storyMetadata: {
    storySource: string;
    premiseArtifact: ArtifactRef | null;
    activeSceneScope: ActiveSceneAnchor | null;
    documentRoot: { hash: SHA256 | null; revision: number };
    storytellerProfileRef: { id: string; revision: number; hash: SHA256 } | null;
    executionPolicyRef: ArtifactRef | null;
    usagePolicyRef: ArtifactRef | null;
  };
  campaign: {
    exists: boolean;
    settingsRevision: number | null;
    character: Character | null;
    storyFacts: StoryFacts;
    itemHolders: StoryItems;
    gameSecond: number | null;
    clock: CampaignClock | null;
    clockPace: Pace | null;
    holds: CampaignHolds;
    offer: Offer | null;
    situationAuthorization: SituationAuthorization | null;
    acceptedPlan: AcceptedActivityPlan | null;
    activeActivityId: UUID | null;
    activeActionOperationId: UUID | null;
    activityOccurrences: ActivityOccurrences;
    worldConditions: WorldConditions;
  };
  referencedActivityStates: readonly {
    activityId: UUID; plan: ResolvedActivityPlan; revision: number;
    state: string; boundariesSettled: number; progress: ActivityProgress;
  }[];
  referencedWorldObligations: readonly {
    obligationId: UUID; revision: number; dueGameSecond: number;
    state: 'pending' | 'fired' | 'cancelled' | string;
    definitionRef: ArtifactRef | null;
  }[];
  completeThrough: boolean;
  schemaRefs: readonly string[];      // exact archive codecs and rule versions
  digest: SHA256;                    // hash of canonical replay state payload
}>;
~~~

**Type names are conceptual bindings to source-validated codecs.** Existing real `campaign` includes `content/location/clockAnchorAt` and other fields; the final strict schema must include any such field **if it can influence a future deterministic decision or historical display**. The sketch is not a complete executable replacement for `campaignStateFileSchema`. A source audit must prove the final field set, avoid quietly dropping optional reference identity and validate any unsafe legacy JSON before marking completeness.

**Partial data never silently becomes a valid checkpoint**. If activity state/source root/actor facts are unknown, the checkpoint must say `completeThrough=false` with field-level missing coverage, and cannot be used as the base for an “exact” deterministic state seek.

## 3. Pure replay applicator, not mutating the production game

Expected reader algorithm:

~~~text
readHistoricalState(storyId, targetTransitionSeq, viewerPurpose)
  1. Authorize viewer/staff grant for story, purpose and field projection.
  2. Verify target belongs to a real committed story transition and
     target >= earliestCompleteInstrumentedFrontier.
  3. Find newest VERIFIED checkpoint with throughSeq <= target;
     reject mismatched schema, owner, code/codec or source checksum.
  4. Fetch ordered transitions in (checkpoint.seq, target.seq],
     with all ordinal-within-commit items, under a bounded snapshot read.
  5. For each:
       assert one correct next sequence (or recorded explicit gap),
       validate typed delta schema/version and all immutable source refs,
       assert prior state digest,
       apply REPLAY-ONLY pure data transformation,
       assert after state digest and game/narrative/root invariants.
  6. Project replay state to authorized viewer perspective and
     source-linked public narrative history.
  7. Return {state,asOf,coverage,sourceRefs,integrityChecks,unavailable}.
  8. NO game writes, NO Storyteller call, NO RNG draw, NO Time advance,
     NO generation/admission side effect, NO Temporal signal, NO outbox.
~~~

**Important distinction:** the replay applicator reuses **the original changed-value data representation and validation**, but not necessarily the original business *command functions*. A normal game command may call `randomInt`, obtain new time, check current holds or contact CAS. Playback must apply recorded results without redeciding the world. This is not a second mechanics engine; it is a strict, deterministic state projector with validated typed change events. If it becomes a generic JavaScript JSON Patch interpreter, reject the design.

**Hydration from historical documents:** a checkpoint can reference immutable canonical root hashes, but the replay operation must verify exact retained root/object existence and ownership and decide whether the reference is required for the chosen mode. Player published-scene playback might not need private world-manifest bodies; forensic full-state reconstruction does. A missing root must be an explicit gap, not a reason to read `story.documentRootHash` today.

## 4. Multiple changes inside one commit

A `settleActivity` transaction can process several checks and update final campaign state once. The replay model should represent:

~~~text
Committed transition #42: activity boundary batch (atomic)
   42.0  Check segment 4, roll X, effect Y, gameSecond 600
   42.1  Check segment 5, roll Z, effect W, gameSecond 750
   42.2  Completion effect, earned reward, gameSecond 900
   42.3  Accepted successor blocked, hold transferred
   42.4  Final committed state hash = H
~~~

The subevent order is **illustrative**. It must come from the real rule loop and persisted source event/roll IDs, not a generated explanation.

**Atomicity:** all child subevents happened in one SQL transaction, and no other story writer could observe the intermediate half-committed state. They are useful for **within-commit explanation**, but the historical state at `42.1` is a **conceptual intermediate calculation** unless the engine explicitly recorded it. Do not describe that intermediate as a published external state. The only authoritative public commit frontier for that transaction is **after #42**, with its final digest. Developer UI may inspect intermediate computation steps but must label them “within one atomic transition”.

## 5. Example of why one timeline is insufficient

Imagine:

| Committed sequence | Narrative revision | GameSecond | Recorded event | What replay may claim |
| --- | --- | --- | --- | --- |
| 18 | 6 | 120 | Accepted a 30-minute repair | It started; completion not earned |
| 19 | 6 | 720 | Earned 2/5 units in one check boundary | Work progressed, same scene still published |
| 20 | 6 | 900 | A required tool changed holder; action interrupted | No success receipt or finished repair |
| 21 | 7 | 900 | A new controlling scene published | Player now has a different decision |
| 22 | 7 | 900 | Historical report about event at GameSecond 720 published | Report became visible **now**, describing earlier time |

These values are a **fictional design fixture**, not measured project data. If the UI sorts by `gameSecond` only, the report may appear to exist before its actual publication. If the UI sorts by passage revision only, it misses the repair progress/interruption before the scene changed. Therefore the UI needs both **committed sequence** and **fictional timeline** as distinct, switchable axes.

## 6. Three output types, separate coverage

### A. Player scene playback (may launch before full replay ledger)

~~~ts
type StoryPlaybackWindowV1 = {
  storyId: UUID;
  perspective: AuthorizedViewerRef;
  fromPassageId: UUID | null;
  toPassageId: UUID | null;
  frames: Array<{
    passageId: UUID;
    passageSequence: number;
    content: PublishedPassageContent;
    recordedPlayerResponse: PublicResponseOrNull;
    playerKnownCommittedEvents: PublicEvent[];
    sourcePublishedAt: ISODateTime | null;
    eventCoverage: 'complete' | 'since-enabled' | 'partial';
  }>;
  nextCursor: string | null;
  unavailable: MissingEvidence[];
}
~~~

This can be genuinely useful without capturing every historical private setting. It must not show old offers as actionable controls or expose a hidden outcome. A button labelled “Replay” in the player UI must never internally call a command endpoint.

### B. Developer historic mechanical state

~~~ts
type HistoricalStoryStateV1 = {
  storyId: UUID;
  transitionSeq: bigintAsDecimalString;
  sourcePassageId: UUID | null;
  gameSecond: number | null;
  state: AuthorizedTypedReplayProjection | null;
  beforeAfter: AuthorizedFieldDiff[];
  sourceRefs: SourceRef[];
  coverage: 'complete' | 'partial' | 'not-recorded' | 'expired' | 'unavailable';
  missing: MissingEvidence[];
  integrityVerified: boolean;
}
~~~

The developer cannot request secret narrative/body fields without a separate sensitive-content capability. Staff identity/current grant is evaluated on every historical read. `integrityVerified` cannot be true if any required hash or source is missing. A display can still show proven source fragments with partial coverage.

### C. Chamber deterministic verification bundle

This contains exact original input, pre-state, rule/codec/build version, **recorded** RNG samples, external fixed observations, game-time fractions and expected recorded output. It is explicitly a test artifact; no production mutation, data secrecy bypass or provider call. If old code/build is not available, label comparison as `new-engine-regression`, not full historical code reproduction.

## 7. Integrity and anti-corruption contracts

- **No source alias drift.** The old passage/root/setting/profile source is pinned; current `story` values never substitute for missing old source.
- **No missing sequence inference.** An unexpected gap in a declared complete range fails exact replay; optional telemetry omission does not.
- **No raw output mistaken for effect.** Only committed game/receipt state changes count.
- **No direct model retry.** Historical read cannot create new G, `storyResolution`, provider spend, outbox or admission.
- **No fake deterministic AI.** A saved Storyteller output can be displayed exactly, but a new provider run is not guaranteed equal and is a separate operation.
- **No use of wall-clock now for old game.** Playback clock derives from recorded state/elapsed time, not server `Date.now()`.
- **No unearned work.** Entry/exit state of each accepted activity must show what was actually earned vs pending, and correct holds.
- **No invented checkpoint.** A checkpoint created by reading today's campaign cannot be labelled “state at transition 12” unless all intermediate source data is proven to reconstruct it.
- **No cross-story hash authorization.** An archived CAS hash/packet key is not sufficient; verify viewer/tenant ownership and effective disclosure purpose.
- **No silent deletion.** A raw prompt body expiring does not erase the existence of a committed event where minimal lawful metadata survives; player playback remains valid if its own published story bytes are retained.

## 8. Performance and retrieval economics

**Seek should be indexed and bounded:**
1. find nearest checkpoint via `(storyId,transitionSeq DESC)`;
2. scan at most the configured maximum transitions (initial design experiment 25) after checkpoint;
3. resolve only necessary source refs and source bodies for the requested view;
4. cache reconstructed *authorized projection* by viewer/grant epoch/story/frontier/coverage, never globally by story alone;
5. return a stable cursor for long histories and stream/paginate meaningful scene cards.

Test 20/200/2,000-scene stories with source gaps and retained raw model packet expiry. Report p50/p95 seek latency, SQL query count, document fetch count, bytes returned, checkpoint size, stored delta bytes and permission-related cache misses. An arbitrary `SELECT *` for every historic event is not an acceptable implementation.

**Checkpoint cadence** is tuned from actual state-delta/read cost. At 25 transitions a checkpoint may be wasteful for a tiny one-off story; at 2,000 scenes without checkpoints full replay can be expensive. Measure before selecting persistent frequency.

## 9. Acceptance ladder

1. **Provider-free source proof:** take a known schema-complete genesis, replay 20 meaningful transitions in order, compare digest with authoritative final state.
2. **Complex activity:** one transaction with >1 roll/earnings and one interruption; subevent provenance is accurate and game commit remains indivisible.
3. **Stale publication:** G succeeds but publication refused; no replayable new passage/effect from candidate output.
4. **Late historical report:** sourceGameSecond precedes current scene, but report's visible chronology follows actual publication commit.
5. **Old legacy story:** no new transition ledger before enable frontier; return `not-recorded` for exact state and permit partial published-scene playback.
6. **Raw prompt expiry:** old published story remains replayable while private packet inspector returns `expired`, without illicit fallback to old generation JSONB.
7. **Permission boundary:** participant B cannot seek into another participant’s private state in future shared story; current solo owner tests must not be misrepresented as multiplayer coverage.
8. **GET purity:** replay makes no command, no RNG draw, no clock or new G; assert no new outbox/attempt/receipt rows and no provider HTTP.
9. **Integrity corrupt/unknown codec:** fail exact-state mode with typed gap, do not silently replay data through current incompatible reducer.
10. **Fork limits:** existing `forkCurrent` supports only an initial safe source; don't offer “fork at any scene” until fork-from-replay state/identity/remapping receives its own design and proof.

**Ready gate:** a validated, source-complete versioned transition data contract, successful checkpoint+delta negative tests and selected owner permission. Not implementation-ready from this Markdown alone.
