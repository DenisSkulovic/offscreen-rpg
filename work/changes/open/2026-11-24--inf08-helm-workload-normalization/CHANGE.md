# INF08 | Helm application workload normalization

**Status: Ready (dependency-gated), owner commissioned 2026-11-24. Kind: implementation. Profile: CONTRACT.** Target undertaking/storyteller-workshop, inspected HEAD b40d9dbc66167b68f78b4a71bbdf4df518c6b52d. Start only after INF07 integrates and its shared loader, scoped receipt adapter and release build graph are present. Source-only; no live cluster, Docker build/load, Helm install/upgrade/uninstall, secret/data mutation or provider calls.

## Outcome
One local Helm application chart, two profiles (owned dev slots and stable release). Retire DXK08 direct legacy development on release cluster. Helm templates are sole application Deployment/Service/Job definition authority; existing slot manager, Tilt and release installer retain lifecycle ownership. Keep names, namespaces, selectors, image references, credentials, compiled entrypoints, migrations and release values; add explicit dev security, TCP readiness and preliminary requests, not hard dev limits. No new worker health endpoint, scaling, Helm release ownership or backing-platform chart migration.

[Execution contract](EXECUTION.md) · [Tasks](TASKS.md) · [Technical owner](../../../../docs/technical/platform/deployment-and-compatibility.md#application-workloads-inf08-selected).

## Acceptance
Offline real helm lint/template for both profiles, structural equivalence of release objects and dev objects except selected deltas, exact namespace/secret/selector/image contracts, fake caller failures, no legacy dev execution paths, no second manifest authority. Preserve existing root public commands and owned stop/park rules. Record local render evidence separately from live NOT-RUN. Parent integrates and archives after focused acceptance, no additional approval. QUEUE unchanged.
