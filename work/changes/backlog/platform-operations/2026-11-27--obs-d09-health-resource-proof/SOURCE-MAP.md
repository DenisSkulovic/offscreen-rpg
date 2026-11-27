# OBS-D09 source map

Principal source seams inspected in previous audit and confirmed unchanged through ce96b1c4. Proposed paths/exports not existing. Refresh all affected callers, fixtures and predecessor outputs at actual commission; local tracked census not established.

| Source | Seam |
|---|---|
| V/resources.mjs::queryGrafanaDatasourceHealth/runResourcesProof/listClusterNodes | unwired/port0/interval0 → actual bounded forward/sample |
| V/resource-observation.py::inventory/cycle_sample_from_nodes/main | role-scoped data |
| V/proof-host.mjs::extractStableIdentities/stableIdentitiesCompatible | full required UIDs/claim/PV/storage |
| P/forward.mjs::openForwards (D05) | shared forwarding/auth |
| infra/clusters/kind/dev/kind.yaml | normal two-node profile |
| V/tests/proof.test.mjs,test_resource_observation.py | health and sample negatives |

[Historical exact contracts](https://github.com/DenisSkulovic/offscreen-rpg/tree/792f529eea391965893a00a42d7224e1e09d3ab3/work/changes/archive/2026-11/observability/2026-11-27--observability-developer/original/) are planner inputs only. [OD-05–07](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md) apply to all affected intermediate states.
