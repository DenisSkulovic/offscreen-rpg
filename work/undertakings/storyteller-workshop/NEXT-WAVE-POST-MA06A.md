# Writer Workshop | next execution wave after MA06A

**Planning snapshot:** `undertaking/storyteller-workshop` at `1ac1dc58` plus one parallel-schedule documentation commit, verified 2026-11-21. **This file lives on the isolated `planning/writer-next-wave-post-ma06a` branch, not the live undertaking; no code or test run has been claimed.** Existing canonical ownership: `docs/technical/engine/{selected-architecture,lifecycle-and-compatibility}.md`, `docs/product/gameplay/time-and-autonomy.md`; existing WR01/WRD decisions are unchanged. `packages/story-engine` now owns stories/campaign/storyteller/generations; `application` retains compatibility. WR04–WR08 older T-IDs were written pre-MA06A and **must not dispatch** as source instructions.

## Primary objective

Get an authenticated human from one Story Prompt to a **committed playable scene**, then preserve history/forkable active fictional truth. Optimize for one working vertical outcome; package-extraction niceties and 3 newly crossed code-health bands do not block it. Provider authorization and uncertain dispatch remain non-negotiable.

## Rolling two-lane execution schedule

| Window | Cursor lane 1 (authority/engine) | Cursor lane 2 (independent code surface) | Integration requirements |
| --- | --- | --- | --- |
| **Current (already launched)** | **WR05S**: Documents v2 checkpoint schema + DB check migration | **WR07C**: Contracts Launch request/status grammar | Worktrees separate; mutually exclusive squash integrations and disposable DB test resources; independent Change closes |
| **Immediately after each current predecessor** | **WR05P**: actual scene-v2 publication in `packages/story-engine/src/{stories,storyteller,campaign}`, then v2 read projection; depends WR05S | **WR08A**: one-prompt Launch form/status UI under `apps/web`, behind truthful backend-availability gate; depends WR07C | Can execute concurrently: no engine/db/contract edits by WR08A, and no Web edits by WR05P |
| **After publication contract lands** | **WR07B**: durable Launch admission, writer dispatch/recovery, Game Authority first-scene and Nest API/DB wiring (one end-to-end backend Change) | **WR06**: active historical fork in engine, *only if WR07B write-set avoids fork paths and DB migration collisions*; otherwise lane 2 switches to independent WR04 bounded-research or focused UI/history polish | Do not assume parallel WR07B+WR06 if both touch `story-engine/stories/index.ts`, `apps/game-authority` or SQL migration journal. One custodian reviews actual filenames before parallel commission |
| **Playable user milestone** | Wire WR08A to real WR07B routes, expose Play navigation, remove mandatory wizard only after successful authenticated end-to-end | WR06 fork / optional WR04 child research and advanced memory evaluations | Complete scripted no-spend journey and failures before any paid creative assessment |

**Rolling queue policy:** keep **2 active Cursor chats**, one next ready packet per lane, and one architecture design being prepared by ChatGPT. Batching 3+ chats is justified only when code/SQL fixture paths are demonstrably disjoint. The integration custodian serializes joins into `undertaking/storyteller-workshop` and reconciles ledgers once per Change, not once per child.

## Existing architecture: decisive observations

- `packages/story-engine/src/stories/continuation.ts:stageSupportedContinuationCheckpoint` (line ~417) is **v1 quiescent-only**, returns undefined for decision/wait, holds, offers, activity/obligation rows and complex notes. `commitStoryContinuation` (line ~543) checks staged state and selects checkpoint (lines ~662–669) **before** `publishStorytellerNotes` (~672), so an old stage may describe pre-note state.
- `packages/story-engine/src/storyteller/publication.ts:publishStorytellerResult` (~136) stages prose and occasionally a quiescent checkpoint off-lock, but its active-choice path (~810–935) computes offer ID, admitted plans, applies notes, saves offers/authorization, transfers holds and advances view **inside SQL** without a corresponding staged full after-state. WRA must handle both routes.
- `packages/story-engine/src/stories/scene-checkpoint.ts:stageSceneCheckpointObject` (~203) already CAS-writes and reads back, and `insertStagedSceneCheckpointSelector` (~226) already rechecks owner/scene/root and inserts immutable selector; **reuse it**. `story_scene_checkpoint` has `stateSchemaVersion` and exact hash; WR05S expands from v1-only to v1/v2, no new selector table.
- `packages/story-engine/src/stories/continuity-notes.ts:publishStorytellerNotes` (~15) already validates succeeded generation, evidence and patch; split into a pure prepared note value and guarded SQL application to avoid divergent after-state.
- `packages/story-engine/src/stories/reads.ts:projectCheckpointCampaign` (~246) explicitly creates an empty activity/hold/offer view from v1 quiescent data; it needs a **v2-specific exact historical projection**. Do not read current live campaign rows to fill a historical scene.
- Existing `apps/api/src/modules/stories/controller.ts` uses Nest `StoriesController` under `/api/stories`, authenticates with `IdentityService`, and proxies several admission operations through `StorySeam` to embedded or Game Authority remote. `apps/web/app/(authenticated)/stories/new/page.tsx` currently forces a draft and a four-step editor; `apps/web/src/shared/api/start-intent-store.ts` already has a session-scoped immutable request capture technique to reuse, not copy arbitrary state.
- `@offscreen/storyteller` pure tasks/provider package remains separate from `@offscreen/story-engine` SQL/runtime. **No further package split is a prerequisite.**

