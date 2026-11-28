# OBS-E2-01 | verified source map

Baseline `1fa759b980d275ef4ad9d11590cf080fc807ccd2`: source from clean `c3900da1e15bba456c71dcb799698fe2a0f7db5f` lean export; GitHub comparison confirms the intervening three commits touch only the E2 dossier and Design catalog. Source anchors below refer to that baseline; new paths/symbols are proposed. Review [integration contract](<../../../../designs/open/observability-infrastructure-visibility/INTEGRATION.md>) only at the cited sections. Gates are recorded in the [evidence register](../NATIVE-INPUTS.md).

- `artifacts.mjs`: `assertArtifactVariantAllowed`, `resolveValuesPaths`, `buildValidatedReleasePlans`, `finalizeArtifactBundle`, `loadArtifacts`, `loadObservabilityVariants`; currently `desired`/`predecessor`, historical Collector overlay only; release has no predecessor.
- `readiness.mjs`: `verifyHelmRevisionMatrix`, `verifyHelmStorageBijection` currently special-case Collector revision 2. Do not modify them here; 09 consumes explicit rows.
- `expected-inventory.json` uses existing profile keys; do not change it in 01. `tests/render.test.mjs` covers render, image pins and variants.

No existing legacy receipt becomes a new PASS. Preserve release E1 and the original historical APIs until the designated normal consumer migration.
