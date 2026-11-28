# OBS-E2-08 | verified source map

Baseline `1fa759b980d275ef4ad9d11590cf080fc807ccd2`: source from clean `c3900da1e15bba456c71dcb799698fe2a0f7db5f` lean export; GitHub comparison confirms the intervening three commits touch only the E2 dossier and Design catalog. Source anchors below refer to that baseline; new paths/symbols are proposed. Review [integration contract](<../../../../../designs/open/observability-infrastructure-visibility/INTEGRATION.md>) only at the cited sections. Gates are recorded in the [evidence register](../../../../open/observability-infrastructure-visibility/NATIVE-INPUTS.md).

- `artifacts.mjs`: LOCK_ROLES/FROZEN_ROLE_REPOSITORY, PRIMARY_WORKLOAD/PRIMARY_CONTAINER_NAME, ALLOWED_INVENTORY_KINDS, `parseImageLock`, `rejectForbiddenDocuments`, `assertPrimaryWorkloadImage`, `collectReleaseInventoryRows`, `helmValuesArgv`, `buildValidatedReleasePlans`, `renderValidatedPlan`, `finalizeArtifactBundle`, `loadArtifacts`.
- E1 exact five locks and profile inventories are immutable predecessor inputs; new helper lock separate. 02–06 own dev Prometheus config; 07 owns Grafana overlay and assets.
- `expected-inventory.json`: currently direct/generated rows [apiVersion,kind,namespace,name,release]. E2 cluster-scoped rows use empty namespace string only for exact approved cluster kinds. `helmValuesArgv` already consumed by install/upgrade. Group contract defines additive descriptor shape.

No existing legacy receipt becomes a new PASS. Preserve release E1 and the original historical APIs until the designated normal consumer migration.