## WR05P: chosen authority mechanism (see [source-grounded map](../../changes/open/2026-11-21--wr05-coherent-scene-publication/POST-MA06A-EXECUTION.md))

**One bounded immutable v2 checkpoint** per newly published scene. Prepare and hash the *complete proposed after-state* off-lock; the underlying SQL may write that state only inside its existing authorized lock, after which equality against staged object is checked **inside the same transaction** before inserting selector. Staged CAS objects without SQL selection are inert. Do not call DocumentStore or provider while holding `FOR UPDATE`.

**Crucial escape from needless refactoring:** project only the finite *scene-publication mutations* (items, notes, admitted offer/choice, holds, activity/work rows, clock and roots), not the whole Game Authority universe or event stream. Existing command handlers retain their authority; the story lock plus exact base-root/revision and relevant source row fences protect staging from concurrent mechanical state changes. Genuine missing lock on a mutator is a correctness fix, not a reason to build event sourcing.

**Honest dependency:** WR05S's actual landed v2 `fictionalState` schema defines field names and types. WR05P's source map and algorithm can be prepared now; finalize symbol-level T-IDs only once WR05S closes. That is an actual type dependency, **not permission for Cursor to invent a new schema**.

## WR08A: independent UI algorithm

Define **`PUT /api/stories/launch/:operationId`** and **`GET /api/stories/launch/:operationId`** as the planned authenticated server routes (to be implemented in WR07B). The Web client captures one immutable `StoryLaunchRequest` with UUID, serializes it once, and uses the same body/ID on retries. On transport ambiguity, it **GETs status**, never constructs a second paid command. Strictly render `pending,preparing,composing,held,failed,uncertain,ready` based on public status. Ready navigates only to a server-confirmed story ID. Reconnect opens same operation.

Build the form and status screen under `apps/web` **without replacing the existing `/stories/new` production route until backend is live**. Feature gate / route isolation must be honest: no button leading to 404, no fake success, no mandatory character/title, no unintended provider spend. Use WR07C's public `@offscreen/contracts/story-launch` output once integrated. This frontend packet is independent of WR05P and requires only WR07C.

## WR07B: durable backend decisions, after WRA

One owner-scoped `story_launch` SQL row keyed by `(owner_id,operation_id)`, immutable `request_hash`, captured prompt/preset root & normalized hints, explicit state, `story_id` on success, creation/update stamps and monotone status. **Existing 1-miB Library/CAS + Writer Workdesk** stores source state; don't put large source bodies in SQL except the bounded captured prompt necessary for replay (WR07C caps 24,000 chars). Resolve effective owner grant and current dispatch authority **on the server**, not in DTO. Use fresh Storyteller attempt custody and stable operation identity; an uncertain transport is never automatically retried. The completion transaction must call authoritative first-scene v2 publication, not merely flip `ready`. Save successful scene ID and `ready` in the same SQL transaction or use a durable reconcilable receipt if ownership/process split demands it; no false ready/duplicate start.

Nest API owns authentication/error mapping; application outer composition or Game Authority owns the actual authoritative command. Embedded/remote `StorySeam` routing must not silently bypass permissions. **WR07B's exact writer-mission creation function and worker notification route must be inspected and mapped before commissioning**, not outsourced as architecture work to Cursor.

## Independent work: what not to send Cursor yet

- **Old WR04–WR08 implementation packets:** stale source paths and T-IDs, although product goal valid.
- **MA06B/C cleanup and 3 code-health bands:** after play, unless concrete new regression; moving huge files again gains no gameplay.
- **The reported concurrent budget.dispatch failure:** an observed pre-existing safety test failure, not proof of MA06A regression. Keep independently visible and prioritize a narrowly scoped analysis/fix only when it gates an authorized paid Storyteller run; never weaken the budget gate to make the test green.
- **WR06 active fork:** known design outcome, but exact FK remapping depends on v2 fields and commit selectors. Can draft now, commission after v2 real.

## Milestone proof (qualitative distinction)

**Milestone 1: Immutable scene v2.** Scene after-state read remains accurate after later world changes; a missing/corrupt CAS object or mismatched notes/offer/clock must reject, never publish a partial scene.

**Milestone 2: Actual Play.** With scripted provider fixture, a single authenticated freeform prompt creates one source-rooted, genuinely playable first scene, and survives HTTP loss/restart/conflicting retry, without a compulsory wizard/avatar/rules engine or model-spend accident.

**Milestone 3: Forkable history.** After parent moves from scene 37 to 80, fork scene 37 with exact choices, fictional time and unresolved commitments. No parent current-state leak, no duplicated provider charge or job.

**Milestone 4: Writer quality.** Real optional bounded child research, source-grounded continuity and long-form qualitative evaluation, with paid tests separately approved.

**Terminal condition:** once WR05S/WR07C land, publish the next two successor packets as **Ready**, one owner-commissioned pair at a time. No additional MA restructuring before Storyteller play. Retire old obsolete packet directions as the replacement successors integrate.
