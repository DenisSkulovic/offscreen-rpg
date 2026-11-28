# OBS-E2-07 | task queue
Base: `1fa759b980d275ef4ad9d11590cf080fc807ccd2`; refresh against recorded Design integration branch. State: PLANNER-BLOCKED (H03; downstream tasks await T01). Shared contracts: [group](../README.md#frozen-packet-interfaces).
Tasks: T01 → T02 → T03; selected: none.

## T01 | Create provider and dashboard shells | PLANNER-BLOCKED (H03; downstream tasks await T01)
DEPTH=PATCH
Requires: Frozen selected metric families, labels, exact panel queries and coverage rows in NATIVE-INPUTS from G1–G4 (G4b before SeaweedFS enabled). Source joins of 02–06 are acceptance dependencies, not dashboard construction prerequisites.
May write: infra/platform/observability/values/profiles/dev/grafana.yaml; dashboards/overview.json, kubernetes.json, nodes.json; coverage/inventory.json (only M03 offscreen-overview/104 query and interpretation)
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/values/grafana.yaml; NATIVE-INPUTS frozen inventory/resource rows including corrected M03 panel 104; TARGET section 4; pinned Grafana chart dashboard templates
Algorithm: Configure native provider `offscreen`, folder Offscreen, file path `/var/lib/grafana/dashboards/offscreen`, allowUiUpdates false, disableDeletion false; home path `/var/lib/grafana/dashboards/offscreen/overview.json`. Build stable UIDs offscreen-overview/kubernetes/nodes, native Prometheus datasource, variables namespace/workload/node and time-preserving links. Overview inventories all components including absent/parked/unsupported/stale; use real KSM label joins and actual selected metrics. Copy exact frozen inventory/resource panels. Synchronize the sole M03 coverage row to the exact revised panel 104 query and interpretation; test one node lacks enough rate samples and duplicate node identities. CPU rate over 5m, memory bytes, valid allocatable denominators; no vector(0) masking missing.
Test: Source gate; 08 Helm mount/render; T03 tests JSON.
Negative: Missing KSM or stale samples must not become green absence or zero; no secret/datasource changes.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.

## T02 | Build service drilldowns | PLANNER-BLOCKED (H03; downstream tasks await T01)
DEPTH=PATCH
Requires: T01 postcondition and packet prerequisites.
May write: infra/platform/observability/dashboards/postgres.json, temporal.json, storage.json, messaging-cache.json, observability.json
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: [selected JSON](../NATIVE-SERVICE-CANDIDATE.json) nativeServices/seaweedfs; existing frozen Redis row; NATIVE-INPUTS exact realization rules; TARGET section 4 dashboard table
Algorithm: Use offscreen-postgres/temporal/storage/messaging-cache/observability UIDs with exact metric-family/label/query mappings from frozen coverage rows. Each required panel is tied to a verified family; distinguish up vs backend health and freshness. Show owner-ratified partial-scope and unsupported domain limitations explicitly rather than guessing metrics; exact titles/description must not imply complete global counts. Add links to overview and existing logs/traces Explore, no new log/trace enrollment. Use milliseconds/seconds/bytes/rates appropriate to actual metric units; histogram quantile only for verified buckets.
Test: Source gate; T03 tests JSON and 13 verifies live queries.
Negative: No arbitrary metric names or hidden unsupported service; real zero distinct from missing.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.

## T03 | Validate dashboard/query contract | PLANNER-BLOCKED (H03; downstream tasks await T01)
DEPTH=PATCH
Requires: T02 postcondition and packet prerequisites.
May write: infra/platform/observability/tests/e2-dashboards.test.mjs
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/dashboards/ eight exact JSON files; NATIVE-INPUTS.md frozen exact inventory/Redis/resource rows; selected JSON service arrays; TARGET section 4
Algorithm: Parse all JSON, check eight unique fixed UIDs, stable datasource UID, valid variables/links/units and exact coverage row-to-panel/query mapping, including M03 and accepted partial views; add focused query fixture cases fresh/old/missing KSM, parked, absent optional, scrape-successful Redis-down, real zero. Verify no generic zero fallback, no remote dashboard/plugin or UI persistence.
Test: node --test infra/platform/observability/tests/e2-dashboards.test.mjs
Negative: Duplicate UID, dangling variable, unsupported or missing metric represented as healthy, unexpected datasource/remote URL fail.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.
