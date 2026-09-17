# Implementation plan

Feature: [Start a reviewed playable candidate](FEATURE.md)

Execution scope: one focused phase after `playable-opening-candidate` has completed and been reviewed.

Implementation owner: Cursor.

Reviewer: ChatGPT/Codex.

## Phase 1 — Convert the accepted candidate into live passage 1

Status: Complete.

### Dependency checkpoint

Before editing:

1. Pull/read current `main`.
2. Confirm the completed playable-opening-candidate implementation.
3. Confirm:
   - persisted successful output is a validated playable proposal;
   - public preview is a `playablePresentation(...)` projection;
   - hidden option intentions remain in generation output;
   - stale/current semantics are tested.
4. Read the final relevant contracts rather than assuming the previous planning document matches implementation exactly.

If those assumptions materially changed, adapt this plan while preserving its product outcome.

### Bounded implementation

#### 1. Add passage generation provenance

Add a nullable source-generation reference to `story_passage`.

Preferred shape:

`source_generation_id UUID NULL REFERENCES generation(id)`

Generate and review the Drizzle migration.

Export/access it through the existing story schema.

Do not make it mandatory because authored fixture passages have no generation source.

Do not add a generalized provenance/event system.

#### 2. Extend initialization internals minimally

The story initialization path must be able to insert an optional source generation ID on passage 1.

Preserve the current public chamber initialization behavior.

If necessary, extend `initialStorySchema` or an internal initialization contract with a nullable/optional source generation identity.

Update `initializationMatches(...)` so idempotent initialization also verifies source provenance when supplied.

Do not expose this field through HTTP bodies used by ordinary clients.

Server-selected initialization supplies it.

#### 3. Implement playable candidate Start

Add one server application operation responsible for starting a story from a candidate.

The operation receives verified application inputs equivalent to:

- `ownerId`
- `storyId`
- `candidateId`
- `expectedDraftRevision`

It must execute the authoritative validation and initialization within one transaction or equivalent race-safe boundary.

Validate:

- UUID shapes;
- candidate exists;
- owner matches;
- generation kind is the supported playable opening kind;
- generation state is `succeeded`;
- output parses as `playableProposalSchema`;
- task/source input is an opening candidate;
- candidate's source draft revision equals `expectedDraftRevision`;
- the owned draft still has that revision;
- `draft_opening` still identifies this candidate as its current generation.

Then derive:

`const presentation = playablePresentation(candidate.output)`

Create the story with passage 1 using:

- candidate-derived scene content;
- candidate-derived visible interaction;
- empty initial items unless the playable opening contract has deliberately gained supported items by this revision;
- source generation ID = candidate ID.

Do not copy option intentions into passage interaction.

Do not infer or generate anything.

#### 4. Preserve idempotency

A repeated Start using the same `storyId` and same candidate must return the existing initialized story.

A reused `storyId` whose existing first passage does not match the same candidate-derived initialization must conflict.

Use existing initialization matching behavior where practical.

Do not solve this with duplicate-story deletion/recreation.

#### 5. Add HTTP contract

Add a small Start request schema in the appropriate contracts package.

Suggested public body:

```json
{
  "candidateId": "<uuid>",
  "expectedDraftRevision": 3
}
```

Suggested route under the story resource:

`PUT /api/stories/:storyId/start`

The authenticated user supplies no owner identity and no generated content.

Return the ordinary `StorySnapshot` after successful initialization.

Map invalid/not-found/conflict consistently with existing story APIs.

Do not overload the chamber endpoint.

#### 6. Add preview UI Start action

When a candidate is:

- succeeded;
- current;
- valid for the currently loaded draft;

show **Start story**.

Generate/retain a stable story UUID for uncertain retry in the same spirit as existing chamber initialization.

Submit Start.

On success navigate to the canonical story page for that new story.

If Start returns conflict because the candidate became stale:

- keep the player on candidate review;
- refresh/reload current preview state;
- explain that the draft/candidate changed.

