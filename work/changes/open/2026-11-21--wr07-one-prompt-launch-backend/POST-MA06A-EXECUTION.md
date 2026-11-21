# WR07B | Selected direct Play admission, wake, publication and recovery algorithm

**PLAN, not commissioned.** The public contract is selected in `docs/product/experience/entry-and-onboarding.md` and `packages/contracts/src/story-launch.ts`; technical authority in `docs/technical/engine/selected-architecture.md`. [Source map](POST-MA06A-SOURCE-MAP.md) was inspected on `undertaking/storyteller-workshop` before WR05P2, WR07N and WR07L landed. Reconcile only their exact exports and committed checks before marking this Ready. No provider spend or implementation was performed by ChatGPT.

## 0. Distinct identities and immutable source

```
Web operationId = UUID chosen by browser; unique only per authenticated ownerId (TEXT).
GA ledger PK = (ownerId,operationId), requestHash = SHA256(canonical parsed request).
GA reservedStoryId = globally UNIQUE UUID; reservedFirstPassageId = globally UNIQUE UUID.
Writer generationId = a third UUID frozen once before first mission insert.
Writer missionId = own UUID with associated generationId; operationId in storyteller_operation = generationId.
Outbox.operationId = reservedStoryId (NOT client operationId); workflow story-launch/<reservedStoryId>.
```

A worker never locates a Launch by client operation ID alone, since **two different owners can legally reuse the same UUID** under WR07L's composite primary key. By reservedStoryId unique lookup the worker gets the owner and stored request without leaking either into Temporal history.

## 1. Admission, GET and eventual public enablement

Nest `StoriesController` validates `storyLaunchRequestSchema` and URL/body operationId equality. `StoriesController.run` authenticates `IdentityService.requireUser`. It calls `StorySeam.admitLaunch/readLaunch`, never the local DB directly. `createLocalStorySeam` delegates to an injected `createGameAuthorityLaunch` built in `apps/api/src/app.ts`; remote `createRemoteStorySeam` calls **story-role** private GA `PUT/GET /internal/v1/stories/launch/:operationId` with the existing bearer/actor/version headers. `game-authority/src/server.ts:routeFor/handle` adds static Launch routes and validates actor against `gameAuthorityActorIdSchema`.

The private GA handler resolves original owner from its authenticated header and sends no generation internal/captured source to caller; returns only `storyLaunchStatusSchema`. Same-body/idempotent PUT returns current status; different same-ID body returns 409, unknown/foreign GET 404. Unavailable GA/storage/worker returns 503 or server-side `held`; **no fallback** to an insecure embedded writer when the configured remote seam is absent. The public Web flag stays OFF until a full scripted end-to-end journey is proven. An HTTP 202 with no body causes Web to GET existing UUID.

## 2. Split source preparation from SQL side effects

WR07L already creates `pending` + immutable original prompt/preset pin, reserved IDs, and a durable owner/revision/time identity. On worker preparation, read this ledger row by **reservedStoryId**, obtain owner and requested source, and freeze effective server-managed invention, model/profile, Library access and spending authority. If policy forbids the request, persist `held:policy` without cost. If no valid owner funding grant for provider use, persist `held:authorization`. Tests may seed disposable funding rows but **production must never mint a synthetic account**.

CAS phase occurs **outside SQL story/launch locks**. For freeform prompt persist `STORY_PROMPT.md` verbatim under a deterministic **Library-v2** root: `@offscreen/documents:createEmptyLibraryIndex` → `canonicalDocumentSchema` with `stableNamespacedDocumentId('story-launch',reservedStoryId,'STORY_PROMPT.md')` → `applyLibraryBatch([{op:'create',entry}])` → `putLibraryNode` for the new trie nodes → `putLibraryRoot`. Use `revision=1`, non-secret source authority and visibility consistent with original player intent. **Do NOT call `stageStoryBootstrapDocuments` for this first source root**, because current `stories/passage-documents.ts` constructs a v1 manifest; a Writer's Workdesk expects v2 Library root. For preset, validate the exact pinned rootHash and start package metadata; never refetch mutable preset content by name after acceptance. Supply pinned profile/skills and capture hashes to the Writer. CAS objects are immutable and inert until the later SQL record points to them; retries reconstruct the same object hashes from the stored request and reserved IDs. The full `writerMissionCaptureV2Opening` captures ownerId (TEXT actor), `reservedStoryId`, `reservedFirstPassageId`, root/revision, profile/skills, finite tool grants and model selection/budgets. No fabricated `sceneFrontier`, campaign, title, character or draft preview.

**Owner-ID fix as a reversible migration:** the current `storyteller_writer_mission.owner_id` is UUID, but login `user.id`, `generation.owner_id`, `storyteller_operation.owner_id` are TEXT. Change **only** the new v2 opening capture's `ownerId` parser to the existing actor-ID regex; keep v1's UUID parse/hash unchanged. Convert SQL writer-mission column UUID→TEXT using `USING owner_id::text` in the first available migration after WR07L, preserving existing UUID values. Enforce cross-row owner equality in mission admission and dispatch; do not invent UUID aliases or accept foreign owner matches.

## 3. Atomic mission and durable wake, no duplicate source/cost

