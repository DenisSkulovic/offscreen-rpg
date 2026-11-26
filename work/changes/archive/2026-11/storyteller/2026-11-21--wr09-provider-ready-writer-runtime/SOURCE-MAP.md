> Superseded by owner 2026-11-26. Historical design/evidence only; successor ownership and residual proof are recorded in CHANGE.md. No dispatch or paid permission.

# WR09 | source call graph and decisive replay hazard

**Inspected:** source snapshot/remote branch HEAD `e122d080677263aa6f38961f8734713664827c55`. Static inspection, no SQL/provider runtime tests.

| Boundary | Current owner/symbol | Required change |
| --- | --- | --- |
| Launch admission | `packages/story-engine/src/storyteller/launch-admission.ts` / `buildLaunchWriterMissionCapture`, `admitLaunchWriterMission` | scripted-offline selection; durable generation input lacks whole typed capture; preserve historical hashes while introducing provider-ready admission |
| Continuation admission | `.../writer-continuation.ts` / `buildWriterContinuationCapture`, `scheduleWriterContinuation` | frozen v3 checkpoint/root/controlling action; model scripted-offline; generation input has capture; one operation/run/funding/outbox |
| Prepared wire | `.../writer-loop.ts` / `buildWriterMissionRoundWire`, `prepareWriterMissionModelStep` | exact wire body/hash attached to step; prevent model/policy drift |
| Custody | `.../writer-mission-custody.ts` / `advanceWriterMissionProviderStep` | reserve/attempt/dispatch/usage; resultCasHash hashes bytes but is not response object pointer |
| Round and tools | `.../writer-loop.ts` / `runWriterMissionModelRound`, `applyToolCalls` | scriptedDecisionBody required; multi-round tool step and resumption need durable same-result replay |
| Transport | `packages/storyteller/src/providers/writer-round-transport.ts` / `createWriterRoundTransport` | policy checks/usage parse, fixed dummy Bearer header; inject credential only at Worker |
| Research child | `.../writer-research-runner.ts`, `apps/worker/src/activities/writer-research.ts` | explicit restricted context, currently fake child response; preserve no recursive delegation or workdesk publish |
| Worker scene | `apps/worker/src/activities/scripted-writer-scene.ts`, `apps/worker/src/activities/index.ts`, `apps/worker/src/runtime/index.ts` | scripted v3 proposal and publish; provider mode not wired |
| Worker launch | `apps/worker/src/launch/scripted-launch.ts`, `.../scripted-launch-writer.ts` | scripted marker, not authentic opening loop |
| Publication | `publishAcceptedWriterScene`, `publishLaunchOpeningScene` | locked checkpoint/root assertions; opening rejects nonnull interaction, scripted observe generated |
| Wake | `apps/worker/src/outbox/dispatch.ts`, `packages/workflows/src/contracts.ts` | versioned topics already exist; preserve workflow identity |
| Regression tests | `packages/application/test/p3b-writer-provider-custody.integration.test.mjs`, `apps/worker/test/scripted-writer-scene.test.mjs`, `apps/worker/test/writer-research-dispatch.test.mjs` | negative uncertain/budget, scripted baseline; expand not weaken |

**Reproducer to design against:** provider delivered valid JSON and charging settled, Worker crashes before parsing/publishing. On retry existing step reports replayed without original body; hash alone cannot recover final decision. No second provider send permissible; solution must persist and replay original exact response or hold honestly.
