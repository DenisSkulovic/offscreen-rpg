# Temporal frontiers and coverage semantics | Don't confuse present, projected, published and remembered

**Status:** wave-3 technical/projection contract, 2026-11-15. No code or gameplay change authorized. Sources: [writer map](../evidence/mutation-writer-audit-2026-11-15.md), [reconstruction algorithm](reconstruction-algorithm-v1.md), [support/developer experience](../admin-investigation-experience.md), [GM05 source event feed](../../experience/patterns/committed-event-feed.md). Inspected `campaign/reads.ts`, `campaign/clock.ts`, `stories/reads.ts`, `stories/visit-checkpoint.ts` against GitHub main `7e15db38`.

## 1. Four very different statements

An operator clicking “What was true at this moment?” must know which truth was requested:

| View | Meaning | Actual source | What cannot be claimed |
| --- | --- | --- | --- |
| **Committed state at frontier N** | Data after a completed authoritative SQL story transition; receipt/effects/time actually recorded | `campaign`/`story`/`story_item` at current instant, or historic checkpoint+deltas when instrumented | That a future due action has already earned its outcome |
| **Projected near-future status** | Estimate based on current clock pace, anchor and valid activity; may be revised by pause/hold | `campaign/reads.ts::projectActivity` dueAt/estimatedCompletionAt and action execution projections | An immutable historic fact/finished work |
| **Published narrative/perspective** | What the player could actually see after a passage/report was published | `story_passage`, GM05 player events, source publication/visibility | That every internal mechanic and private model thought was visible |
| **AI working candidate** | Frozen task/context, provider packet, partial output, possible pending consequence before settlement | `generation.input`, `storyteller_context_capture`, `storyteller_attempt` | That the story occurred or output was accepted/published |

**Current source fact:** `campaign/reads.ts` projects `dueAt` and estimated completion from `state.clockAnchorAt` and deterministic rule functions, but returns `gameSecond: state.gameSecond` as the **committed frontier**. Storyteller pending generation can exist before the mechanic settles. The workbench must not conflate these.

## 2. One explicit selector for historic game state

Define an exact source address, not arbitrary “time travel to 17:30”:

~~~ts
type StoryAsOfV1 =
  | { kind: 'commit-frontier'; storyId: UUID; transitionSeq: decimalString }
  | { kind: 'published-passage'; storyId: UUID; passageId: UUID }
  | { kind: 'game-event'; storyId: UUID; sourceKind: EventKind; eventId: UUID }
  | { kind: 'generation'; storyId: UUID; generationId: UUID; stage: StageKey };
~~~

Resolver returns all available coordinates:

~~~ts
type ResolvedStoryMomentV1 = Readonly<{
  storyId: UUID;
  asOf: StoryAsOfV1;
  committedTransitionSeq: decimalString | null;
  publishedPassageId: UUID | null;
  narrativeRevision: number | null;
  gameSecond: number | null;
  sourceGameSecond: number | null; // e.g. a historical report's older event
  committedObservedAt: ISOTime | null;
  evidenceWindow: { start: decimalString | null; end: decimalString | null };
  perspective: 'player-visible' | 'mechanical-private' | 'candidate';
  coverage: EvidenceCoverageV1;
}>;
~~~

**No approximate-inference masquerade:** if choosing an old passage with no instrumented mechanical transition mapping, show that passage's source and best historically provable status, **not** an invented exact old character inventory. A report published today about an event yesterday has **sourceGameSecond yesterday** and **publication/commit today**, both shown.

## 3. Coverage is multi-dimensional, not a green badge

Recommend typed coverage with **presence, custody, visibility, temporal completeness, and integrity** separate:

~~~ts
type EvidenceCoverageV1 = {
  source: 'recorded' | 'not-instrumented' | 'not-applicable' | 'unverified';
  custody: 'available' | 'expired' | 'deleted' | 'corrupt' | 'unavailable' | 'not-recorded';
  disclosure: 'authorized' | 'redacted' | 'denied' | 'not-evaluated';
  ordering: 'complete-prefix' | 'known-gap' | 'not-ordered';
  integrity: 'verified' | 'not-checked' | 'failed';
  lastCommittedFrontier: decimalString | null;
  instrumentedFrom: decimalString | null;
  reasons: readonly CoverageReasonCode[];
};
~~~

A source can be *recorded* but *expired*, or *available* but *unauthorized*, or *present* with *unknown chronological placement*. These are different causes and need different UI/recovery paths. **Do not return a public “denied private file exists” signal**: disclosure tiers should collapse protected existence where needed to preserve no-enumeration policy.

Examples:
- A valid game event has source recorded and integrity verified, but the associated OTel span was sampled out. Game evidence **complete**, operational trace **not recorded**. No “event didn't happen.”
- One raw model packet expired after policy window; source `attemptId`/packet SHA remains as lawful metadata. AI **body unavailable**, but published scene still playable.
- An old 2026 POC campaign was created before the transition sequencer. `instrumentedFrom` is later than story genesis. Exact old state is **not-instrumented**, not “empty game history.”
- A source memory record was selected but never included in actual provider packet. The source decision is **recorded**, but model-visible content is **not-applicable/omitted**; don't claim model saw it.

**No single `coverage='complete'` on an Admin page** unless clearly qualified by requested dimension. A scene can have perfect player playback and partial engineering prompt provenance.

## 4. Referential and chronological consistency

