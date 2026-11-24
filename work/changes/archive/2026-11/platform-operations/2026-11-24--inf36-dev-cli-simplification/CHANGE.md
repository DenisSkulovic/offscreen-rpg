# INF36 | Thin developer CLI

**Status: Done (2026-11-24). Kind: implementation. Profile: CONTRACT.** Integrated on undertaking/storyteller-workshop from change/inf36-dev-cli-simplification. Baseline 54f9261d; worktree start 5d83601a. Dependency INF30, INF34 Done. Source-only. Live cluster NOT-RUN. Goal: Thin developer CLI. [Program](../../../../../undertakings/storyteller-workshop/INF-MEDIUM.md).

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Runtime orchestration and current-generation verification anchors | docs/technical/platform/developer-environments.md Source ownership map | changed: launch and status moved out of the CLI; CLI still parses and dispatches; behavior unchanged | tools/dev-environments/src/application/dev-lifecycle.mjs and dev-status.mjs on change/inf36-dev-cli-simplification | fixture-tested | stale/failed readiness and rollback-incomplete still fail closed; 75 focused tests pass | runbook watch-graph bullet names dev-status.mjs::collectSelectedSlotReadiness |
| Root pnpm dev command names | package.json / runbook commands | unchanged: root commands still call the CLI entry | no command rename | reviewed | no live cluster | N/A |
| Product player-facing claims | product | unchanged: no product heading describes the developer CLI split | no product source behavior changed | reviewed | live cluster, Docker, Tilt, and tenant deletion stayed out of this source proof | N/A |

Target undertaking/storyteller-workshop, reviewed snapshot 54f9261d699097835e6c97ad55612a02ae49e59c, owner commissioned 2026-11-24. Source-only, no live cluster/Docker/Tilt/registry mutation or tenant deletion. Personal dev platform: optimize daily flow, not enterprise adversarial security. Preserve existing data/credential/foreign-slot protections. No new frameworks, profile features or auto-retry. One linked Change worktree, branch guard node scripts/repo-tools/change-branch-guard.mjs --change ID --target undertaking/storyteller-workshop; parent Composer coordinates one bounded task at a time, shared docs/catalog joined by human custodian. Mechanical successor reconciliation permitted; material source contradiction stop. Focused tests from repo root, changed-file quality and docs health, receipt actual counts; no live acceptance credit.

Dispatch T01 after dependency receipt. Archive only after focused proofs and reconciliation. No successor auto-start.
