# OBS-D10 candidate cards

P=infra/platform/observability/; V=infra/verification/smoke/observability/; other paths repo-root. Serial, dispatch held. Parent supplies one card and exact EXECUTION sections, not archive. Child writes only named owners, runs focused tests, reports ID/base, paths, commands/results, normal/negative result and any contradiction; parent owns commit. No live calls, network pulls, paid traffic, obsolete fallback or unsafe incomplete gate. Stop on contradiction or essential failure.

## T01 | Fixed restoration capability | PLANNER-BLOCKED

Anchors P/custody.mjs::acquireCustody/runMutation, tests/custody.test.mjs, EXECUTION § Closed intent. Write custody/tests. Exact closed persistence/outage validators and restoreTempoOnce/finishCancelledOutage only exclusive own record, fresh UID/RV/generation/claims; no generic command, cancellation reset or unknown restore. Root node --test infra/platform/observability/tests/custody.test.mjs. Negative wrong phase/UID/RV, foreign record, unknown down/close, shared handle, cancelled normal write.

## T02 | Persistence and query-only replay | PLANNER-BLOCKED

Requires T01. Anchors V/disruptions.mjs::runProbeSession/guardedRolloutRestart/runPersistenceProof, proof-resources.mjs, tests/proof.test.mjs, EXECUTION § Persistence. Write disruptions/persistence tests. Initial positive, finish Pod, restart exact three backends, old Pod absent, claims retained, new Pod query-only replay zero POST, final own clear after cleanup. Root node --test --test-name-pattern='^D10 persistence ' infra/verification/smoke/observability/tests/proof.test.mjs (rename/add scoped cases). Negative stale RV/unknown write/replaced claims/replay POST.

## T03 | Outage and bounded compensation | PLANNER-BLOCKED

Requires T02. Anchors V/disruptions.mjs::guardedScaleTempo/runOutageProof/restoreTempoAfterOutage, P/custody.mjs::restoreTempoOnce, proof-host.mjs, EXECUTION § Outage. Write disruptions/host/proof and scoped tests; enable persistence/outage only after complete normal, cancellation and fixed restoration routes. Use D07 per-gate reserve, no double subtraction. Exact down, healthy logs/metrics, one fixed restore, fresh recovery normal only; cancellation reserve no green/no new probe, unknown retains fence. Root node --test --test-name-pattern='^D10 (persistence|outage) ' infra/verification/smoke/observability/tests/proof.test.mjs; final unfiltered suite. Negative insufficient reserve/unknown restore/changed claims/Collector/cancelled POST.
