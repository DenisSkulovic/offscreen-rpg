# OBS-E2-06 | verified source map

Baseline `1fa759b980d275ef4ad9d11590cf080fc807ccd2`: source from clean `c3900da1e15bba456c71dcb799698fe2a0f7db5f` lean export; GitHub comparison confirms the intervening three commits touch only the E2 dossier and Design catalog. Source anchors below refer to that baseline; new paths/symbols are proposed. Review [integration contract](<../../../../designs/open/observability-infrastructure-visibility/INTEGRATION.md>) only at the cited sections. Gates are recorded in the [evidence register](../NATIVE-INPUTS.md).

- `dev-bootstrap.mjs`: `renderDevObjectStore`, `assessObjectStoreProbe`, `ensureDevObjectStore`, `executeAuthorizedDevObjectStore`.
- `providers/seaweedfs/observe.mjs`: `validateWorkloadContainer`, `validateWorkloadPodSpec`, `validateLiveStructuralChain`, `classifyObjectStorageObservation`, `observeObjectStorageChain` require exact shape.
- `providers/seaweedfs/install.mjs`: `decideObjectStorageInstall`, `ensureObjectStorage`; `mutation-guard.mjs`: `withObjectStorageMutation`, pending/identity helpers. Existing install-only admission is not an upgrade authority.
- Chart deployment/service currently S3 8333 only; `-metricsPort=9327` upstream 4.54 verified at design stage. Object owner contract: `docs/technical/platform/object-storage-infrastructure.md`; preserve its native lifecycle and custody contracts.

No existing legacy receipt becomes a new PASS. Preserve release E1 and the original historical APIs until the designated normal consumer migration.
