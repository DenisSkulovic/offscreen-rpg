# WR10B | Provider-free Writer round through the real Temporal executor

**State: READY.**  
**Kind:** implementation · **Profile:** RELEASE/CONTRACT · **Reference branch:** `undertaking/storyteller-workshop`  
**Planner baseline and source recheck:** `b59c22e9f874933666b86f6412693e996bdc4db5`.  
**Predecessor:** WR10 private split-custody Writer round protocol is integrated.  
**Unblocks:** TURN03 T04 `command-temporal-executor` and downstream cold-kind gates.  
**No paid provider call is authorized.**

## Why this Change exists

WR10 deliberately stopped before Temporal Writer wake / mission lifecycle scheduling. TURN03 proved that omission is now the exact blocker:

- `WRITER_SCENE_WAKE_TOPIC` starts `writerSceneV1`, whose `runScriptedWriterScene` activity runs on the broad-DB relay worker.
- the new WR10 `executePreparedWriterRound` activity exists but is not mounted by `startExecutionRuntime`;
- Game Authority production bootstrap does not install `writerRounds`;
- both `validateCaptureAgainstPolicy` and `validateDurableCapture` refuse the current continuation capture model `scripted-offline`;
- therefore a provider-free continuation can never traverse the real execution worker.

WR10B supplies exactly that missing bridge without enabling OpenRouter or changing player/provider policy.

## Selected architecture

1. Keep `writer.scene.v1` as the durable outbox topic, but dispatch new notices to a **new workflow type** `writerSceneDistributedV2`. Do not rewrite the historical `writerSceneV1` workflow implementation; existing Temporal histories remain replay-compatible.
2. `writerSceneDistributedV2(missionId)` runs on the control workflow worker. It obtains the current Writer round execution plan from Game Authority, creates one deterministic Temporal `uuid4()` attempt id, invokes `executePreparedWriterRound` on `storyteller-execute-v1`, then asks Game Authority to interpret/publish the settled final response.
3. Mount WR10's `executePreparedWriterRound` activity on the existing execution worker alongside `executeFrozenStoryteller`. Execution worker still receives **no SQL or DocumentStore credentials**.
4. Add an explicit Game Authority Writer-scene control seam:
   - executor-authenticated WR10 prepare/outcome/status remain executor-only;
   - control-authenticated plan/finalize operations return only IDs/state/revision and cause GA-owned interpretation/publication;
   - no raw provider response is returned to Temporal.
5. Add an **explicit lab-only scripted execution mode**. When configured, GA installs a pinned policy whose model is exactly `scripted-offline`, and the execution worker uses a deterministic local transport that validates the prepared wire and returns a valid v3 final Writer decision with zero usage/cost. It performs **no fetch to OpenRouter and requires no provider key**.
6. Production/default behavior remains deny-by-default. Without the explicit lab scripted mode, Game Authority does not admit `scripted-offline` into WR10 private rounds and the execution worker does not silently substitute fake output.
7. Do not remove the `scripted_offline_model` protection globally. Replace the unconditional rejection with an explicit execution-policy decision: provider mode rejects `scripted-offline`; lab-scripted mode accepts only `scripted-offline`.
8. TURN03 uses this path only to prove distributed causality. WR11 remains owner of real provider-authored continuation.

## Scope

Primary writes:

- `packages/workflows/src/contracts.ts`
- `packages/workflows/src/index.ts`
- `apps/worker/src/outbox/dispatch.ts`
- `apps/worker/src/runtime/execution.ts`
- `apps/worker/src/bootstrap/config.ts`
- `apps/worker/src/activities/writer-round-provider-execution.ts`
- new focused deterministic scripted Writer transport under `apps/worker/src/activities/` or `apps/worker/src/custody/`
- `apps/game-authority/src/writer-round-private-seam.ts`
- `apps/game-authority/src/application.ts`
- `apps/game-authority/src/server.ts`
- `apps/game-authority/src/bootstrap/main.ts`
- `packages/story-engine/src/storyteller/writer-round-replay.ts`
- one narrow GA-owned settled-round finalization helper under `packages/story-engine/src/storyteller/`
- focused Worker/GA/workflow/outbox/integration tests.

Read-only authority/source anchors include `writer-continuation.ts`, `writer-mission-custody.ts`, `writer-loop.ts`, `writer-scene-proposal.ts`, `launch-admission.ts`, and TURN03 current execution packet.

Do not edit Web/UI09, API, DB schema/migrations, Kubernetes common overlays, provider credentials, or TURN03 harness except normal post-join rerun/reconciliation.

## Acceptance

WR10B is Done only when:

- a real `writer.scene.v1` notice starts `writerSceneDistributedV2`;
- Temporal history crosses the real `storyteller-execute-v1` task queue;
- the execution worker runs `executePreparedWriterRound` with no broad DB/storage credential;
- explicit lab-scripted mode accepts only `scripted-offline`, emits no external HTTP provider call, settles zero reported cost, and produces one durable result pointer;
- GA control finalization rehydrates the settled response and performs Writer interpretation/publication, producing the next scene exactly once;
- replay of workflow/activity/outcome does not create a second provider/fake invocation, second charge, or second scene;
- provider/default mode still rejects `scripted-offline`;
- wrong story/executor/control bearer roles fail closed;
- missing lab flag/scripted policy/fake adapter fails closed rather than falling back to OpenRouter;
- existing WR10 private custody tests remain green;
- TURN03 can then rerun T04 without a paid call.

See SOURCE-MAP.md, EXECUTION.md, TASKS.md and PROOF.md.
