# OBS-E2-08 | task queue
Base: `1fa759b980d275ef4ad9d11590cf080fc807ccd2`; refresh against recorded Design integration branch. State: DEPENDENCY-GATED — selected G1–G4 inputs and construction joins. Shared contracts: [group](../README.md#frozen-packet-interfaces).
Tasks: T01 → T02 → T03; selected: none.

## T01 | Build explicit E2 render plan | PROPOSED (readiness/commission pending)
DEPTH=PATCH
Requires: 01–07 joined (only approved selected scope); G1–G4 closed or explicit owner-ratified scope correction; accepted manifests/metric rows and canonical contract frozen.
May write: infra/platform/observability/artifacts.mjs
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/artifacts.mjs: loadArtifacts, resolveValuesPaths, buildValidatedReleasePlans, helmValuesArgv; 01 artifactId; exact dev overlays and lock files
Algorithm: Implement dev-e2 only with ordered base+dev overlays P/G, dev Collector overlay unchanged, other roles same. Parse separate E2 lock with exact selected helper roles/repositories/digests, require exactly one each; verify all chart hashes first. Add deterministic `--set-file dashboards.offscreen.<name>.json=<absolute repo asset>` in lexical filename order after existing storage/image args, same descriptor used by all consumers. Expose expectedWorkloads map per release with exact regular container identity and no init/ephemeral containers, retain expectedImage for legacy primary path. Keep explicit historical selector and current default until 10. Export loadOperationalArtifactSet(profileId,deps) with exact desired/admissible bundles and explicit desiredArtifactId/desiredUnavailableReason; release only release-e1. Implement the [G2 binding/render interface](../NATIVE-INPUTS.md#g2-construction-freeze-candidate--direct-https-and-cluster-bound-trust), including one `--set-json` on E2 P only, exact fixture-only offline binding, unavailable desired:null with historical admissible descriptors and static E2 identities. No unavailable E2 fallback.
Test: Source gate; T03 render.
Negative: Missing/duplicate helper lock, unexpected dashboard path or release E2 selector fails; historical loadObservabilityVariants unchanged.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.

## T02 | Freeze exact object allowlist | PROPOSED (readiness/commission pending)
DEPTH=PATCH
Requires: T01 postcondition and packet prerequisites.
May write: infra/platform/observability/artifacts.mjs; expected-inventory.json
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/artifacts.mjs: rejectForbiddenDocuments, collectReleaseInventoryRows, assertInventoryMatch; expected-inventory.json; selected rendered manifests
Algorithm: Retain legacy profile rows unchanged and add explicitly named E2 inventory entry. Render candidate and independently compare named resources to selected chart-native KSM/exporter/RBAC/provider objects; freeze exact direct/generated rows (namespace empty only for explicitly reviewed ClusterRole/ClusterRoleBinding). Require exact API version/kind/name/namespace/release ownership and exact container membership; reject other cluster-scoped objects, unexpected roles/rules/subjects, external namespace or duplicate. Validate frozen KSM inventory and resource/system/optional coverage rows produced by 02/03, exact `obs-kubelet-trust` immutable ConfigMap content/digest and mount; never derive trust from rendered/live Helm data. Do not auto-bless rendered unexpected objects or mutate source values to satisfy checks.
Test: Source gate; T03 tests positive/negative.
Negative: Unplanned RBAC/ServiceAccounts/host accesses, extra containers, invalid labels, wrong owner, duplicate identity fail.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.

## T03 | Render and verify immutable artifacts | PROPOSED (readiness/commission pending)
DEPTH=PATCH
Requires: T02 postcondition and packet prerequisites.
May write: infra/platform/observability/tests/render.test.mjs; tests/e2-artifacts.test.mjs
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/tests/render.test.mjs; new expected inventory and exact plans; group interface
Algorithm: Run actual Helm render of four artifact IDs with explicit test-only valid public certificate binding for E2; compare exact E1 and release parsed documents to baseline, verify allowed E2 delta only. Assert both helper workload/container strings/digests, exact owned RBAC, preserved base chart/archive pins and persistence, no public exposure/host access, stable datasource/credential config, provider mount and home file, config syntax through pinned promtool at G5. Add fake render negatives before any real mutator can consume.
Test: node --test infra/platform/observability/tests/render.test.mjs infra/platform/observability/tests/e2-artifacts.test.mjs
Negative: Same revision with wrong manifests, extra containers or role permissions, wrong digest or generated claim fails artifact validation.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.
