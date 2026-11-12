# Application story operations | source/transaction map

**First look:** The Nest `StoriesController` delegates to `createStoryApplication`, which composes persisted use cases and an **owner-scoped public snapshot**. The controller is not the correct place to duplicate DB command logic. This is the high-value map for W19 receipt and W16 SSE work.
**Start:** [createStoryApplication](index.ts) → [createStoryResolution.admit](resolution.ts) / [createResolutionReceiptReader.read](resolution-receipt.ts) or [createStoryReads/readSnapshot](reads.ts) → [story persistence helpers](persistence.ts). Open only the path corresponding to your Change.
**Source basis:** post-W16 `main`; recheck symbols before editing. **Target:** resolution receipt GET (W19) and committed-version SSE NOTIFY (W16) are implemented; browser EventSource bridge remains W17.

## Source responsibilities

| Question | Owner / symbol | Need next? |
| --- | --- | --- |
| Public façade and response | `index.ts: createStories/createStoryApplication` | `read` returns public view; `admitResolution` calls admission then reads current snapshot; `readResolutionReceipt` is read-only |
| Resolution command/idempotency | `resolution.ts: createStoryResolution.admit` | Locks owner story in DB transaction; checks operation UUID, prior expected revision and exact submission equality for scripted route |
| Resolution operation receipt | `resolution-receipt.ts: createResolutionReceiptReader.read` | Owner+story+operation join; maps generation state → admitted/processing/settled/failed/uncertain; SHA-256 `requestDigest` of canonical `{expectedRevision,submission}`; never enqueues |
| Current projection/version | `reads.ts: createStoryReads/readSnapshot` | Builds owned snapshot in repeatable-read read-only transaction; includes story `viewVersion` and `resolution.version` |
| Owner/resource lock | `persistence.ts: lockOwnedStory` | WHERE `ownerId` and `storyId`; only application action may admit |
| Publication | `continuation.ts: commitStoryContinuation` | Persists next passage and calls `advanceStoryView` to increment `viewVersion` in same transaction |
| Interval controls | `timing.ts: createStoryTiming` | Calls `incrementStoryViewVersion`, reads database clock, coordinates with committed wait |
| Start reviewed candidate | `start.ts: createStoryStart` | Checks existing story/candidate/expected draft revision; permanent Start ID is story UUID |
| Campaign action/passage | [campaign actions](../campaign/actions.ts), [campaign persistence](../campaign/persistence.ts) | Additional `viewVersion` writers **not reached through StoriesController alone** |
| Storyteller recovered operation | `index.ts: retryResolution` | Existing retry action distinct from GET receipt; don't reuse it for a read-only operation status |

## Reliable exactly-once reasoning (W19)

```text
PUT /api/stories/:storyId/resolutions/:operationId
  -> Nest requires user, passes ownerId -> createStoryApplication.admitResolution
  -> resolution.admit, lockOwnedStory
  -> existing operation? compare expectedRevision + submitted intent:
          same => idempotent admission/reuse
          different => conflict (409)
     absent => validate current revision/admit under DB transaction
  -> return current owner-scoped public story snapshot (202 transport admission)

GET /api/stories/:storyId/resolutions/:operationId/receipt
  -> Nest requires user -> createStoryApplication.readResolutionReceipt
  -> owner-scoped story + story_resolution + generation join
  -> 404 if missing/other owner; never enqueue, retry provider, or mutate
  -> Zod receipt with state, viewVersion, resolutionVersion, safe reason/recovery, requestDigest
```

**Receipt recovery note:** a 404 before in-flight commit does not prove no effect will arrive; the browser must not auto-start a new UUID after a missing ACK. Wire schema: `@offscreen/contracts/stories` `resolutionOperationReceiptSchema` + `canonicalResolutionRequestJson`.

## SSE commit hint reasoning (W16)

Not all story mutations originate in HTTP. Workers may commit narrative, mechanics and timing. `persistence.ts:advanceStoryView` and `incrementStoryViewVersion` both write `viewVersion` and `pg_notify` `offscreen_story_view` in the **same transaction** (so campaign paths that call those helpers also emit). Nest `story-update-hub` uses a dedicated LISTEN connection and fans out only to authorized SSE subscribers. No raw narrative, internal model payload or durable-replay promise. The SSE hint invalidates a browser Query entry (W17), never becomes state authority.

## Tests and reading boundaries

- [resolution integration](../../../../tools/api-integration/test/story-resolution.integration.ts) for duplicate/late/outcome; [Start](../../../../tools/api-integration/test/story-start.integration.ts) for idempotent story creation; [DB and Temporal warning](../../../../tools/api-integration/README.md) before any execution.
- [durable execution contract](../../../../docs/technical/execution.md) only if DB/worker retry rules are relevant; [selected F5/F6](../../../../docs/engineering/targets/react-next.md) for client observable promise.
- Update this map if public facade, transaction owner, version writers or receipt semantics change. Do **not** enumerate every SQL query or paste a 200-line failure taxonomy here.
