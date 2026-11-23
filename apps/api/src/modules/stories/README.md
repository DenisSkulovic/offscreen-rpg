# Nest stories / Chamber routes | API ownership map

**First look:** Stories HTTP routes are thin authenticated Nest facades under `controllers/`. They call application operations using `ownerId` and map `StoryError` to HTTP; they do **not** decide game rules, effects or private narrative. **Current:** resolution-receipt GET (W19) and story SSE updates (W16) are implemented.
**Start:** [route registry](controllers/registry.ts) → handler group (`catalogue-and-launch`, `story-reads`, `story-commands`, `story-events`, `story-documents`) → [story HTTP context](story-http-context.ts) → [createStoryApplication](../../../../../packages/application/src/stories/index.ts) → [story application map](../../../../../packages/story-engine/src/stories/README.md). For private browser reads see [web transport map](../../../../web/src/lib/README.md).
**Source basis:** post-W16; recheck symbols before editing. **Never call provider from a GET, retry after ambiguous charged work automatically, or expose internal workflow rows as public DTOs.** Cross-route status and identity rules shared with drafts and openings: [HTTP and client contracts](../../../../../docs/technical/platform/http-api-and-client-contracts.md).

## Identity and error mapping

`StoryPlayerIdentity.requireStoryPlayer` is the sole Stories HTTP identity entry (cookie session or story-only bearer; cookie + bearer is rejected). Shared helpers in [story-http-context.ts](story-http-context.ts) map `StoryError` codes `invalid→400`, `not_found→404`, `conflict→409`, `unavailable→503`; launch admission uses `not-admitted→403`. Non-`StoryError` becomes service unavailable.

## Route contract map

| HTTP endpoint under `/api/stories` | Controller group | Method/status |
| --- | --- | --- |
| `/` | catalogue-and-launch | GET 200 |
| `/launch/:operationId` | catalogue-and-launch | PUT 200, GET 200 |
| `/presets/catalogue`, `/presets` | catalogue-and-launch | GET 200 |
| `/presets/:presetId` | catalogue-and-launch | PUT 200 |
| `/:id/settings` | story-reads | GET 200 |
| `/:id/settings/:operationId` | story-commands | PUT 200 |
| `/:id/delegation-policy/:operationId` | story-commands | PUT 200 |
| `/:id/delegated-offers/:operationId` | story-commands | PUT 200 |
| `/:id/actions/:operationId` | story-commands | PUT 200 |
| `/:id/activity-controls/:operationId` | story-commands | PUT 200 |
| `/:id/action-execution-controls/:operationId` | story-commands | PUT 200 |
| `/:id/accepted-plan-controls/:operationId` | story-commands | PUT 200 |
| `/:id/world-obligation-controls/:operationId` | story-commands | PUT 200 |
| `/:id/retries/:retryId` | story-commands | PUT 200 |
| `/:id/updates` | story-events | **SSE** |
| `/:id` | story-reads | GET 200 |
| `/:id/scenes/:sequence` | story-reads | GET 200 |
| `/:id/history` | story-reads | GET 200 |
| `/:id/events` | story-reads | GET 200 |
| `/:id/custom-intents/:interpretOperationId` | story-documents | PUT 200 |
| `/:id/custom-intent-accepts/:operationId` | story-documents | PUT 200 |
| `/:id/visit` | story-reads | GET 200 |
| `/:id/visit/acks/:ackId` | story-documents | PUT 200 |
| `/:id/documents` | story-reads | GET 200 |
| `/:id/documents/projected-passages` | story-reads | GET 200 |
| `/:id/documents/:documentId` | story-reads | GET 200 |
| `/:id/documents/:operationId` | story-documents | PUT 200 |
| `/:id/forks/:forkId` | story-commands | PUT 200 |
| `/:id/start` | story-commands | PUT 200 |
| `/:id/resolutions/:operationId/receipt` | story-reads | GET 200 |
| `/:id/resolutions/:operationId` | story-commands | **PUT 202** |
| `/:id/controls/:operationId` | story-commands | PUT 200 |

## SSE commit path (W16)

```text
advanceStoryView / incrementStoryViewVersion (same DB transaction)
  -> pg_notify(offscreen_story_view, {eventId,storyId,viewVersion,kind})
  -> API dedicated LISTEN client (story-update-hub)
  -> owner-scoped SSE subscribers only
  -> browser must GET /api/stories/:id (W17); hint is not authority
```

LISTEN `error`/`end` marks the hub unhealthy, reconnects with backoff, and emits SSE `listener-recovered` so open clients refresh via GET. Heartbeats may continue while LISTEN is down; do not treat heartbeat as proof of NOTIFY health.

Proxy note: responses set `Cache-Control: no-store, no-transform` and `X-Accel-Buffering: no`. Heartbeat ≈15s; reconnect re-authorizes via `StoryPlayerIdentity` on [story-events](controllers/story-events.ts).

## Developer routes are conditional, not globally public

Production [createApp](../../app.ts) (`buildApiControllers` in [bootstrap/api-controllers.ts](../../bootstrap/api-controllers.ts)) does not register Chamber or QA controllers. Those four controllers live in `@offscreen/api-lab` and are mounted only by [createLabApp](../../../../../tools/api-lab/src/create-lab-app.ts). Ordinary [main](../../main.ts) does not use that factory; the loopback [Chamber launcher](../../../../../tools/chamber/src/main.ts) does when it is not in story mode.

## Targeted tests / extend only when needed

[HTTP semantics](../../../../../tools/api-integration/test/stories-http.integration.ts), [resolution](../../../../../tools/api-integration/test/story-resolution.integration.ts), [Start](../../../../../tools/api-integration/test/story-start.integration.ts), [SSE updates](../../../../../tools/api-integration/test/story-updates.integration.ts) and [test DB safety](../../../../../tools/api-integration/README.md). Update this map when routes/status/owners/developer-mode registration change.