**Authoritative per-story sequence:** allocate under the existing story writer transaction, exactly one outer transition per meaningful commit, then attach ordered subevents within it. No global clock/counter and no `MAX(story_public_event.event_sequence)` surrogate. Story revisions, view versions, settings revisions, activity ordinals and world obligation event ordinals live in different namespaces and are joined through typed source IDs.

**Repeatable read:** a forensic query that assembles snapshot+frontier+event window must operate against a consistent DB snapshot or an explicit pinned source frontier; otherwise a new event can commit between checkpoint read and event scan and produce an impossible mixed state. Long blob reads may occur outside the transaction **only after** pinned immutable refs and hashes have been captured; revalidate subject/permission and CAS bytes before release. Don't hold a long DB transaction while rendering a large graph.

**Commit time:** `createdAt` timestamps may be assigned before transaction commit; do not assert that sorting across services by `createdAt` is perfect causal order. Use per-story committed sequence and within-commit order for game history; use actual timestamps with uncertainty for operational dashboards. Two unrelated stories have no single total ordering contract.

**Source transition history:** an older story may have `story_document_commit.root_revision` and immutable manifest chain but no mechanical sequence; this means canon is versioned, not actor state fully reconstructible. No automatic expansion of prior coverage from the mere existence of a manifest.

## 5. Read purity and view side effects

A player opening the **live story** may trigger legitimate product read metadata operations (the GM06 visit challenge route writes a short-lived `story_viewer_visit_open` row even though it is a GET). The **historic Replay API** must be a separate **read-only** code path:
- it must not issue a visit token or ACK; replaying an older scene must not hide genuinely new developments on the live story;
- it must not start/resume/pause a timer, request Storyteller regeneration, call workflow signals, add a generation, update `viewVersion` or create a game receipt;
- it must not prefetch currently actionable offers as if the archived scene were live;
- exceptions: legitimate staff **sensitive-evidence access audit** may write a narrowly scoped access record. That audit is outside game authority and must be disclosed separately from the replay's “no game mutation” guarantee.

**Test:** take row counts/frontiers before and after the same replay GET 100 times; game state and visit ACK remain equal, and provider attempts/outbox count unchanged. Staff audit count may increase only for appropriately protected disclosure.

## 6. Live vs pinned historical investigation

**Live Support Now**:
- current owner/participant scope and latest revision;
- committed authoritative game/hold/attempt state and explicit observed timestamp;
- estimates such as activity `dueAt` labelled **estimate**, not guarantee;
- fresh/query staleness and relevant incident/case context;
- safe action explanation with source IDs.

**Pinned Developer View**:
- selecting G or moment N freezes a display snapshot and source evidence hashes;
- background SSE may show a banner (“Current game moved to revision R+1”), not silently mutate the old investigation;
- clicking “go live” intentionally changes the as-of selector;
- sensitive raw packet panel fetched only after explicit grant each time, never part of background snapshot prefetch.

**Historic Player Replay**:
- show published narrative and recorded chosen action only;
- show earned effects only when the authoritative receipt actually committed;
- scrub hidden DM plans/pending source even if the player later learned some related content;
- current UI renderer may visually differ from old release, so promise **semantic replay**, not pixel-identical old CSS unless renderer assets/build archived.

## 7. Query and cursor contracts

- For timeline pagination, cursor = signed/opaque tuple of `storyId, lastExclusiveTransitionSeq, filterSetVersion, projectionVersion, permission/visibility scope`, not timestamp alone. Server validates on every page; no cross-story leakage.
- Reconstruct page data from typed source-event references with immutable source hash/known codec. Do not issue N+1 SQL queries or fetch 20 raw packets for a basic 20-item Support summary.
- For as-of state `N`, load verified checkpoint <=N + all required transitions through N, with integrity and source visibility check. Reject/skips must be explicit in coverage.
- For published history playback, a simpler passage-sequence cursor works and needn't wait on mechanical history ledger. Call it **published-scene playback**.
- For source graph expansion, use bounded depth, allowed edge types, stable IDs and server-authorized field selection. Graph cycles should be forbidden or annotated; no universal nested `SELECT *`.

## 8. Reconciliation tests

| Fixture | Incorrect answer to prevent | Correct grounded answer |
| --- | --- | --- |
| 30-minute activity accepted but completion still pending | “30 minutes passed, you earned reward” | “Committed: started at game second X; completion not yet recorded; projected due is Y” |
| Multiple checks within one SQL transaction | “The world publicly entered intermediate state 42.1” | “One atomic commit at #42; internal computation steps in order” |
| Historical report publishes late | Report shown as a scene published in the past | Earlier source fiction time + later real publication frontier |
| Pending G ready before action settled | “Storyteller awarded effects” | “Private candidate existed; no committed receipt yet” |
| GM05 public event omitted a private hold transfer | “Hold never existed” | Public feed not exhaustive; private evidence source may show hold under authorization |
| OTel collector down | “The player did nothing” | Business event recorded, operational timing unavailable |
| Raw prompt expired | “Context empty at that turn” | Source existed, body expired under policy; safe provenance hashes may remain |
| Story visit token opened by live GET | “User read every passage” | Challenge issued, no comprehension/read claim |
| Player historical Replay GET | Advances visit ACK or current scene | Zero story/visit/provider mutation |
| Cross-account content hash collision/same bytes | Grants artifact across stories | Independent subject/perspective authorization required |

**Gate:** no claims of full historical replay until consistent committed frontier and tested typed transition/checkpoint data exist. Legacy/projection-only playback is useful but must use truthful coverage. No runtime source changes authorized.
