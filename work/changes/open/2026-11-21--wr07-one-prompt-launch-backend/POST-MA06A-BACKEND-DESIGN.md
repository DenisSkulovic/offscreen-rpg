# WR07B | direct Play backend after the scene-v2 publisher

**Status: next-wave backend DESIGN, not commissioned to Cursor.** Source: live `undertaking/storyteller-workshop` after MA06A (`1ac1dc58` + coordination doc), 2026-11-21; old WR07 product outcomes remain binding. This is a replacement for pre-refactor implementation routes, **not** permission to change source before WR07C/WR05 are in. WR07C writes Contracts now; WR05S writes DB checkpoint version now. The full Launch backend starts once WR05P has proven first-scene v2 commit.

## Chosen external command

- Authenticated **`PUT /api/stories/launch/:operationId`** with exact `StoryLaunchRequest` from `@offscreen/contracts/story-launch`. The URI operation ID **must equal** body `operationId`, otherwise 400. Return accepted `StoryLaunchStatus`, not fictional `ready` until a committed scene is verified.
- **`GET /api/stories/launch/:operationId`** owner-scoped status/resume. Return 404 for unknown or foreign operation to avoid existence leak. The response is a projection of committed rows, not an in-memory controller job.
- Idempotency key is `(authenticated ownerId, operationId)`. Same ID and exact canonical request SHA returns same operation/current status (even after HTTP loss). Same ID + different body rejects 409, no new story/generation/reservation. Do not accept `ownerId` in body.
- Owner-selected prompt or immutable pinned preset captures exact original bytes/effective source revision and hints. A placeholder `BAH` and a conscious galaxy remain valid; no mandatory character/title/rules.
- Server obtains current usage grant and launch policy independently. A client hint is not permission to bill or invent restricted world content.

## SQL authority: one minimal row, existing custody

Create a `story_launch` table in existing DB schema/migration owner only when WR05S migration has integrated:

```ts
story_launch = {
  ownerId: text, operationId: uuid, requestHash: sha256,
  source: jsonb,  // bounded exact accepted prompt or pinned preset + hints
  reservedStoryId: uuid, // allocated at admission, not yet a live story
  generationId: uuid | null, // existing generation/Writer mission eventually tied to attempt
  state: 'pending'|'preparing'|'composing'|'ready'|'held'|'failed'|'uncertain',
  sceneSequence: integer | null, // only ready and equals committed first scene
  publicReason: text | null,
  createdAt, updatedAt
};
PRIMARY KEY (ownerId, operationId);
UNIQUE (reservedStoryId);
```

No direct FK from `reservedStoryId` to `story` before publication, because `initializeStoryInTransaction` inserts the story **with** its first passage. A `ready` row has a linked committed `story`/passage/scene-v2 selector. Prefer `storyLaunch` as bounded lifecycle record; do not duplicate `storyteller_operation` attempt/cost counters.

**Status transition authority:** admission `pending`→`preparing`→`composing`, then `ready` only after committed scene 1; `held` on non-permission/insufficient sources/budget, `uncertain` for unknown paid delivery, `failed` terminal on validated bounded error. A retry reads instead of resetting terminal or uncertain states. No broad enum ladder implying all phases must happen; source-pinned preset may skip separate preparation.

## Critical WR03 contract extension: opening missions do not have a prior passage

**Live source observation (2026-11-21):** `packages/storyteller/src/tasks/writer-mission.ts:writerMissionCaptureSchema` currently freezes `version:'writer-mission.v1'` and requires `sceneFrontier:{passageId:uuid,narrativeRevision:positive,sequence:nonnegative}`. Existing `writer-round-request.ts:compileWriterRoundCapturedRequest` serializes that frontier into the pinned prompt. `writer-scene-proposal.ts` verifies storyId/root evidence. But **direct Play starts before scene one exists**. The old WR07 packet did not resolve this.

