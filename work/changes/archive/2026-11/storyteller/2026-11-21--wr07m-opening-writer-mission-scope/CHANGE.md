# WR07M | Writer opening-mission scope, without a fake first passage

**State:** Done (2026-11-21). Integrated on `undertaking/storyteller-workshop` by squash from `change/wr07m-opening-mission-scope`. Not merged to `main`. Kind: implementation. No SQL, Worker, API, Game Authority, Web, provider call, or budget mutation.

## Execution proof

T01 preserved `writer-mission.v1` as `writerMissionCaptureV1Schema` and added `writerMissionCaptureV2OpeningSchema` (`sceneScope.kind:'opening'`, `reservedStoryId` equal to `storyId`, `reservedFirstPassageId`). `writerMissionCaptureSchema` is the discriminated union. T02 selects round pins from `capture.version`. v1 keeps `sceneFrontier` and the pre-edit SHA256 `7c62d3be002da2280b039ba6cdb9df00e3b4b12860a22987c7141c0696f9dac3`. v2 emits `sceneScope` and omits `sceneFrontier`. No passage history is invented.

`pnpm --filter @offscreen/storyteller build` passed. `pnpm --filter @offscreen/storyteller test` passed 59/59, including the v1 oracle and the v2 negatives (malformed ids, foreign reserved story id, injected scene frontier, duplicate grants, unlimited budget, ungranted tool). Prettier and quality ESLint passed on the three Storyteller files. No provider call. SQL and live Launch admission were not run because this Change does not admit a story.

## Reconciliation ledger

| Affected claim | Authority | Target delta | Source delta | Evidence tier | Negative proof | Map update |
| --- | --- | --- | --- | --- | --- | --- |
| An opening writer capture can name the reserved story and first passage without a prior scene frontier | docs/technical/storyteller/operation-and-controller.md#current-prototype-runtime | changed: the prototype section now records writer-mission.v2 opening scope as a parse and pin, and states that it does not create a passage, admit a story, or authorize a provider call | packages/storyteller/src/tasks/writer-mission.ts and packages/storyteller/src/tasks/writer-round-request.ts | fixture-tested | malformed UUID, reservedStoryId different from storyId, injected sceneFrontier, duplicate grants, unlimited budget, and ungranted tools fail; v2 pins omit sceneFrontier | docs/technical/storyteller/request-context-and-cost.md#recall-over-many-days |
| Existing version-1 writer mission replay bytes stay stable | docs/technical/storyteller/operation-and-controller.md#current-prototype-runtime | unchanged: v1 still requires sceneFrontier and the same budget, root, and tool checks; the compiler keeps the previous pin key order | packages/storyteller/test/writer-mission.test.ts | fixture-tested | frozen v1 request JSON equals the pre-edit oracle and SHA256 7c62d3be002da2280b039ba6cdb9df00e3b4b12860a22987c7141c0696f9dac3; a second compile returns the same hash | N/A — no route or export path moved |
| Direct Play still publishes a real first scene only after a later Launch backend admits it | docs/product/experience/entry-and-onboarding.md#launch-and-first-arrival | unchanged: this Change does not add an endpoint, a passage row, or a provider dispatch, so the product arrival rule is not rewritten | packages/storyteller/src/tasks/writer-round-request.ts | fixture-tested | v2 user payload has no passageHistory or priorPassages; priorToolResults stays empty | STATUS.md demonstrated boundary |

## Diff paths

packages/storyteller/src/tasks/writer-mission.ts packages/storyteller/src/tasks/writer-round-request.ts packages/storyteller/test/writer-mission.test.ts docs/technical/storyteller/operation-and-controller.md docs/technical/storyteller/request-context-and-cost.md STATUS.md work/changes/README.md work/changes/ledger/2026-11.md work/undertakings/storyteller-workshop/PROGRAM.md

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
