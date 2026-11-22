# WR10B selected execution

## T01 workflow + dispatch

Add `writerSceneDistributedV2` workflow and contract. Repoint `WRITER_SCENE_WAKE_TOPIC` dispatch to v2 for new starts. Workflow:

1. call control activity `planWriterSceneRound(missionId)`;
2. create deterministic Temporal `uuid4()` attempt id;
3. call `executePreparedWriterRound(plan + attemptId)` on `storyteller-execute-v1`;
4. if executor returns uncertain/held/replayed terminal status, call/read GA final state as appropriate and stop without retrying a possible send;
5. call control activity `finalizeWriterSceneRound(missionId)`;
6. return only after GA reports published/replayed, or throw typed non-retryable held/uncertain failure.

Temporal workflow retries may repeat plan/finalize, but WR10 durable attempt identity and GA publication idempotency prevent duplicate effects.

## T02 execution worker mount + lab transport

Extend `ExecutionWorkerConfig` with a strict Writer execution mode. Preserve `forbidBroadDatabaseOnExecutor`.

`startExecutionRuntime` mounts:
- existing distributed Storyteller activities;
- WR10 `createWriterRoundProviderExecutionActivities` configured with the same GA origin/executor token;
- a mode-selected transport factory.

In scripted lab mode, inject deterministic transport. In default/provider mode, do not silently use it. WR10B does not authorize a live provider key or OpenRouter call.

## T03 GA plan/finalize + explicit scripted policy

Install `writerRounds` in GA only under exact lab-scripted configuration. Replace unconditional scripted-model rejection with mode-aware validation in both private seam and settled replay/finalization path.

Add control-only plan/finalize routes. Plan derives current state. Finalize consumes only already-settled response and publishes through existing GA/Story Engine owners.

The existing executor prepare/outcome/status routes stay executor-only.

## T04 joined zero-cost proof

With disposable SQL/DocumentStore/Temporal and the explicit lab-scripted mode:

player/campaign command → `writer.scene.v1` outbox → v2 workflow → execute queue → WR10 prepare → local deterministic transport → WR10 outcome → GA finalize → published next passage.

Then run duplicate/retry and wrong-role negatives. No network provider endpoint may be contacted.

After WR10B integrates, TURN03 reruns its existing T04 against the joined HEAD. WR10B itself does not mark TURN03 gates PASS.
