# INF60 | Named Redis pools and operator inspection

**Status: Ready (dependency-gated) / owner-commissioned source implementation.**

Baseline c5da10d8d722c3d067fbb06d84d8fd57c22faf00; integration target main. Kind implementation; profile STANDARD. Owner commissioned source-only in 2026-11-25 Redis exploration. Use dedicated change/<id>-<slug> branch from current main and linked worktree; pnpm repo:change-branch --change INF60 --target main (check actual guard invocation in workflow). One Composer Standard child at a time, scoped source/test anchors only. No live Kubernetes/Docker, provider, tenant, SQL or Redis mutations. No application package or VER07/VER08 changes. INF58 parent is wave integration custodian; serialize shared catalogs, ledger, overview, STATUS and joins with other parents; INF59 may implement concurrently. After INF58 and INF59 source postconditions and receipts land INF60 is commissioned without extra promotion. Parent checks branch/status and named predecessor contracts, runs focused tests and diff/changed-file formatting, reconciles permanent docs/ledger, archives and squash-joins main under repository workflow. No unselected successor. Any real architectural/ownership contradiction returns exact file/symbol to ChatGPT; no broad investigation. Live tests NOT RUN, source evidence only.

## Outcome
Allow an explicitly named additional disposable cache pool on release without modifying the default shared cache or wiring any app to it. Physical isolation follows operational concern, not package name. Add human-friendly render/plan/status and guarded create-only ensure; no automatic activation.

## Dependencies and file ownership
INF58 + INF59 source integrated; their chart values/ownership APIs must match. Own named pool additions and new operator CLI only after both land.

[Tasks](TASKS.md) · [Redis infrastructure direction](../../undertakings/storyteller-workshop/REDIS-INFRASTRUCTURE.md) · [Cache architecture](../../../../docs/technical/platform/persistence-and-caching.md) · [Operator experience](../../../../docs/technical/platform/infrastructure-operator-experience.md).

## planned-impact.v1
| Plane | Disposition |
| --- | --- |
| Product | No gameplay, authorization or financial changes |
| Technical | Bounded local disposable Redis foundation; not hosted production proof |
| Source | Exclusive owners in TASKS |
| Proof | Positive and negative focused source fixtures; live NOT RUN |
| Related | Runbook/catalog/overview reconciliation through custodian |

## Acceptance and reconciliation
All T-ID tests pass, preserved baseline identities and no unexpected target/resource changes; record actual SHA and source receipt, no live claim. Failure or partial mutation reporting must not claim ready. Explicitly retain known local-only security and concurrency limits.

| Claim | Authority | Source SHA | Evidence | Negative |
| --- | --- | --- | --- | --- |
| Named Redis pools and operator inspection | persistence-and-caching; operator experience | pending | NOT RUN | TASKS |
