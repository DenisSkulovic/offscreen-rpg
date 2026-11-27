# OBS-D07 candidate cards

P=infra/platform/observability/; V=infra/verification/smoke/observability/; other paths repo-root. Serial, dispatch held. Parent supplies one card and exact EXECUTION sections, not archive. Child writes only named owners, runs focused tests, reports ID/base, paths, commands/results, normal/negative result and any contradiction; parent owns commit. No live calls, network pulls, paid traffic, obsolete fallback or unsafe incomplete gate. Stop on contradiction or essential failure.

## T01 | Terminal proof session | PLANNER-BLOCKED

Anchors V/proof-host.mjs::runProofOperationSession/buildProofReceipt, V/proof.mjs::runLiveProof, tests/proof.test.mjs, EXECUTION § Session. Write host/proof/tests. Auth and exact dev/context/clean source before evidence, one deadline, correct lock order, one frozen identity, terminal receipt and cleanup. Disable unfinished public gates before writes. Root node --test infra/verification/smoke/observability/tests/proof.test.mjs. Negative wrong target/auth/pending/failed cleanup, disabled route zero writes.

## T02 | Owned resource lifecycle | PLANNER-BLOCKED

Requires T01. Anchors V/signals.mjs::runSignalsProof/deleteProofResourcesWithUid, planned proof-resources.mjs, P/forward.mjs (D03), EXECUTION § Resource lifecycle. Write signals/resource ledger/tests. UID immediately durable from create response, Pod-before-CM, UID precondition, unknown/replaced/foreign consumer refuses; namespace retained. Real frozen Pod wait/exec/read evidence. Root node --test infra/verification/smoke/observability/tests/{proof,proof-resources}.test.mjs. No namespace delete.

## T03 | Strict synthetic queries | PLANNER-BLOCKED

Requires T02. Anchors V/signal-probe.py::observe_positive_queries/run_probe/metrics_check, signals.mjs, tests/test_signal_probe.py, EXECUTION § Synthetic. Fix duplicate argument, raw timestamp and bounded HTTP/control/privacy checks, replay zero POST. Root python3 -m unittest discover -s infra/verification/smoke/observability/tests -p 'test_signal_probe.py'; node --test infra/verification/smoke/observability/tests/{proof,proof-resources}.test.mjs. Negative stale-only, query error not absence, malformed evidence, privacy failure.
