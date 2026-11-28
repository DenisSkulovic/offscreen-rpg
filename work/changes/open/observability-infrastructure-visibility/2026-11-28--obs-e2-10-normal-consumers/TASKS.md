# OBS-E2-10 | task queue
Base: `1fa759b980d275ef4ad9d11590cf080fc807ccd2`; refresh against recorded Design integration branch. State: DEPENDENCY-GATED — 08/09 contracts. Shared contracts: [group](../README.md#frozen-packet-interfaces).
Tasks: T01 → T02 → T03; selected: none.

## T01 | Make fresh ensure explicit | PROPOSED (readiness/commission pending)
DEPTH=PATCH
Requires: 08,09 joined; full selected E2 artifact frozen. 01 historical API preserved.
May write: infra/platform/observability/install.mjs; tests/install.test.mjs
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/install.mjs: runObservabilityEnsure, verifyCompletedPhasePrefix, helmInstallArgv; 08/09 operational interfaces
Algorithm: Under existing exclusive custody choose explicit desired E2 for fresh dev only, using one validated G2 binding and recheck digest before each mutation and final observation; absent binding refuses fresh activation, E1 status remains readable; exact release E1 unchanged. Use one union admission, check named RBAC collisions before namespace creation, carry same descriptor through prefix/Helm/final. Existing E1 base/developer -> explicit upgrade-required, exact E2 -> no-op, pending/unknown/partial -> refusal; no implicit upgrade. Preserve phase budgets and supervisor; stop if measured artifact/inventory work exceeds existing bound, return planner for bounded budget change.
Test: node --test infra/platform/observability/tests/install.test.mjs
Negative: E1/pending/mixed never install over state; exact E2 no writes; no unintended release commands.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.

## T02 | Route status, public render and diagnostics | PROPOSED (readiness/commission pending)
DEPTH=PATCH
Requires: T01 postcondition and packet prerequisites.
May write: infra/platform/observability/readiness.mjs; artifacts.mjs; infra/environments/{infra-cli,platform-plan}.mjs; infra/platform/common/cli.mjs; infra/verification/diagnostic-live.mjs; affected existing tests
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/readiness.mjs: observeObservability; artifacts.mjs: renderObservabilityDocuments, lintObservability; infra/environments/infra-cli.mjs: observabilityReadinessToServiceState; infra/verification/diagnostic-live.mjs
Algorithm: Normal observation wrapper defaults to operational selector; explicit historical supplied descriptor still supports E1 only with its original semantics. Normal plan/status report artifactId/historyId, structuralReady, desiredConverged; preserve existing machine status/reason/exit behavior (E1 upgrade-required not ready for desired), diagnostics must not certify E1 as E2. Public render/lint dev desired E2 with real local trust capture (no cluster or invalid trust returns kubelet-trust-unavailable; source fixtures use injected binding), release exact E1; do not redefine historical desired. Preserve all existing platform CLI flags and CLI01 wrappers.
Test: node --test infra/environments/infra-cli.test.mjs infra/environments/platform-plan.test.mjs infra/platform/observability/tests/diagnostic-worker.test.mjs
Negative: Render/lint release exactly unchanged; recognized E1 developer not desired-converged; pending never ready; unknown artifact refuses.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.

## T03 | Connect using matched descriptor | PROPOSED (readiness/commission pending)
DEPTH=PATCH
Requires: T02 postcondition and packet prerequisites.
May write: infra/platform/observability/connect.mjs; tests/forward.test.mjs (connect-related cases only; shared test path collision with 11)
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/connect.mjs: collectObserved, runObservabilityConnect; forward.mjs: openForwards, readGrafanaAdmin; 09 classifier
Algorithm: Acquire existing shared custody, match exact operational E1 developer or E2, carry descriptor/history through identity recheck, forwarding and admin Secret UID validation, no default re-resolution. E1 base, pending, unreadable, foreign/mixed refuse. Keep loopback ports and flags, transport checks, bounded process cleanup and no credential output.
Test: node --test infra/platform/observability/tests/forward.test.mjs
Negative: E2 matched descriptor used even when E1 artifact available; wrong Secret UID, changed context, base or pending fails before forward.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.
