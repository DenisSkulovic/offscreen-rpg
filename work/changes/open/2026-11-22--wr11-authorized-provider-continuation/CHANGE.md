# WR11 | Authorized provider continuation on the landed WR10B Writer path

**State: READY AFTER TURN03 CLOSE/HEAD RECHECK.**  
**Kind:** implementation · **Profile:** STATE/CONTRACT · **Reference:** `undertaking/storyteller-workshop`  
**Source baseline:** `22b46a828b56a8b3094bfab30162d5718c406e22`. WR10B is integrated; TURN03 is the only predecessor gate for release execution.  
**No paid provider call is authorized by this packet.**

## Outcome

A trusted server-side provider admission can create a v3 continuation mission whose model/policy is frozen before dispatch, execute through the **existing** `writer.scene.v1 → writerSceneDistributedV2 → storyteller-execute-v1 → WR10 private custody` path, use bounded Library/Workdesk tool rounds, and publish one v3 scene through Game Authority. Free acceptance uses an injected fake provider transport. Production/default remains scripted/disabled unless explicit provider-authorized configuration exists.

## Corrected architecture after WR10B

Do **not** add `writer.scene.provider.v1`, a second Writer workflow, a second workflow ID, or a second custody protocol. WR10B already moved new `writer.scene.v1` wakes to `writerSceneDistributedV2` and the no-SQL execution worker.

WR11 adds only the missing layers:

1. **Trusted admission.** Add a typed `WriterContinuationAdmission`: default scripted; provider admission is server-owned and contains the exact allowlisted model plus policy version. It is injected at SQL-worker boot and passed through `createStories → createCampaignActionExecutions → settleNarrativeIntentExecution → scheduleWriterContinuation`. Player bodies never select provider/model/price.
2. **Frozen policy identity.** Extend the v3 continuation capture with an optional provider policy/version pin used only for provider admissions. Existing scripted captures remain valid. GA rejects a provider capture whose pinned model/policy version does not match its installed policy before reserving/sending.
3. **Explicit provider bootstrap.** Extend GA bootstrap from `unavailable | scripted-offline-lab` with an explicit provider-authorized mode using one strict non-secret policy configuration. Execution worker uses normal WR10 provider transport and requires a key only in provider-authorized runtime; absent/mixed config fails closed. Free tests inject fake transport and never need a key.
4. **Multi-round loop on existing workflow.** `writerSceneDistributedV2` becomes a bounded plan→execute→finalize/advance loop. Control plan selects the latest parent model step (tool_call_id NULL, highest ordinal) and returns ordinal/revision/model/max-round bound. GA finalization interprets the saved decision:
   - final v3 proposal → publish and return published/replayed;
   - normal Library/Workdesk tool calls → apply idempotently, prepare the next parent model step, return `needs-next-round`;
   - `research.delegate` → held unsupported in WR11;
   - uncertain/held/failed → preserve existing terminal semantics.
   Workflow loops only on `needs-next-round`, never after uncertain/possibly-sent.
5. **No duplicate provider send.** Every round keeps WR10 mission/context/ordinal/attempt custody. Activity automatic retry remains one attempt for the send. Saved response/tool receipts are replayed; a possibly-sent attempt never receives a new attempt ID automatically.

## Write owners

Primary: `packages/story-engine/src/{stories/index,campaign/action-executions,campaign/narrative-intent-settlement,storyteller/writer-continuation,storyteller/writer-round-settled-finalization}.ts`; v3 capture schema owner under `packages/storyteller/src/tasks/**`; `packages/contracts/src/writer-scene-round-control.ts`; `packages/workflows/src/{contracts,index}.ts`; `apps/worker/src/{bootstrap/config,bootstrap/main,runtime/index,runtime/execution,activities/writer-scene-distributed-control}.ts`; `apps/game-authority/src/{writer-round-lab-policy,writer-round-control-seam,bootstrap/main}.ts`; focused tests and one unique `tools/api-integration/test/wr11-provider-continuation.integration.ts`.

Do not edit Web/CL01, DB migrations, K8S10 chaos, launch/opening, Admin, or TURN03 harness.

## Acceptance

Free fake-provider proof: one real player narrative action admits a provider-mode capture, provider round 1 returns a Library tool call, GA applies/replays the tool once, round 2 returns a final v3 scene, GA publishes exactly one passage/checkpoint/offer. Replay/worker restart performs no second fake send. Wrong actor, stale root, policy-version mismatch, over-budget, `research.delegate`, missing provider authorization and uncertain dispatch all fail closed. Existing scripted WR10B path remains green.

Optional real OpenRouter smoke is a separate owner authorization and may remain NOT RUN without blocking WR11 code completion.
