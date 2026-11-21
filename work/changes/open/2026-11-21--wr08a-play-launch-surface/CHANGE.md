# WR08A | Real one-prompt Launch screen and status flow

**State: READY / OWNER-COMMISSIONED; EXECUTE NOW IN INDEPENDENT WEB WORKTREE.** WR07C is Done/archived on `undertaking/storyteller-workshop` and its exact `@offscreen/contracts/story-launch` public request/status grammar has been verified on live HEAD (prompt up to 24k, preset root SHA, `held`/`failed` reasons, `uncertain.explanation`, `ready.storyId` + `sceneSequence`). Targets integration `undertaking/storyteller-workshop`. The distinct active WR07C Cursor owns only Contracts; this Change owns only `apps/web`. Do not start from this planning branch or edit Contracts. The backend Launch endpoint does not exist yet; keep the new UI **gated and not advertised as working** until WR07B lands and passes real integration. No paid model requests by this Change.

## Concrete product outcome

An authenticated player can create a Story Prompt without a required title, avatar, ruleset or multi-step draft wizard; optionally choose a version-pinned prepared start; submit **one immutable idempotent Launch request**; inspect honest server status and resume after lost HTTP response. A server-confirmed `ready` response navigates to `/play/<storyId>`. The screen's functional tests use scripted network handlers, not real model calls. Legacy `/stories/new` remains operational until backend Launch is real.

## Decided HTTP/data seam

- `PUT /api/stories/launch/:operationId`, body exactly `StoryLaunchRequest` from `@offscreen/contracts/story-launch`; `GET /api/stories/launch/:operationId` returns `StoryLaunchStatus`. A Nest controller/GA implementation of these URIs is reserved for WR07B, not this Change.
- Use one generated UUID per user submission. Freeze request bytes at first PUT. On uncertain network response GET existing status for same operation; never mint a second operation automatically. Server response ownership and requestHash validation still belong to backend.
- Use a tiny sessionStorage **operation pointer only** `{viewerId,operationId,requestHash?,createdAt}`. Keep the verbatim 24k prompt in current component memory while a submit is unsettled; do **not** persist private prose in sessionStorage or URL. After browser refresh, GET by operationId. If 404 and body no longer exists, show an honest not-submitted state and allow user to reenter prompt; never invent a success or automatic second paid call.
- Poll status on bounded intervals only while `pending|preparing|composing`; stop on held/failed/uncertain/ready/unmount. Disabled browser/tab visibility may defer polling; on return GET again. Do not show provider request/internal chain of thought or imply completion from HTTP 202.
- `uncertain` is a terminal/attention state for UI: show clear recovery guidance and a status retry button (GET), not `PUT`. Held/failed render server's public reason. `ready` requires validated storyId and sceneSequence; only then link to playable story.

## Exact source owners

- `apps/web/app/(authenticated)/stories/page.tsx`: current Stories home has a Create story link to legacy draft. **Do not replace it until WR07B is complete.** Optionally display new Play entry only when server capability flag `STORY_LAUNCH_ENABLED` is explicitly supplied. No live link to an unimplemented endpoint.
- `apps/web/app/(authenticated)/stories/new/page.tsx`: currently allocates a draft UUID, loads mechanical start catalogue and displays `DraftEditor` with four steps. Keep legacy behavior unchanged in WR08A.
- New `apps/web/app/(authenticated)/stories/launch/page.tsx`: requireViewer, render `StoryLaunchForm` only under an explicit server-side capability gate; when disabled, redirect to existing `/stories/new` or render a clear unavailable message without placing a primary link. Do not call launch backend at render.
- New `apps/web/src/features/stories/{story-launch-form,story-launch-status,use-story-launch}.tsx/.ts`: one prompt textarea and optional pinned preset choice; never require character/title; network and status using `StoryLaunchRequest/StoryLaunchStatus`.
- New `apps/web/src/shared/api/story-launch-intent-store.ts`: operation pointer only; emulate `start-intent-store.ts`'s versioned, viewer-specific TTL validation but not its older draft fields. Use `StoryLaunchRequest` parser on submission, public status parser on GET response.
- Reuse `apps/web/src/shared/ui/action.tsx`, `SystemNotice`, stories stylesheet tokens, query client pattern, existing session renewal. Accessible submit/loading/failure, responsive layout, no generated art needed.

## Acceptance and exclusions

Scripted MSW/Vitest UI tests must prove: one freeform prompt, optional preset, no compulsory character/title; one immutable body/operation across retry; malformed status rejected; `ready` navigates to exact story; lost PUT response causes GET and no duplicate PUT; held/uncertain never silently resubmit; cross-viewer session pointer rejected; disabled production gate does not link to 404; empty/oversize prompt rejected; private prompt not stored in browser storage/URL. No server API additions, no DB writes, no Story Engine edits, no change to legacy draft flow, no claims of real end-to-end Play before WR07B.

[Executor tasks](TASKS.md) · [Acceptance proof](PROOF.md). WR07C landed, contract reconciled. **This packet is commissioned; no WR05P/scene-v2 completion is needed for Web-only implementation.** Start from live undertaking HEAD in dedicated `change/wr08a-play-surface` worktree; final integration must be serialized with any WR05S archive/catalog change. Keep launch navigation gated OFF by default until WR07B backend exists.
