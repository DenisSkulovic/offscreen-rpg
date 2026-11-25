# VER03 | DB programme: admission, pressure and process isolation

**Status: Ready (dependency-gated) / owner-commissioned source implementation. Kind: implementation. Profile: PROOF.** Baseline 0c45ae7318295398d706511b9d702720a55c8a92; target main. VER02 joined; DB07 joined (verified); DB09 source Done (telemetry sections may use joined helpers).

[Normative verification programme](../../../../docs/technical/platform/verification-programmes.md) · [Program and ownership](../../../undertakings/storyteller-workshop/VERIFICATION-PROGRAMME.md) · [TASKS](TASKS.md)

## Outcome
Import actual built @offscreen/db and exercise real managed connection behavior, not private functions. Standard, stress and shutdown scenarios.

## Execution and acceptance
Separate linked Change branch/worktree from current main; branch guard `node scripts/repo-tools/change-branch-guard.mjs --change VER03 --target main`. Parent reads selected packet and canonical contract, one bounded Composer task at a time. Do not redesign shared interfaces or edit unselected DB/INF code. No provider spend, protected DB, shared cluster mutation, or production deployment. Source implementation commissioned; live disposable resource actions require explicit operator --live invocation. Run named source tests, build/typecheck where affected, graph guard and positive/negative fixture tests. No live PASS without real evidence. Record exact source SHA, commands, results, limitations and cleanup. Integrate source with live NOT-RUN if required resource unavailable; retain live acceptance obligation in permanent programme capability catalog (do not close required live evidence by assertion). Actual contract or safety contradiction returns to planner with exact evidence; missing live permission not source blocker.

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
| DB programme: admission, pressure and process isolation | verification-programmes.md | pending | NOT-RUN | TASKS |
