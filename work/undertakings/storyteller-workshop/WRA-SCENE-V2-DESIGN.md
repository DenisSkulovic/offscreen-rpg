# WRA | Scene v2: smallest credible coherent post-state design

**Status: proposed design for owner selection, NOT commissioned implementation.** Date 2026-11-21. Planning branch `planning/ma05h-capture-boundary`, integration target `undertaking/storyteller-workshop`. Source facts checked against snapshot `2bcebcdd79ef898ace2ead59cdb56a8013f7a511`; on 2026-11-21 the remote undertaking's `stories/scene-checkpoint.ts` source was separately reopened and matches key selector semantics. MA05G is in progress; MA06A moves source to `packages/story-engine`, so **do not write obsolete `packages/application/src` Composer tasks for WRA now**. Product and technical authority: `docs/technical/engine/{selected-architecture,lifecycle-and-compatibility}.md`, Writer WR05/WR06/WR07 outcomes. This note decides a *candidate mechanism*, not a change to accepted gameplay or historical truth.

## Executive decision

Implement **one complete, bounded, immutable v2 scene checkpoint per published scene**. Use the **existing** `@offscreen/documents` content-addressed store and the existing `story_scene_checkpoint` SQL selector; raise `stateSchemaVersion` to 2 with `format='offscreen.scene-checkpoint.v2'`. The v2 object contains a complete *fictional semantic after-state*, including open offers, active/due work, world obligations and playable choice meaning. It does **not** clone provider attempts, billing, queue leases or full indexed Library bytes.

**Why not complex references/event sourcing now?** Existing v1 checkpoint has a 1 MiB canonical JSON bound and a content-addressed selector with verified hash/pins. Most first vertical-slice stories have modest state. A bounded v2 snapshot is simpler, debuggable and directly usable for historical reads/forks. Use **the same 1 MiB bound initially** and hard per-collection caps. If the real target 200-scene corpus violates this, publish a measured `v2.1` segmented-root design rather than quietly truncating data. No fabricating historic v1 v2 state.

## Inspected source and reality

- `packages/documents/src/schema.ts:sceneCheckpointSchema` currently accepts only `offscreen.scene-checkpoint.v1`, `stateSchemaVersion=1`, `maximumSceneCheckpointBytes=1024*1024`. Its quiescent mechanics requires `holds=[]`, `offer=null`, `acceptedActivityPlan=null`, `activeActivityId=null`, `activeActionOperationId=null`; `continuityNotes` must be null or []. It stores an immutable canon root and exact passage/choice, not complete active history.
- `packages/db/src/schema/stories.ts:storySceneCheckpoint` already has `(storyId,sceneSequence)` PK, unique passage and operation/transition, checkpoint SHA, canon root/revision, `stateSchemaVersion` integer and pinned JSON. **No new selector table needed.**
- `application/src/stories/continuation.ts:continuationCheckpointCandidate` currently returns undefined for pending decision/wait, non-empty holds, active plan/activity/action, nontrivial notes. `lockedCheckpointMatches` reads current items, campaign and notes. `commitStoryContinuation` currently commits passage/document/view then inserts checkpoint selector, then calls `publishStorytellerNotes`; this ordering can yield a selected checkpoint claiming pre-patch notes. Fix in WRA.
- `application/src/stories/continuity-notes.ts:publishStorytellerNotes` validates succeeded generation, source part and evidence, computes patch via `applyContinuityPatch` and writes `story.continuityNotes` in caller tx. Expose a **pure preview** that computes exactly the post-note value from the same validated task/evidence; commit must use the same result, not recompute a different patch.
- `campaign` SQL contains `campaign` (character, facts, occurrences, location, clock/pace, holds, offer, situation authorization, active activity/action IDs, settings revision, world conditions), `gameActivity` (plan/state/progress), `worldObligation` (definition/due/status), `gameActionExecution` (running/paused/interrupted/settled + pending resolution), and `storyItem`. These are distinct *semantic* owner sources. Event histories and provider custody are not copied wholesale.
- `stories/forks.ts` currently uses v1 quiescent snapshot and intentionally refuses unsupported active state. Reuse its historical root checks and new-ID remap rules in WRC; do not widen v1 fork behavior by pretending old objects have absent fields.

## V2 canonical object (decided candidate schema)

Retain v1's *outer identity* keys: `storyId, passageId, sceneSequence, transitionId, source, premise, storyteller, execution, usagePolicy, canon{rootHash,rootRevision}, ancestor, pins, passage{response,responseSource,initialItems,effects,decisionPlan,waitPlan,controlRevision,content|contentDocumentHash,interaction}`. Distinguish with `format='offscreen.scene-checkpoint.v2'`, `stateSchemaVersion=2`.

