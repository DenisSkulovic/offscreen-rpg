# Proof matrix
No proof executed by ChatGPT. Run from repo root after install; report actual exit code and counts.

| Check | Positive | Negative |
|---|---|---|
| Source identity | moved validators and literals unchanged except imports/specified splits | no widened validators, altered digest or silent alias |
| Package graph | `pnpm repo:module-graph` and `pnpm repo:module-graph:test` | no cycle, undeclared dependency or forbidden edge |
| Build | `pnpm exec turbo run build typecheck` (full at closure, or explicitly scoped reverse consumers for intermediate tasks) | no stale dist-only resolution; fresh install |
| Tests | moved tests actually emitted and run | all pre-existing negative assertions preserved |
| Docs | `pnpm wiki:change-guard --mode plan` / `--mode close` with selected packet arguments per current CLI; `pnpm wiki:health` | no new broken links; baseline failures separately recorded |
| Quality | `pnpm repo:code-quality:changed` with actual reference and `pnpm repo:code-health --base <reference> --strict-new` | no unrelated edits or new severe bands |

## Relocated test commands
- `node --test packages/story-interface/dist/test/scene-appearance.test.js`
- `node --test packages/story-interface/dist/test/stories-receipt.test.js`
- `node --test packages/story-interface/dist/test/stories-update-hint.test.js packages/story-engine/dist/stories/view-notification.test.js`
- `node --test packages/story-interface/dist/test/interactions.test.js`
- `node --test packages/story-interface/dist/test/openings.test.js`
- `node --test packages/story-interface/dist/test/story-launch.test.js`
- `node --test packages/story-interface/dist/test/story-launch-canonical.test.js`
- `node --test packages/story-interface/dist/test/campaign-holds.test.js`

## Stage-specific acceptance
Coherent story/campaign player-interface leaf: seven tightly related modules and campaign-holds (server-side campaign state vocabulary shared with Admin; export distinct subpath and ban in browser production). Storyteller profile reference/summary is the player catalogue DTO, not provider implementation. Keep story/campaign validators independent of Story Engine and Storyteller. `campaign.ts` retains `@offscreen/documents/schema`; no new direct storage imports; baseline transitive Documents→object-storage edge is not a regression. Preserve game imports. Split `stories.ts` as follows: move `startChamberSchema` to residual `packages/contracts/src/chamber.ts` immediately; adjust its existing import, tool controller import and chamber.test import; DO06 moves it with Chamber. Move `publicationBackdropSchema`, `publicationSceneDirectiveV1Schema`, `makeValidatedAppearanceForPublication`, `readOptionalSceneAppearance`, `projectStoredSceneAppearance` to `packages/story-interface/src/scene-publication.ts`, importing publicSceneAppearanceV1Schema and PublicSceneAppearanceV1 from `./stories`; export only existing public symbols, not private backdrop. Storyteller task-contracts and appearance test(s) import that subpath; browser runtime must not import it (test fixture exception). Move `STORY_VIEW_NOTIFY_CHANNEL` to `packages/story-engine/src/stories/view-notification.ts` and use it in persistence.ts and API story-update-hub.ts; storyUpdateHintSchema remains public. Split stories-update-hint.test.ts: public strict hint tests in story-interface; engine notification literal assertion in compiled `view-notification.test.ts`. No dependency from story-interface to engine. `game-authority.ts` residual imports respondToStorySchema from story-interface; `chamber.ts` residual imports stories/campaign/interactions from story-interface. All canonical resolution/launch JSON functions unchanged, including launch newline and resolution no newline. `campaign-holds` remains campaign-owned, no private hold body added to public campaignViewSchema. Add story-interface assertion; retain old contracts assertion until DO07 retirement.

## Stop conditions
Unexpected behavior or schema/digest change, private browser import, production graph cycle, unplanned Documents dependency or missing fixture: stop and report exact symbol/path to ChatGPT. No live provider, DB reset, or cluster operation.
