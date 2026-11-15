# Replay, retention and privacy | Time travel without rewriting history

**Status: technical/product recommendation, 2026-11-15; not approved for implementation.** **Wave-3 policy update:** the earlier 30/90-day raw AI windows below were exploratory; the [recommended first production candidate](../product-policy-recommendations-v1.md) is now 90 days default and up to 180 days incident hold, **still awaiting product/legal/cost acceptance**. [Evidence model](evidence-model.md) defines durable source and artifacts; [golden journeys](../product-vision.md) define expected replay experiences. Existing [Chamber](../../engineering/targets/chamber-laboratory.md) owns isolated test execution. Historic display, deterministic re-execution and agent rerun are **different products**.

## 1. Four replay modes (do not call them all “replay”)

| Mode | User | What actually happens | Accuracy and hard restriction |
| --- | --- | --- | --- |
| **A. Story playback** | Player, Support with allowed view, Developer | Read historical published passage+choice+receipt+event records; render actual saved narrative, fictional timeline and safe visible state | Exact **recorded** content/outcomes if retained; no execution, mutation or model call |
| **B. State time travel** | Developer; scoped Support summary | Rehydrate a historical authoritative state at a chosen committed frontier using checkpoints and deterministic recorded state transitions | Precise only for instrumented complete events; incomplete source becomes explicit gap |
| **C. Deterministic verification** | Developer/Chamber | Replay recorded accepted input, virtual clock, deterministic RNG samples, rule versions and fixed external observations in an **isolated sandbox** | Compare old vs current mechanics; does not update production or guarantee model equivalence |
| **D. AI re-evaluation / fork** | Developer/QA, later player fork with consent | Deliberately run a **new** model/task against a captured or modified state; record new branch/attempt, budget and differences | Not historically exact, may cost money, must never overwrite an old turn |

**Separate Temporal Workflow Replay** is a fifth technical mechanism: Temporal replays its own Event History to restore deterministic workflow control flow. It is not a player history renderer and does not re-run historical Activities/model calls. Reusing the word without naming the mode is a design bug.

**Recommendation for first playable:** build A with authoritative published history and GM05 facts, then B with truthful coverage. Implement C only after source-state/checkpoint/entropy capture is proven. D is a separate explicit paid/permissioned capability, *not* what happens when a user clicks Play on an old scene.

## 2. The historical frontier is a committed ledger position

A replay cannot safely reconstruct “state at 16:34” by mixing current rows with old passages. Define a **per-story monotonic committed transition sequence** under the existing story write lock for each meaningful authoritative mutation (accepted command, activity boundary, clock/hold transition, item transfer, canonical root/publication, settings change, important world obligation). Its exact physical representation needs source inspection and migration design; **GM05’s public event sequence is not automatically sufficient** because it omits hidden/private/quiet state transitions.

Choose **one consistent position**, not one sort over separate `gameActionExecutionEvent.ordinal`, `gameActivityEvent.ordinal`, `worldObligationEvent.ordinal`, `storyPassage.sequence` and wall timestamps.

A historical frontier selects:
- last **committed** transition sequence;
- narrative passage revision / actual published passage ID;
- fictional `gameSecond`;
- settings revision and resolved policy;
- authoritative campaign character/storyFacts/items/activities/holds/worldConditions at that position;
- canonical document root/revision and readable source manifest;
- visibility/participants as-of the chosen position;
- causal operation/receipt/event IDs that produced the result.

**Atomicity contract:** sequence allocation and compact transition evidence commit in the **same SQL transaction** as the business mutation. If the transaction rolls back, its evidence row/sequence cannot claim an action happened. Use scoped uniqueness under the story lock, avoid a central global hot counter, and preserve existing operation idempotency.

**Uninstrumented old history:** give partial playback of whatever published passages/receipts exist, but never claim it can reconstruct arbitrary old campaign JSON values. For pre-ledger periods show “Historical state not fully recorded”.

## 3. Record transition deltas, not a game object every second

