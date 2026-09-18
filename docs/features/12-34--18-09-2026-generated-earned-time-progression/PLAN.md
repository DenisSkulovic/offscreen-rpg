# Implementation plan

Feature: [Generated earned-time progression](FEATURE.md)
Execution scope: approved phases below. No live provider calls. No world-entity schema.
Implementation owner: Cursor.
Reviewer: ChatGPT/Codex.

## Phases

### Phase 1 — Continuation v2 contract and playable-slice recovery

Status: Implemented

Outcome: A versioned continuation result can express an immediate scene or one interval with a prepared arrival. A pure helper recovers the exact published playable slice from generation output plus source part. Existing v1 `PlayableProposal` records keep their meaning.

Dependencies: none.

Owning components:

- `packages/ai/src/playable-proposal.ts`
- `packages/ai/src/playable.ts`
- `packages/ai/test/playable.test.ts` and a focused continuation test

Contracts:

- Openings remain `playableProposalSchema` v1.
- New continuation results are version 2 with `content` published now and `next` of `choice`, `end`, or `interval`.
- `interval` carries fictional `gameDurationMs` and one `arrival` whose `next` is `choice` or `end`.
- An interval cannot also expose a current actionable interaction.
- Only one prepared future boundary. No effects. No real-wait field in storyteller output.
- `generationSourcePart` is `current` | `arrival`. Null means legacy single publication.
- `publishedPlayableFromGeneration({ output, sourcePart })` validates kind/version/output, selects the declared part, and returns that bounded scene/offer.
- Continuation prompt/artifact becomes `playable.v2` for new prepares. Persisted `playable.v1` continuation artifacts remain readable.

Checks: AI package tests for v2 immediate, timed, mixed/invalid duration, unique options, v1 compatibility, and exact hidden-intention recovery from an arrival slice.

Exit: helper and schemas exist; no persistence yet.

### Phase 2 — Passage provenance and retry identity

Status: Implemented

Outcome: Persisted passages identify which validated publishable part of a generation created them. Changing provenance cannot masquerade as an identical retry.

Owning components:

- `packages/db/src/schema/stories.ts` plus generated migration
- `packages/server/src/story-command-policy.ts`
- `packages/server/src/story-persistence.ts`
- `packages/server/src/story-continuation.ts`
- `packages/server/src/story-initialization.ts` / start (legacy null part)
- chamber inspector current provenance

Invariant: `source_generation_part` is null or `current`/`arrival`. Non-null part requires `source_generation_id`. Timing publisher copies the waiting passage's generation id and sets part `arrival` without parsing model output.

Checks: db integration after migrate; policy/retry equality coverage in existing story suites.

### Phase 3 — Translate generated intervals into existing waits

Status: Implemented

Outcome: Fake storyteller v2 timed output commits an in-progress passage and ordinary wait plan now; arrival stays prepared. Immediate v2 output still commits a playable scene. Application policy maps fictional duration to a short scripted real wait.

Owning components:

- `packages/server/src/scripted-continuations.ts`
- `packages/server/src/story-resolution.ts`
- `packages/server/src/story-timing.ts`
- a narrow `scriptedContinuationTiming` policy module
- `packages/ai` prepare/presentation matching through the new helper

Fixture policy: `realDurationMs = 2000` for generated intervals in this slice. Document that this is not campaign pace.

Preserve `continuation.playable.scripted.v1` processing kind/topic so Temporal dispatch stays the same. Version the stored prompt/output, not a second timing engine.

Exit: unit/server translation plus scripted complete() can produce waiting or immediate generated continuations.

### Phase 4 — Live `/play/:id` waiting controls

Status: Implemented

Outcome: Generated live stories show in-progress travel, fictional duration, persisted due time, Pause/Resume when controllable, polling, and reload survival. Shared snapshot transport helpers are extracted from Chamber only as far as that avoids duplication.

Owning components:

- `apps/web/app/stories/` transport helpers
- `apps/web/app/play/[id]/view.tsx`
- `apps/web/app/chamber/transport.ts` (re-export/adapt)

No client-authoritative countdown.

### Phase 5 — Integration evidence and permanent docs

Status: Implemented

Outcome: Targeted integration proves generated resolution → wait → reload → worker restart → pause past due → resume → one arrival → arrival choice → second generic resolution, plus v1 compatibility and stale fencing. Permanent docs and `docs/progress.md` describe only the connected loop.

Checks:

- AI tests
- db integration
- `story-resolution.integration.js` including browser `/play/:id`
- `story-start.integration.js` regression
- eslint on changed TS
- `python scripts/check_docs.py`
- `pnpm format:check` for non-ignored changed files

Do not run paid inference. Combined `pnpm test:auth` only if time allows after focused suites; it is now sequential.

## Current checkpoint

- Current phase and exact next action: Implementation complete; ready for ChatGPT/Codex review. Do not start the next feature from this slice.
- Base/reviewed Git revision: `9150a1b92153e277b7294d2d478b25471e80289d`.
- Relevant uncommitted changes: continuation v2, `source_generation_part`, generated wait translation, `/play/:id` waiting controls, sparse-world docs, closed finished feature folders, sequential integration launcher, Prettier ignore for generated Drizzle meta.
- Checks/results for this revision: `pnpm format:check` passed. AI tests 16/16. DB integration 9/9. `test:stories:resolution` 8/8. `test:stories:start` 5/5. eslint on changed TypeScript passed. `python scripts/check_docs.py` passed. Combined `pnpm test:auth` not rerun.
- Unresolved findings/blockers: generated worker-restart coverage proves departure after restart, not a second dedicated arrival-after-restart case; arrival still uses the existing interval executor already covered by chamber wait tests. Combined auth+stories integration not rerun after `--test-concurrency=1`.
- Provider spend and accounting certainty: zero; no live provider authorized or required.
