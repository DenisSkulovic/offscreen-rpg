# Temporal infrastructure | greenfield outcome and residual work

**2026-11-26: design closed, development implementation live-observed.** The prior selected wave is superseded, not an executable plan. Owner accepted retirement of the design after wiki promotion.

- [Permanent technical contract](../../../docs/technical/platform/temporal-infrastructure.md)
- [Current operator runbook](../../../docs/runbooks/kubernetes-temporal.md)
- [Dated live evidence and method retrospective](../../../evidence/runs/2026-11-26-temporal-platform.md)
- [Original full design, immutable Git archive](https://github.com/DenisSkulovic/offscreen-rpg/tree/3bf63b3ab46de8974b76886031853249c15e1e10/work/designs/open/temporal-platform)
- [Prior INF61–71 program, historical](https://github.com/DenisSkulovic/offscreen-rpg/blob/3bf63b3ab46de8974b76886031853249c15e1e10/work/undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md)

Development installation 66s, six ready Pods, both dedicated CNPG databases and role applied, RPC SERVING, working UI 2.58.1, repeat ensure 2s. No app workflow, release or cold cluster acceptance inferred.

## Remaining work, not commissioned by this ledger

| Area | Remaining decision or proof |
| --- | --- |
| Release | Resolve observed unrelated PUBLIC CONNECT safely in repository-controlled PostgreSQL setup, then explicit release cutover/install and default namespace registration proof |
| Namespace / app integration | Verify actual CLI JSON, owned dev tenant registration and connected application workloads against new frontend |
| Durable workflows | Build a rerunnable disposable workflow proof (normal execution/history/visibility, interruption/restart); separately exercise PG failover and backup/restore |
| Installer regression | Add normalization and asynchronous CNPG reconciliation regression coverage; full source regression and repeat-ensure identity evidence |
| Maintenance | Design explicit upgrade/schema compatibility/refusal/rollback lifecycle; no automatic ensure upgrades |
| Reproduction | Fresh Git clone and cold local clusters, normal documented commands only; no undocumented live patches |

INF61–63 and INF70–71 remain archived historical source receipts; INF64–69 were candidate descriptions, not dispatched Changes. They are superseded as a plan; do not execute or resurrect the legacy chart, embedded PG, old probes or smoke. Their still-useful requirements are represented above, not marked Done. No new Change selected, no live mutation authorization. PostgreSQL and Redis clean-slate design candidates are separate from this closed design.
