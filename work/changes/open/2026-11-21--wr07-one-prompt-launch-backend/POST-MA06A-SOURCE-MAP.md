# WR07B | Source-grounded direct Play backend map

**PLANNING ONLY, NOT CURSOR-READY.** Inspected live `undertaking/storyteller-workshop` after WR05P1/WR07M/WR08A and before WR05P2/WR07N/WR07L. Planned integration target is always `undertaking/storyteller-workshop`. The three predecessor Changes are owner-commissioned but their final interfaces remain unverified. Tests NOT run by planner. Product contract: `docs/product/experience/entry-and-onboarding.md`; technical: `docs/technical/engine/selected-architecture.md`.

## Entry-to-commit path (verified source)

| Anchor | Current facts | Decided WR07B edit |
| --- | --- | --- |
| `packages/contracts/src/story-launch.ts` | Stable client request/status including `operationId`, source-pinned prompt/preset, pending/preparing/composing/held/failed/uncertain/ready | Reuse exact parser, do not invent second DTO or authorize costs based on client hints |
| `apps/web/src/features/stories/use-story-launch.ts` | Frozen PUT `/api/stories/launch/:operationId`; on 202/lost reply GET same ID; only ready redirects to `/play/:storyId` | Return schema-valid status; preserve no duplicate command semantics. Web feature flag stays false until real backend |
| `apps/api/src/modules/stories/controller.ts:StoriesController.run` | `IdentityService.requireUser` supplies string `ownerId`; maps StoryError 400/404/409/503 | Static `@Put/@Get('launch/:operationId')`, validate URI=body ID and call seam, not direct SQL |
| `apps/api/src/modules/stories/game-authority-client.ts:StorySeam,callGameAuthority,create{Local,Remote}StorySeam` | Existing embedded/remote modes, bearer and `x-offscreen-actor-id` remote contract | Add typed `admitLaunch/readLaunch` to BOTH modes, no silent local fallback when distributed |
| `apps/api/src/app.ts:createApp` | Constructs `storySeamFor(stories, storyAuthority)`, Nest injects `STORY_SEAM` | Compose a GA-backed local launch owner with DB/DocumentStore and remote client dispatch |
| `apps/game-authority/src/server.ts:routeFor,handle` | Validates story role, actor regex `^[A-Za-z0-9_-]{1,128}$`; route parser no launch | Private `PUT/GET /internal/v1/stories/launch/:operationId` with existing story-role token and actor, not executor/public credentials |
| `apps/game-authority/src/application.ts:createGameAuthoritySeam`, `bootstrap/main.ts` | Story read/start/fork/resolve, Database and DocumentStore injected | GA owns Launch admission/status and first-scene commit; extend one seam, avoid extra service |
| `packages/story-engine/src/stories/initialization.ts:initializeStoryInTransaction` | Writes story and first passage in same TX; passage UUID random unless supplied by staged passage; v1-only checkpoint condition at old snapshot | Call WR05P2 v2 opening publisher with exact `reservedFirstPassageId`, no invented passage. Ensure selector and Launch ready commit together |
| `packages/story-engine/src/stories/scene-checkpoint.ts:{stageSceneCheckpointObject,insertStagedSceneCheckpointSelector}` | CAS verification outside SQL lock, selector under story lock | Reuse both and WR05P2 semantic equality; no shortcut publication |
| `packages/story-engine/src/stories/start.ts:createStoryStart` | Legacy draft/candidate start | **Do not** reuse mandatory draft workflow as direct Play |
| `packages/story-engine/src/storyteller/writer-mission-store.ts:insertWriterMissionParentStep` | Inserts mission + first step inside its OWN transaction; `contextId=missionId` | Add a transaction-accepting helper (retain wrapper) so generation/operation/mission/step/outbox admit atomically |
| `packages/story-engine/src/storyteller/writer-loop.ts:runWriterMissionModelRound` | Runs deterministic bounded mission round with `scriptedDecisionBody`; no live-model transport in this function | Use for no-spend scripted vertical; real provider transport is later explicitly guarded work, not implied |
| `packages/story-engine/src/storyteller/writer-scene-proposal.ts:acceptWriterSceneProposal` | Validates staged object hashes and rooted citations, old result only summary/provenance | After WR07N: accept *validated opening scene content and interaction*, no summary-as-passage |
| `packages/storyteller/src/tasks/writer-mission.ts:writerMissionCaptureV2OpeningSchema` | Opening `sceneScope` has reserved story/passage UUIDs, but `ownerId` is currently `z.uuid()` | V2-opening ownerId must use authenticated string-actor grammar. Preserve v1 byte/hash replay and v1 UUID parser |
| `packages/db/src/schema/storyteller.ts:storytellerWriterMission.ownerId` | SQL UUID while `story.ownerId`, `generation.ownerId`, `storytellerOperation.ownerId` and `user.id` are TEXT | Post-WR07L migration to TEXT (`USING owner_id::text`); every mission owner must match trusted generation/operation/launch actor. No fake UUID mapping |
| `packages/db/src/schema/storyteller.ts:storytellerOperation` | Keyed by `generationId`, account/run FK and cumulative finite spend | Launch UUID != generation UUID. WR07L row captures relation, one existing funding/round envelope |
| `packages/story-engine/src/storyteller/writer-mission-custody.ts:reserveWriterMissionProviderAttempt` | Existing attempt state/reservations, includes a global uncertain-attempt guard | Do not weaken safeguards. Known concurrency failure needs separate source-grounded negative proof before live-provider enablement |
| `apps/worker/src/outbox/dispatch.ts:noticeDispatch,dispatchedNoticeTopics` | Stable topic→workflow deterministic mapping; no Writer Launch wake | Add topic `story.launch.v1` with workflow identity `story-launch/<operationId>`; outbox row carries ID only |
| `packages/workflows/src/{contracts,index}.ts` | Legacy storytellerV1 and distributed old `StorytellerTask` path; no Writer mission workflow | New `storyLaunchV1(operationId)`, activities idempotent and bounded, reload SQL/capture every wake |
| `apps/worker/src/runtime/index.ts` and `activities/index.ts` | Local `offscreen-local` worker with DB and application services | First no-spend vertical uses this local path, not the current distributed executor |
| `apps/worker/src/activities/storyteller-distributed-execution.ts` | **Rejects** provider mode for old StorytellerTask | Never pretend new Writer mission already runs here |

