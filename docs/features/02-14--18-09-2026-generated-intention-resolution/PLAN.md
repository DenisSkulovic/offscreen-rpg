# Implementation plan

Feature: [Resolve a generated intention asynchronously](FEATURE.md)

Execution scope: one focused implementation phase. Connect generated option selection through durable fake storyteller resolution and passage commit. Do not add waits/effects/live inference.

Implementation owner: Cursor.

Reviewer: ChatGPT/Codex.

## Phase 1 — Generated option to asynchronously committed generated passage

Status: Ready

### Current repo assumptions

Before editing, verify current `main`.

The reviewed repository currently provides:

- persisted playable opening proposals;
- hidden intentions retained in generation output;
- passage `sourceGenerationId`;
- explicit Start from current candidate;
- live `/play/:id`;
- generated options rendered but disabled;
- `preparePlayableContinuation(...)`;
- generic `generation` lifecycle;
- transactional outbox;
- Temporal worker;
- generic story continuation commit;
- Chamber inspector.

Preserve these boundaries.

### 1. Freeze structured premise on live story

Add the smallest durable story-owned premise snapshot.

Preferred implementation:

add nullable versioned JSONB to `story`, e.g.

`premise`

validated through `premiseContentSchema`.

Authored Chamber stories may keep it `NULL`.

During `startFromCandidate(...)`, the exact owned draft revision is already locked.

Store:

- title;
- premise;
- storytellingDirection;

onto the new story in the same transaction.

Extend initialization retry matching so an existing story started with another premise/context cannot accidentally be accepted as an identical retry.

Do not recover story premise later by parsing the captured provider request.

Add migration and tests.

### 2. Define continuation-generation artifact schema

`preparePlayableContinuation(...)` already constructs most of the desired request.

Add an exported Zod runtime schema matching its immutable returned artifact.

Validate:

- inputVersion;
- promptVersion;
- task = continuation;
- source story/revision/view/passage/interaction identity;
- selectedOptionId;
- captured provider request.

Keep selected intention inside the frozen request context as today unless a clean first-class field significantly improves inspection; do not duplicate domain values unnecessarily.

The application must never need to parse the prompt to determine source identity.

### 3. Add explicit resolution persistence

Create a small `story_resolution` table.

Recommended fields:

- `story_id`
- `base_passage_id`
- `base_revision`
- `operation_id`
- `generation_id`
- `submission` JSONB
- `created_at`

Recommended invariants:

- generation ID unique;
- operation identity unique per story;
- one active/admitted resolution per base passage/revision.

Use foreign keys to story/passage/generation where practical without circular migration pain.

Do not store generated output here.

Generation remains owner of generation state/output.

### 4. Implement generic resolution admission

Add server module such as:

`story-resolution.ts`

Operation input:

- ownerId
- storyId
- operationId
- expectedRevision
- interaction submission

Inside one transaction:

1. validate IDs/request;
2. lock owned story;
3. require expected revision=current revision;
4. require current passage;
5. require `sourceGenerationId`;
6. load generation that produced current passage;
7. validate its output as `PlayableProposal`;
8. load story premise;
9. build ordinary snapshot/context required by `preparePlayableContinuation`;
10. validate the submission against current interaction;
11. call `preparePlayableContinuation(...)`;
12. insert/recover the continuation `generation`;
13. insert/recover `story_resolution`;
14. enqueue one outbox notice.

If an identical operation already exists:

- return/recover it.

If operation ID is reused with different submission/source:

- conflict.

If a resolution already exists for the same passage with a different operation:

- conflict/busy according to the smallest existing error vocabulary.

Do not use the Chamber fixture resolver.

### 5. Add scripted continuation generation kind/topic

Introduce a deterministic offline continuation generation:

Suggested kind:

`continuation.playable.scripted.v1`

Suggested topic:

same semantic versioned identity.

Use the generic generation machinery where practical.

The fake result must be a valid `PlayableProposal`.

It must not depend on known opening fixture option IDs.

Return one stable immediate continuation with another valid choice.

No waits.

No effects.

No decision deadlines.

No provider SDK.

### 6. Add Temporal workflow/activity

Add a bounded scripted continuation workflow similar in spirit to scripted opening.

The Activity should:

- find the admitted resolution;
- complete its fake generation idempotently;
- publish/commit the result through normal story continuation logic.

Keep workflow history reference-only.

Do not put proposal prose/context in Temporal history.

Register topic dispatch and worker activity.

### 7. Commit generated result safely

Extend generic continuation insertion so a generated next passage can store its `sourceGenerationId`.

Prefer adding an optional internal commit argument rather than exposing generation ID through public HTTP `proposed` objects.

When publishing the resolution:

- convert proposal through `playablePresentation`;
- construct a valid `StoryContinuation`:
  - expectedRevision = base revision;
  - content = presentation.content;
  - interaction = presentation.interaction;
  - response = saved submitted interaction response;
  - no effects;
  - no wait;
  - no decision;
- transition identity must be stable/idempotent, preferably resolution/generation identity;
- commit using existing `commitStoryContinuation`.

Before commit, recheck:

- resolution still belongs to current story/base revision;
- story has not advanced;
- source passage still matches;
- result is valid.

