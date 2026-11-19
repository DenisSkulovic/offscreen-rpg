# Cross-route HTTP identity, receipt, and client-read contract

**Owns:** the HTTP rules that apply across player routes and that no single controller owns: authenticated actor scope, frozen operation identity, an accepted `202` versus a committed read, GET truth versus an SSE hint, error and uncertainty recovery, and private DTO projection. [Service calls are not player routes](#service-calls-are-not-player-routes) says a proposed service command is not one of those routes.

**Does not own:** the route inventory ([API map](../../../apps/api/README.md), [story routes](../../../apps/api/src/modules/stories/README.md), [draft and opening routes](../../../apps/api/src/modules/drafts/README.md)), Zod shapes ([contracts](../../../packages/contracts/README.md)), session policy ([Authentication and sessions](identities-and-access.md#authentication-and-sessions)), client cache and reload UX ([Commands and hints](../client/state-and-server-boundary.md#commands-and-hints)), Temporal delivery ([Story execution with Temporal](execution-and-delivery.md)), service ownership ([Proposed service ownership](topology.md#proposed-service-ownership)), or staff grants ([Admin topology](../admin/topology-and-authorization.md)).

**Status:** source-inspected at `b3113814` for the headings that describe handlers. Those statements are what those files do. [Service calls are not player routes](#service-calls-are-not-player-routes) records one internal command and still adds no player route. This page adds no player right and no retry. The named integration tests were read and were not re-run. No provider call was made.

**Reader question:** What must a second client respect on every authenticated player route, even when the route list lives in a controller map?

**Read one heading:** [actor](#authenticated-actor-scope) · [frozen id](#frozen-operation-identity) · [202 versus commit](#accepted-response-versus-committed-world) · [GET versus SSE](#get-truth-and-sse-hints) · [errors](#error-and-uncertainty-recovery) · [projection](#private-dto-projection) · [new route review](#review-a-new-route) · [service calls](#service-calls-are-not-player-routes) · [unknowns](#unknowns)

## Authenticated actor scope

**Reader question:** Whose row may this response contain?

**Normative status:** source-inspected HTTP behavior. It does not widen who may read a story or a draft. Session policy stays on [Authentication and sessions](identities-and-access.md#authentication-and-sessions).

**Owner:** this heading, for the rule that every player handler shares. Each controller remains the route facade.

`StoriesController.run`, `DraftsController.run`, and `OpeningsController.run` call `IdentityService.requireUser` and pass that session user id in as `ownerId` before the application operation. No session throws Nest `UnauthorizedException` (HTTP 401) and the operation is not called. A driver failure while reading the session throws HTTP 503 `Identity service unavailable`, which is also before the operation.

Story snapshot and resolution-receipt reads require `story.ownerId` to equal that session id. A miss throws `StoryError('not_found')`, which the controller maps to HTTP 404 `{ code: 'not_found' }`. Draft reads and saves use `DraftError('not_found')` and the same status and code. The other-session cases in the resolution, SSE, and draft integration tests assert 404. An empty cookie asserts 401. An unknown resolution id for the owner also asserts 404.

**Normal:** the signed-in owner calls `GET /api/stories/:id` or `GET /api/stories/:id/resolutions/:operationId/receipt` and receives that owner's projection.

**Negative:** HTTP 401 is an authentication failure. 401 is not a reason to retry as a new command. HTTP 404 is the status both for a missing id and for an id the caller does not own. 404 must not be described as a way to infer another user's data, and the body is not that user's row.

`GET /api/me` returns the caller's own `id`, `name`, and `email`. It is the session user, not a directory of players.

Admin staff routes and Chamber routes are outside this verified set. See [Unknowns](#unknowns).

## Frozen operation identity

**Reader question:** After a lost response, which request may be sent again?

**Normative status:** source-inspected for resolution admission, opening request and retry, and draft save. Other command families are [unknown](#unknowns). The lifecycle rule is [Five owners](../engine/lifecycle-and-compatibility.md#five-owners). This heading is the HTTP consequence.

**Owner:** this heading. The route inventory stays in the module READMEs.

The client supplies the operation id. The server stores that id. A later attempt uses the same id and the same body.

Resolution admission in `admitStorytellerResolution`:

- The same `operationId`, the same `expectedRevision`, and a deep-equal submission leave the stored submission in place. The HTTP handler is still `PUT` 202. That identical call still goes through admission, including an enqueue of the same operation id. It is a command replay, not a receipt GET.
- The same `operationId` with a different revision or a different submission throws `StoryError('conflict')` (HTTP 409) and leaves the stored submission in place.
- A different `operationId` while a resolution already exists for the current revision throws conflict (HTTP 409).

The resolution integration test asserts that sequence: the first `PUT` is 202, the identical `PUT` is 202, a changed option is 409, and a fresh UUID is 409.

Opening request uses the path id as the generation id. On the scripted opening module, `createGenerations.insert` keeps the existing row when the input is deep-equal and throws `GenerationError('conflict')` when that id is reused with different input. On the storyteller opening module, the same id is kept when draft, revision, content id, and start package match. A difference in one of those fields throws `GenerationError('conflict')`. In both opening modules, a prior row owned by someone else, or of another generation kind, throws `GenerationError('not_found')` (HTTP 404). A second opening while the latest one is `pending`, `running`, or `uncertain` throws `GenerationError('busy')`. The opening controller maps `busy` to HTTP 409. That 409 allocates no replacement generation id.

Opening retry is `PUT /api/drafts/:draftId/openings/:id/retries/:retryId` with HTTP 202. The handler loads generation `:id`. When recovery rules allow it, the same row returns to `pending` and `storytellerRetry` records the supplied `retryId`. The handler inserts no new generation id. A retry the recovery rules reject throws conflict (HTTP 409).

Draft save uses the client-supplied draft id and `expectedRevision`. An identical body is returned unchanged when the server revision equals the submitted `expectedRevision` or is exactly one higher. A different body at the wrong revision throws `DraftError('conflict')` and the row stays as it was. The draft integration test asserts that one of two concurrent different saves is 200 and the other is 409, and that a stale `expectedRevision` is 409.

The version field name is part of the frozen body. Resolution and draft save use `expectedRevision`. Start uses `expectedDraftRevision`. Interval control uses `expectedControlRevision`. A different fence under the same operation id is a conflict.

**Normal:** the player chose option A under operation id `O` and revision 1. The response was lost. The client sends the same `PUT` with the same id, revision, and option A.

**Negative:** retrying a paid operation must not be described as silently minting a fresh operation id. A 409 from a changed body, a second resolution id, or a busy opening is not permission to invent a new id.

## Accepted response versus committed world

**Reader question:** Did this HTTP status publish the next world state?

**Normative status:** source-inspected for the handlers that declare `@HttpCode`. Handlers that omit `@HttpCode` are [unknown](#unknowns) as a class. This section is not a route catalogue.

**Owner:** this heading, for the status meaning. Later worker publication stays on [Story execution with Temporal](execution-and-delivery.md).

| Handler | Declared status | What the handler has done when it returns |
| --- | --- | --- |
| `PUT /api/stories/:id/resolutions/:operationId` | 202 | Awaited resolution admission, then returned the current public snapshot. Admission can leave `resolution.state` at `pending`. |
| `PUT /api/drafts/:draftId/openings/:id` and its retry | 202 | Awaited opening request or retry, then returned the opening preview. Preview `state` may still be `pending`. |
| `PUT /api/stories/:id/start` | 200 | Awaited start, then returned the current public snapshot. |
| `PUT /api/stories/:id/controls/:operationId` | 200 | Awaited the interval control, then returned the current public snapshot. |
| `PUT /api/drafts/:id` | 200 | The draft transaction returned the saved row, or the identical replay of the current row. |

The resolution fixture's 202 body still has story `revision` 1, `resolution.state` `pending`, and `canRespond` false. After that same operation is completed in the fixture, the receipt `state` is `settled`, the snapshot `resolution` is null, and the story revision has moved. The 202 body was a read of the not-yet-settled snapshot.

Interval control is the contrasting case on [Implemented fixed interval](execution-and-delivery.md#implemented-fixed-interval): HTTP 200 for that control means the database change has committed, even when Temporal has not yet received the wake hint. This page keeps 200 and 202 as different outcomes. It does not restate the worker.

**Normal:** show the 202 snapshot as accepted and still pending. Replace the scene from a later GET whose revision or receipt state says the world moved.

**Negative:** an HTTP 202 is not a settled world consequence. An SSE message is not one either. See [GET truth and SSE hints](#get-truth-and-sse-hints).

## GET truth and SSE hints

**Reader question:** Which response is allowed to replace the scene?

**Normative status:** source-inspected. Client cache keys and polling intervals stay on [Commands and hints](../client/state-and-server-boundary.md#commands-and-hints). This heading says what the HTTP messages are.

**Owner:** this heading.

`GET /api/stories/:id` is the owner-scoped public snapshot. `GET /api/stories/:id/resolutions/:operationId/receipt` is the owner-scoped receipt. The receipt reader selects and returns. Its own comment says it does not enqueue, retry a provider, or update a generation row. The resolution fixture records outbox count and generation `state` / `status_revision` around that GET and asserts they are unchanged. A missing or unowned receipt is 404. An empty cookie is 401.

Receipt fields are `operationId`, `storyId`, `state` (`admitted`, `processing`, `settled`, `failed`, `uncertain`), `viewVersion`, `resolutionVersion`, `reason`, `recovery`, and `requestDigest`. Stored generation `pending` is reported as `admitted`. Stored `running` is reported as `processing`. `admitted` and `processing` are distinct from `settled`. `recovery` is a coarse hint. The attempt-level retry gate remains authoritative. A `retry` hint still names the existing operation.

`GET /api/stories/:id/updates` is Server-Sent Events. Subscribe requires the session and a successful owner read of the story. Anonymous is 401. Another owner is 404. A committed-view hint matches `storyUpdateHintSchema`: `eventId`, `storyId`, `viewVersion`, and `kind: 'committed-view'`. The updates fixture asserts the hint has neither `paragraphs` nor `candidate`.

Heartbeat data is `{ ok: true, listenerHealthy }` about every 15 seconds (`HEARTBEAT_MS`). `listener-recovered` data is `{ ok: true }` after LISTEN reconnects. Heartbeats continue while `listenerHealthy` is false. A heartbeat does not show that NOTIFY is healthy, and it does not show that the story changed.

Story list pagination uses a `before` story id. Draft list pagination uses a `cursor`. Those query names apply to different resources. The module READMEs keep the per-route detail.

**Normal:** on `story-update`, or on `listener-recovered`, GET the snapshot, and GET the receipt while the operation is still unresolved. Ignore a hint whose `storyId` is a different story.

**Negative:** an SSE message is not a settled world consequence. Render the next passage from GET. A heartbeat does not send a paid command.

## Error and uncertainty recovery

**Reader question:** What may the client do after a non-success status?

**Normative status:** source-inspected mapping for the story, draft, and opening controllers. It is not a new recovery right. Explicit player recovery UX stays on [Commands and hints](../client/state-and-server-boundary.md#commands-and-hints).

**Owner:** this heading, for the shared meaning.

| Status | Where it is mapped | What it means here | What it must not mean |
| --- | --- | --- | --- |
| 401 | `requireUser` when the session is missing | The application operation was not called. | 401 is not a reason to retry as a new command. |
| 400 | `invalid`, and `OpeningInputError` | The body or identifier failed validation. | A corrected paid command under a new id. |
| 404 | `not_found` | The id is missing or not owned by this session. | 404 must not be described as a way to infer another user's data. |
| 409 | `conflict`, and opening `busy` | The frozen id, version fence, or in-flight opening rejected the write. A draft conflict leaves the saved row unchanged. | 409 must not be described as permission to overwrite a draft blindly. |
| 429 | SSE subscribe when `story_stream_limit` or `owner_stream_limit` is thrown | This stream was refused. | A limit for every other route. Those limits were not read. |
| 503 | `unavailable`, any other thrown error in these handlers, an identity driver failure, or a missing update hub | The handler did not produce the projection. | Proof the story was deleted, or proof a command settled. |

`StoryError` responses are `{ code, reason? }`. `reason` is included only when the error carries one. The unowned story read and the unowned receipt throw `not_found` with no reason. `DraftError` and `GenerationError` responses from these controllers are `{ code }` only.

An uncertain generation is reported on the receipt as `state: 'uncertain'` and `recovery: 'operator'` when the state is uncertain or the failure code is `usage_uncertain`. That hint is operator recovery of the existing operation. It allocates no fresh operation id.

**Normal:** on 409 for a draft, GET `/api/drafts/:id`, keep the unsaved local edits, and submit again only against the revision that GET returned, with the same draft id.

**Negative:** 401 is not a reason to retry as a new command. 404 must not be described as a way to infer another user's data. 409 must not be described as permission to overwrite a draft blindly.

## Private DTO projection

**Reader question:** Which stored fields is a player response allowed to contain?

**Normative status:** source-inspected for the public schemas and presenters named here. It is not an audit of every JSON key on every route, and it adds no disclosure.

**Owner:** this heading, for the cross-route projection rule. The Zod objects stay in [contracts](../../../packages/contracts/README.md).

A player response is an authorized projection for the session owner. It is not the stored generation row.

- Public choice options (`choiceSpecificationSchema`) are `id`, `label`, optional `description`, and optional `risk`. The schema has no `intention` field.
- `playablePresentation` maps a playable offer's options to `id` and `label` only.
- The resolution receipt schema has no submission field. The resolution fixture asserts the chosen option id is absent from the receipt JSON, and asserts the scripted fixture's hidden intention strings are absent from the public snapshot JSON.
- Scripted and storyteller opening reads return `openingPreviewSchema`: id, source revision, currentness, mode, state, optional storyteller, content, and package fields, optional `canRetry`, and a nullable candidate of scene content plus a choice. They omit `attemptId` and the stored generation input.
- A mechanical opening candidate copies `plan.intention` into option `description` and `plan.risk` into `risk`. That description is visible choice text on the authorized preview. It is not a provider prompt, and it is not another owner's row.

Chamber inspection can read a selected intention through the developer adapter. That adapter is not this player projection, and this page does not make it a player endpoint.

**Normal:** render the snapshot's choice labels. Reload the scene with GET. Read operation progress from the receipt fields listed above.

**Negative:** a 404 body is not another user's snapshot. A public label, and a mechanical `description`, are not a request for stored prompts, attempt rows, or unselected plan consequences.

## Review a new route

**Reader question:** What must be reviewed before a new player route exists?

**Normative status:** a review checklist for a future route. Completing the checklist does not authorize the route, the command, or a player right. Product authority and the owning technical contract come first.

**Owner:** this heading.

| Review | The route is not ready until | Negative that fails the review |
| --- | --- | --- |
| Identity | The session user id is the only owner passed in. A missing session is 401 and the operation is not called. Another owner receives the same 404 as a missing id, and the body has no foreign row. | The 401 path mints a new operation id and retries the command. |
| Command admission | The operation id and the route's version field stay frozen. The same id with a different body conflicts. HTTP 202 is used only when the world consequence can still be unsettled after the response. A paid retry names the existing operation id. | A lost paid response is recovered by silently minting a fresh operation id. |
| Schema and contracts | Request and response use a strict public schema. The response is a projection. A new public field is an explicit projection change. | The handler returns a raw generation or story row. |
| Client cache | The scene is replaced from GET. An SSE payload, when one exists, is an invalidation hint and has no passage body. A 202 is not stored as a committed scene. | The client treats the 202 body or the SSE message as the settled world. |
| Security | An unowned id and a missing id share 404. The body does not say that another account holds the id. | The notes say 404 means another user owns this id. |
| Error mapping | 400, 401, 404, 409, 429, and 503 keep the meanings in [Error and uncertainty recovery](#error-and-uncertainty-recovery). | A draft 409 is handled by writing local form text over the server revision. |

## Service calls are not player routes

**Reader question:** Does naming a service add a player HTTP route, or turn a broker message into one?

**Normative status:** one internal command is implemented. The rest of this heading remains a proposed target from 2026-11-19. This heading adds no player route.

**Owner:** this heading, for the boundary between player HTTP and a service command. The route inventory stays in the module READMEs. Process ownership stays on [Proposed service ownership](topology.md#proposed-service-ownership). Delivery classes stay on [Commands, business events, and workflows](execution-and-delivery.md#commands-business-events-and-workflows).

Current runtime: a player command is direct HTTP to the Nest API. The actor, frozen operation id, 202, GET, and error headings above still govern that call. With `GAME_AUTHORITY_MODE=distributed`, Nest forwards only the owned snapshot read and one scripted resolution to Game Authority at `GET /internal/v1/stories/:storyId` and `PUT /internal/v1/stories/:storyId/resolutions/:operationId`. The browser still calls `/api/stories/...`. The internal server does not mount `/api`. A forged service credential is refused. A wrong owner is not found. The same operation id returns the stored admission. Start, campaign commands, and publication are not on that server. Compose mode does not make the internal call. The source map is [Game Authority](../../../apps/game-authority/README.md).

Proposed target: a direct HTTP call from one service to another is a command to that owner. It is not a business event, not an SSE hint, and not a player route. A broker message never arrives as a player HTTP body. A Temporal signal is not an HTTP route on this page. Player routes do not accept a notification command or a fictional-market command from the browser. A player route does not own a committed scene checkpoint and does not assemble that history by asking whichever service answers first. That checkpoint is selected future behavior. The current journal and the current-only fork do not implement it, and this page does not add a route for it.

Negative: minting a fresh player operation id to recover a lost response stays forbidden on player routes. That fresh id cannot duplicate an admitted roll, a story-item transfer, or another committed effect. An imaginary market is not a service. This page does not add a market endpoint. Effect identity stays on [Proposed service schemas and delivery records](data-and-persistence.md#proposed-service-schemas-and-delivery-records).

## Contract dependencies

| This claim | Relation | Governing claim | Why a change triggers review |
| --- | --- | --- | --- |
| [Authenticated actor scope](#authenticated-actor-scope) | constrained-by | [Authentication and sessions](identities-and-access.md#authentication-and-sessions) | A session or membership change has to keep 401-before-work and owner-scoped 404. This page cannot invent an access right to absorb that change. |
| [Frozen operation identity](#frozen-operation-identity) | constrained-by | [Five owners](../engine/lifecycle-and-compatibility.md#five-owners) | Lifecycle command identity says a retry reuses the captured operation. The HTTP rule has to keep that id. |
| [GET truth and SSE hints](#get-truth-and-sse-hints) | co-change | [Commands and hints](../client/state-and-server-boundary.md#commands-and-hints) | Client invalidation has to keep GET as the scene. A hint payload change has to be reviewed with that client rule. |
| [Private DTO projection](#private-dto-projection) | constrained-by | [Authentication and sessions](identities-and-access.md#authentication-and-sessions) | What the viewer may read stays the access rule. A public field that exposed another owner's stored row would violate it. |
| [Service calls are not player routes](#service-calls-are-not-player-routes) | constrained-by | [Proposed service schemas and delivery records](data-and-persistence.md#proposed-service-schemas-and-delivery-records) | A player HTTP replay stays on the frozen operation id. It does not become permission to apply a committed effect again. |
| [Service calls are not player routes](#service-calls-are-not-player-routes) | constrained-by | [Commands, business events, and workflows](execution-and-delivery.md#commands-business-events-and-workflows) | Direct HTTP, a broker event, and a Temporal workflow stay different transports. This page cannot turn a broker message into a player route. |

## Unknowns

These were not established in the files read for this page.

- Settings, campaign-action, activity-control, document-admission, visit-ack, fork, and custom-intent handlers take an id in the URL. Their admission functions were not read. A fresh UUID is not assumed to be rejected the way resolution admission rejects one.
- Several `PUT` handlers omit `@HttpCode`. This page states no default status for them, and it states no world-commit claim for them.
- The controller comment on custom-intent interpretation says that handler does not mutate game state. The application function was not traced, so that comment stays unverified here.
- `PUT /api/stories/:id/start` is declared HTTP 200 and returns the snapshot from the awaited application call. Whether a later worker write can still follow that 200 was not traced past that call.
- SSE `429` was read only on the story-update subscribe path.
- Admin controllers and Chamber controllers were not re-audited. They are not evidence for the player-route rules above.
- Response bodies for a missing id and for another owner were not compared byte for byte. The named tests assert status 404 in both situations. That is not a timing-oracle result.
- No integration test named here was re-run at `b3113814`.

## Evidence read

Read at `b3113814`, and not re-executed:

- [identity.ts](../../../apps/api/src/modules/auth/identity.ts)
- [stories controller](../../../apps/api/src/modules/stories/controller.ts)
- [drafts controller](../../../apps/api/src/modules/drafts/controller.ts)
- [openings controller](../../../apps/api/src/modules/drafts/openings-controller.ts)
- [story-update hub](../../../apps/api/src/modules/stories/story-update-hub.ts)
- [resolution admission](../../../packages/application/src/storyteller/admission.ts)
- [opening request and retry](../../../packages/application/src/storyteller/openings.ts)
- [generation insert](../../../packages/application/src/generations/service.ts)
- [scripted opening busy check](../../../packages/application/src/generations/openings.ts)
- [draft save](../../../packages/application/src/drafts/index.ts)
- [receipt reader](../../../packages/application/src/stories/resolution-receipt.ts)
- [story contracts](../../../packages/contracts/src/stories.ts)
- [opening contracts](../../../packages/contracts/src/openings.ts)
- [interaction contracts](../../../packages/contracts/src/interactions.ts)
- [playable presentation](../../../packages/storyteller/src/tasks/playable-proposal.ts)
- [resolution HTTP test](../../../tools/api-integration/test/story-resolution.integration.ts)
- [SSE HTTP test](../../../tools/api-integration/test/story-updates.integration.ts)
- [draft HTTP test](../../../tools/api-integration/test/drafts.integration.ts)
