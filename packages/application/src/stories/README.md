# Application story operations | source/transaction map

**First look:** The Nest `StoriesController` delegates to `createStoryApplication`, which composes persisted use cases and an **owner-scoped public snapshot**. The controller is not the correct place to duplicate DB command logic. This is the high-value map for W19 receipt and W16 SSE work.
**Start:** [createStoryApplication](../../../../index.ts) → [createStoryResolution.admit](../../../../resolution.ts) or [createStoryReads/readSnapshot](../../../../reads.ts) → [story persistence helpers](../../../../persistence.ts). Open only the path corresponding to your Change.
**Source basis:** `470a5df`, 2026-11-12 static inspection, no local DB, runtime or test proof. **Target:** immutable public command receipts and committed-version hints **not yet implemented**.

## Source responsibilities

| Question | Owner / symbol | Need next? |
| --- | --- | --- |
| Public façade and response | `index.ts: createStories/createStoryApplication` | `read` returns public view; `admitResolution` calls admission then reads current snapshot |
| Resolution command/idempotency | `resolution.ts: createStoryResolution.admit` | Locks owner story in DB transaction; checks operation UUID, prior expected revision and exact submission equality for scripted route |
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
```

**W19 proposed GET receipt:** read existing persisted `storyResolution`/generation status **without enqueue, mutation, provider or new charge**. Return only safe authorized reference/status and canonical submitted-input digest. A 404 during an in-flight request does not prove a command cannot subsequently commit; browser must not auto-start a new UUID after missing ACK. For exact wire/status design read the selected [W19 packet](../../../../docs/changes/2026-11-12--web-resolution-operation-receipts/CHANGE.md) rather than inventing another protocol.

## SSE commit hint reasoning (W16)

Not all story mutations originate in HTTP. Workers may commit narrative, mechanics and timing. `persistence.ts:advanceStoryView` and `incrementStoryViewVersion` are currently the main helpers; `campaign/persistence.ts` also advances views. **Before editing, do one narrow call-site search for these exact symbols** and verify every authoritative version write site. Publish minimal `storyId/viewVersion/kind` hint transactionally (PostgreSQL NOTIFY delivered only at commit) and listen with a dedicated API connection. No raw narrative, internal model payload or durable-replay promise. The SSE hint invalidates a browser Query entry, never becomes state authority.

## Tests and reading boundaries

- [resolution integration](../../../../tools/api-integration/test/story-resolution.integration.ts) for duplicate/late/outcome; [Start](../../../../tools/api-integration/test/story-start.integration.ts) for idempotent story creation; [DB and Temporal warning](../../../../tools/api-integration/README.md) before any execution.
- [durable execution contract](../../../../docs/technical/execution.md) only if DB/worker retry rules are relevant; [selected F5/F6](../../../../docs/engineering/targets/react-next.md) for client observable promise.
- Update this map if public facade, transaction owner, version writers or receipt semantics change. Do **not** enumerate every SQL query or paste a 200-line failure taxonomy here.
