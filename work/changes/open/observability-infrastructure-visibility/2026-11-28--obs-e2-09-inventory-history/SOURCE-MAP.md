# OBS-E2-09 | verified source map

Baseline `1fa759b980d275ef4ad9d11590cf080fc807ccd2`: source from clean `c3900da1e15bba456c71dcb799698fe2a0f7db5f` lean export; GitHub comparison confirms the intervening three commits touch only the E2 dossier and Design catalog. Source anchors below refer to that baseline; new paths/symbols are proposed. Review [integration contract](<../../../../designs/open/observability-infrastructure-visibility/INTEGRATION.md>) only at the cited sections. Gates are recorded in the [evidence register](../NATIVE-INPUTS.md).

- `inventory.mjs`: `objectKey`, `sanitizeSecretObservation`, `parseHelmManifestDocuments`, `collectInventory`, `fetchHelmHistory`, `fetchHelmManifest`, `listHelmReleases`, `readNamespaceObservation`; retained history fetch special-cases Collector.
- `readiness.mjs`: `verifyPodSpecImageIdentity`, `verifyContainerRuntimeIdentity`, `verifyWorkloadImages`, `verifyHelmStorageBijection`, `verifyHelmRevisionMatrix`, `assessShape`, `classifyInventory`, `verifyOwnedFinalShape`, `verifyOwnedEnsurePrefix`, `verifyOwnedTempoDown`, `observeObservability`. Existing namespace-only keys and one expectedImage per role; E1 history special-case.
- 01 exact history rows; 08 exact scoped object keys/descriptors. INTEGRATION `Artifact routing and exact history contract` + `Final Helm revision and storage matrix` and acceptance negatives govern.

No existing legacy receipt becomes a new PASS. Preserve release E1 and the original historical APIs until the designated normal consumer migration.
