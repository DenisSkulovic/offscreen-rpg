# OBS-D05 source map

Principal source seams inspected in previous audit and confirmed unchanged through ce96b1c4. Proposed paths/exports not existing. Refresh all affected callers, fixtures and predecessor outputs at actual commission; local tracked census not established.

| Source | Seam |
|---|---|
| P/forward.mjs (D03) | owned child, close/outcome and held FD → openForwards |
| P/connect.mjs (new) | fixed dev CLI and foreground supervisor |
| P/readiness.mjs::classifyInventory | current ready only |
| P/identity.mjs::captureIdentity/recheckIdentity; custody.mjs::acquireCustody | frozen tuple/shared custody |
| P/values/grafana.yaml, artifacts.mjs | actual pinned Service port |
| package.json, P/tests/forward.test.mjs | command and tests |

[Historical exact contracts](https://github.com/DenisSkulovic/offscreen-rpg/tree/792f529eea391965893a00a42d7224e1e09d3ab3/work/changes/archive/2026-11/observability/2026-11-27--observability-developer/original/) are planner inputs only. [OD-05–07](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md) apply to all affected intermediate states.