**Decided correction:** preserve `writer-mission.v1` for existing continuation/research work; add an **explicit v2 opening capture** discriminant in the pure `@offscreen/storyteller/tasks` grammar, e.g. `{version:'writer-mission.v2', sceneScope:{kind:'opening',reservedStoryId:uuid,reservedFirstPassageId:uuid}, ...existing pinned source/tool/profile/budget fields}`. For existing-scene v2 missions use `sceneScope:{kind:'continuation',sceneFrontier:existingV1Frontier}`. `WriterMissionCapture` becomes a versioned union; `compileWriterRoundCapturedRequest` emits the exact scope, not a fabricated historical passage. Existing v1 CAS bytes/validation stay unchanged; old mission replay parses as before. `storytellerWriterMission.storyId` remains the preallocated reserved story UUID, and the reserved passage UUID must be used by the eventual authoritative first-scene publication. No fake `story_passage` or draft story is inserted merely to satisfy the mission compiler.

**Concrete implementation placement:** WR07B owns `packages/storyteller/src/tasks/{writer-mission,writer-round-request}.ts` plus focused unit fixtures, then `packages/story-engine/src/storyteller/{writer-loop,writer-scene-proposal,writer-mission-store}.ts` for union-compatible pin/evidence handling. It may reuse `insertWriterMissionParentStep` (current helper inserts mission and first step) and `runWriterMissionModelRound` (current model round/custody/tool processing), but creates a **single explicit launch-owned admission/orchestration adapter** rather than a duplicate Writer loop. Maintain existing external operation budget and `writer-mission-custody.ts` dispatch guards. Test v1 replay and v2 pre-scene scope, default-deny attempt authority, and opening passage identity continuity.

## Admission and worker orchestration

1. Controller authenticates via existing `StoriesController.run`/IdentityService and parses WR07C DTO.
2. In a short SQL transaction, insert launch row with captured immutable request hash, exact source and reservedStoryId allocated **once**. Unique conflict: compare stored hash under row lock and return existing state or 409. No provider call/CAS under transaction.
3. Stage `STORY_PROMPT.md` and optional `START.md`/profile/source refs in existing content-addressed Library; commit a pinned root for the reserved story scope. Any repeat uses the same captured source identity, no current mutable preset read. Keep creator documents referenced by hash, not copied in bulk.
4. Admit one Generation/Storyteller Writer mission under `storytellerWriterMission` and `storytellerOperation` existing custody, using the captured owner, root, source identity and effective budget policy. **Reuse** `writer-workdesk.ts` stage revision + `storytellerWriterStep` journal. `generation` has a user owner FK but no story FK; Writer mission stores `storyId` without FK, so it can reference the reserved identity before `story` exists. Before implementation verify the mission-admission entrypoint and any other code's existence assumptions; a direct SQL insert from controller is forbidden.
5. Dispatch through the existing guarded worker/outbox path, with idempotent source-generation identity and current spending-authority check. Unknown transport outcome sets/keeps uncertain, not a second attempt. No implicit paid testing.
6. Worker completes the Writer proposal, stages passage/root and v2 scene state using WR05P, then Game Authority runs authoritative `initializeStoryInTransaction` / equivalent one-scene commit for reservedStoryId **once**. First scene has no elapsed clock merely because prep took minutes. The writer's source pins/offer and resulting root must match captured mission.
7. In the same local SQL transaction that selects first scene, mark launch `ready` with committed scene 1; if execution crosses a remote boundary, record a durable publication receipt and reconcile launch status from it without falsely returning `ready` before SQL committed. A second completion/replayed wake finds same selector, no duplicate story or charge.
8. GET status projects the owner's launch row. UI's uncertain PUT delivery uses GET; disabled/delayed GET is harmless. No hidden prompt/chain-of-thought exposure in returned status.

## Actual source anchors and system seams

