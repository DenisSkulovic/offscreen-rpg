# Change CH13 | Isolated connected rig for real Nest/worker/Temporal recovery

> **Cursor first look:** [integration test source](../../../tools/api-integration/test/README.md) + [app story authority](../../../packages/application/src/stories/README.md) + [launcher modes](../../../tools/chamber/src/README.md). **Target:** [C04/C05/C07/C08/C12/C13](../../engineering/targets/chamber-laboratory.md#11-verifiable-acceptance-c01c16), [protocol 2/8](../../technical/chamber-lab-protocol.md#2-architecture-and-drivers), [audit H03/H05/H13](../../engineering/audits/chamber-gap-2026-11-12.md#4-ranked-gaps). **Trap:** a pure mocked run cannot certify DB idempotency or an actual worker restart.

**State: Done** (2026-11-13). Owner authorized via continue after CH12. **Depends on:** CH04/CH06/CH08/CH09/CH12 (Done). Live Nest/Postgres/Temporal boot remains **blocked** until a separate authorized integration run; this slice ships planner + serial lock + fake-offline connected proof.

**Evidence:** `lab/connected-rig.ts`. Tests: `connected-rig.test.mjs` 3/3. Normal: confirmed fake-offline duplicate delivery → effectCount=1 deliveries=2 + evidence capsule. Negatives: unconfirmed → blocked; parallel second run forbidden; reserved `offscreen_auth_test` URL → isolation error; live-stack without infra → blocked (not failed gameplay). No disposable DB reset; provider spend none.

## One executable outcome

An opt-in `connected` scenario driver executing **real Nest → application/DB → Temporal/worker → public projection**, with optional Next Play link, against an isolated run identity/DB/task queue. One scenario may hold/duplicate/late-deliver a worker boundary and observe a persisted receipt, then restore the surrounding local services without altering another run.

## Binding design

- Reuse existing `tools/api-integration/test/helpers/app-integration.ts`, local launcher guards, real worker/outbox and saved resolution operations. **Do not** reimplement provider or mechanics inside driver.
- Shared fixed local ports/DB cannot safely run in parallel by default. Serial execution until isolation is proven; unique queue/namespace/run DB and verified cleanup. Hold and release are test-only controls with correlation IDs.
- Keep default provider-free scripted/fake transport, no real billable dispatch. Play/Next is a **selected observation tier**, not prerequisite for an automated transaction test.
- Record exact normal vs injected-failure outcome and actual test boundary in CH09 evidence; missing infrastructure is `blocked`, not failed gameplay.

## Proof

**Normal:** a valid scenario starts through real Nest, admits an activity, worker completes it and authoritative projection+receipt reflect one earned effect.  
**Negative:** duplicate worker notice/restart after DB commit doesn't duplicate reward/time, wrong owner denied, missing ACK doesn't start a new business intent.  
**Check:** explicitly authorized disposable Postgres/Temporal provider-free integration and selected browser smoke; no live provider, deployment or user DB reset.

**Handoff:** existing integration helper and one real execution route first; do not build a new microservice/scheduler just to host Chamber scenarios.
