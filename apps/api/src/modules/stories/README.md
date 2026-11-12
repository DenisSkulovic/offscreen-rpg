# Nest stories / Chamber routes | API ownership map

**First look:** `StoriesController` is a thin authenticated Nest API facade. It calls application operations using `ownerId` and maps `StoryError` to HTTP; it does **not** decide game rules, effects or private narrative. **Current:** resolution-receipt GET (W19) and story SSE updates (W16) are implemented.
**Start:** [StoriesController](controller.ts) → [createStoryApplication](../../../../../packages/application/src/stories/index.ts) → [story application map](../../../../../packages/application/src/stories/README.md). For private browser reads see [web transport map](../../../../web/src/lib/README.md).
**Source basis:** post-W16; recheck symbols before editing. **Never call provider from a GET, retry after ambiguous charged work automatically, or expose internal workflow rows as public DTOs.**

## Route contract map (selected relevant endpoints)

| HTTP endpoint under `/api/stories` | Method/status in current controller | Application responsibility |
| --- | --- | --- |
| `/` and `/:id` | GET 200 | owner-scoped list/snapshot; full public snapshot parsed by Zod web client |
| `/:id/history` | GET 200 | owner-scoped chronology, numeric `before` cursor |
| `/:id/updates` | **SSE** | authenticated committed-view hints via [story-update-hub](story-update-hub.ts); no narrative |
| `/presets/catalogue`, `/presets` | GET | public catalogue vs private owned preset list |
| `/presets/:presetId` | PUT | captured preset revision/save; distinguish validation/conflict |
| `/:id/settings` | GET | settings history, not editable local form state |
| `/:id/settings/:operationId` | PUT | owned settings command; expected revision fence |
| `/:id/actions/:operationId` | PUT | campaign action admission; result is current public view |
| `/:id/activity-controls/:operationId`, `/:id/action-execution-controls/:operationId` | PUT | activity or action pause/resume/speed; real domain state from application |
| `/:id/resolutions/:operationId` | **PUT 202** | admits intent; returned snapshot can still be `pending`/`running` |
| `/:id/controls/:operationId` | **PUT 200** | timed interval control, current snapshot |
| `/:id/retries/:retryId` | PUT | specifically allowed recovery; **not** a duplicate paid request by inference |
| `/:id/start` | **PUT 200** | starts from reviewed opening; story ID provides GET recovery anchor |
| `/:id/resolutions/:operationId/receipt` | **GET** | read-only owner-scoped durable receipt, never enqueues/retries |

**Error mapping:** `StoriesController.run` invokes `IdentityService.requireUser`; `StoryError` codes `invalid→400`, `not_found→404`, `conflict→409`, `unavailable→503`. Non-StoryError becomes service unavailable. Don't turn an unavailable server into “story deleted,” and don't disclose hidden other-owner existence.

## SSE commit path (W16)

```text
advanceStoryView / incrementStoryViewVersion (same DB transaction)
  -> pg_notify(offscreen_story_view, {eventId,storyId,viewVersion,kind})
  -> API dedicated LISTEN client (story-update-hub)
  -> owner-scoped SSE subscribers only
  -> browser must GET /api/stories/:id (W17); hint is not authority
```

Proxy note: responses set `Cache-Control: no-store, no-transform` and `X-Accel-Buffering: no`. Heartbeat ≈15s; reconnect re-authorizes.

## Developer routes are conditional, not globally public

[createApp](../../app.ts) registers `ChamberStoriesController`, `ChamberToolsController` and `QaJourneysController` **only when `options.developerTools===true`**. Ordinary [main](../../main.ts) does **not** pass that option; the loopback [Chamber launcher](../../../../../tools/chamber/src/main.ts) intentionally does.

## Targeted tests / extend only when needed

[HTTP semantics](../../../../../tools/api-integration/test/stories-http.integration.ts), [resolution](../../../../../tools/api-integration/test/story-resolution.integration.ts), [Start](../../../../../tools/api-integration/test/story-start.integration.ts), [SSE updates](../../../../../tools/api-integration/test/story-updates.integration.ts) and [test DB safety](../../../../../tools/api-integration/README.md). Update this map when routes/status/owners/developer-mode registration change.