Once CAS source and effective capture is frozen, an SQL transaction locks the launch row (owner scoped by reservedStoryId), checks current state and capture hash, and (if generation not yet recorded) inserts:
- `generation` row with captured typed Writer round task and true authenticated owner, stable generated `generationId`;
- `storyteller_operation` row keyed by generationId with actual authorized accountId/runId/finite resources. One cost envelope for all child rounds, no resetting on retry;
- Writer mission + first step rows through a new transaction-taking variant of `insertWriterMissionParentStep(tx, ...)`, with existing public wrapper delegating to that variant to preserve WR03 tests;
- `story_launch.generation_id` and state `preparing/composing`;
- exactly one `outbox(topic='story.launch.v1',operationId=reservedStoryId)` notice.

If an identical SQL wake races or repeats, the existing launch generation identity is reused and no new mission or funding allocation is created. A process crash after CAS stage but before SQL commit leaves unselected objects only; a crash after transaction returns one committed generation+outbox. **Never** start Temporal before committing the outbox/mission receipt. A change in owner effective grant before dispatch must be checked again by existing funding authority; capture alone is not spending permission.

## 4. Worker orchestration: source-recoverable, zero-spend first

Add a `storyLaunchV1(reservedStoryId)` workflow in `packages/workflows/src/{contracts,index}.ts` and a `story.launch.v1` entry in `apps/worker/src/outbox/dispatch.ts`, using deterministic workflow ID `story-launch/<reservedStoryId>`. Temporal history contains only the UUID, not private prompt/body/root. The **local `offscreen-local` Worker** registers a Launch Activity that:
1. Loads the unique launch+mission+step from SQL, verifies frozen generation/capture hashes and owner;
2. Runs one finite Writer model/tool step via `prepareWriterMissionModelStep` and `runWriterMissionModelRound` with **scripted transport for zero-cost proof**; never replays a settled or uncertain attempt to a transport;
3. If tools complete, advances to the next bounded ordinal based on the existing mission budget; if proposal ready, requests Game Authority first-scene publication; held/failed/uncertain ends with honest persisted public status and no automatic new dispatch;
4. On redelivery/restart, re-reads the SQL step/launch statuses before any work.

The current distributed `storytellerDistributedV1` is **not** a Writer workflow and its executor refuses provider mode. Do not wire it as a shortcut. Live provider transport requires an independent, explicitly budget-authorized implementation and controlled test; do not claim the default scripted path is real model generation.

## 5. A scene proposal becomes truth only under Game Authority

WR07N final v2 Writer proposal adds `scene:{content,interaction}`. Extend `writer-scene-proposal.ts:acceptWriterSceneProposal` to verify source evidence, root hashes and exact typed scene content/interaction; do not use its `summary` as passage. Use the root snapshot and staged documents chosen by mission; no model output writes character/mechanics truth without an admitted campaign/preset start policy. For original freeform narratives with no mechanics, `mechanicsAbsent` remains legitimate. First scene fictional time is zero unless a genuinely admitted opening says otherwise.

Call WR05P2's authoritative scene-v2 bootstrap with pre-reserved story/passsage UUIDs; ensure `initializeStoryInTransaction` does not allocate a new passage ID if `reservedFirstPassageId` is present. Prestage Library and checkpoint with CAS outside SQL lock. Under one DB transaction verify actor, exact launch hash, succeeded generation/accepted proposal, source root and checkpoint after-state; insert story, passage, v2 selector and **update launch state='ready',sceneSequence=1** atomically. Replay of the same generation returns the existing story and selector; conflicting proposal/source/publication fails 409 and leaves launch not-ready. No partial SQL or notification on CAS/SQL conflict.

## 6. Recovery and denial matrix

| Fault/action | Required outcome |
| --- | --- |
| Two owners use same client operation UUID | Different rows, no cross-owner GET; independent reserved story IDs and distinct outbox wake UUID |
| Same owner/UUID, same request, repeated HTTP PUT | Same requestHash/reserved IDs/generation/status; no new Writer attempts |
| Same owner/UUID, different prompt/preset | 409, no mutation/spend |
| Web loses PUT response | GET previous UUID; no new PUT by hook |
| Worker crashes after source CAS only | May leave inert objects; retries reconstruct same hashes; no playable story |
| Worker crashes after generation/outbox commit | One mission/outbox identity; workflow wake safe to redeliver |
| Writer provider delivery uncertain | Persist uncertain; **never** auto-dispatch a second paid attempt |
| Funding missing/stopped/revoked | Held, not auto-funded; no model call |
| Source root or cited object forged/swapped | Held/invalid, no story commit |
| First scene SQL transaction fails halfway | No ready/status, story/passage/selector partially committed |
| SQL commit succeeds, reply is lost | GET returns same ready storyId/sceneSequence; replay no second story |
| v1 Writer capture or existing v1 checkpoint | Old bytes/parse/hash and old start/fork semantics unchanged |
| Real provider not configured | Web public Launch disabled or held, never claim model-produced Play |

## Proof levels and release

**WR07B acceptance** is one real scripted **end-to-end** story with authenticated HTTP, session, persisted prompt, durable worker wake, Writer output, Game Authority first scene and v2 checkpoint, including owner/identity/money/crash negatives. The full Undertaking additionally requires explicitly authorized real-provider Writer execution and an evaluated long-story/fork/research journey; don't conflate them. Do not enable `STORY_LAUNCH_ENABLED` solely on a unit-test pass.

The implementation is one coordinated Change with the [microtask order](POST-MA06A-TASKS.md); the three active predecessor packet files are not modified or merged by planning. Only release it after inspecting WR05P2, WR07N and WR07L's actual integrated source and all critical failure tests.
