# VER02 | Disposable PostgreSQL resource adapter

**State: Done (source implementation; live Docker acquire/fault/cleanup NOT-RUN).** Closed 2026-11-25 on Change branch `change/ver02-owned-postgres-verification-resource` from main `598403a8e3e0fdb532882b8bf6eddb5b25924834`. Joined main at `d27df892ab8aa4ecae1c415026a8371e0d13a6ca`. Kind: implementation. Profile: STATE. Baseline `0c45ae7318295398d706511b9d702720a55c8a92`. VER01 joined; no DB runtime API changes.

[Normative verification programme](../../../../../../docs/technical/platform/verification-programmes.md) · [Program and ownership](../../../../../undertakings/storyteller-workshop/VERIFICATION-PROGRAMME.md) · [TASKS](TASKS.md)

## Outcome

Real PostgreSQL resources for package suites with strict ownership, no shared credentials, deterministic lifecycle and cleanup.

## Execution and acceptance

Separate linked Change branch/worktree from current main; branch guard `node scripts/repo-tools/change-branch-guard.mjs --change VER02 --target main`. Parent reads selected packet and canonical contract, one bounded Composer task at a time. Do not redesign shared interfaces or edit unselected DB/INF code. No provider spend, protected DB, shared cluster mutation, or production deployment. Source implementation commissioned; live disposable resource actions require explicit operator --live invocation. Run named source tests, build/typecheck where affected, graph guard and positive/negative fixture tests. No live PASS without real evidence. Integrate source with live NOT-RUN if required resource unavailable; retain live acceptance obligation in permanent programme capability catalog. Actual contract or safety contradiction returns to planner with exact evidence; missing live permission not source blocker.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no gameplay, auth, or spend promise moved | none | tooling only |
| Technical | changed: realize disposable Postgres Docker resource adapter contract in verification-programmes.md | docs/technical/platform/verification-programmes.md; VERIFICATION-PROGRAMME.md | source fixtures; live NOT-RUN |
| Code | change: tools/verification/resources/postgres plan/create/fault/cleanup + pg 8.23.0; negative: foreign identity, wrong context, non-recovery restart, cleanup failure, secrets omitted | tools/verification/resources/postgres/**; tools/verification/package.json; pnpm-lock.yaml | node --test 22/22; quality-lint clean |
| Related | changed: verification programme catalog, Change catalogs, ledger, OVERVIEW note | work/changes/README.md; work/changes/ledger/2026-11.md; OVERVIEW.md | archive + link repair |

## Alignment with INF54 (documentation only, 2026-11-25)

INF54 [`topology.mjs`](../../../../../../infra/platform/postgres/topology.mjs) owns the shared CNPG owned-cluster builder. A future CNPG verification resource adapter must consume that API only and must not weaken this packet’s Docker contracts: random run-scoped identity and `offscreen.verify.run=<runId>` label, closed bounded resource profiles without arbitrary engine arguments, explicit fault surfaces with ID+label verification before restart or backend termination, and release cleanup targeting exact owned container ID with failed cleanup as run failure and no foreign adoption. VER02 implementation scope remains Docker single/constrained.

## Touched paths

Touched implementation paths: `tools/verification/resources/postgres/docker-plan.mjs`, `tools/verification/resources/postgres/docker-plan.test.mjs`, `tools/verification/resources/postgres/docker.mjs`, `tools/verification/resources/postgres/docker.test.mjs`, `tools/verification/resources/postgres/docker-fault.test.mjs`, `tools/verification/package.json`, `pnpm-lock.yaml`.

Touched documentation/status paths: `docs/technical/platform/verification-programmes.md`, `work/undertakings/storyteller-workshop/VERIFICATION-PROGRAMME.md`, `work/undertakings/storyteller-workshop/OVERVIEW.md`, `work/changes/README.md`, `work/changes/open/README.md`, `work/changes/archive/2026-11/README.md`, `work/changes/ledger/2026-11.md`, `work/changes/archive/2026-11/platform-operations/2026-11-25--inf54-postgres-owned-clusters/CHANGE.md`, `work/changes/archive/2026-11/platform-operations/2026-11-25--inf54-postgres-owned-clusters/PROOF.md`, `work/changes/archive/2026-11/platform-operations/2026-11-25--inf54-postgres-owned-clusters/TASKS.md`.

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/verification-programmes.md#db-topology-and-limits disposable PostgreSQL Docker adapter (single/constrained) | technical | changed: realize owned Docker plan/create/auth/fault/cleanup under tools/verification/resources/postgres; record VER02 source Done and live NOT-RUN | tools/verification/resources/postgres/docker-plan.mjs; tools/verification/resources/postgres/docker-plan.test.mjs; tools/verification/resources/postgres/docker.mjs; tools/verification/resources/postgres/docker.test.mjs; tools/verification/resources/postgres/docker-fault.test.mjs; tools/verification/package.json; pnpm-lock.yaml; docs/technical/platform/verification-programmes.md; inspected vs main `598403a8e3e0fdb532882b8bf6eddb5b25924834` | source-tested: node --test on docker-plan.test.mjs, docker.test.mjs, docker-fault.test.mjs 22/22 PASS; quality-lint clean on owned files; live Docker acquire/fault/cleanup NOT-RUN | wrong Docker context refused; low memory refused; unsupported profile refused; foreign run label/image refused; non-recovery restart refused; cleanup failure surfaced; public facts omit credentials | work/undertakings/storyteller-workshop/VERIFICATION-PROGRAMME.md; work/undertakings/storyteller-workshop/OVERVIEW.md; work/changes/README.md; work/changes/open/README.md; work/changes/archive/2026-11/README.md; work/changes/ledger/2026-11.md; INF54 inbound link repair |
| Live Docker acquire / fault / cleanup acceptance | technical capability catalog | unchanged because source fixtures must not close live acceptance | no live Docker run authorized in this Change | live NOT-RUN | live PASS by assertion forbidden | retained obligation in verification-programmes.md |
| CNPG owned topology / INF54 builder for future replicated adapters | technical + INF54 | unchanged because VER02 did not implement a CNPG adapter and must not duplicate the manifest algorithm | infra/platform/postgres/topology.mjs untouched by VER02 | INF54 source Done; live dual-cluster NOT-RUN | must not override VER02 Docker fault/cleanup contract | N/A because CNPG adapter remains future work |
| Product player/story/auth/spend contracts | product | unchanged because no player-facing behavior moved | no product Markdown edits; inspected diff vs main `598403a8e3e0fdb532882b8bf6eddb5b25924834` | reviewed | no product promise rewritten for verification tooling | map update not required because product docs untouched |
