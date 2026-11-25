# VER03 | DB programme: admission, pressure and process isolation

**State: Done (source implementation; live admission/stress/multiprocess/constrained/shutdown NOT-RUN).** Closed 2026-11-25 on Change branch `change/ver03-db-admission-workloads` from main `e67ffede3a666c64d506403b92814f4ea84d0215`. Joined main at `5034224e102096f66827f3ff50149e82af06499a`. Kind: implementation. Profile: PROOF. Baseline `0c45ae7318295398d706511b9d702720a55c8a92`; target main. VER02 joined; DB07 joined (verified); DB09 source Done (telemetry sections may use joined helpers).

[Normative verification programme](../../../../../../docs/technical/platform/verification-programmes.md) · [Program and ownership](../../../../../undertakings/storyteller-workshop/VERIFICATION-PROGRAMME.md) · [TASKS](TASKS.md)

## Outcome

Import actual built `@offscreen/db` and exercise real managed connection behavior, not private functions. Standard, stress and shutdown scenarios (source/fixture tier joined; live separately authorized).

## Execution and acceptance

Separate linked Change branch/worktree from current main; branch guard `node scripts/repo-tools/change-branch-guard.mjs --change VER03 --target main`. Parent reads selected packet and canonical contract, one bounded Composer task at a time. Do not redesign shared interfaces or edit unselected DB/INF code. No provider spend, protected DB, shared cluster mutation, or production deployment. Source implementation commissioned; live disposable resource actions require explicit operator --live invocation. Run named source tests, build/typecheck where affected, graph guard and positive/negative fixture tests. No live PASS without real evidence. Record exact source SHA, commands, results, limitations and cleanup. Integrate source with live NOT-RUN if required resource unavailable; retain live acceptance obligation in permanent programme capability catalog (do not close required live evidence by assertion). Actual contract or safety contradiction returns to planner with exact evidence; missing live permission not source blocker.

## planned-impact.v1

| Plane | Disposition |
| --- | --- |
| Product | No gameplay/auth/spend changes |
| Technical | Realize verification-programmes.md DB admission/pressure/process isolation |
| Source | Named runner/resource/scenario files only |
| Proof | Named source and live tiers; no fabricated PASS |
| Related | Verification catalogue, runbook, receipts and archive |

## Touched paths

Touched implementation paths: `tools/verification/package.json`; `pnpm-lock.yaml`; `tools/verification/runner/{catalog,catalog.test,cli,execute.test}.mjs`; `tools/verification/resources/postgres/docker.mjs`; `tools/verification/suites/packages/db/**` (manifest, policy, adapter, source + admission scenarios, multiprocess IPC/worker, fixture/helpers, focused tests).

Touched documentation/status paths: `docs/technical/platform/verification-programmes.md`; `work/undertakings/storyteller-workshop/VERIFICATION-PROGRAMME.md`; `work/undertakings/storyteller-workshop/OVERVIEW.md`; `work/changes/README.md`; `work/changes/open/README.md`; `work/changes/archive/2026-11/README.md`; `work/changes/ledger/2026-11.md`.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| DB programme: admission, pressure and process isolation | docs/technical/platform/verification-programmes.md | changed: register `@offscreen/db` suite with source/admission/stress/shutdown/multiprocess/constrained scenario modules; record VER03 source Done and live NOT-RUN | tools/verification/suites/packages/db/**; tools/verification/runner/catalog.mjs; tools/verification/runner/cli.mjs; tools/verification/package.json; pnpm-lock.yaml; docs/technical/platform/verification-programmes.md; base main `e67ffede3a666c64d506403b92814f4ea84d0215` | source-tested: focused node --test 39/39 PASS; quality-lint clean on owned suite files; `pnpm verify package @offscreen/db --profile source` DB-S01 PASS / DB-S02 NOT-RUN (exit 1 incomplete); live admission/stress/multiprocess/constrained/shutdown NOT-RUN | unknown scenario NOT-RUN; live:false → live-not-authorized; argv credentials refused; stampede accounting mismatch FAIL; no fake LIVE PASS | work/undertakings/storyteller-workshop/VERIFICATION-PROGRAMME.md; OVERVIEW.md; work/changes catalogs + ledger |
| Live disposable PostgreSQL admission/stress/multiprocess/constrained/shutdown acceptance | technical capability catalog | unchanged because source fixtures must not close live acceptance | no `--live` Docker/PG run authorized in this Change | live NOT-RUN | live PASS by assertion forbidden | retained obligation in verification-programmes.md |
| Transactions / migrations / telemetry / topology sections | technical + VER04/VER05 | unchanged because those sections remain later packets; advertised IDs stay NOT-RUN | suites preserve catalogue IDs; unimplemented live sections plan as NOT-RUN without --live | deferred to VER04/VER05 | not claimed PASS | N/A |
| Product player/story/auth/spend contracts | product | unchanged because no player-facing behavior moved | no product Markdown edits | reviewed | no product promise rewritten for verification tooling | map update not required |
