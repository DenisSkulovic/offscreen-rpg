# Resolve a generated intention asynchronously

Status: Agreed

Approval: On 2026-09-18 the owner approved continuing the connected story lifecycle after playable candidate creation, explicit Start and Chamber observability. This feature connects a selected option from a generated live passage to a deterministic asynchronous storyteller result and commits the resulting passage through the production story machinery.

No live model/provider call is involved.

## Intended outcome

A live story created from a playable opening candidate can advance when the player selects one of its generated options.

The selected option represents an **intention**, not an outcome.

The application must:

1. verify the selected published interaction;
2. recover the exact hidden intention from the persisted proposal that produced the current passage;
3. freeze the relevant story context and selected intention into an immutable resolution request;
4. admit that resolution durably;
5. expose that resolution as pending while work occurs asynchronously;
6. obtain a deterministic fake storyteller proposal through the same generation boundary intended for later model-backed resolution;
7. validate the proposal;
8. commit exactly one resulting next passage;
9. preserve provenance from that next passage to the generation that created it;
10. recover correctly after browser reload or worker restart.

This creates the first real generic loop:

`generated passage -> player intention -> async storyteller -> generated passage`

The next passage may itself offer another generated choice, allowing the same mechanism to repeat.

## Product intent

This is not merely "make the disabled buttons work."

The important boundary is:

**The player chooses what the character attempts. The storyteller determines what follows.**

The visible label is presentation.

The hidden saved intention is authoritative input to storyteller resolution.

The application must never infer the hidden intention later from:

- the button label;
- prose;
- option position;
- option ID conventions.

The exact persisted proposal that created the published choice remains the source of truth.

## Representative flow

1. A player starts a story from a successful playable candidate.

2. Passage 1 shows a scene and generated choices.

3. The player chooses an option such as:

   `Walk toward the water`

4. The published proposal behind the passage contains the corresponding hidden intention:

   `Follow the sound of water and see what is ahead.`

5. The browser submits the interaction answer with:
   - expected story revision;
   - interaction ID;
   - selected option ID;
   - a stable operation ID for retry.

6. The server validates that:
   - the caller owns the story;
   - the story is still on that exact passage/revision;
   - the current passage came from a supported playable proposal;
   - the submission references the current published interaction;
   - the proposal still matches the published scene/interaction;
   - the selected option exists.

7. The server creates one persisted continuation-generation operation containing the exact frozen context and selected intention.

8. The API returns an accepted/pending state rather than fabricated continuation prose.

9. The player may close the browser.

10. A deterministic fake storyteller completes the generation asynchronously.

11. Its output is validated as a `PlayableProposal`.

12. If the story is still eligible for this result, the application atomically commits passage 2:
    - passage 1 records the player's response;
    - passage 2 contains `playablePresentation(result)`;
    - passage 2 retains provenance to the continuation generation.

13. Reloading `/play/:storyId` shows passage 2.

14. If passage 2 offers another generated choice, it can be resolved through the same path.

## Freeze story premise at Start

A live story must not depend on an editable draft or on parsing captured prompt strings in order to understand its foundational premise.

Add a small versioned structured story premise/origin snapshot to live stories created from playable candidates.

For the current scope this should preserve the exact saved draft content relevant to storyteller generation:

- title;
- premise;
- storytelling direction.

The Start transaction already locks and verifies the exact draft revision used by the candidate. Freeze this structured premise into the live story during that transaction.

Authored Chamber fixtures may have no premise and remain valid.

Do not introduce a generalized campaign-settings framework in this feature.

The purpose is simply:

**once started, the story owns the premise it began from.**

## Resolution generation

Introduce a dedicated generation kind for scripted continuation resolution.

Suggested production-neutral kind:

`continuation.playable.scripted.v1`

The generation input must validate the immutable artifact returned by `preparePlayableContinuation(...)`, extended only where necessary to make its structured inputs durable and inspectable.

The continuation artifact should preserve at least:

