# OBS-E2-12 | verified source map

Baseline `1fa759b980d275ef4ad9d11590cf080fc807ccd2`: source from clean `c3900da1e15bba456c71dcb799698fe2a0f7db5f` lean export; GitHub comparison confirms the intervening three commits touch only the E2 dossier and Design catalog. Source anchors below refer to that baseline; new paths/symbols are proposed. Review [integration contract](<../../../../designs/open/observability-infrastructure-visibility/INTEGRATION.md>) only at the cited sections. Gates are recorded in the [evidence register](../NATIVE-INPUTS.md).

- `proof.mjs`: `runLiveProof` and session observation via `observeObservability`; `proof-host.mjs`: `runProofOperationSession` specialized dispatch before generic health, `extractStableIdentities`, `stableIdentitiesCompatible`, `assessHealthStructuralObservation` fixed storage/workload assumptions.
- `disruptions.mjs`: `runPersistenceProof`, `runOutageProof`, `guardedRolloutRestart`, `guardedScaleTempo`, `restoreTempoAfterOutage`, `capturePersistenceBaseline`; uses old `verifyOwnedFinalShape`.
- `partial-install.mjs`: `resolvePartialInstallPlans`, `runIsolatedPartialInstallProof`, `runPartialInstallProof`, wrapper; historical calls use default install contract. `resources.mjs`: `runResourcesProof`, old E1 budget.
- `signals.mjs: runSignalsProof`, `developer.mjs: runDeveloperProof`; preserve existing policy and cleanup, adapt matched descriptor. INTEGRATION operation matrix H01.

No existing legacy receipt becomes a new PASS. Preserve release E1 and the original historical APIs until the designated normal consumer migration.
