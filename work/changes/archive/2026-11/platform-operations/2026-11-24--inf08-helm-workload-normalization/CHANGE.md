# INF08 | Helm application workload normalization

**Status: Done. Kind: implementation. Profile: CONTRACT.** Integrated on `undertaking/storyteller-workshop`. Commission baseline `b40d9dbc66167b68f78b4a71bbdf4df518c6b52d`; implementation started at `5f5cc5a217d5e28fda8dc1e83a25ab62f5f32684`. Source-only. Live cluster, Docker load, Helm install, and Kind NOT-RUN.

## Reconciliation ledger

| Affected claim | Authority | Target delta | Source | Evidence tier | Negative proof |
| --- | --- | --- | --- | --- | --- |
| Application workload authority | `docs/technical/platform/deployment-and-compatibility.md` INF08 | one Helm chart for six roles, Services, and migration Job; slot and release profiles | `infra/workloads/chart`, `infra/workloads/render.mjs` | source-inspected; `pnpm workload:check` 21/21; focused tests 126/126; `check-lab-manifests` Helm render | schema and template refusals for foreign slot, missing secrets, unsupported section; inventory and Helm failure before apply |
| Dev launch | dev worktree runbook | slot-only `kind-offscreen-dev`; legacy static manifests retired in source | root `Tiltfile`, `infra/dev/Tiltfile`, `load-dev-image.sh` | source-inspected; T04 tests 104/104 | missing slot, release context, and legacy image tags refuse before Docker |
| Release apply | release installer | render before mutation; migration, authority, workers, edge, then rollouts | `infra/environments/release/install.sh` | overlay-guard 12/12 with real local Helm template | missing Helm, bad render, missing image, failed migration wait skip later applies |

## Outcome
One local Helm application chart, two profiles (owned dev slots and stable release). Retire DXK08 direct legacy development on release cluster. Helm templates are sole application Deployment/Service/Job definition authority; existing slot manager, Tilt and release installer retain lifecycle ownership. Keep names, namespaces, selectors, image references, credentials, compiled entrypoints, migrations and release values; add explicit dev security, TCP readiness and preliminary requests, not hard dev limits. No new worker health endpoint, scaling, Helm release ownership or backing-platform chart migration.

[Execution contract](EXECUTION.md) · [Tasks](TASKS.md) · [Technical owner](../../../../../docs/technical/platform/deployment-and-compatibility.md#application-workloads-inf08-selected).

## Acceptance
Offline real helm lint/template for both profiles, structural equivalence of release objects and dev objects except selected deltas, exact namespace/secret/selector/image contracts, fake caller failures, no legacy dev execution paths, no second manifest authority. Preserve existing root public commands and owned stop/park rules. Record local render evidence separately from live NOT-RUN. Parent integrates and archives after focused acceptance, no additional approval. QUEUE unchanged.