~~~ts
type StoryTransitionV1 = Readonly<{
  storyId: UUID;
  sequence: number;                // committed per-story frontier
  kind: 'mechanic' | 'time' | 'hold' | 'item' | 'settings'
    | 'world' | 'publication' | 'control';
  operationId: UUID | null;
  sourceIds: readonly string[];
  priorSequence: number | null;
  fictionalGameSecondBefore: number;
  fictionalGameSecondAfter: number;
  sourceNarrativeRevisionBefore: number;
  sourceNarrativeRevisionAfter: number;
  ruleVersion: string;
  inputArtifactId: UUID | null;
  recordedEffectsArtifactId: UUID | null;
  stateDeltaArtifactId: UUID;      // exact typed changed fields / before-after values
  committedAt: ISODateTime;         // not used as total causal order
  completeness: 'complete' | 'partial';
}>;
~~~

The state delta schema should be **owned by the existing game domain** and contain admitted effects/diffs, actor capability changes, item holder old/new, activity progress/earnings and hold transfers as appropriate. It cannot become a weak `Record<string,unknown>` plus arbitrary JS patch “execute this later” operation. Schema version and effect IDs make it auditable and replayable. Avoid replaying business mutators during ordinary historic view: playback projects **recorded results**, not new decisions.

**Sampling by importance:** every committed **meaningful transition** is retained, but an idle no-op scheduler wake is not a new transition. If the game has 100 internal wakeups and zero relevant state change, no 100-row forensic ledger is necessary. Record one compact summary of repeated service health via metrics, not a fake world event.

### Checkpoint cadence

Use a verified full-state checkpoint:
- on story Start or fork;
- on a new committed published scene/controlling decision when meaningful;
- every bounded number of transitions (initial experiment: approximately 25, adjust after sizing);
- when state schema changes or a long history needs compaction;
- before archival/export/deletion workflows when allowed.

A checkpoint includes versioned validated **authoritative** actor/world/time/settings/activity/holds and story document-root hash, source frontier and integrity summary; the current passage's immutable content remains referenced, not pasted hundreds of times. A checkpoint **is not a new game authority**. It must be reconstructable/verified against source rows at creation, and may be regenerated only while source coverage suffices.

**Seek algorithm:** load latest verified checkpoint at/before target → apply recorded pure state deltas in monotonic sequence order → validate hashes/invariants and target root/clock/actor → project authorized perspective for viewer. If any critical transition or codec is missing, return `partial` / `cannot-replay` with a named gap, not interpolate with current state.

## 4. Player playback: a game feature, not an incident debugger

**Proposed UI:** “Replay story” from Story/Journal. A side rail navigates scene cards/meaningful committed events; a central narrative stage renders the old published prose and appearance, with historical setting/time and original response; an optional “What changed?” panel shows player-known facts and results. Seek by scene, event, date or character/perspective where permitted. Bookmark a scene without modifying gameplay.

- **Recorded options** are displayed as history, not buttons that execute. “You chose…” comes from actual accepted source, not a speculative generated menu.
- The UI never fetches private future DM instructions or hidden system data. Past story content is released under the **current viewer’s legitimate access**, including additional shared-story privacy rules as that product matures.
- Player may see original live-time duration, accepted plan and eventual completion, including **what had not yet been earned** during the wait. A narration that arrived after settlement is shown according to its **actual committed/published time**, with optional separate fictional chronology.
- If visual media/appearance existed, use the saved immutable scene appearance/source and original asset IDs if retained. New renderer code may produce a different visual interpretation; an **exact pixel replay** additionally needs archived renderer/CSS/assets/build and is **not** promised by V1. Semantic replay can still be exact when visuals differ.
- Forking is **not** seeking. A future “try another path” creates a separate story with explicit branch origin and copied authorized source state; never rewind or overwrite the live story.

**Support replay** is purpose-redacted, with only permitted narrative/story evidence. **Developer replay** may add instrumentation layers; it must always show which layer is being inspected.

## 5. Deterministic test replay: what has to be recorded

Exact reconstruction of an old **deterministic mechanical result** needs:
- accepted command/plan/offer + actor/control and prerequisites;
- *actual* RNG draw(s) and rule version (not a new draw); any rounding/fractional clock remainder;
- virtual/real timing boundaries, stored pace and change events, idempotency identities;
- before-state or a verified checkpoint+all deltas;
- external observations that influenced mechanics, including CAS source response or world obligation event;
- code/git build, schema/feature flag and evaluator versions;
- registered effect order, resulting receipt and exact after-state digest.