## Canonical IDs and joins

```
session ownerId (string) + client operationId (UUID)
       -> WR07L story_launch(ownerId,operationId)
           requestHash, exact source, reservedStoryId, reservedFirstPassageId
           generationId (assigned once)
           -> generation(ownerId TEXT)
           -> storyteller_operation(generationId, ownerId TEXT, funding/run/budget)
           -> storyteller_writer_mission(ownerId TEXT after migration, generationId)
           -> storyteller_writer_step(contextId=missionId, ordinal=1)
           -> outbox(story.launch.v1, operationId)
               -> Temporal storyLaunchV1(operationId)
               -> bounded Writer rounds/proposal/citation proof
               -> GA single scene-one SQL commit:
                  story + story_passage + v2 selector + story_launch.ready
```

No CAS or provider call under SQL story lock. On crash before SQL ready, an unselected CAS object is inert. Duplicate outbox/workflow wake reloads the same row. Foreign-owner GET must return same 404 as missing. Immutable request-hash conflict returns 409, never another generation/charge.

## Release-time factual checks, not architecture design requests

- WR05P2: exact first-scene v2 publication API and how reserved passage ID is supplied.
- WR07N: actual final proposal union and validated v2 scene body/interaction fields.
- WR07L: exact ledger exports, SQL migration and public status projection.
- Verify script fixture can use **disposable seeded** funding/operation rows; production launch with no valid owner grant returns held rather than fabricating free funding.
- Existing `@offscreen/storyteller` Writer emits a **scripted** round only. A real provider model path requires separate configured/authorized transport and paid negative proof. The default-enabled setting remains false.

Source inspections here are not tests and do not authorize paid model calls.
