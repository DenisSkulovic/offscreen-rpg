# VER04 | DB programme: transactions, migration, telemetry and recovery

**Status: Ready (dependency-gated) / owner-commissioned source implementation. Kind: implementation. Profile: PROOF.** Baseline 0c45ae7318295398d706511b9d702720a55c8a92; target main. VER03 joined; DB09 source Done for telemetry/helpers; DB10 component source tests available on main (live acceptance not prerequisite).

[Normative verification programme](../../../../docs/technical/platform/verification-programmes.md) · [Program and ownership](../../../undertakings/storyteller-workshop/VERIFICATION-PROGRAMME.md) · [TASKS](TASKS.md)

## Outcome
Persistent transactional and migration acceptance, real faults and evidence independent of infrastructure installation. Reuse DB10 instead of duplicating tests.

## Execution and acceptance
Separate linked Change branch/worktree from current main; branch guard `node scripts/repo-tools/change-branch-guard.mjs --change VER04 --target main`. Parent reads selected packet and canonical contract, one bounded Composer task at a time. Do not redesign shared interfaces or edit unselected DB/INF code. No provider spend, protected DB, shared cluster mutation, or production deployment. Source implementation commissioned; live disposable resource actions require explicit operator --live invocation. Run named source tests, build/typecheck where affected, graph guard and positive/negative fixture tests. No live PASS without real evidence. Record exact source SHA, commands, results, limitations and cleanup. Integrate source with live NOT-RUN if required resource unavailable; retain live acceptance obligation in permanent programme capability catalog (do not close required live evidence by assertion). Actual contract or safety contradiction returns to planner with exact evidence; missing live permission not source blocker.

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
| DB programme: transactions, migration, telemetry and recovery | verification-programmes.md | pending | NOT-RUN | TASKS |

## Transferred DB10 acceptance (2026-11-26)

DB10 source scope closed by owner; component harness and graph/wiki work already integrated at a658f707. VER04 owns remaining disposable live SQL proof, not a duplicate harness: migration advisory-lock exclusion, transactional rollback, applied hash/prefix refusal, managed saturation and recovery, serializable conflicts, rollback/read-only/lock timeout and no duplicated effects. Preserve zero extraction DDL and tracked migration bytes as source invariants; no live PASS inferred. Historical graph failure in action-executions.ts is a separate source-health check, not a SQL experiment. DB12/13/14 corrected earlier source defects; revalidate current anchors before dispatch and test the fixed behavior, not obsolete assumed failures. [Archived DB10](../../archive/2026-11/platform-operations/2026-11-24--db10-dependency-closure-and-proof/CHANGE.md).