- input version;
- prompt version;
- task = `continuation`;
- story ID;
- narrative revision;
- view version;
- passage ID;
- interaction ID;
- selected option ID;
- captured provider request.

Do not rely on searching/parsing provider-message strings to recover application-domain identity.

The generation output is a validated `PlayableProposal`.

## Pending-resolution identity

The application needs a direct authoritative relationship between a story/passage and its admitted continuation generation.

Do not discover pending resolution by querying JSON inside `generation.input`.

Introduce the smallest explicit persistence relation needed to identify the active resolution.

Preferred shape:

`story_resolution`

with fields conceptually equivalent to:

- story ID;
- base passage ID;
- base revision;
- operation ID;
- generation ID;
- submitted interaction response;
- createdAt.

Use appropriate uniqueness so:

- one operation identity cannot mean two different requests;
- the same current passage cannot admit conflicting simultaneous resolutions;
- retries return the existing resolution rather than creating another.

Do not turn this into a universal gameplay command journal.

## API behavior

Add a generic generated-story resolution endpoint distinct from Chamber's authored fixture responder.

Suggested route:

`PUT /api/stories/:storyId/resolutions/:operationId`

Request body:

- expected revision;
- interaction submission.

The browser does not send:

- intention text;
- proposal;
- continuation prose;
- storyteller prompt;
- effects.

On successful admission, return a representation that lets the client understand:

- the resolution was accepted;
- it is pending/running/succeeded/failed/uncertain as appropriate;
- the current committed story snapshot has not necessarily advanced yet.

The exact DTO may combine current story snapshot + resolution status if that keeps reload/recovery simple.

Do not return a fake new passage synchronously.

## Reading pending state

Reloading the live story must reveal when its current interaction already has a pending resolution.

The player should not be able to submit a second different option while that accepted resolution remains active.

Expose the minimum pending-resolution state needed by the live UI.

Possible states:

- pending;
- running;
- failed;
- uncertain.

Once the result has committed passage 2, normal story state becomes authoritative and no special completed banner is required.

Do not make generation internals such as prompts or hidden intentions public.

## Deterministic fake storyteller

This feature uses an offline fake storyteller.

It must enter through the normal continuation-generation boundary.

It must not branch on specific option IDs from the opening fixture.

A newly generated arbitrary option ID must be resolvable without adding server fixture code for that ID.

For this first feature, the fake may return one stable valid generic continuation proposal regardless of selected intention, provided:

- the request still captures the actual selected hidden intention;
- no resolver branch depends on that intention;
- the result offers at least one next generated choice so recursion of the mechanism can be tested.

Example result:

Scene:
`The path bends around an old wall. Something has changed ahead.`

Choices:
- inspect the change;
- continue cautiously.

The prose quality is irrelevant. The architecture under test is the feature.

## Async execution

Admission and completion must be separated.

Use:

- generation persistence;
- transactional outbox;
- Temporal workflow/activity;
- worker dispatch;

rather than completing the fake generation inside the HTTP request.

The fake Activity can remain safely repeatable if its database operation is genuinely idempotent.

Do not copy fake retry semantics into the future live-provider adapter.

## Commit semantics

A successful generation result does not automatically mean it may still mutate the story.

Before publishing it, recheck authoritative eligibility.

The commit must require that:

- story revision still equals the resolution's base revision;
- current passage still equals the captured source passage;
- the accepted interaction has not already been resolved by another valid transition;
- generation output validates;
- published proposal/source still corresponds to the accepted resolution.

If stale, retain generation evidence but do not apply its result.

Do not rewrite history to accommodate a late result.

## Passage provenance

Every passage produced by generated continuation resolution stores:

`sourceGenerationId = continuation generation ID`

This allows the next interaction to recover the proposal that created it exactly as passage 1 currently recovers the opening proposal.

Do not copy hidden intentions into public interaction JSON.

## Response provenance

The committed transition must retain the player's actual interaction submission.

Passage/history state should continue distinguishing player responses from future default/autonomous responses.

This feature supports only an explicit player-selected generated option.

