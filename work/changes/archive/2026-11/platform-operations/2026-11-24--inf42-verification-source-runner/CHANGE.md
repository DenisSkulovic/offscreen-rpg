# INF42 | Repeatable source verification entrypoint

**State: Done (2026-11-24).** Kind: implementation. Profile: PROOF. Integrated on undertaking/storyteller-workshop from change/inf42-verification-source-runner. Baseline 88a4e1b23bf3637b7b3a1886e6943ccb08be24fb. Dependency INF43 Done. Source-only. Live cluster was not exercised. Goal: Repeatable source verification entrypoint. No product behavior is impacted. Technical context remains infra/verification/CAPABILITIES.md. [Program](../../../../../undertakings/storyteller-workshop/LOCAL-DEV-PLATFORM.md) · [Tasks](TASKS.md) · [Execution](EXECUTION.md) · [Source map](SOURCE-MAP.md) · [Proof](PROOF.md).

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| Repeatable source verification entrypoint | infra/verification/CAPABILITIES.md | changed: `pnpm infra:verify --suite source` runs the four catalog node test groups and records live oracles as NOT-RUN | infra/verification/verify.mjs at change/inf42-verification-source-runner before integration | source-tested | smoke and full exit 2; empty glob fails; missing Helm blocks the workloads suite only; timeout is not PASS | program row records Done |
| Product player-facing claims | docs/product | unchanged: no product heading describes this developer verification command | no product source changed | reviewed | live cluster, Docker, Tilt, and tenant mutation stayed outside this source proof | N/A |

Target undertaking/storyteller-workshop, inspected source snapshot 91bc2af40a94 matches current documentation-only HEAD 21ed6630e8a8f60a9a3e2bc49054eb5a0bec916e. Owner commissioned source implementation 2026-11-24. No live cluster/Docker/Tilt/tenant/production/remote data mutation by these packets. INF29 live proof remains independent; no edits in its checkout. Preserve existing defaults, isolation and data. No new orchestration framework, daemon, scheduler, custom YAML language or security expansion. Separate Change worktree, node scripts/repo-tools/change-branch-guard.mjs --change ID --target undertaking/storyteller-workshop; one bounded child per task, parent integrates and archives; no automatic successor dispatch. Shared package.json/docs/catalog edits serialized by human integration custodian. Mechanical predecessor path joins allowed; material source contradiction returns to planner with exact evidence. Focused tests at repo root; changed-file quality/docs health; report actual commands/counts, source vs live NOT-RUN.

First dispatch T01 after dependency gate. No live acceptance credit. Archive after source acceptance and reconciliation.
