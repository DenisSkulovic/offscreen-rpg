# WR07 | Direct Play: real Writer output, durable wake and first-scene admission

**Status:** source-grounded design for post-WR05P2 Launch backend, **not commissioned**. Target integration `undertaking/storyteller-workshop`; planning branch `planning/wr05-post-state-and-play-pipeline`. Current source checked 2026-11-21, after MA06A/WR05S/WR07C and before WR07M/WR05P2. This document resolves product/algorithm decisions and names the one missing implementation seam, without changing live code or claiming test execution.

## Target

A player types one arbitrary Story Prompt (or selects a version-pinned prepared experience) and gets **one actual committed playable first scene**. No draft, wizard, preview, fake first passage or new paid attempt on retry. A durable Launch operation is reconnectable by authenticated owner/operation ID. First scripted fixture execution precedes any provider-backed trial. Do **not** claim model-backed generation works until a real Writer runner is registered and custody verified.

## Actual source findings (avoid false assumptions)

- `packages/contracts/src/story-launch.ts`: WR07C already defines strict `{operationId,source,hints?}` and status `pending|preparing|composing|ready|held|failed|uncertain`. Web WR08A uses `PUT/GET /api/stories/launch/:operationId`.
- `packages/storyteller/src/tasks/writer-mission.ts:writerMissionCaptureSchema` v1 requires an **existing** `sceneFrontier.passageId`. WR07M ready packet introduces **v2 opening** `sceneScope:{kind:'opening',reservedStoryId,reservedFirstPassageId}` while retaining old v1 captures unchanged.
- `packages/story-engine/src/storyteller/writer-mission-store.ts:insertWriterMissionParentStep` already inserts Writer mission and first step in an existing TX; `writer-loop.ts:runWriterMissionModelRound` runs bounded rounds with `writer-mission-custody.ts` attempts and `writer-workdesk.ts` tool journal. These are **functions**, not a durable HTTP/worker Launch pipeline.
- `writer-scene-proposal.ts:acceptWriterSceneProposal` proves staged CAS hashes and rooted citations, but its accepted result is only `{summary,stagedObjectHashes,sourceEvidence}`. **It does not include validated scene prose, player interaction or a complete first-scene outcome.** Treating `summary` as a playable passage would be a false feature.
- `apps/worker/src/activities/storyteller-distributed-execution.ts` handles old `StorytellerTask` and explicitly refuses provider mode. The current outbox registry and Temporal workflows have **no Writer Launch wake**. Reusing the distributed old task worker without a new route silently fails.
- `apps/worker/src/runtime/index.ts` is the local `offscreen-local` worker with DB, DocumentStore through StorytellerOptions and outbox relay. `packages/workflows/src/index.ts` already has simple idempotent workflow activity patterns; `apps/worker/src/outbox/dispatch.ts` maps stable notice topics to workflow type/ID.
- `packages/story-engine/src/stories/initialization.ts:initializeStoryInTransaction` creates first `story` and `story_passage` atomically; `story-engine/src/stories/start.ts:createStoryStart` is legacy candidate/draft only. Do not insert a fake draft or placeholder playable story to feed Writer.
- WR05P2 planned publication ensures v2 first-scene selector and semantic after-state. Backend must call that exact authoritative route, not perform a second shortcut publication.

## Decisions

### 1. Writer's final opening output needs explicit content

Version the Writer final-scene proposal for opening missions: retain legacy `writerSceneProposalSchema` version 1 and its accepted hashes; add **opening proposal v2** with required `scene:{content:passageContentSchema,interaction:interactionSpecificationSchema|null}` and the existing summary/staged-object/source-evidence pins. The writer can still stage and revise Library documents using Workdesk; the final scene body is explicitly validated against the established `@offscreen/contracts/stories:passageContentSchema` (title, 1–10 paragraphs, each max6000 characters). **No implicit `SCENE.md` path or arbitrary Workdesk document is promoted to a scene**. The final scene is a candidate only until Game Authority validates ownership, source root, pinned evidence, prescribed mechanics/world rules, and commits it. A bounded output fits current Writer budgets by producing a concise opening; overlarge body is rejected/held rather than truncating or raising financial limits.

Avoid gratuitous new model schema for output: export one `writerOpeningSceneProposalV2Schema` and widen `writerRoundDecisionSchema` final proposal using the existing version union; v1 continuation remains bit-for-bit valid. A later Writer-creation Change can prepare this subcontract after WR07M, not in parallel edits to the same files.

### 2. Durable Launch identity and spending custody

