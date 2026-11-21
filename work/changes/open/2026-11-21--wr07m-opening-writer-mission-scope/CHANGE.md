# WR07M | Writer opening-mission scope, without a fake first passage

**Status: READY / OWNER-COMMISSIONED, NEXT AVAILABLE CURSOR CHAT.** Kind: implementation; profile: CONTRACT. Integration: `undertaking/storyteller-workshop` only. Read current `AGENTS.md`, `CHATGPT.md`, and [T-IDs](TASKS.md). At authoring baseline (2026-11-21) WR05P1 owns `packages/story-engine/src/stories` and WR08A owns `apps/web`; this Change **only writes** `packages/storyteller/src/tasks/{writer-mission,writer-round-request}.ts` and `packages/storyteller/test/writer-mission.test.ts`, so it can run without overlap. No SQL, Worker, API, Game Authority, Web, provider calls or budget mutations.

## Problem proven in source

`writerMissionCaptureSchema` currently accepts only `version:'writer-mission.v1'` and requires `sceneFrontier:{passageId,narrativeRevision,sequence}`. `compileWriterRoundCapturedRequest` embeds that frontier in the pinned provider request. **Direct Play has no existing passage.** Creating a pretend row or inventing narrative history to satisfy this schema would violate Launch's first-scene identity. `writer-loop.ts`, `writer-workdesk.ts` and `writer-scene-proposal.ts` use the common capture fields; their inspected source does **not** require `sceneFrontier`. Preserve v1 history and all budget/tool rules.

## Selected contract

- Preserve the existing v1 parser **exactly**, including `sceneFrontier` and all its validations. Export `writerMissionCaptureV1Schema`; add strict `writerMissionCaptureV2OpeningSchema` with `version:'writer-mission.v2'` and **`sceneScope:{kind:'opening',reservedStoryId:UUID,reservedFirstPassageId:UUID}`**, in place of `sceneFrontier`. Keep existing `storyId` as the same reserved story identity; refine `sceneScope.reservedStoryId===storyId`. Do not loosen root, pin, tool, budget or model selection checks; reuse common field definitions and duplicate-grant/skill validators.
- Export `writerMissionCaptureSchema` as a discriminated union of v1 and v2-opening, and `WriterMissionCapture` from it. **No v2 continuation variant is needed now**; existing scenes keep v1. `writerRoundTaskSchema` still uses `version:'writer-round.v1'` and accepts either mission version.
- `compileWriterRoundCapturedRequest` preserves **identical serialized user-message bytes for v1** (its `pins.sceneFrontier` stays unchanged). For v2-opening, emit `pins.sceneScope` with the two reserved UUIDs and no `sceneFrontier`; all root/profile/skill/tool pins and output schema remain unchanged. No new provider dispatch authorization implied by parsing.
- On replay the version is immutable; never infer `opening` from `sequence===0` or automatically upgrade v1. A later Launch backend will allocate reserved story/passage IDs at one durable operation admission, then provide this v2 capture. This Change deliberately **does not create/admit a mission or a story**.

## Proof and closure

Tests: existing v1 mission/round tests unchanged; assert v1 captured-request deep equality and stable SHA256 before/after change; v2 opening valid with no passage row; malformed/foreign reservedStoryId, missing IDs, injected `sceneFrontier`, duplicate grants, unlimited budget, unauthorized tools denied. `pnpm --filter @offscreen/storyteller build` and `pnpm --filter @offscreen/storyteller test`; changed-file formatting/lint. No provider calls.

Parent executes [T01–T03](TASKS.md), archives and ledger-reconciles the Change, squash-integrates into undertaking, retires linked worktree/branch and reports SHA. Serial final integration with active chats; never `main`. Any source contradiction must name the exact affected caller, not trigger a repository-wide agent research sweep.