A stale successful generation remains evidence but does not mutate current story.

### 8. Expose pending resolution safely

Extend story read contract with minimal public resolution state.

Avoid leaking generation internals.

Suggested snapshot addition:

```ts id="xwjn0u"
resolution: null | {
  state: 'pending' | 'running' | 'failed' | 'uncertain'
}
```

Only expose it for a resolution attached to the current passage.

After successful passage advancement, normal story state supersedes it and `resolution` returns null.

If result generation has succeeded but publication is still in retry/recovery, choose a truthful presentation state rather than pretending the story advanced.

Keep public API small.

### 9. Add resolution endpoint

Add:

`PUT /api/stories/:storyId/resolutions/:operationId`

Body may reuse existing response shape:

- expectedRevision;
- submission.

Return the current story snapshot including pending-resolution state.

Use existing origin/auth/error conventions.

Do not change Chamber's `/responses/...` fixture route yet.

### 10. Enable live choices

Update `/play/:id`.

Add a small client hook/component only as necessary.

Behavior:

- choices enabled when there is an interaction and no active resolution;
- click creates stable operation ID and submits resolution;
- pending disables choices;
- poll while resolution is pending;
- successful advancement renders passage 2;
- conflict refreshes authoritative snapshot;
- failed/uncertain displays an honest message;
- retry retains same operation identity when delivery outcome is unknown.

Do not implement regeneration or changing intention after accepted admission.

### 11. Extend Chamber inspector

When inspecting a generated story with active resolution, display safe developer diagnostics:

- operation ID;
- base passage/revision;
- generation ID;
- generation kind/state;
- selected option ID if available;
- proposal once produced;
- hidden intention only in developer inspector where safely derivable.

Keep inspector read-only.

No Chamber control panel yet.

### 12. Tests

Focused AI tests:

- continuation artifact runtime validation;
- arbitrary option IDs;
- proposal/snapshot matching;
- selected hidden intention preserved in request.

DB/server tests:

- story premise frozen during Start;
- Chamber story may have null premise;
- resolution admission;
- operation retry;
- conflicting operation reuse;
- competing option rejection;
- source-generation lookup;
- malformed/missing provenance rejection;
- stale revision rejection;
- fake generation completion;
- successful single commit;
- resulting passage provenance;
- repeated worker/activity completion does not duplicate passage;
- stale completed result does not mutate advanced story.

API/browser:

- live choice becomes clickable;
- accepted resolution appears pending;
- reload while pending recovers;
- eventual passage 2 appears;
- passage 2 option can also be admitted generically;
- hidden intentions absent from public response.

Regression:

- existing Chamber responses;
- waits/deadlines;
- item transfer;
- Start from candidate;
- Chamber inspector.

### Verification

Run focused suites first.

Expected:

1. AI package tests.
2. DB migration/integration tests.
3. generated-story server tests.
4. generation/outbox/worker integration tests.
5. browser live-story test.
6. Chamber regression tests.
7. `pnpm chamber --smoke`
8. `pnpm typecheck`
9. `pnpm lint`
10. `pnpm format:check`

Run the broader repository test command if shared story/generation contracts changed broadly.

### Documentation

Update permanent docs after implementation:

`docs/technical/story-lifecycle.md`
- document generated resolution admission and pending state.

`docs/technical/storyteller-runtime.md`
- document exact proposal provenance and fake continuation path.

`docs/progress.md`
- mark connected generic generated progression accurately.

`docs/development.md`
- mention fake continuation remains provider-free.

`docs/features/README.md`
- add this active feature.

Do not claim:

- real AI;
- waits generated by storyteller;
- general autonomy;
- memory/context retrieval beyond current input;
- earned-life activities.

### Exit condition

Stop when a generated live story can:

1. display a generated choice;
2. accept it as an intention;
3. persist an asynchronous resolution;
4. survive reload/worker execution;
5. receive a deterministic validated storyteller proposal;
6. commit exactly one next generated passage;
7. preserve proposal provenance;
8. offer another generically resolvable generated choice.

No live provider calls.

No waits/effects.

No free text.

Commit and push, then stop.

## Current checkpoint

- Current phase and exact next action: Phase 1 implemented and verified; ready for review.
- Base/reviewed revision: `87688290ba7612a2617a2a5b23ef244ad3c08ea0`.
- Relevant uncommitted changes: Phase 1 implementation in the working tree.
- Checks run: AI playable tests 5/5; contracts tests 7/7; db integration 9/9; package `tsc` for contracts/db/ai/workflows/server/worker/api and web `tsc --noEmit` plus `next build`; eslint on changed TS files `--max-warnings 0`; `story-resolution.integration.js` 6/6 including browser pending/reload and worker restart; `story-start.integration.js` 5/5; `stories-http.integration.js` 4/4; `python scripts/check_docs.py` 43 files, 0 broken links. Full `pnpm typecheck`/`pnpm lint`/`pnpm format:check`/`pnpm chamber --smoke` and the combined stories suite were not run because pnpm is unavailable on PATH and the laptop-aware rule prefers focused checks.
- Known design issue resolved by this plan: live story premise is structured durable story state rather than recovered from captured provider request text.
- Provider spend: zero; no live provider authorized or required.