Do not automatically regenerate.

#### 7. Generated choices must not enter the fixture resolver

Inspect the live story view.

If ordinary generated choices would currently call chamber-authored resolution code, gate that interaction.

For this phase the generated opening may display its choices without permitting resolution.

Use an explicit presentation state such as "continuation not connected yet" if needed.

Do not teach the chamber resolver about arbitrary proposal option IDs.

This is critical.

#### 8. Tests

Add targeted coverage for:

- successful Start;
- passage content/interaction equal candidate presentation;
- passage provenance equals candidate ID;
- persisted proposal still contains hidden intentions;
- snapshot does not contain hidden intentions;
- reopen same story;
- identical retry;
- incompatible story-ID reuse conflict;
- stale draft revision rejection;
- candidate no longer latest rejection;
- foreign ownership rejection;
- candidate not succeeded rejection;
- malformed stored candidate rejection according to current error conventions;
- chamber initialization remains functional;
- generated visible choice cannot accidentally resolve through fixture-specific chamber policy.

Include a race-oriented integration test if existing test harness can reasonably coordinate:
- Start versus edit/regenerate/current-link change;
- assert either the valid Start commits before invalidation or Start conflicts;
- never commit from a candidate established stale before the locked validation.

Do not build elaborate concurrency test infrastructure solely for this case if existing transaction-level tests already establish the lock ordering; in that case document and test the relevant locked invariant directly.

### Documentation

After implementation:

- mark the feature active in `docs/features/README.md`;
- update creation/start sections of `docs/technical/story-lifecycle.md` to describe actual implemented behavior rather than the older planned asynchronous Start design where they differ;
- update `docs/progress.md`.

Be explicit:

**Now working:** saved draft → playable candidate → explicit Start → persistent live first passage → reopen.

**Still missing:** selecting a generated option and asynchronously resolving it into a new storyteller proposal.

Do not claim that generated story progression is connected.

### Checks

Run focused checks first:

1. DB schema/migration tests.
2. AI/playable proposal tests if touched.
3. server story/opening integration tests.
4. API start integration tests.
5. relevant browser test.
6. chamber regression tests.
7. `pnpm typecheck`
8. `pnpm lint`
9. `pnpm format:check`

Run broader repository tests if shared initialization/contracts changed sufficiently to justify them.

Review the final diff manually for accidental fixture coupling before committing.

### Exit condition

Stop when:

- an accepted current candidate can become persistent live passage 1;
- candidate provenance is preserved;
- reopen/retry/stale behavior is correct;
- generated choices are visible but cannot accidentally invoke authored fixture resolution;
- checks pass;
- no continuation generation has been implemented.

Commit and push.

Do **not** begin option resolution in the same Cursor turn.

## Current checkpoint

- Current phase and exact next action: Phase 1 complete. Do not begin option resolution. Reviewer: ChatGPT/Codex. Commit/push only when the owner asks.
- Base/reviewed Git revision: implementation based on `0a2dfbf` (`main`).
- Relevant uncommitted changes: this Start slice; preserve pre-existing local `docs/vision.md` and `docs/playthroughs.md` edits.
- Checks/results: `@offscreen/db` integration 9/9; API/web production build including `/play/[id]`; `@offscreen/api test:stories` 15/15 (chamber, item/timing, Start HTTP/DB/race, Chromium Start with disabled generated choices); eslint on changed TS files `--max-warnings 0`; `python scripts/check_docs.py` 41 files, 0 broken links. Full repo `pnpm typecheck`/`pnpm lint`/`pnpm format:check` not run because `pnpm` is not on PATH; package `tsc`/eslint/prettier were used instead. `test:auth`/drafts browser not rerun: Start coverage lives in the stories suite.
- Unresolved blockers: none.
- Provider spend and accounting certainty: no provider spend; all checks used scripted openings. Cumulative OpenRouter account usage was not verified this turn.