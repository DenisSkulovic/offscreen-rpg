# VER02 | Disposable PostgreSQL resource adapter

**Status: Ready (dependency-gated) / owner-commissioned source implementation. Kind: implementation. Profile: STATE.** Baseline 0c45ae7318295398d706511b9d702720a55c8a92; target main. VER01 joined; can implement while DB03–10 continue; no DB runtime API changes.

[Normative verification programme](../../../../docs/technical/platform/verification-programmes.md) · [Program and ownership](../../../undertakings/storyteller-workshop/VERIFICATION-PROGRAMME.md) · [TASKS](TASKS.md)

## Outcome
Real PostgreSQL resources for package suites with strict ownership, no shared credentials, deterministic lifecycle and cleanup.

## Execution and acceptance
Separate linked Change branch/worktree from current main; branch guard `node scripts/repo-tools/change-branch-guard.mjs --change VER02 --target main`. Parent reads selected packet and canonical contract, one bounded Composer task at a time. Do not redesign shared interfaces or edit unselected DB/INF code. No provider spend, protected DB, shared cluster mutation, or production deployment. Source implementation commissioned; live disposable resource actions require explicit operator --live invocation. Run named source tests, build/typecheck where affected, graph guard and positive/negative fixture tests. No live PASS without real evidence. Record exact source SHA, commands, results, limitations and cleanup. Integrate source with live NOT-RUN if required resource unavailable; retain live acceptance obligation in permanent programme capability catalog (do not close required live evidence by assertion). Actual contract or safety contradiction returns to planner with exact evidence; missing live permission not source blocker.

## planned-impact.v1
| Plane | Disposition |
| --- | --- |
| Product | No gameplay/auth/spend changes |
| Technical | Realize verification-programmes.md |
| Source | Named runner/resource/scenario files only |
| Proof | Named source and live tiers; no fabricated PASS |
| Related | Verification catalogue, runbook, receipts and archive |

## Alignment with INF54 (documentation only, 2026-11-25)

INF54 [`topology.mjs`](../../../../infra/platform/postgres/topology.mjs) owns the shared CNPG owned-cluster builder (`renderOwnedPostgresCluster`, `--owner` scoped plan/status/ensure); packet archived at [INF54](../../archive/2026-11/platform-operations/2026-11-25--inf54-postgres-owned-clusters/CHANGE.md). A future CNPG verification resource adapter must consume that API only and must not weaken this packet’s Docker contracts: random run-scoped identity and `offscreen.verify.run=<runId>` label, closed bounded resource profiles without arbitrary engine arguments, explicit fault surfaces with ID+label verification before restart or backend termination, and release cleanup targeting exact owned container ID with failed cleanup as run failure and no foreign adoption. VER02 implementation scope remains Docker single/constrained; CNPG replicated/dual-replicated adapters are a separate implementation wave after INF54 source join.

## Reconciliation ledger
| Claim | Authority | Source SHA | Evidence | Negative |
| --- | --- | --- | --- | --- |
| Disposable PostgreSQL resource adapter (Docker) | verification-programmes.md | pending | NOT-RUN | TASKS |
| CNPG owned topology for future adapter | verification-programmes.md + INF54 topology.mjs | INF54 source Done (archive); live dual-cluster NOT-RUN | source tests 59/59 PASS; live NOT-RUN | must not duplicate manifest algorithm or override VER02 Docker fault/cleanup contract |
