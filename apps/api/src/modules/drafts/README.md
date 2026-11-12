# Nest draft and opening endpoints | source map

**First look:** Draft save is a synchronous revision-fenced edit; opening generation is an **asynchronous accepted operation**; Start belongs to the *stories* API. These are three different lifecycles. The future Query/RHF/typed-mutation implementation must not force them into one generic hook.
**Start:** [DraftsController](controller.ts) or [OpeningsController](openings-controller.ts) → [draft application](../../../../../packages/application/src/drafts/index.ts) / [opening application](../../../../../packages/application/src/generations/openings.ts). For Start follow [StoriesController](../stories/controller.ts).
**Source basis:** `470a5df`, static inspection only; no new endpoint or extra provider retry authorized by this README.

## Existing HTTP semantics

| Call | Status/contract | Owner and trap |
| --- | --- | --- |
| GET `/api/drafts` | owner list, opaque `cursor` | `DraftsController.list`; cursor not interchangeable with story list UUID |
| GET `/api/drafts/:id` | owned current draft or hidden 404 | `DraftsController.read`; shared `draftSchema` |
| PUT `/api/drafts/:id` | **200** saved draft or **409** stale revision | `saveDraftSchema` with `expectedRevision`; current editor preserves dirty edits after 409 |
| GET `/api/drafts/:id/openings/catalogue` | mechanical content catalogue | `OpeningsController.catalogue` |
| GET `/api/drafts/:id/openings/latest` | `{preview}` | `OpeningsController.latest`; the preview can be null/pending/running/uncertain/succeeded/failed |
| PUT `/api/drafts/:id/openings/:generationId` | **202** accepted generation | `requestOpeningSchema`, stable id/expected draft revision; provider work may continue after response |
| PUT `/api/drafts/:id/openings/:generationId/retries/:retryId` | **202** retry admission | Only if backend recovery rules allow it; never automatically repeat model spend |
| PUT `/api/stories/:storyId/start` | **200** | Different controller/application operation; reviewed candidate, expected draft revision and campaign Start envelope |

**Error taxonomy:** `DraftError` maps invalid→400, not_found→404, conflict→409, unavailable→503; `GenerationError` maps invalid→400/not_found→404/conflict or busy→409. Do not silently turn a 409 into an overwrite or turn an uncertain generation into a new request.

## Source-to-UI route

[Stories frontend map](../../../../web/src/features/stories/README.md) distinguishes `DraftEditor` local unsaved form and `OpeningPreviewPanel` generation/Start. Current Start client keeps a UUID but reconstructs body from mutable form settings; W09 freezes exact submitted bytes and GET-reconciles first. Current draft save body/revision remains owned by Nest.

**Read deeper only when:** [story lifecycle contract](../../../../../docs/technical/story-lifecycle.md) for semantics; [draft Zod](../../../../../packages/contracts/src/drafts.ts) and [opening Zod](../../../../../packages/contracts/src/openings.ts) for wire; [browser draft](../../../../../tools/api-integration/test/drafts.browser.ts) / [Start proof](../../../../../tools/api-integration/test/story-start.integration.ts) for tests. A tested mock is not proof of provider settlement.

**Maintenance:** update this map on API status/schema/controller owner changes. Cosmetic form rewrites do not require a full description of every input field here.
