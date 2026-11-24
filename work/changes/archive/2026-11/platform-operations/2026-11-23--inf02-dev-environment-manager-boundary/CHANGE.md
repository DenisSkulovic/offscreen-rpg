# INF02 | Development environment manager placement

**Status: Done (2026-11-24). Kind: implementation. Profile: CONTRACT.** Baseline b01a68b4e91fbbb68f4e67c91427db7435e44738; integrated on undertaking/storyteller-workshop from change/inf02-dev-environment-manager-boundary at HEAD 853f966780ad. Live cluster NOT-RUN. User starts INF03.

[Selected atlas](../../../../infra/README.md) · [Exact execution contract](../../../undertakings/storyteller-workshop/INF-PARALLEL.md) · [Move map](../../../undertakings/storyteller-workshop/INF-MOVE-MAP.json) · [TASKS](TASKS.md)

## Outcome and acceptance

Relocate exactly the 76 baseline files assigned to INF02, update mechanical callers, preserve behavior and integrate source proof. Preserve runtime context names, resource IDs, existing tenant data, CLI semantics and build/receipt safety. No new lab catch-all path, no blind runtime name substitution, no Helm/GitOps/HA redesign. Run focused tests in TASKS; live proof separately NOT-RUN. Only actual semantic/ownership/safety contradiction blocks. Separate worktree and Change branch; pre-edit guard node scripts/repo-tools/change-branch-guard.mjs --change INF02 --target undertaking/storyteller-workshop. One child at a time. Parent integrates and retires, user starts successor.

## Reconciliation

| Claim | Target | Result | Source | Evidence | Negative | Map |
| --- | --- | --- | --- | --- | --- | --- |
| Dev manager placement | 76 INF02 files under tools/dev-environments | changed | tools/dev-environments at post-move tree | node --check PASS; infra-layout.test.mjs PASS; dev-*.test.mjs 182 pass / 2 pre-existing fail | foreign slot refusal in dev-slot-app-graph.test.mjs PASS; `dev-tilt.mjs attach` exits 1 | INF-MOVE-MAP.json unchanged; staged paths old XOR new |
| Product behavior | no new player behavior | unchanged because relocation only | package.json dev scripts | root-command-surface.test.mjs PASS | live pnpm dev NOT-RUN | N/A |
| Technical path owners | developer-environments and runbooks name the new CLI and renderer | changed | docs/technical/platform/developer-environments.md; docs/runbooks/dev-worktree-stacks.md; docs/runbooks/local-development.md | source-inspected path strings | runtime context names unchanged | N/A |

Pre-existing failures left unfixed: `dev-fu03-startup.test.mjs` EACCES on hardcoded `/shared/checkout`; `dev-tilt.test.mjs` process.exit after unreadable image recipe on an empty temp tree.
