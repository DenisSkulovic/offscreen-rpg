# INF07 bounded implementation tasks

Read EXECUTION.md. Parent dispatches one child at a time; each child reads only its section and named anchors, runs focused tests, reports edits/tests/limitations. No live operations.

| Task | Anchors | Proof / exit |
|---|---|---|
| T01 Toolchain + recipe consolidation | development/Dockerfile; release/lib-build.sh; release/Dockerfile.api/game-authority/worker; dev-slot-image-plan.mjs; release/test/dockerfile-guard.test.mjs | Three recipes, pins consumed, exact final targets, existing refs, fake build args, shell syntax and pin/fingerprint tests. |
| T02 Graph and selection | production-workspace-closure.mjs; select-affected-images.mjs; infra/dev/dev-sync-paths.mjs; prepare-runtime-tree.sh; closure tests | runtime vs build fixtures; staged helper resolves; docs/tests no build; changed dev dependency selects dependents. |
| T03 Kind delivery | manager/config.mjs; load-dev-slot-image.sh (read only until T04); release/install.sh; release/Tiltfile; kind-image-match.mjs | injected all-node vectors, wrong profile and mismatch refusals, no premature success; both release callers use distributor. |
| T04 Dev adapters | load-dev-slot-image.sh; development/tilt/load-dev-image.sh; infra/dev/Tiltfile; dev-slot-startup.mjs; dev-slot-image-plan.test.mjs | single canonical build, no redundant archive, slot-scoped receipt, fresh rebuild fingerprint, legacy path explicitly fenced. |
| T05 Parent join | scripts/repo-tools/infra-layout.test.mjs; infra/README.md; all focused tests in EXECUTION.md | exact successor paths and guards; source-only acceptance receipt; integrate/retire. |

Paths in table are relative to their source directories in EXECUTION.md. T01→T02→T03→T04→T05. Parent owns shared joins; no child redesign. T01 does not copy not-yet-created T02 graph module until T02. Ordinary dependency order is not planner-blocked.