Autonomous/default generated intention selection is deferred.

## Live player UI

Update `/play/:id`.

When the current generated interaction is actionable:

- render enabled choice buttons.

After selecting one:

- retain one stable operation ID for uncertain retry;
- disable conflicting selections;
- display a clear pending state;
- poll/reload saved state using bounded recovery behavior.

The player may close the browser while resolution is pending.

On successful commit:

- display the new passage;
- enable its generated choices if present.

On failure:

- keep the existing committed scene;
- explain that continuation failed;
- do not fabricate advancement.

On uncertain state:

- explain that the outcome must be reconciled/retried safely;
- do not admit a second independent resolution.

On 409/stale conflict:

- reload the authoritative story state.

## Scope

### Included

- freeze structured premise into generated live story;
- generic admission of one selected generated option;
- exact hidden-intention recovery from passage generation provenance;
- persisted continuation generation;
- explicit pending-resolution relation;
- asynchronous deterministic fake storyteller;
- result validation;
- stale-result fencing;
- atomic commit to next passage;
- passage generation provenance;
- repeatable generated-choice loop;
- live browser pending/reload behavior;
- Chamber inspector visibility for generated continuation state where practical.

### Deferred

- live LLM/provider;
- free-text intentions;
- waits produced by storyteller proposals;
- item/resource effects produced by storyteller proposals;
- generated decision deadlines;
- autonomous defaults;
- pace system;
- character/world memory retrieval beyond current bounded context;
- relationships/facts;
- movement/place state;
- notifications;
- multiplayer;
- cost reservation/accounting.

The existing `PlayableProposal` contract supports immediate scene + choice/end only. Keep this feature within that boundary.

## Chamber relationship

This feature should unlock the next Chamber Laboratory phase.

The Chamber inspector should be able to display the newly created resolution/generation relationship using the same developer-only inspection philosophy already implemented.

Do not implement the full Chamber fake-storyteller control panel in this feature.

The fake storyteller exists as deterministic application infrastructure first.

Interactive Chamber control over fake outcomes is a following Chamber Laboratory phase.

## Acceptance

The feature is complete when:

1. A story started from a playable candidate freezes its structured starting premise.

2. A generated option on `/play/:id` can be selected.

3. Admission uses the exact hidden intention from the proposal that created the published passage.

4. Neither browser label nor option-ID-specific server code determines the intention.

5. Admission creates a durable continuation-generation operation and returns pending rather than immediate fake prose.

6. Reloading while pending shows that resolution is still in progress.

7. The deterministic fake storyteller completes through Temporal/worker execution.

8. A valid result commits exactly one next passage.

9. The next passage stores provenance to the continuation generation that created it.

10. If that passage offers another generated choice, the same generic resolution path can resolve it.

11. Retrying the same operation/request is idempotent.

12. Reusing an operation identity with different input conflicts.

13. A different option cannot be admitted concurrently for the same passage once resolution is accepted.

14. A stale result cannot advance a story that has moved on.

15. Hidden intentions and provider-request internals are not exposed publicly.

16. Browser closure/reload does not lose the accepted resolution.

17. Worker restart does not create a duplicate resulting passage.

18. Chamber authored fixtures continue to resolve through their existing fixture path.

19. No live provider call or provider spend occurs.

20. `docs/progress.md` can truthfully state:

`draft -> playable candidate -> Start -> generated choice -> async fake storyteller -> persistent next generated passage`

## Decisions still needed

None for this slice.

Waits, effects, autonomy and richer continuation context remain separate upcoming product/technical decisions.

## Owning specifications

- `docs/vision.md`
- `docs/playthroughs.md`
- `docs/gameplay.md`
- `docs/technical/story-lifecycle.md`
- `docs/technical/storyteller-runtime.md`
- `docs/technical/execution.md`
- `docs/progress.md`
- `packages/ai/src/playable.ts`
- `packages/server/src/stories.ts`
- `packages/server/src/story-continuation.ts`
- `packages/server/src/generations.ts`