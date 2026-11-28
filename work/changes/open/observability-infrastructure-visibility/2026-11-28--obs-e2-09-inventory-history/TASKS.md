# OBS-E2-09 | task queue
Base: `1fa759b980d275ef4ad9d11590cf080fc807ccd2`; refresh against recorded Design integration branch. State: DEPENDENCY-GATED — exact artifacts from 08. Shared contracts: [group](../README.md#frozen-packet-interfaces).
Tasks: T01 → T02 → T03; selected: none.

## T01 | Observe bounded scoped inventory | PROPOSED (readiness/commission pending)
DEPTH=PATCH
Requires: 01 pure history table and 08 exact artifact bundle/inventory joined.
May write: infra/platform/observability/inventory.mjs; tests/inventory.test.mjs
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/inventory.mjs: objectKey, readNamespaceObservation, parseHelmManifestDocuments, collectInventory, fetchHelmManifest; 08 descriptor
Algorithm: Add canonical scoped identity (namespace,kind,name; empty namespace only explicit cluster roles/bindings), retaining legacy namespaced lookup adapter for historical callers. Observe union of exact known named E2 identities even if desired binding unavailable (and cluster RBAC even if namespace absent); no foreign enumeration/adoption. Read exact roleRef/subjects/rules/owner/UID/termination and bounded failure. Fetch actual retained P/G revision 1 manifests only when applicable bounded history indicates revision 2; preserve Collector retained fetch, sanitization, deadlines, identity, exact Helm release list and PV claims. Do not infer retained content.
Test: node --test infra/platform/observability/tests/inventory.test.mjs
Negative: RBAC collision on absent namespace, foreign roleRef/subject, forbidden read, missing retained revision, wrong context or duplicate identity refuses.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.

## T02 | Match exact history and storage | PROPOSED (readiness/commission pending)
DEPTH=PATCH
Requires: T01 postcondition and packet prerequisites.
May write: infra/platform/observability/readiness.mjs; tests/e2-history.test.mjs
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/readiness.mjs: verifyHelmRevisionMatrix, verifyHelmStorageBijection, assessDirectInventory, verifyWorkloadImages, assessShape; 01 artifact-history.mjs
Algorithm: Refactor both verifiers to consume SAME explicit row and corresponding immutable descriptors. Check contiguous revision histories, one current deployed, superseded predecessors, chart/app pins, actual manifest content against per-revision artifact, exact storage Secret name/type/labels/release key/namespace/nontermination and bijection; no extra/missing/mismatched record. Verify exact per-workload container names/images/status and owned controller chains, KSM/exporter descendants, scope and RBAC rules. Preserve historical E1 wrappers with original semantics.
Test: node --test infra/platform/observability/tests/e2-history.test.mjs
Negative: Every final row positive; correct numbers wrong current/predecessor manifest, wrong metadata/extra/missing Secret, unknown runtime image, unexpected RBAC all negative.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.

## T03 | Expose operational classification and owned phases | PROPOSED (readiness/commission pending)
DEPTH=PATCH
Requires: T02 postcondition and packet prerequisites.
May write: infra/platform/observability/readiness.mjs; tests/readiness.test.mjs; tests/snapshot-fixtures.mjs
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/readiness.mjs: classifyInventory, verifyOwnedFinalShape, verifyOwnedEnsurePrefix, observeObservability; 01 intermediate rows; group interface
Algorithm: Add classifyOperationalInventory(snapshot,artifactSet) returning only exactly one matched final descriptor/history; classify public pending before final readiness, distinguish foreign/mixed/unreadable/absent. Structural E1 developer ready but desired convergence upgrade-required; E1 base not operational; E2 ready only if exact. Add explicit owned history/phase verifier for 11, with operation-owned pending and exact intermediate row; no automatic resume. Preserve prefix/final ensure checks incl namespace/RBAC absent collisions, E1 proof compatibility. Add new observeOperationalObservability facade using one identity-bound bounded observation and recheck; consume G2 readDevKubeletTrust under custody, match E2 only with independently derived exact binding, preserve E1 admission if E2 desired unavailable; never admit a partial/unknown E2 from historical descriptors; leave legacy observeObservability until 10 migration.
Test: node --test infra/platform/observability/tests/readiness.test.mjs infra/platform/observability/tests/e2-history.test.mjs
Negative: Pending complete-looking E2, ambiguous matches, mixed P/G, foreign namespace, failed readiness and collision refuse public use; desired status distinct from structural ready.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.