- `apps/api/src/modules/stories/controller.ts`: `@Controller('stories')`, `run` with `IdentityService.requireUser` and `StoryError` mappings, `@Put(':id/start')` legacy route. Add **static** `launch/:operationId` routes before dynamic story routes to avoid accidental conflict; maintain current API auth.
- `apps/api/src/modules/stories/game-authority-client.ts:StorySeam` and `apps/game-authority/src/application.ts:createGameAuthoritySeam` provide embedded/remote GA model. Design Launch as a single GA-owned writer command/receipt; no path may fall back to insecure embedded-only write merely because remote mode is unavailable.
- `packages/story-engine/src/stories/initialization.ts:initializeStoryInTransaction` writes story and first passage from reservedStoryId, with already-known idempotent conflict handling. **Do not** create a placeholder story that prematurely appears playable.
- `packages/story-engine/src/stories/start.ts:createStoryStart` is **legacy draft opening** (requires candidateId + expectedDraftRevision); it is not a valid backend for one-prompt Play. Reuse its safe source/pin/checkpoint operations, not its mandatory draft/candidate lifecycle.
- `packages/db/src/schema/storyteller.ts:storytellerWriterMission` (~957) has one `generationId`, `operationId`, `ownerId`, `storyId`, capture SHA, immutable root/revision and stage revision; `storytellerWriterStep` (~1053) has context-id and attempt identity. `packages/story-engine/src/storyteller/writer-workdesk.ts` owns revisioned stage CAS, locking and tool journal; do not duplicate this logic.
- `packages/db/src/schema/generations.ts:generation` has `ownerId` and no story FK; `storytellerOperation` in storyteller schema is keyed by generation ID and owns rounds/token/cost allowance. Use that existing custody and its single operation envelope.
- `packages/story-engine/src/stories/reads.ts:readHistoricalScene` and `scene-checkpoint.ts:insertStagedSceneCheckpointSelector` own published history identity; no client-generated scene ID or fake completion.
- `apps/web/src/features/stories/` launch UI/transport is owned by separate WR08A successor packet, not this backend.

## Planned bounded Cursor tasks (not yet dispatchable)

T01 SQL launch row + canonical request/owner hashing, migration, same-id/conflicting-id/foreign-owner negatives.
T02 source-root capture + Writer mission admission and original-world prepared preset routing, no paid dispatch.
T03 worker/attempt dispatch+recovery, held/uncertain budget fences, duplicate wake proofs.
T04 Game Authority v2 first-scene publication, atomic ready reconciliation, lost HTTP/collision/restart proof.
T05 Nest PUT/GET authenticated seams, integration scripted provider tests, docs + archive + squash integration.

**One remaining source-specific blocker for packet release:** enumerate the actual WR03 **mission-admission entrypoint**, worker topic and provider-custody transition now used by initial generation. The available source **does** provide `writer-mission-store.ts:insertWriterMissionParentStep`, `writer-loop.ts:{prepareWriterMissionModelStep,runWriterMissionModelRound}`, `writer-scene-proposal.ts:acceptWriterSceneProposal` and `writer-mission-custody.ts:advanceWriterMissionProviderStep`. What is still unproved is the host's durable wake/outbox route from Launch admission through those functions and the exact activation of a provider-authorized mission. Before commissioning WR07B, ChatGPT must map that host route and ensure versioned opening `sceneScope` is supported without creating a ghost passage; the algorithm above decides its intended behavior. This is not a reason to block WR05P/WR08A execution.

## Critical tests

Same UUID + same request after lost PUT response never creates a second generation, source root or charge; same UUID/different request =409; foreign user =404; preset source root swapped after capture cannot contaminate mission; unknown provider delivery returns uncertain without auto-dispatch; no owner grant cannot spend; crash between CAS stage and SQL commit yields no playable story; ready always has story+passage+scene selector with identical root; narrator creative delay advances **zero** fictional seconds absent admitted activity. Run zero-spend scripted fixture first; any funded model test requires explicit new owner approval.