Replace v1 `mechanics` payload with **`fictionalState`** discriminated `mechanicsAbsent`:
- absent: `{mechanicsAbsent:true, items:[], character:null, gameSecond:null, ...}` with no typed mechanics fabricated; *but still preserve notes, scene scope, choices and Library pins in their dedicated fields*. The implementation can normalize absent-world data to null/empty only when the actual story has no Campaign row.
- present: fixed typed fields `character,items,storyFacts,activityOccurrences,location,gameSecond,clock,pace,settingsRevision,content,worldConditions,situationAuthorization`, plus **`holds,offer,acceptedActivityPlan,activeActivityId,activeActionOperationId`** from the snapshot. Each must parse under its already canonical domain schema, not `z.json()` for security-sensitive active permission.
- `activeActivities[]`: story-scoped `{id,plan,state,boundariesSettled,revision,progress}` from `gameActivity` for semantic open work; no event delivery/worker lease.
- `worldObligations[]`: `{id,revision,definition,dueGameSecond,state,firedAtGameSecond}` for open and causally relevant obligations. Completed/cancelled obligations that are already reflected in state need not all be copied, but the **selection predicate must be deterministic and documented**, otherwise a historical fork could lose provenance. For v2 initial version, select all obligation rows relevant to the state frontier within the collection cap; fail closed if exceeded rather than silently omit.
- `activeAction`: nullable semantic subset of `gameActionExecution` (operation/offer/baseRevision, plan, pending resolution, start/target fictional seconds, state/revision). Exclude `preparationGenerationId` for fork replay and all provider/queue/charge/attempt identities. Preserve source operation as **provenance only**; WRC maps a new child operation ID.
- `continuityNotes` and `activeSceneScope` are top-level v2 fields representing the **committed after-state**, including notes patch from this scene; do not store only empty notes.
- `admittedChoice` (or equivalent existing `passage.interaction` + pinned selected offer) must retain immutable playable option meaning independent of old provider generation. Reuse existing interaction schema and offer schema; WRC maps story-scoped IDs.
- `stateFrontier`: exact `{baseStoryRevision,baseViewVersion,baseCanonRootHash,baseCanonRootRevision,commitOperationId}` and optional affected row revisions needed for race proofs. The checkpoint SHA itself is the immutable *post-state commitment*. Do **not** claim that it hashes external changing objects; every semantic field required for fork must be inside it.

Bounds: inherit 1 MiB canonical JSON total. Reuse existing bounded v1 arrays and existing domain validators; for new collections initial max: **256 activities, 256 obligations** and a bounded active-action/hold structure. Exceeding any bound means **`held / state_not_representable`**, not serialization loss or automatic v1 downgrade. These cap values are engineering proposals to verify against fixtures before ratifying; do not silently pick different numbers in Cursor.

## Publication algorithm: Stage candidate outside lock, select under lock

**Critical precondition:** scene publication and campaign effects currently may be applied *inside* the lock; a prior snapshot plus stale comparison is insufficient to predict post-state without a deterministic projector. Therefore WRA must introduce a **single pure `projectSceneAfterState(base,effects,notesPatch,admittedChoices)`** that mirrors selected authoritative changes. Avoid a second ad-hoc SQL mutation path.

1. **Prepare/read**: capture an owner-scoped base story/campaign/items/active rows and exact root, revision, viewVersion and relevant row revisions from a **consistent SQL snapshot**. No CAS/provider access under story `FOR UPDATE`.
2. **Project**: evaluate deterministic effects/choice/notes without SQL side effects. Validate source generation and notes evidence; use the same `applyContinuityPatch` semantics as `publishStorytellerNotes`. Create complete candidate after-state including active offers/plans/obligations and intended passage/interaction IDs. If some effect policy is not purely projectable, stop WRA preparation; **do not publish an incomplete checkpoint** or ask Cursor to invent semantics.
3. **Stage**: stage passage/Library changes using current immutable document APIs; create canonical v2 checkpoint with final proposed root, passage, pins, source and post-state, hash + write + read-back verify via existing store outside lock. Staged but unselected objects are inert.
4. **Commit**: owner story SQL lock, check expected base revision/viewVersion/root and every required actor/commitment/row-version fence. Recheck source generation/notes evidence and current campaign/activities/obligations. Apply exactly the deterministic projected effects in original transaction, including passage, root commit, notes, commitments, active permissions and view. **Then derive/compare the actual SQL semantic after-state under the same transaction against the staged v2 object** (including notes and scene choice). Mismatch throws conflict/invalid and rolls back all rows. Only after equality insert selector, then outbox notices. No network/CAS under lock.
5. **Replay**: existing idempotent operation/transition and selector SHA take precedence; identical retry returns existing scene, differing payload/root conflicts. No regeneration, reapplication or duplicate budget reservation. Unknown provider attempt remains uncertain outside this transaction.
6. **Reader**: verify selector SHA, v2 parsed object, canon and passage identity; v1 reader stays unchanged. Read exact historic v2 without consulting *current* campaign/item/notes rows. A missing/corrupt object fails explicitly; no fallback to current state.
7. **Fork (WRC)** consumes v2 and remaps semantic IDs in a separate later operation. WRA need not launch WRC in same code Change; v2 must include all required state for it.

**Concurrency rule:** use one pre-stage snapshot and an exact same-base revalidation under the story lock. If independent campaign work can change semantic state without incrementing story.viewVersion, fence its own revision/rows (or serialize with the story lock); otherwise the selector would adopt an obsolete candidate. Do not assume story.viewVersion alone is sufficient until all writers are inspected.

