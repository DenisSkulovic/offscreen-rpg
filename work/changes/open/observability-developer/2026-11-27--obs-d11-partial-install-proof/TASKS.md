# OBS-D11 tasks — owner-released offline source only

**Dispatch authority:** [CHANGE](CHANGE.md) and [joint offline release](../../../../designs/open/observability-developer/ACCEPTANCE.md) govern. Owner-released implementation, not independent READY or live permission. Verify predecessor receipt and branch/worktree, then execute the serial tasks. Do not wait for another approval; stop only for concrete contradiction, ownership conflict or required cheap proof failure. No real cluster or Docker commands. No main merge or Done.


P=infra/platform/observability/; V=infra/verification/smoke/observability/; other paths repo-root. Serial, dispatch held. Parent supplies one card and exact EXECUTION sections, not archive. Child writes only named owners, runs focused tests, reports ID/base, paths, commands/results, normal/negative result and any contradiction; parent owns commit. No live calls, network pulls, paid traffic, obsolete fallback or unsafe incomplete gate. Stop on contradiction or essential failure.

## T01 | Fault and retained-state predicates | RELEASED (offline; prerequisites apply)

Anchors V/partial-install.mjs receipt helpers, P/custody.mjs::readPending, P/inventory.mjs history builder, tests/proof.test.mjs, EXECUTION § Fault and read-only predicates. Write partial-install/custody inspect/tests offline against frozen candidate; no actual fault deployment. Exact selected fault identity, immutable pending/history and retained projection. Negative changed fixture/UID/history/missing marker/later release. Root node --test infra/platform/observability/tests/custody.test.mjs; node --test --test-name-pattern='^D11 predicates ' infra/verification/smoke/observability/tests/proof.test.mjs. No cluster.

## T02 | Bounded outer process runner | RELEASED (offline; prerequisites apply)

Requires T01. Anchors infra/verification/diagnostic-engine.mjs::runCommand/commandOutcome, diagnostic-engine.test.mjs, provisioning.mjs read-only, EXECUTION § Outer process. D11 sole engine/test owner; no D10 duplicate. Write engine/tests only. Optional signal/clock/byte cap, preabort, inclusive deadline/actual close distinct from terminal result, no late exit0 success, preserve generic defaults. Root node --test infra/verification/diagnostic-engine.test.mjs infra/verification/{diagnostic,provisioning}.test.mjs. Actual short owned group, timeout/overflow/cancel/nonzero/close-unconfirmed.

## T03 | Public failure and repeat refusal | RELEASED (offline; prerequisites apply)

Requires T02. Anchors V/partial-install.mjs::runPartialInstallProof, proof-host.mjs::runProofOperationSession, proof.mjs::runLiveProof, tests/proof.test.mjs, EXECUTION § Public orchestration. Write partial-install/host/proof/tests. Enable partial-install only after safe default gate; legacy direct wrapper remains refused on selected admission-policy candidate. Exact independently verified isolated UID and absent inventory, actual public CLI via outer group/no platform outer lock, typed Loki prefix, actual namespace UID from pending, exact retained fault/history/inventory; repeat none/empty prefix, no extra ensure. Root node --test --test-name-pattern='^D11 (predicates|public) ' infra/verification/smoke/observability/tests/proof.test.mjs; final unfiltered. Negative wrong target/timeout/changed retained state, no clear/teardown.
