# Decision ENG06 | First prove replay compatibility, then choose production Worker Deployments

**Status:** selected first implementation slice, **design-ready for owner authorization**; full production deployment/version routing remains later. Source baseline main `23fe6b5`: `@temporalio/workflow/client/worker@1.24.0`, `packages/workflows/src/index.ts`, `apps/worker/src/runtime/index.ts`, `compose.yaml` with `temporalio/temporal:1.9.1` **CLI dev image** (not sufficient evidence of Temporal Server's feature version).

## The right near-term problem

A character may sleep, travel or work while code is upgraded. A Temporal Workflow **replays its earlier command history**; a new worker implementation that changes the command sequence may be non-deterministic even if TypeScript builds. Current `campaignActivityV1`, `campaignActionV1` and `storyIntervalV1` loop through Activity results and durable timers/signals; names ending in `V1` do not provide deployment pinning.

**First work:** prove actual old-workflow-history compatibility. Do **not** immediately implement a production build-ID routing system that the local Temporal setup may not support or need.

## Selection among viable options

| Approach | When useful | First-stage choice |
| --- | --- | --- |
| Only keep new workflow code backward compatible and test **replay of real recorded histories** | Current local/simple deploy and modest workflow changes | **Select** |
| Use SDK `patched()` when a command sequence must change | Scoped incompatible new branch while old histories still run | **Allow with explicit unique patch ID + replay proof**, not automatically on every code edit |
| Worker Deployment API / version-pinned workers | Production hosted workers where exact Temporal server/SDK supports rollout/ramping and retention of old workers | **Later target**, not part of first local proof |
| Continue-As-New | A genuinely long-lived workflow accumulating thousands of events | **Conditional**, measure histories first; no arbitrary migration across business IDs |

Current Temporal guidance recommends Worker Versioning for production and patching when the environment cannot yet support versioned deployments; it also recommends keeping individual workflow histories within a few thousand events when feasible. Sources: [Temporal worker deployment](https://docs.temporal.io/best-practices/worker), [TypeScript patched API](https://typescript.temporal.io/api/namespaces/workflow).

## Narrow first ENG06 implementation proof

1. Record **real event histories from a disposable local Temporal service** for `campaignActivityV1`, `campaignActionV1` and one signal-driven `storyIntervalV1`; include a still-sleeping/paused workflow and a completed one.
2. Store a small, sanitized, deterministic **replay fixture corpus** in a test-only location with SDK/service/build metadata. No account secrets, provider request bodies, private narrative text or production histories.
3. Use the replay API available in installed SDK **1.24.0** (`Worker.runReplayHistory/Histories` where supported; verify actual type/API before implementation) to prove the current worker code accepts those old histories without non-determinism.
4. Restart a separate worker process while one accepted task is sleeping, then complete it using the **same SQL business operation identity** and assert exactly one roll/settled receipt/effect. Pure replay alone is not enough to prove SQL/outbox.
5. Create a **test-only deliberately incompatible change** in an isolated fixture to prove the replay check would fail, then remove/contain it. A green test that cannot detect incompatibility is useless.
6. Record actual event-history count/bytes for short and repeated boundary cases, including long-wait event count and worst observed replay duration.
7. Document the release rule: **no unpatched Workflow command-order changes** for existing live workflow types without a replay corpus or versioned worker deployment migration. Pending `V1` activities must remain readable.

## Production evolution, explicitly deferred

When hosted long-lived workflows are planned:
- confirm actual Temporal Server and SDK support for the **Worker Deployment API** and current versioning semantics;
- create a build-ID/deployment naming and retention/rollback policy;
- retain workers serving pinned old executions; never remove them while active work remains;
- stage/ramp new worker version and monitor stuck/stale executions;
- add Continue-As-New or bounded segments if recurring routines cause excessive history growth;
- preserve canonical PostgreSQL receipt/clock identities across new Temporal workflow run IDs.

**Not first stage:** deployment automation, Kubernetes, Temporal Cloud, automatic scaling, multi-region workers or a new task queue architecture.

## Gates now resolved

We've selected the near-term approach: **replay compatibility + old-process restart**, SDK 1.24.0, local disposable service, patching only when command sequences change, no production Worker Deployment dependency. This unblocks a **test-first compatibility Change** after owner authorization and explicit local test permission. It does **not** establish a complete long-running production versioned deployment system.

## Negative acceptance

- Replay a recorded old workflow under a deliberately reordered Activity/timer sequence -> explicit non-determinism failure.
- Restart process mid-wait -> exact same saved business operation settles once.
- Duplicate outbox wake -> not two concurrent current work instances or double effect.
- New worker accidentally changes old timer/signal behavior -> test fails before release.
- Old task with missing matched Activity result -> explicit held/retry behavior, not fabricated completion.
- Repeated many-boundary workflow -> measured history growth, not unbounded assumptions.

**Ready state:** design-ready, not formally Ready; first approval is for local/disposable proof only. Upgrade to production Worker Deployments is a separate decision requiring actual server version/hosting.