## Scope and risk boundaries

**WRA one coherent implementation Change** (prefer 4 tasks rather than schema-per-function):
- T01: v2 schema + pure projection/notes preview (source-verified).
- T02: stage/store/reader and selector version-aware validation (preserve v1).
- T03: continuation/initialization/Storyteller publication integration, SQL commit and checkpoint equality, new active work snapshots.
- T04: focused normal and negative SQL/CAS faults, docs closure, integration into undertaking.

**Do NOT add:** event sourcing, materialized state map infrastructure, permanent workflow engine, new writer agent loop, launch UI, full historical fork remapping, provider dispatch changes, extra abstraction-only package or temporary second checkpoint table.

### Prove, not just compile

- Normal: scene opens with no mechanics, with a human campaign, with active offer, ongoing activity and due obligation; notes patch and choice appear in the exact historical v2 read.
- Negative: concurrent world condition, item, clock, offer or obligation change between stage/commit; changed source generation; stale notes; missing/corrupt checkpoint blob; replay changed payload; abandoned CAS stage; 1MiB exceeded; foreign owner; divergent actual-vs-projected SQL state. **No selector, no partial passage/root/notes/outbox on failure**.
- v1 compatibility: historical reads remain bit-for-bit and v1 unsupported active-state fork stays denied; never fabricate v2 for old scene.
- No provider-spend under tests. SQL suites only against verified disposable test database.

## State mutation inventory and projector constraint (source scan)

Source scan on the 2bcebcdd snapshot of Drizzle `.insert/.update/.delete` for `campaign`, `gameActivity`, `worldObligation`, `storyItem`, `story` within the four engine directories found **many distinct mutator families**, not one Scene Commit writer. This is a discovery census, **not yet an exhaustive proof**: SQL wrappers, aliases, raw SQL and MA05G changes require follow-up.

| Current file family | Relevant writes found | Consequence for WRA |
| --- | --- | --- |
| `stories/{initialization,forks,persistence,continuation,continuity-notes,documents}` | story lifecycle/passage/root/items/notes and branch bootstrap | Stage/commit must compare the exact after-state including the notes patch and item effects; document edit commands may advance roots independently |
| `campaign/{settings,activities,actions,action-executions,custom-intent}` | campaign clock/offer/plan/settings and active progress; activity rows | Pure projector cannot simply copy pre-scene campaign; active actions may be settled or newly admitted in the same story epoch |
| `campaign/{holds,controls,accepted-plan-controls,action-execution-controls,world-obligations,world-obligation-controls,persistence}` | locks/holds/plan transitions, obligation revisions and campaign projections | A scene checkpoint must either capture these during a serialized story transaction or fence them individually |
| `storyteller/publication.ts` | campaign mutation during creative publication | Existing publication flow must use the same committed-after-state contract, not a separate Storyteller-owned checkpoint builder |

**Engineering consequence:** do not attempt an unbounded pure projection of *every* campaign command just for WRA. Project only the **scene-publication transition** from an existing typed base and a finite admitted effect plan. Other commands remain the owners of their own state changes; their updates must serialize against or be detected by the publication fence. An expanded world-state snapshot captures their **current accepted result** at scene-boundary time. Full replay of arbitrary past actions is not required.


**Initial lock scan:** `campaign/{settings,actions,activities,action-executions,controls,custom-intent,world-obligation-controls}.ts` use `lockOwnedStory` or `lockStoryById` in their transaction entrypoints and expose `incrementStoryViewVersion` in their write paths. `campaign/holds.ts` and `campaign/world-obligations.ts` have no direct story-lock/view-version call in the scanned file, indicating helper-level mutation; inspect their **callers' lock discipline** before declaring the story lock a universal semantic-state fence. The probable simplest option is reuse the existing story row lock plus a post-mutation comparison rather than invent per-entity event-sourcing revisions.

**Pre-release source questions (specific, not for Cursor investigation):** which writers already call `lockOwnedStory` or `lockStoryById` before updating campaign state; which writes change `story.viewVersion`; which mutate `gameActivity`/`worldObligation` without either; and which existing typed effect helpers can project the finite scene transition from a captured base. These are the only remaining implementation-critical design holes. If the current engine cannot enforce a consistent snapshot at publication, the WRA packet stays unready until this is closed.

## Release gate

**Not ready for Cursor.** Before post-MA06A packet release, ChatGPT must map **all mutations** of `campaign`, `gameActivity`, `worldObligation`, `storyItem`, `story.continuityNotes`, and active scene/offer paths, including writers outside narrative continuation. One must choose actual projector implementation and row-version/fence algorithm from those writers. The candidate fields/caps must be verified against existing schema contracts and realistic fixtures, not guessed by paid Composer. After MA06A, replace WR05's obsolete task route in place, avoid two parallel current publication packets, then independently audit G0–G7.

**Why hold here:** a v2 immutable JSON object and hash are easy. Proving it truly represents the *post*-commit world state is the expensive architectural responsibility and must be solved before implementation. The next planner iteration should focus on that mutation map, not on 20 tiny migration tasks.
