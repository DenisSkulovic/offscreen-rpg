# OBS-E2-03 | verified source map

Baseline `1fa759b980d275ef4ad9d11590cf080fc807ccd2`: source from clean `c3900da1e15bba456c71dcb799698fe2a0f7db5f` lean export; GitHub comparison confirms the intervening three commits touch only the E2 dossier and Design catalog. Source anchors below refer to that baseline; new paths/symbols are proposed. Review [integration contract](<../../../../designs/open/observability-infrastructure-visibility/INTEGRATION.md>) only at the cited sections. Gates are recorded in the [evidence register](../NATIVE-INPUTS.md).

- `infra/clusters/` defines the Kind cluster; the current snapshot does not establish live serving certificates.
- `values/prometheus.yaml` disables default kubelet jobs; TARGET section 2 selects direct 10250 and scoped `nodes/metrics`. G2 establishes actual address/CA; never infer from API CA.
- Existing identity and release artifact contract unchanged; only 08 includes new RBAC in exact inventory.

No existing legacy receipt becomes a new PASS. Preserve release E1 and the original historical APIs until the designated normal consumer migration.

Current G2 source anchors (verified reconstruction at `8cb05ff2841d548e52c75cd6dae0e666081f810b`): `identity.mjs::readControlPlaneTuple`, `captureIdentity`, `recheckIdentity`, `runObservabilityReadCommand` own local Docker endpoint, loopback kubeconfig, control-plane and baseline identity. `artifacts.mjs::buildValidatedReleasePlans`, `helmValuesArgv`, `renderValidatedPlan`, `loadArtifacts`, `loadObservabilityVariants` are 08's exact descriptor interface, not 03 write ownership. `readiness.mjs::observeObservability` and `install.mjs::runObservabilityEnsure`, `upgrade.mjs::runObservabilityUpgrade` consume it via 09–11. Vendored Prometheus 31.0.0 `templates/extra-manifests.yaml` supports templated strings; `templates/deploy.yaml` mounts `server.extraConfigmapMounts` read-only as specified. Use [G2 frozen candidate](../NATIVE-INPUTS.md#g2-construction-freeze-candidate--direct-https-and-cluster-bound-trust).