A comparator then reports **old recorded truth** vs **newly computed test result**, not “new code proves the old thing was different”. LLM/provider responses in deterministic verification are **captured fixtures**, not a re-invoked stochastic model. If the historical input, code artifact or byte-exact source was not retained, label the deterministic guarantee incomplete.

**Chamber bridge:** export a signed/hashed restricted **sanitized replay bundle** with input provenance, fixture/state/checkpoints and redaction manifest; import only into isolated Bench/Sandbox using existing protocol and permissions. No live token, customer auth secret, payment instrument, raw private narrative or cross-tenant permission is imported by default. A diagnostic bundle must expire and inherit the owning incident's authorized purpose.

## 6. Retention classes, with explicit trade-offs

**These are proposed starting policies for review, not legal commitments or current system configuration.** An EU-facing production service needs documented lawful purpose, privacy notice, erasure/hold requirements and measured storage cost before final durations.

| Data category | Recommended first policy | Reason and limitations |
| --- | --- | --- |
| Authoritative published player story/passages/committed game history | Retain for active life of story and within user-controlled archive; deletion/closure policy and account rights separately defined | This is the product itself, not diagnostic logging |
| Complete compact game transition ledger + reconstruction checkpoints | Same story-lifecycle class where replay promised; bounded size and integrity checks | Required for long-term reliable player replay; no hidden future details in player view |
| Immutable canonical world/story documents used in those scenes | As long as necessary to render/verify retained story, with references/dedup and rights checks | No "delete root but keep full-replay" fiction |
| Sensitive **raw** provider packets/outputs/tool responses | **Revised candidate** 90 days ordinary; up to 180 days on documented incident/purpose hold, subject to legal, cost and full SQL/CAS erasure proof; synthetic QA may have a different policy | Highly useful but expensive/private; after expiry retain safe hashes/metadata and honest lost-body coverage |
| Prompt/component IDs, hashes, effective config/recipe/selection metadata | **Candidate** 12 months, with player-coupled minimum references as genuinely needed for replay | Explains regressions without storing raw player content permanently |
| Operational spans | **Candidate** 7–14 days, sampled | Performance diagnostics, not permanent player record |
| Structured process logs | **Candidate** 14–30 days, bounded/error-focused | Short-lived incidents and on-call troubleshooting |
| Aggregated operational metrics | **Candidate** 90 days high-resolution plus longer downsampled aggregate as justified | Trends/SLO without per-user content |
| Security/audit and sensitive access history | Defined by security/legal policy, append-only and purpose-limited; **not** universal indefinite | Access accountability and legal obligation may require different retention than game prose |
| Case evidence attachments and sealed diagnostic bundles | Case/purpose based, expiring and reviewed, no unconstrained “forever” | Escalation without creating shadow copies of private games |
| Derived search indexes, caches, thumbnails and redacted views | Short or rebuildable; delete when source permission/revision/delete changes | Derived data cannot outlive lawful source rights |

The key conclusion: **player replay data may need a much longer life than raw AI-debug payloads**. A campaign can be replayable years later using durable published content, committed deltas and checkpoints even after private raw provider packets expire. A developer should then see the original prompt hashes/versions and an explicit “raw body expired” state, not an empty context reconstructed from today's config.

**Alternative under review:** user-selected extended forensic retention for a diagnostic beta, with transparent opt-in, quotas and pricing. Not a reason to force every private user to fund enterprise indefinite packet archives.

## 7. Storage engineering and privacy safeguards

