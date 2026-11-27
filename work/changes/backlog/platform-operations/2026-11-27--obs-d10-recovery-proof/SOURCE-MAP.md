# OBS-D10 source map

Principal source seams inspected in previous audit and confirmed unchanged through ce96b1c4. Proposed paths/exports not existing. Refresh all affected callers, fixtures and predecessor outputs at actual commission; local tracked census not established.

| Source | Seam |
|---|---|
| P/custody.mjs::acquireCustody/runMutation (D03) | fixed exclusive restoration-only transition |
| P/readiness.mjs::verifyOwnedTempoDown/verifyOwnedFinalShape (D04) | exact intentional down/final |
| V/disruptions.mjs::runProbeSession/guardedRolloutRestart/runPersistenceProof | owned replay and retained projection |
| V/disruptions.mjs::guardedScaleTempo/runOutageProof/restoreTempoAfterOutage | exact down/restore |
| V/proof-resources.mjs (D07), proof-host.mjs/proof.mjs | owned lifecycle, actual restoration result |
| P/tests/custody.test.mjs, V/tests/proof.test.mjs | transition/recovery fixtures |

[Historical exact contracts](https://github.com/DenisSkulovic/offscreen-rpg/tree/792f529eea391965893a00a42d7224e1e09d3ab3/work/changes/archive/2026-11/observability/2026-11-27--observability-developer/original/) are planner inputs only. [OD-05–07](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md) apply to all affected intermediate states.
