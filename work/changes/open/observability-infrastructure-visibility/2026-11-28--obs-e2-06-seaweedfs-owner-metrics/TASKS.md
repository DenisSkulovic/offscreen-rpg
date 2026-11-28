# OBS-E2-06 | task queue
Base: `1fa759b980d275ef4ad9d11590cf080fc807ccd2`; refresh against recorded Design integration branch. State: PLANNER-BLOCKED — G4 owner transition details and native feasibility. Shared contracts: [group](../README.md#frozen-packet-interfaces).
Tasks: T01 → T02 → T03; selected: none.

## T01 | Freeze dev target and classifier | PLANNER-BLOCKED (native inputs)
DEPTH=PATCH
Requires: G4a selected exact owner transition contract and authorization boundaries; native version/port and fixture inputs frozen. Source construction precedes separately authorized G4b proof. Enrollment task T03 additionally requires 02 joined and G4b or explicit owner-ratified exclusion; 08/13 consume that result.
May write: infra/platform/object-storage/dev-bootstrap.mjs; providers/seaweedfs/chart/templates/deployment.yaml and service.yaml; providers/seaweedfs/observe.mjs; G4a exact dev values
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/object-storage/providers/seaweedfs/chart/templates/{deployment,service}.yaml; infra/platform/object-storage/dev-bootstrap.mjs: renderDevObjectStore, assessObjectStoreProbe; infra/platform/object-storage/providers/seaweedfs/observe.mjs: validateWorkloadContainer, validateLiveStructuralChain; accepted G4a
Algorithm: Use G4a exact dev-only values and explicit named metrics port 9327, same image/data/S3/claim/identity. Classify exact predecessor and target, not any extra args/port. Release parsed manifest and owner verifier unchanged. Fresh dev target and existing predecessor handled according to G4a; ordinary ensure never implicitly mutates occupied predecessor.
Test: node --test infra/platform/object-storage/tests/object-storage-chart.test.mjs infra/platform/object-storage/tests/readiness.test.mjs
Negative: Wrong image/args/extra port, foreign data chain or changed release refused.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.

## T02 | Implement owner-controlled transition | PLANNER-BLOCKED (native inputs)
DEPTH=PATCH
Requires: T01 postcondition and packet prerequisites.
May write: infra/platform/object-storage/providers/seaweedfs/install.mjs; providers/seaweedfs/mutation-guard.mjs; object-storage tests named in G4a
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/object-storage/providers/seaweedfs/install.mjs: ensureObjectStorage; infra/platform/object-storage/providers/seaweedfs/mutation-guard.mjs: withObjectStorageMutation; accepted G4a exact operation contract
Algorithm: Implement only ratified G4a algorithm: explicit separate operation authorization, object owner lock, exact identity and predecessor, no active consumers, positive preexisting object marker, durable intent before one controlled rollout, verify same service/admin/claim/PV/data chain and exact target, same marker readable, then clear owned intent. Fail closed on uncertainty; no force/uninstall/restore/adoption or implicit monitor invocation. Exact target repeat nonmutating.
Test: node --test infra/platform/object-storage/tests/object-storage-install.test.mjs infra/platform/object-storage/tests/mutation-guard.test.mjs
Negative: Inject active consumers, wrong UID, failed/unknown write, marker mismatch; zero further mutations; retained fence.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.

## T03 | Enroll proven endpoint | PLANNER-BLOCKED (native inputs)
DEPTH=PATCH
Requires: T02 postcondition, 02 joined, G4b authorized positive receipt and no concurrent overlay owner; packet prerequisites.
May write: infra/platform/observability/values/profiles/dev/prometheus.yaml; infra/platform/observability/coverage/seaweedfs.json; infra/platform/observability/tests/e2-collection.test.mjs
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/values/profiles/dev/prometheus.yaml; G4b positive owner receipt and G3 native metric families
Algorithm: Only after authorized owner proof and frozen metric evidence, add static `seaweedfs` job `object-store.offscreen-dev-objects.svc:9327/metrics` if exact Service confirmed by G4. Use bounded families, explicit storage coverage and limits. No S3 scrape. If G4 fails or not authorized, leave this assignment blocked; owner may ratify explicit inventory-only scope, planner revises affected contract before activation.
Test: node --test infra/platform/observability/tests/e2-collection.test.mjs
Negative: Missing owner proof or unsupported family never silently enables target or claims full coverage.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.
