# WR11 source map

**Inspected:** `22b46a828b56a8b3094bfab30162d5718c406e22`.

## Landed path

`packages/story-engine/src/storyteller/writer-continuation.ts` still hardcodes `modelSelection.model='scripted-offline'` and `WRITER_SCENE_WAKE_TOPIC='writer.scene.v1'`.

`apps/worker/src/outbox/dispatch.ts` now maps that topic to `writerSceneDistributedWorkflowType='writerSceneDistributedV2'` on `storytellerControlTaskQueue`, with stable id `writer-scene/<missionId>`.

`packages/workflows/src/index.ts:writerSceneDistributedV2` calls:
`planWriterSceneRound → executePreparedWriterRound(storyteller-execute-v1) → finalizeWriterSceneRound`.
It currently performs one ordinal only.

`apps/game-authority/src/writer-round-control-seam.ts` currently fixes `SCENE_CONTINUATION_ORDINAL=1`; plan validates the capture against one installed policy and returns ordinal/revision/model. Finalize calls `finalizeSettledWriterSceneRound`.

`writer-round-settled-finalization.ts` can already rehydrate a settled response and call `interpretPersistedWriterDecision`. When the interpreter returns a tool-round result it currently collapses that to held `needs_next_round`. That is the exact seam WR11 promotes into a typed continuation result.

`writer-loop.ts:interpretPersistedWriterDecision` already executes idempotent Library/Workdesk tools, records tool receipts, commits parent state `tools-applied`, prepares the next parent step and returns `tool-round-complete`. Research delegation is separately represented and stays unsupported for WR11.

`apps/worker/src/bootstrap/config.ts` already has no-SQL executor custody plus real `prepareWriterRoundTransport`; scripted lab mode swaps only the transport. `apps/game-authority/src/writer-round-lab-policy.ts` currently exposes only unavailable/scripted-lab bootstrap and must gain explicit provider-authorized policy installation.

## Selected admission path

The SQL-capable legacy worker is still the action-settlement owner:
`apps/worker/src/bootstrap/main.ts → startRuntime → createStories → createCampaignActionExecutions → settleNarrativeIntentExecution → scheduleWriterContinuation`.

Inject the frozen admission there. Do not move SQL authority to GA/executor.

Existing missions are immutable: replay reads the persisted capture/topic. A boot-time policy change may affect only newly admitted missions. Provider capture policy mismatch at GA holds before prepare/send.

## Round selection algorithm

Control planning queries the latest **parent model step** for `missionId/contextId` where `toolCallId IS NULL`, ordered ordinal DESC, limit 1. It returns that exact ordinal/revision. Never infer ordinal from Temporal loop count.

After a tool result, the interpreter prepares/records the next parent step. A subsequent plan therefore sees the new ordinal. Workflow may loop at most the capture's `maxModelRounds`; exceeding it holds before another send.
