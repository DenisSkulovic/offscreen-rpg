# OBS-E2-03 | task queue
Base: `1fa759b980d275ef4ad9d11590cf080fc807ccd2`; refresh against recorded Design integration branch. State: PLANNER-BLOCKED — G2. Shared contracts: [group](../README.md#frozen-packet-interfaces).
Tasks: T01 → T02; selected: none.

## T01 | Add direct authenticated jobs | PLANNER-BLOCKED (native inputs)
DEPTH=PATCH
Requires: 02 joined; G2 passes both-node verified serving CA/SAN and scoped auth; frozen trust/address/metric inputs.
May write: infra/platform/observability/values/profiles/dev/prometheus.yaml and G2-named CA asset
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/values/profiles/dev/prometheus.yaml (02); TARGET section 2; G2 accepted record
Algorithm: Enable token on dedicated Prometheus SA and exact parent extraManifests Role/Binding for node list/watch/get and get nodes/metrics, preserving already-selected permissions without wildcard or duplicate grants. Add `kubelet-cadvisor` and `kubelet-resource` with node discovery limited to exact two names, verified address scheme 10250, verified CA file, token file, HTTPS and explicit paths. Apply 20k cAdvisor and 5k resource limits, node target cap 4, bounded labels and families from G2. If CA asset required, mount read-only exact public trust material, no private keys. No admin kubeconfig.
Test: Source gate; 08 renders/promtool; 13 tests actual endpoints.
Negative: Wrong node, bad SAN/CA, missing token, nodes/proxy, insecure_skip_verify or annotation-controlled address must not be admitted.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.

## T02 | Pin resource metric semantics | PLANNER-BLOCKED (native inputs)
DEPTH=PATCH
Requires: T01 postcondition and packet prerequisites.
May write: infra/platform/observability/tests/e2-collection.test.mjs; infra/platform/observability/coverage/inventory.json
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/tests/e2-collection.test.mjs; TARGET sections 1,2,4; G2 record
Algorithm: Extend the frozen inventory coverage rows with G2 resource jobs/families/panel mappings; extend fixtures to verify both paths, token and trust reference, exact node selection, no double collection and no forbidden RBAC. Retain metric labels needed for namespace/pod/container/node and omit unproven disk/network families.
Test: node --test infra/platform/observability/tests/e2-collection.test.mjs
Negative: Empty/POD containers are not business resource totals; missing native family remains unsupported, not zero.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.
