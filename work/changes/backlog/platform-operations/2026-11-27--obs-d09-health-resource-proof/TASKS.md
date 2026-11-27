# OBS-D09 candidate cards

P=infra/platform/observability/; V=infra/verification/smoke/observability/; other paths repo-root. Serial, dispatch held. Parent supplies one card and exact EXECUTION sections, not archive. Child writes only named owners, runs focused tests, reports ID/base, paths, commands/results, normal/negative result and any contradiction; parent owns commit. No live calls, network pulls, paid traffic, obsolete fallback or unsafe incomplete gate. Stop on contradiction or essential failure.

## T01 | Authenticated Grafana health | PLANNER-BLOCKED

Anchors V/resources.mjs::queryGrafanaDatasourceHealth, proof-host.mjs::extractStableIdentities/stableIdentitiesCompatible, P/forward.mjs, tests/proof.test.mjs, EXECUTION § Health. Write resources/host/proof/tests. Exact datasource UID/type/URL/health and database ok; full before/after identities, auth not argv/output, close before receipt. Root node --test infra/verification/smoke/observability/tests/proof.test.mjs. Negative wrong auth/URL/UID, missing identity, failed cleanup.

## T02 | Actual resource cadence and scoped evidence | PLANNER-BLOCKED

Requires T01. Anchors V/resources.mjs::runResourcesProof/listClusterNodes, resource-observation.py::inventory/cycle_sample_from_nodes/main, dev/kind.yaml, tests/test_resource_observation.py, EXECUTION § Resources. Write resources/Python/gate/tests. Actual positive forwarded port, exact five roles, 12x10s, advancing timestamps, scoped CPU/memory and Collector families, no raw summary. Root python3 -m unittest discover -s infra/verification/smoke/observability/tests -p 'test_resource_observation.py'; node --test infra/verification/smoke/observability/tests/proof.test.mjs. Negative zero cadence/port, empty/stale/missing/foreign samples.
