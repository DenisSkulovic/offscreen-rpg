# Nest stories / Chamber routes | API ownership map

**First look:** `StoriesController` is a thin authenticated Nest API facade. It calls application operations using `ownerId` and maps `StoryError` to HTTP; it does **not** decide game rules, effects or private narrative. **Current:** no read-only resolution-receipt GET and no story SSE endpoint. **Selected:** W19/W16 will add them; neither exists yet.
**Start:** [StoriesController](controller.ts) → [createStoryApplication](../../../../../packages/application/src/stories/index.ts) → [story application map](../../../../../packages/application/src/stories/README.md). For private browser reads see [web transport map](../../../../web/src/lib/README.md).
**Source inspected:** `470a5df`, 2026-11-12, no runtime tests. **Never call provider from a GET, retry after ambiguous charged work automatically, or expose internal workflow rows as public DTOs.**

## Route contract map (selected relevant endpoints)

| HTTP endpoint under `/api/stories` | Method/status in current controller | Application responsibility |
| --- | --- | --- |
| `/` and `/:id` | GET 200 | owner-scoped list/snapshot; full public snapshot parsed by Zod web client |
| `/:id/history` | GET 200 | owner-scoped chronology, numeric `before` cursor |
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
| `/:id/resolutions/:operationId/receipt` | **NOT CURRENT; W19** | read-only owner-scoped durable receipt, never enqueues/retries |
| `/:id/updates` | **NOT CURRENT; W16** | SSE compact version hint, not narrative/published state itself |

**Error mapping:** `StoriesController.run` invokes `IdentityService.requireUser`; `StoryError` codes `invalid→400`, `not_found→404`, `conflict→409`, `unavailable→503`. Non-StoryError becomes service unavailable. Don't turn an unavailable server into “story deleted,” and don't disclose hidden other-owner existence.

## Developer routes are conditional, not globally public

[createApp](../../app.ts) registers `ChamberStoriesController`, `ChamberToolsController` and `QaJourneysController` **only when `options.developerTools===true`**. Ordinary [main](../../main.ts) does **not** pass that option; the loopback [Chamber launcher](../../../../../tools/chamber/src/main.ts) intentionally does. There is no requirement to add redundant hosted RBAC in W12. Preserve and test normal-vs-local mount behavior and per-owner scoping.

## Backend/consumer invariants worth reusing

- The request path is `Nest controller -> application use case -> owned DB transaction/read -> authorized public projection`. A 202 admission never implies narrated publication.
- The backend owns same-operation UUID plus exact request/payload matching; client-side button disabled or TanStack mutation state cannot establish exactly-once.
- SSE W16 must see worker-driven commits, not just controller HTTP writes; follow **actual** `viewVersion` updates in [story persistence](../../../../../packages/application/src/stories/persistence.ts) and [campaign persistence](../../../../../packages/application/src/campaign/persistence.ts). PostgreSQL notification is a *commit hint*, not a durable event log.
- W19 receipt read must never enqueue a continuation or leak provider/private plan data.

## Targeted tests / extend only when needed

[HTTP semantics](../../../../../tools/api-integration/test/stories-http.integration.ts), [resolution](../../../../../tools/api-integration/test/story-resolution.integration.ts), [Start](../../../../../tools/api-integration/test/story-start.integration.ts) and [test DB safety](../../../../../tools/api-integration/README.md). For architecture read [F2/F5/F6/F11 target](../../../../../docs/engineering/targets/react-next.md) by heading. Update this map when routes/status/owners/developer-mode registration change; it is not a second API design specification.