Add `story_launch` row keyed by `(owner_id,operation_id)` with immutable request SHA256, exact original prompt or preset pin, effective server-selected hints and policy, **reservedStoryId**, **reservedFirstPassageId**, `generationId`/mission identity, state, timestamps and eventual committed scene identity. Both reserved UUIDs minted once in a short SQL admission transaction, and never regenerated on retry. Distinct request under same operation conflicts 409. Foreign operation reads 404. Do not FK the reserved story until actual publication because a draft story should not appear as playable.

Use `storyteller_operation`/attempt + current owner-grant/dispatch-authority logic for model spending, never a new Launch-specific budget counter. No client-chosen `ownerId` or cost ceiling grants permission. `uncertain` blocks automatic second dispatch. A fenced final-scene receipt must allow crash recovery after SQL commit.

### 3. First implementation host: local workflow and existing outbox

To ship the first real no-spend vertical slice without inventing distributed Writer infrastructure, add a **new** `story.launch.v1` notice topic, `storyLaunchV1` workflow type, and `story-launch/<operationId>` deterministic workflow ID in the existing outbox/Workflow contract registry. The first supported runtime is `offscreen-local`, where DB/DocumentStore already exist and local Worker activities can call `runWriterMissionModelRound` with an explicit **scripted provider transport** for zero-cost acceptance. The workflow passes only the durable operation ID; worker reloads frozen launch/mission/capture from SQL/CAS each time and runs bounded one-round steps until proposal-ready/held/failed/uncertain, then requests Game Authority publication. **Do not repurpose legacy `storytellerDistributedV1` or call a model inside the SQL lock.**

Provider-backed launch is **disabled/held** until an explicitly authorized provider transport is wired using `writer-mission-custody.ts` (reserve/dispatch/settle). The current distributed executor intentionally rejects provider mode and cannot be claimed as a model-enabled Writer host. This is a deployment-support limit, not a reason to fake a provider response. Later distribution can move the Writer worker behind a custody API without changing the public Launch DTO or SQL operation IDs.

### 4. Commit, status and recovery

The Game Authority first-scene commit consumes the accepted v2 Writer opening proposal, staged Library root and the two **preallocated** identities. Verify owner/request hash/source pins and the exact succeeded Writer mission under story lock. Stage CAS before lock. Insert first story/passage/root and **WR05P2 v2 checkpoint selector** in one SQL transaction, and record Launch `ready` there as the last step (or reconcile via durable committed receipt if isolated runtime is used). If SQL fails, no ready story or selector; staged CAS is inert. Replay returns original ready scene. The first fictional clock is admitted game state (usually zero), not elapsed wall-clock Writer generation time.

`PUT /api/stories/launch/:operationId` only admits/returns status; `GET` reads same owner-scoped persisted status. Web only navigates when `ready` includes the committed story/scene. On lost PUT response, GET existing operation, never a second command with a new UUID. Held or uncertain never auto-dispatch.

## Implementation route after WR05P2 and WR07M

One substantial **WR07B** backend Change, likely five bounded stages:
1. New `story_launch` table/migration, authenticated immutable PUT/GET operation ledger. Zero provider calls.
2. Capture verbatim Story Prompt/preset source to pinned Library; versioned opening Writer capture; parent mission/first step/operation admission under existing budget authority; persistent outbox notice.
3. New local Writer Launch workflow + Activity; scripted provider transport and durable step/custody replay; disabled provider route by default. Add strict opening final proposal v2 content validation.
4. Game Authority commits first scene with source-root pins, v2 selector and ready status, no fake draft, no duplicate/story resurrection after crash.
5. Integration with WR08A, scripted end-to-end no-spend + negative transaction/failure/cost tests; archive and integrated docs.

**Not Ready now** because WR05P2 publisher isn't implemented and WR07M opening capture hasn't landed. All broad architectural decisions above are chosen, including the worker route. On predecessor completion, ChatGPT must inspect the exact implemented first-scene API and decide a source-based T-ID map, not delegate another design to Cursor.

## Discriminating proof

No-draft 'BAH' Play yields one validated scene, first passage and v2 selector with same root; user with other owner ID never sees it; repeated PUT = same launch/generation/attempt/story; changed body =409; crash after CAS before SQL gives no playable story; lost response → GET resolves; old preset root swap fails; 0-grant/expired grant held; unknown paid transport uncertain without retry; duplicate workflow wake leaves same result; v1 Writer mission/round and source-citation/replay remain intact; no model spend in default fixture.
