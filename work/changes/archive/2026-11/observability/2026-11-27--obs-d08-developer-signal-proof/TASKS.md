# OBS-D08 tasks — owner-released offline source only

**Dispatch authority:** [CHANGE](CHANGE.md) and [joint offline release](../../../../designs/open/observability-developer/ACCEPTANCE.md) govern. Owner-released implementation, not independent READY or live permission. Verify predecessor receipt and branch/worktree, then execute the serial tasks. Do not wait for another approval; stop only for concrete contradiction, ownership conflict or required cheap proof failure. No real cluster or Docker commands. No main merge or Done.


P=infra/platform/observability/; V=infra/verification/smoke/observability/; other paths repo-root. Serial, dispatch held. Parent supplies one card and exact EXECUTION sections, not archive. Child writes only named owners, runs focused tests, reports ID/base, paths, commands/results, normal/negative result and any contradiction; parent owns commit. No live calls, network pulls, paid traffic, obsolete fallback or unsafe incomplete gate. Stop on contradiction or essential failure.

## T01 | Developer backend oracle | RELEASED (offline; prerequisites apply)

Anchors planned developer-probe.py, V/signal-probe.py read-only helpers, immutable data-plane.py, EXECUTION § Probe and Exact metric fixture. Write Python/tests: fixed payload, exact Tempo/Loki and Prometheus raw range/series/buckets, complete negative window, no per-run labels. Root python3 -m unittest discover -s infra/verification/smoke/observability/tests -p 'test_developer_probe.py'. Negative old-only/wrong label/bucket/timestamp/control; Use exact frozen fixture offline; owner verifies actual pinned backend evidence before live or main merge.

## T02 | Freshness allocation | RELEASED (offline; prerequisites apply)

Requires T01; implement frozen D4/D4.1 candidate offline, no actual backend submission. Anchors developer-probe.py, V/proof-host.mjs::runProofOperationSession, P/custody.mjs::acquireProofCustody, EXECUTION § Timestamp allocation only. Write probe and watermark filesystem tests (host wiring T03). Once-per-session bounded domain scan, seven durable write-ahead advancing allocations under exclusive proof writer, no reset. Negative delayed ingestion, rollback, failed write, unknown submission, wrong FD, deadline. Root python3 -m unittest discover -s infra/verification/smoke/observability/tests -p 'test_developer_probe.py'.

## T03 | Wire actual developer gate | RELEASED (offline; prerequisites apply)

Requires T02. Anchors V/developer.mjs new, proof.mjs::runLiveProof, proof-host.mjs, P/forward.mjs::openForwards, tests/proof.test.mjs. Read EXECUTION § Host wiring and deadline; write host gate and tests, frozen session and owned forwards, no cluster credential in Python, typed result and cleanup/refusal. Root node --test infra/verification/smoke/observability/tests/proof.test.mjs infra/platform/observability/tests/forward.test.mjs. Negative malformed result, failed child/forward/cleanup, wrong lock. No live.