- **One protected immutable artifact interface, several lifecycle classes:** CAS object uses type/version/content SHA; SQL records have subject ownership, expiry, classification, encryption key association and structured provenance. Do not rely only on object hash as authorization.
- **Compression/dedup:** identical stable prompt blocks, canonical evidence and schema fragments can share storage references, but per-campaign access must still be evaluated independently. Compress big JSON/text before encryption/storage as policy permits. Never leak dedup existence between tenants.
- **Tiering:** hot SQL/index metadata, protected warm CAS for recent raw/context artifacts, colder object storage for archived replay checkpoints/story assets after measured demand. A full artifact is fetched only on lawful drilldown, not every Support summary.
- **Encryption and keys:** authenticated TLS; at-rest encryption; scoped key management; no cross-tenant unauthorized reuse. An erasure may require crypto-shredding plus physical lifecycle deletion with backup/cache/search index policy.
- **Lifecycle/GC:** stage immutable CAS then publish SQL pointer in short transaction; orphaned staged objects eventually GC only after confirming no valid reference or legal hold. Deleted/redacted artifacts retain **a typed tombstone/coverage marker**, not a potentially identifying unbounded body.
- **Privacy:** data minimization, purpose limitation and retention apply even to developer tools. Avoid raw narrative in OTel exporters, exceptions, metrics labels, customer-support ticket payloads, or analytics. Restrict fields and audit every sensitive read; internal engineers are not automatically entitled to user intimacy.
- **Deletion, export and legal hold:** define subject/ownership, participant rights, scoped purge across SQL/CAS/derived indexes/backups and reasonable backup expiry. An incident hold needs named actor/purpose/approval/expiry. Immutable audit records may preserve only narrowly justifiable security metadata, not raw deleted game prose. A SHA/hash can sometimes remain identifying and must also undergo privacy review.
- **No permanent raw secret:** API credentials, OAuth tokens, payment instruments and database connection strings must **never** enter forensic artifacts. Strip/deny at capture boundary before storage; encrypting them does not make their collection wise.

**Security warning:** a malicious player can write prompt injection or log injection into in-game text. Such bytes remain *data*, not instructions to the Admin, a coding assistant or the replay engine. Escape rich text, validate content type, deny executable artifact rendering and never allow an admin prompt-inspector to run those strings as commands.

## 8. Costs and reliability

Track per-story **artifact bytes, number of retained raw model rounds, checkpoint bytes, deletion/GC backlog, compression ratio, CAS read latency and reconstruction latency**, with **no story ID as a Prometheus label**. Meter at the indexed evidence store. Per-operation cost model:

~~~text
monthly_storage_bytes ~= model_turns * average_new_raw_bytes
                      + durable_transition_count * average_delta_bytes
                      + checkpoint_count * average_checkpoint_bytes
                      - validated_dedup_savings
~~~

That formula is a planning instrument, **not** a claim about current workload. Measure 10/100/1000 scripted and representative provider-disabled turns first; report p50/p95 artifact size, CAS reads, write latency, cost of long story replay and bytes retained per class. Review retention candidates against actual storage and privacy, not intuition.

**Failure rules:** A telemetry outage does not stop gameplay. A critical compact business evidence write must co-commit (otherwise fail the whole *new* action before effects commit). Missing protected packet archival prevents a **new paid dispatch** but never retroactively undoes a mechanically settled action. A replay index lag must show stale/partial rather than invented history. Backpressure must never silently drop a required evidence reference; fail closed at that boundary and alert on backlog.

## 9. Acceptance probes

1. Player can replay a 20-scene story without triggering one command, model call or roll, including a historical interrupt and late report.
2. A story's state as of transition 17 equals the source-validated checkpoint + deltas, even after 50 later transitions.
3. Duplicate delivery/transaction rollback creates no extra committed transition or irreversible effect.
4. A world without human currency/body can replay its own typed capabilities and time without generic inventory assumptions.
5. Saved result can be displayed after the raw provider packet expires; inspector truthfully reports metadata-only evidence.
6. Privilege revocation mid-session invalidates sensitive drilldown while preserving authorized safe summaries.
7. Shared-player A cannot use a replay URL to see B-private records or hidden future Storyteller plans.
8. Deleting a story removes raw artifacts and invalidates replay/index caches according to policy, including authorized incident exceptions.
9. Exporting a test bundle to Chamber strips or denies all secret/non-allowed content and records who exported it.
10. Changing renderer/agent version after original play never silently re-generates or changes historical source.

**Decision needed before code:** choose a lawful story retention promise, raw model evidence window and staff-purpose approval threshold. These are **not** pure backend code-quality preferences; they are product/security commitments.
