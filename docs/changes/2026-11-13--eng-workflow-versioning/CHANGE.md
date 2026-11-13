# ENG06 | An old accepted activity survives a worker deployment

**Design decision update (post-ENG wave, Nov 13):** **Design-ready for one bounded local history-replay compatibility proof**, still Proposed and not code-authorized. [ENG06 compatibility policy](../../engine-architecture/decisions/eng06-temporal-compatibility-policy.md) selects actual SDK 1.24.0, disposable Temporal service, replay of captured old workflow histories, a deliberately incompatible replay negative, and worker restart with the same SQL business operation. A full production Worker Deployment API/rollout, old-build retention and Continue-As-New redesign remain later work, not this first proof. The earlier versioning-strategy question is therefore resolved for the **first stage**, not for hosted production.

**State:** Proposed, **design-ready for a replay-first local compatibility proof after explicit owner authorization**, not ready for a complete production Worker Deployment rollout. **Kind:** Temporal workflow compatibility/versioning and replay/fault tests, preserving game authority. **Authority:** [evolution/release](../../engine-architecture/evolution-and-release.md), [time/execution](../../engine-architecture/time-and-execution.md), [Temporal worker guidance](https://docs.temporal.io/best-practices/worker).

## Cursor first-screen brief

> **Goal:** a workflow started under version X can finish its previously admitted action under unchanged game rules after version Y workers are deployed. No replay nondeterminism, duplicate roll/reward, missing timer or unbounded history.
>
> **Start:** `packages/workflows/src/index.ts`, `packages/workflows/src/contracts.ts`, `apps/worker/src/runtime/index.ts`, `apps/worker/src/outbox/dispatch.ts` and existing worker tests. Inspect actual Temporal SDK/service versions and deployment configuration.
>
> **Known trap:** a workflow name ending in `V1` does not guarantee replay compatibility. A code change that changes timer/Activity command ordering can break an old execution. Business idempotence stays in PostgreSQL, not workflow run IDs.

## Narrow result

**Selected first slice:** record and replay representative `campaignActivityV1` / `campaignActionV1` / `storyIntervalV1` histories against the installed TypeScript SDK v1.24.0; verify one worker-process restart with an accepted operation and a deliberately incompatible replay negative. Preserve current compatible workflow command order, add `patched()` only when source actually needs changed commands. Full production Worker Deployment API and long-history Continue-As-New remain separate decisions. See [selected replay policy](../../engine-architecture/decisions/eng06-temporal-compatibility-policy.md).

## Acceptance

Start one work execution under old workflow code; wait, restart worker with compatible new code, finish exactly once. Test pause/resume and duplicate outbox notice. Captured rule version, accepted effort, receipts and time remain identical. An incompatible change is detected/rejected before deployment. Measure workflow history/event counts for repeated boundary workload; no arbitrary “infinite loop forever” without bounded history proof.

## Exclusions

No redesign of game clock, no new shared-party time domain, no provider calls, no large event bus, no mandatory Kubernetes/Temporal Cloud account and no destructive production namespace manipulation. **Explicit test-environment permission required**.

**Ready gate:** the **initial approach is selected** (replay compatibility, local disposable Temporal, no cloud). Owner may authorize this one code/testing slice; Cursor checks installed APIs and actual local service behavior, implements the replay fixture, and reports compatibility evidence. Production version-pinned Worker Deployments still require an explicit hosting/server-capability decision.
