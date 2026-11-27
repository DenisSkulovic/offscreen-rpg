# OBS-D05 candidate cards

P=infra/platform/observability/; V=infra/verification/smoke/observability/; other paths repo-root. Serial, dispatch held. Parent supplies one card and exact EXECUTION sections, not archive. Child writes only named owners, runs focused tests, reports ID/base, paths, commands/results, normal/negative result and any contradiction; parent owns commit. No live calls, network pulls, paid traffic, obsolete fallback or unsafe incomplete gate. Stop on contradiction or essential failure.

## T01 | Owned forward helper | PLANNER-BLOCKED

Anchors P/forward.mjs (D03), P/identity.mjs::recheckIdentity, P/tests/forward.test.mjs, EXECUTION § Forwarding. Write forward and tests: exact service/port pairs, loopback startup line, real transport, reverse owned cleanup on any startup/child failure. Negative foreign port, invalid output, second child exit, identity/pending change and unconfirmed close. Root node --test infra/platform/observability/tests/{forward,custody}.test.mjs.

## T02 | Public connect and supervision | PLANNER-BLOCKED

Requires T01. Anchors P/connect.mjs new, P/readiness.mjs::classifyInventory, custody.mjs::acquireCustody, package.json, EXECUTION § Admission and final supervision paragraph of Forwarding. Write connect/script and tests. Accept only [] or --queries, fixed dev, shared custody, exact current/ready, full identity before spawn and serialized checks. SIGINT success only clean own closure. Root node --test infra/platform/observability/tests/{forward,custody}.test.mjs. Invalid args before host, predecessor/pending/refusal, unexpected death, no foreign kill.
