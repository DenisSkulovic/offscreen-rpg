# OBS-D08 candidate cards

P=infra/platform/observability/; V=infra/verification/smoke/observability/; other paths repo-root. Serial, dispatch held. Parent supplies one card and exact EXECUTION sections, not archive. Child writes only named owners, runs focused tests, reports ID/base, paths, commands/results, normal/negative result and any contradiction; parent owns commit. No live calls, network pulls, paid traffic, obsolete fallback or unsafe incomplete gate. Stop on contradiction or essential failure.

## T01 | Developer backend oracle | PLANNER-BLOCKED

Anchors planned developer-probe.py, V/signal-probe.py read-only helpers, immutable data-plane.py, EXECUTION § Probe and Exact metric fixture. Write Python/tests: fixed payload, exact Tempo/Loki and Prometheus raw range/series/buckets, complete negative window, no per-run labels. Root python3 -m unittest discover -s infra/verification/smoke/observability/tests -p 'test_developer_probe.py'. Negative old-only/wrong label/bucket/timestamp/control; require pinned fixture before commission.

## T02 | Freshness allocation | PLANNER-BLOCKED

Requires T01 and ratified D4/D4.1. Anchors developer-probe.py, V/proof-host.mjs::runProofOperationSession, P/custody.mjs::acquireProofCustody, EXECUTION § Timestamp allocation only. Write probe and watermark filesystem tests (host wiring T03). Once-per-session bounded domain scan, seven durable write-ahead advancing allocations under exclusive proof writer, no reset. Negative delayed ingestion, rollback, failed write, unknown submission, wrong FD, deadline. Root python3 -m unittest discover -s infra/verification/smoke/observability/tests -p 'test_developer_probe.py'.

## T03 | Wire actual developer gate | PLANNER-BLOCKED

Requires T02. Anchors V/developer.mjs new, proof.mjs::runLiveProof, proof-host.mjs, P/forward.mjs::openForwards, tests/proof.test.mjs. Read EXECUTION § Host wiring and deadline; write host gate and tests, frozen session and owned forwards, no cluster credential in Python, typed result and cleanup/refusal. Root node --test infra/verification/smoke/observability/tests/proof.test.mjs infra/platform/observability/tests/forward.test.mjs. Negative malformed result, failed child/forward/cleanup, wrong lock. No live.
