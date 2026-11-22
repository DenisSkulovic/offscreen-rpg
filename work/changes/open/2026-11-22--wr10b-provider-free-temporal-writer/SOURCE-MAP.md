# WR10B source map

**Inspected HEAD:** `b59c22e9f874933666b86f6412693e996bdc4db5`.

## Current call path and exact gap

1. A settled player command creates a v3 continuation through `packages/story-engine/src/storyteller/writer-continuation.ts:scheduleWriterContinuation`.
2. It enqueues `WRITER_SCENE_WAKE_TOPIC = 'writer.scene.v1'`.
3. `apps/worker/src/outbox/dispatch.ts` maps that topic to `writerSceneWorkflowType` / `writerSceneV1`.
4. `packages/workflows/src/index.ts:writerSceneV1` calls `runScriptedWriterScene`.
5. `apps/worker/src/activities/index.ts` mounts `runScriptedWriterScene` on the relay worker, which has DB/DocumentStore authority.
6. `apps/worker/src/activities/scripted-writer-scene.ts` performs prepare, scripted model round and publication in-process. It never uses WR10's execution worker.
7. WR10 added `apps/worker/src/activities/writer-round-provider-execution.ts:executePreparedWriterRound` and private GA client, but `apps/worker/src/runtime/execution.ts` mounts only `createStorytellerDistributedExecutionActivities`.
8. `apps/game-authority/src/bootstrap/main.ts` installs Storyteller custody but does not pass `writerRounds` to `startGameAuthorityServer`.
9. `apps/game-authority/src/writer-round-private-seam.ts:validateCaptureAgainstPolicy` returns `scripted_offline_model`.
10. `packages/story-engine/src/storyteller/writer-round-replay.ts:validateDurableCapture` independently returns the same refusal.

This is the exact TURN03 blocker.

## Chosen ownership after WR10B

**Temporal workflow** owns orchestration identity only:
`missionId → current round plan → deterministic attemptId → executor activity → GA finalization`.

**Execution worker** owns the one outbound-effect slot. In lab scripted mode the effect is a deterministic in-memory transport, not network I/O. It never owns SQL, DocumentStore or publication.

**Game Authority** owns mission capture lookup, revision/root/policy verification, WR10 reservation/outcome custody, response rehydration, decision interpretation and final publication.

## Versioning decision

Do not mutate historical `writerSceneV1` semantics. Add:

- workflow type `writerSceneDistributedV2`;
- stable workflow id may continue using `writer-scene/<missionId>` because new outbox starts occur after deploy and duplicate-start is already rejected; if current tests prove collision with an existing v1 execution, use a `writer-scene-v2/<missionId>` id and update the dispatch test explicitly. Cursor must not choose a third scheme.
- repoint only **new `WRITER_SCENE_WAKE_TOPIC` dispatch** to v2.

## Execution plan contract

Add a control-authenticated GA operation that returns bounded metadata only:

`{ missionId, contextId, ordinal, expectedRevision, model }`

It must derive all fields from durable GA state and the persisted capture. No caller-supplied root, owner, model, price or budget.

The Temporal workflow uses `uuid4()` from `@temporalio/workflow` for attempt identity, then sends:

`{ missionId, contextId, ordinal, expectedRevision, attemptId }`

to `executePreparedWriterRound`.

## Scripted lab policy

Add one explicit runtime mode, named consistently in code, e.g. `OFFSCREEN_WRITER_EXECUTION_MODE=scripted-offline-lab`.

Acceptance rules:

- mode absent/default: no scripted Writer-round enablement;
- mode exact scripted lab: GA installs a fixed WriterRoundModelPolicy with model `scripted-offline`, bounded caps within the existing v3 continuation budget, and a dedicated policy/version label;
- provider/default validation continues to reject `scripted-offline`;
- the execution worker selects the deterministic local transport only in exact scripted lab mode;
- no `OPENROUTER_API_KEY` is read or required in this mode;
- invalid/mixed config fails startup.

The policy may reserve conservatively through the existing WR10 accounting helpers and settle zero reported usage/cost. Do not weaken accounting invariants to special-case zero reservation.

## Deterministic transport

The fake transport receives the exact prepared WR10 wire and pinned policy.

It must:

1. validate wire SHA/self-consistency and model `scripted-offline`;
2. parse the Writer request's user-message pins;
3. require a v3 continuation scene scope;
4. deterministically construct one valid `writerRoundDecisionSchema` final proposal for scene `baseSceneSequence + 1`, with two valid follow-up choices/intents and no forged source evidence;
5. return `kind:'delivered'`, zero usage, zero-cost telemetry, and the exact input wire SHA;
6. never call `fetch`.

Reuse/move the deterministic proposal construction logic from `apps/worker/src/activities/scripted-writer-scene.ts:buildScriptedWriterSceneProposal` only if it can be made input-complete from the prepared wire. Do not give the executor DB access merely to recover the executed plan. Generic deterministic proof prose is acceptable for TURN03; semantic model quality is not being tested.

## GA finalization

Add a GA-owned control operation that, after executor settlement:

- reloads mission/capture and exact current step;
- requires a strict durable response pointer;
- rehydrates the private response;
- invokes existing Writer decision validation/interpreter;
- requires a final v3 proposal for WR10B's bounded proof path; tool-call decisions may return a typed `needs-next-round` status if the existing interpreter already exposes it, otherwise fail/hold explicitly rather than inventing a second architecture;
- calls existing `publishAcceptedWriterScene` under GA-owned DB/DocumentStore authority;
- is idempotent when the passage for the mission/generation already exists.

No raw body enters Temporal history.

## Security matrix

- executor token: prepare/outcome/status only;
- control token: execution-plan/finalize only;
- story token: neither private Writer operation;
- default GA bootstrap: Writer private scripted policy unavailable;
- scripted lab bootstrap: explicit fixed policy only;
- executor startup rejects broad DB env exactly as today.
