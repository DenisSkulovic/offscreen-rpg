# OBS-E2-12 | task queue
Base: `1fa759b980d275ef4ad9d11590cf080fc807ccd2`; refresh against recorded Design integration branch. State: DEPENDENCY-GATED — 08/09 operational classifier. Shared contracts: [group](../README.md#frozen-packet-interfaces).
Tasks: T01 → T02 → T03; selected: none.

## T01 | Make eligibility explicit before dispatch | PROPOSED (readiness/commission pending)
DEPTH=PATCH
Requires: 08/09 joined; 01 history rows. 11 pending schema must be recognized by existing/new readers before activation, but source construction independent of upgrade implementation.
May write: infra/verification/smoke/observability/proof.mjs; proof-host.mjs; tests/proof.test.mjs
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/verification/smoke/observability/proof.mjs: runLiveProof; proof-host.mjs: runProofOperationSession, refuseProofInvocation; 09 operational classifier
Algorithm: Reject partial-install for E2-enabled source before cluster creation, wrapper/Helm/pending writes. For persistence/outage/resources require exact E1 developer artifact/history before specialized dispatch; E2 returns `unsupported-evolution` with no mutation. Health/signals/developer admit exact E1 developer or E2 under existing proof custody; do not use desired-convergence state for proof of installed predecessor. Carry matched descriptor/history through session, repeat classification under custody and recheck identity. Preserve authorization checks.
Test: node --test infra/verification/smoke/observability/tests/proof.test.mjs
Negative: Each E2 unsupported gate invoked directly via dispatcher has zero cluster mutations, pending writes, scale/rollout and probe creations; base/pending/mixed refuse.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.

## T02 | Fence direct disruption and legacy paths | PROPOSED (readiness/commission pending)
DEPTH=PATCH
Requires: T01 postcondition and packet prerequisites.
May write: infra/verification/smoke/observability/disruptions.mjs; partial-install.mjs; resources.mjs; tests/proof.test.mjs; tests/proof-resources.test.mjs
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/verification/smoke/observability/disruptions.mjs: runPersistenceProof, runOutageProof, guardedRolloutRestart, guardedScaleTempo, restoreTempoAfterOutage; partial-install.mjs: resolvePartialInstallPlans, runIsolatedPartialInstallProof, runPartialInstallProof; resources.mjs: runResourcesProof
Algorithm: Require explicit E1 eligibility at both top-level disruption runners and again under exclusive proof custody before pending write or first mutation. Lower helpers require matching E1-only admitted session/pending authority, including restore path; no standalone bypass. Keep old E1 exact history and preservation verification. Refuse E2 old resources gate, refuse legacy partial-install at direct entries/resolver on E2-enabled tree before mutation. Existing E1 historical specimen preserved in historical source.
Test: node --test infra/verification/smoke/observability/tests/proof.test.mjs infra/verification/smoke/observability/tests/proof-resources.test.mjs
Negative: Direct helper without matched eligibility, E2 session, legacy partial-install and E2 resources gate cannot invoke a runner; E1 correct path remains eligible with authorization.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.

## T03 | Use matched identity for nondisruptive proofs | PROPOSED (readiness/commission pending)
DEPTH=PATCH
Requires: T02 postcondition and packet prerequisites.
May write: infra/verification/smoke/observability/proof-host.mjs; signals.mjs; developer.mjs; tests/proof.test.mjs
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/verification/smoke/observability/proof-host.mjs: extractStableIdentities, stableIdentitiesCompatible, assessHealthStructuralObservation; signals.mjs: runSignalsProof; developer.mjs: runDeveloperProof
Algorithm: Derive exact stable workload/storage history identities from matched artifact/history instead of fixed five Secret names; include retained records and E2 helper identities as appropriate; retain existing synthetic privacy, transport, identity, stable resource and UID-bound cleanup. No platform rollout/scale. Separate existing synthetic/developer signal proof from full coverage; source receipt identifies matched history.
Test: node --test infra/verification/smoke/observability/tests/proof.test.mjs
Negative: Changed history/Secret/namespace/descriptor or cleanup mismatch fails; E2 synthetic success cannot claim E2 coverage or disruptive certification.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.
