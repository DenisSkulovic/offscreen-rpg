# Change CH13 | Isolated connected rig for real Nest/worker/Temporal recovery

> **Cursor first look:** [integration test source](../../../tools/api-integration/test/README.md) + [app story authority](../../../packages/application/src/stories/README.md) + [launcher modes](../../../tools/chamber/src/README.md). **Target:** [C04/C05/C07/C08/C12/C13](../../engineering/targets/chamber-laboratory.md#11-verifiable-acceptance-c01c16), [protocol `2/8](../../technical/chamber-lab-protocol.md#2-architecture-and-drivers), [audit H03/H05/H13](../../engineering/audits/chamber-gap-2026-11-12.md#4-ranked-gaps). **Trap:** a pure mocked run cannot certify DB idempotency or an actual worker restart.

**State:** Specified/Proposed; no source or service-run authorization. **Depends on:** CH04, CH06, CH08, CH09, CH12. **Baseline:** `470a5df`.

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
