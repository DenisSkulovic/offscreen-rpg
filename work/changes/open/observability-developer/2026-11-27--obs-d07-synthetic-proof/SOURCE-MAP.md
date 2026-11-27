# OBS-D07 source map

Principal source seams inspected in previous audit and confirmed unchanged through ce96b1c4. Proposed paths/exports not existing. Refresh all affected callers, fixtures and predecessor outputs at actual commission; local tracked census not established.

| Source | Seam |
|---|---|
| V/proof-host.mjs::runProofOperationSession/buildProofReceipt/gateImplemented/GATE_BUDGET_MS/reserveMsForGate | terminal path, shared budgets, exact gate refusal and frozen locks |
| V/proof.mjs::main/runLiveProof | gate refusal before evidence allocation, safe default gate dispatch |
| V/partial-install.mjs direct executable block after dispatchHelmWrapperInvocation | T01 replace direct invocation with unconditional exit2; D11 owns full mechanism; no other writes to this module |
| V/signals.mjs::runSignalsProof/deleteProofResourcesWithUid | current namespace cascade → per-create UID cleanup |
| V/proof-resources.mjs new | owned namespace/CM/Pod creation, exec and individual delete |
| V/signal-probe.py::observe_positive_queries/run_probe/metrics_check | duplicate arguments and fresh query oracle |
| V/tests/{proof,proof-resources}.test.mjs,test_signal_probe.py | exact stateful fixtures |

[Historical exact contracts](https://github.com/DenisSkulovic/offscreen-rpg/tree/792f529eea391965893a00a42d7224e1e09d3ab3/work/changes/archive/2026-11/observability/2026-11-27--observability-developer/original/) are planner inputs only. [OD-05–07](https://github.com/DenisSkulovic/offscreen-rpg/blob/114cc39cf4e1477ac34e24d4a26684ad9f91b8c3/work/designs/open/observability-developer/committee/pass-03.md) apply to all affected intermediate states.
