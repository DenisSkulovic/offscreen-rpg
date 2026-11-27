# OBS-D06 source map

Principal source seams inspected in previous audit and confirmed unchanged through ce96b1c4. Proposed paths/exports not existing. Refresh all affected callers, fixtures and predecessor outputs at actual commission; local tracked census not established.

| Source | Seam |
|---|---|
| P/upgrade.mjs (new) | fixed dev auth, preservation and transition |
| P/readiness.mjs::classifyInventory/verifyOwnedFinalShape (D04) | exact predecessor/current/final |
| P/custody.mjs::acquireCustody/runMutation (D03) | exclusive intent and owned record; D06 T02 adds exact collector-upgrade validator and phase to D03 |
| infra/clusters/kind/manager/host-probe.mjs::MIN_HOST_MEMORY_MIB/parseMeminfoMiB | existing 4096 MiB floor |
| P/artifacts.mjs::loadObservabilityVariants/helmValuesArgv, forward.mjs::openForwards | same descriptor and transport |
| P/tests/upgrade.test.mjs, snapshot-fixtures.mjs | real render-derived fixtures |

[Historical exact contracts](https://github.com/DenisSkulovic/offscreen-rpg/tree/792f529eea391965893a00a42d7224e1e09d3ab3/work/changes/archive/2026-11/observability/2026-11-27--observability-developer/original/) are planner inputs only. [OD-05–07](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md) apply to all affected intermediate states.
