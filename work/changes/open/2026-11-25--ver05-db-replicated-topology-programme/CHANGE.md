# VER05 | DB programme: replicated and independent PostgreSQL topologies

**Status: Dependency-gated / do not dispatch while VER04 is deferred. Kind: implementation. Profile: STATE.** Baseline 0c45ae7318295398d706511b9d702720a55c8a92; target main. VER02/03 source joined; VER04 deferred, prerequisite not satisfied. Requires verified local dev Kind and pinned CNPG operator already installed for live; no operator changes.

[Normative verification programme](../../../../docs/technical/platform/verification-programmes.md) · [Program and ownership](../../../undertakings/storyteller-workshop/VERIFICATION-PROGRAMME.md) · [TASKS](TASKS.md)

## Outcome
Same DB package scenarios with one replicated and two independently replicated PostgreSQL clusters; fault/failover evidence without implying shard routing.

## Execution and acceptance
Separate linked Change branch/worktree from current main; branch guard `node scripts/repo-tools/change-branch-guard.mjs --change VER05 --target main`. Parent reads selected packet and canonical contract, one bounded Composer task at a time. Do not redesign shared interfaces or edit unselected DB/INF code. No provider spend, protected DB, shared cluster mutation, or production deployment. Historical source commission is dependency-gated; do not dispatch until VER04 source joins and readiness is reconciled; live disposable resource actions require explicit operator --live invocation. Run named source tests, build/typecheck where affected, graph guard and positive/negative fixture tests. No live PASS without real evidence. Record exact source SHA, commands, results, limitations and cleanup. Integrate source with live NOT-RUN if required resource unavailable; retain live acceptance obligation in permanent programme capability catalog (do not close required live evidence by assertion). Actual contract or safety contradiction returns to planner with exact evidence; missing live permission not source blocker.

## planned-impact.v1
| Plane | Disposition |
| --- | --- |
| Product | No gameplay/auth/spend changes |
| Technical | Realize verification-programmes.md |
| Source | Named runner/resource/scenario files only |
| Proof | Named source and live tiers; no fabricated PASS |
| Related | Verification catalogue, runbook, receipts and archive |

## Reconciliation ledger
| Claim | Authority | Source SHA | Evidence | Negative |
| --- | --- | --- | --- | --- |
| DB programme: replicated and independent PostgreSQL topologies | verification-programmes.md | pending | NOT-RUN | TASKS |
