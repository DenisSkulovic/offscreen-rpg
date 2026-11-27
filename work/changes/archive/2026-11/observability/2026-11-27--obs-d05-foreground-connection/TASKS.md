# OBS-D05 tasks — owner-released offline source only

**Dispatch authority:** [CHANGE](CHANGE.md) and [joint offline release](../../../../designs/open/observability-developer/ACCEPTANCE.md) govern. Owner-released implementation, not independent READY or live permission. Verify predecessor receipt and branch/worktree, then execute the serial tasks. Do not wait for another approval; stop only for concrete contradiction, ownership conflict or required cheap proof failure. No real cluster or Docker commands. No main merge or Done.


P=infra/platform/observability/; V=infra/verification/smoke/observability/; other paths repo-root. Serial, dispatch held. Parent supplies one card and exact EXECUTION sections, not archive. Child writes only named owners, runs focused tests, reports ID/base, paths, commands/results, normal/negative result and any contradiction; parent owns commit. No live calls, network pulls, paid traffic, obsolete fallback or unsafe incomplete gate. Stop on contradiction or essential failure.

## T01 | Owned forward helper | RELEASED (offline; prerequisites apply)

Anchors P/forward.mjs (D03), P/identity.mjs::recheckIdentity, P/tests/forward.test.mjs, EXECUTION § Forwarding. Write forward and tests: exact service/port pairs, loopback startup line, real transport, reverse owned cleanup on any startup/child failure. Negative foreign port, invalid output, second child exit, identity/pending change and unconfirmed close. Root node --test infra/platform/observability/tests/{forward,custody}.test.mjs.

## T02 | Public connect and supervision | RELEASED (offline; prerequisites apply)

Requires T01. Anchors P/connect.mjs new, P/readiness.mjs::classifyInventory, custody.mjs::acquireCustody, package.json, EXECUTION § Admission and final supervision paragraph of Forwarding. Write connect/script and tests. Accept only [] or --queries, fixed dev, shared custody, exact current/ready, full identity before spawn and serialized checks. SIGINT success only clean own closure. Root node --test infra/platform/observability/tests/{forward,custody}.test.mjs. Invalid args before host, predecessor/pending/refusal, unexpected death, no foreign kill.
