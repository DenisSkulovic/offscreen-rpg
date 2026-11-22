# WR11 | Authorized provider continuation on the landed WR10B Writer path

**State:** Done  
**Kind:** implementation · **Profile:** STATE/CONTRACT · **Reference:** `undertaking/storyteller-workshop`  
**Source baseline:** `22b46a828b56a8b3094bfab30162d5718c406e22`. WR10B and the TURN03 harness are already integrated. TURN03's remaining cold-kind acceptance is an independent proof lane, not a prerequisite for WR11 implementation or its provider-free fake integration proof.  
**No paid provider call is authorized by this packet.**

## Outcome

A trusted server-side provider admission can create a v3 continuation mission whose model/policy is frozen before dispatch, execute through the **existing** `writer.scene.v1 → writerSceneDistributedV2 → storyteller-execute-v1 → WR10 private custody` path, use bounded Library/Workdesk tool rounds, and publish one v3 scene through Game Authority. Free acceptance uses an injected fake provider transport. Production/default remains scripted/disabled unless explicit provider-authorized configuration exists.

## Corrected architecture after WR10B

Do **not** add `writer.scene.provider.v1`, a second Writer workflow, a second workflow ID, or a second custody protocol. WR10B already moved new `writer.scene.v1` wakes to `writerSceneDistributedV2` and the no-SQL execution worker.

WR11 adds only the missing layers:

1. **Trusted admission.** Add a typed `WriterContinuationAdmission`: default scripted; provider admission is server-owned and contains the exact allowlisted model plus policy version. It is injected at SQL-worker boot and supplied along `createStories → createCampaignActionExecutions → settleNarrativeIntentExecution → scheduleWriterContinuation`. Player bodies never select provider/model/price.
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

Primary paths: `packages/story-engine/src/stories/index.ts`, `packages/story-engine/src/campaign/action-executions.ts`, `packages/story-engine/src/campaign/narrative-intent-settlement.ts`, `packages/story-engine/src/storyteller/writer-continuation.ts`, `packages/story-engine/src/storyteller/writer-round-settled-finalization.ts`, `packages/story-engine/src/storyteller/writer-mission-custody.ts`, `packages/story-engine/src/storyteller/writer-round-capture-validation.ts`, `packages/storyteller/src/tasks/writer-mission.ts`, `packages/storyteller/src/providers/writer-provider-authorization-policy.ts`, `packages/storyteller/package.json`, `packages/contracts/src/writer-scene-round-control.ts`, `packages/workflows/src/contracts.ts`, `packages/workflows/src/index.ts`, `packages/workflows/src/writer-scene-distributed-v2-round-loop.ts`, `apps/worker/src/bootstrap/config.ts`, `apps/worker/src/runtime/index.ts`, `apps/worker/src/activities/writer-scene-distributed-control.ts`, `apps/game-authority/src/writer-round-lab-policy.ts`, `apps/game-authority/src/writer-round-control-seam.ts`, `apps/game-authority/src/bootstrap/main.ts`, `tools/api-integration/test/wr11-provider-continuation.integration.ts`, `tools/api-integration/test/wr11-t03-writer-round-control.integration.ts`, `tools/api-integration/test/helpers/wr10b-temporal-lab-stack.ts`, `tools/api-integration/test/wr10-private-round-protocol.integration.ts`, `docs/technical/storyteller/generation-and-publication.md`, `STATUS.md`, `work/undertakings/storyteller-workshop/OVERVIEW.md`, `work/undertakings/storyteller-workshop/PROGRAM.md`, `work/undertakings/storyteller-workshop/UNDERTAKING.md`, `work/changes/README.md`, `work/changes/open/README.md`, `work/changes/ledger/2026-11.md`, `work/sessions/2026-11-22.md`, `work/changes/backlog/experience-admin/2026-11-22--adi03-effective-policy-history-explorer/CHANGE.md`, `work/changes/backlog/agent-runtime/2026-11-22--wr12-provider-authored-opening/CHANGE.md`.

Focused tests: `packages/story-engine/test/writer-continuation-admission.test.mjs`, `packages/story-engine/test/writer-continuation-scene.test.mjs`, `packages/story-engine/test/writer-round-capture-validation.test.mjs`, `packages/storyteller/test/writer-mission.test.ts`, `packages/storyteller/test/writer-provider-authorization-policy.test.ts`, `packages/contracts/test/writer-scene-round-control.test.ts`, `packages/workflows/test/writer-scene-distributed-workflow.test.mjs`, `packages/workflows/test/writer-scene-distributed-v2-round-loop.test.mjs`, `apps/game-authority/test/writer-round-bootstrap-policy.test.ts`, `apps/game-authority/test/writer-round-control-custody.test.ts`, `apps/worker/test/executor-worker-config.test.ts`, `apps/worker/test/writer-continuation-admission-bootstrap.test.ts`, `apps/worker/test/writer-scene-distributed-control.test.ts`.

exception: tools/api-integration/test/turn03-cold-kind-evidence.test.ts because the integration package build required a .js import suffix and the TURN03 harness behavior stayed unchanged.

Do not edit Web/CL01, DB migrations, K8S10 chaos, launch/opening, Admin, or TURN03 harness.

## Acceptance

Free fake-transport proof: one real player narrative action admits a server-selected model capture, round 1 returns a Library tool call, GA applies/replays the tool once, round 2 returns a final v3 scene, GA publishes exactly one passage/checkpoint/offer. Replay/worker restart performs no second fake send. Wrong actor, stale root, policy-version mismatch, over-budget, `research.delegate`, missing authorization and uncertain dispatch all fail closed.

Existing scripted WR10B path remains green.

Optional real OpenRouter smoke is a separate owner authorization and remains **NOT RUN**. TURN03 cold-kind acceptance stayed independent; this Change did not operate the live kind cluster.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/storyteller/generation-and-publication.md#landed-provider-authorized-continuation-wr11 | technical | changed: continuation stays on writer.scene.v1 and writerSceneDistributedV2; provider admission is optional and pinned; research.delegate stays held | packages/workflows/src/index.ts writerSceneDistributedV2; packages/story-engine/src/storyteller/writer-continuation.ts @ 5dd4bf2 plus this Change | fixture-tested | policy mismatch, research.delegate, and uncertain dispatch do not publish or resend; wr11-provider-continuation.integration.ts | heading rewritten in that technical page |
| docs/technical/storyteller/generation-and-publication.md#selected-durable-writer-replay-stage-wr09b-prerequisite-wr09a | technical | changed: default admission remains scripted-offline; provider pin is no longer described as absent | packages/storyteller/src/tasks/writer-mission.ts providerPolicy @ 5dd4bf2 plus this Change | fixture-tested | scripted WR10B integration stayed accepted | same page |
| no product page changed | product | unchanged: player-visible story rules and spending consent are the same; paid provider use is still unauthorized | STATUS.md @ 5dd4bf2debe84aa1a6bcd5816783cf79df5012a6 | source-observed | player bodies cannot select model or policy | N/A |
