# VER01 | Unified verification entrypoint and evidence runner

**Status: Done / source joined; live disposable resource acceptance NOT-RUN. Kind: implementation. Profile: CONTRACT.** Baseline 0c45ae7318295398d706511b9d702720a55c8a92; integrated from main `a3445c11ea39ea8a0bbe0965e8b9b9fb786ff5a4`; Change branch HEAD `8d22ed75a8456fc388e93d2f7e40fd43fcf175b0`. None; coordinate shared root package.json / pnpm-lock.yaml joins with active DB/infra parents.

[Normative verification programme](../../../../../../docs/technical/platform/verification-programmes.md) · [Program and ownership](../../../../../undertakings/storyteller-workshop/VERIFICATION-PROGRAMME.md) · [TASKS](TASKS.md)

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
| Claim | Authority | Disposition | Source path / SHA | Evidence tier | Negative | Map update |
| --- | --- | --- | --- | --- | --- | --- |
| Unified verification entrypoint (`pnpm verify` catalog/CLI/plan/execute/report) | docs/technical/platform/verification-programmes.md § One entrypoint | changed — realized in tools/verification | tools/verification/** @ `8d22ed75a8456fc388e93d2f7e40fd43fcf175b0` | source-fixture PASS (`node --test` 47/47; `pnpm verify list`; `pnpm verify infra --plan`) | unknown/duplicate flags exit 2; missing suite exit 1; source-only never acquires live adapters; secret sentinel excluded | VERIFICATION-PROGRAMME + changes catalogs updated |
| Infra compatibility adapter (existing diagnostic as child; no hidden provisioning) | verification-programmes.md + infra/verification/CAPABILITIES.md | changed — suites/infra adapter | tools/verification/suites/infra/** @ `8d22ed75` | source-fixture PASS; live diagnostic acceptance NOT-RUN | malformed child FAIL; live-only rows NOT-RUN; no provisioning.mjs invoke | CAPABILITIES unchanged (adapter consumes existing CLI) |
| Live disposable resource acceptance | verification-programmes.md capability catalog | unchanged — still required; not closed by source fixtures | N/A | live NOT-RUN | N/A | retained obligation |
| Product gameplay/auth/spend | docs/product | unchanged — tooling only | N/A | N/A | N/A | N/A |
