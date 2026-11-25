# VER01 | Unified verification entrypoint and evidence runner

**Status: Ready / owner-commissioned source implementation. Kind: implementation. Profile: CONTRACT.** Baseline 0c45ae7318295398d706511b9d702720a55c8a92; target main. None; coordinate shared root package.json / pnpm-lock.yaml joins with active DB/infra parents.

[Normative verification programme](../../../../docs/technical/platform/verification-programmes.md) · [Program and ownership](../../../undertakings/storyteller-workshop/VERIFICATION-PROGRAMME.md) · [TASKS](TASKS.md)

## Outcome
A common CLI, explicit catalog, dependency/resource plan, evidence and existing infra adapter; no live DB provisioner in this Change.

## Execution and acceptance
Separate linked Change branch/worktree from current main; branch guard `node scripts/repo-tools/change-branch-guard.mjs --change VER01 --target main`. Parent reads selected packet and canonical contract, one bounded Composer task at a time. Do not redesign shared interfaces or edit unselected DB/INF code. No provider spend, protected DB, shared cluster mutation, or production deployment. Source implementation commissioned; live disposable resource actions require explicit operator --live invocation. Run named source tests, build/typecheck where affected, graph guard and positive/negative fixture tests. No live PASS without real evidence. Record exact source SHA, commands, results, limitations and cleanup. Integrate source with live NOT-RUN if required resource unavailable; retain live acceptance obligation in permanent programme capability catalog (do not close required live evidence by assertion). Actual contract or safety contradiction returns to planner with exact evidence; missing live permission not source blocker.

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
| Unified verification entrypoint and evidence runner | verification-programmes.md | pending | NOT-RUN | TASKS |
