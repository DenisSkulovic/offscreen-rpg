# OBS-E2-13 | task queue
Base: `1fa759b980d275ef4ad9d11590cf080fc807ccd2`; refresh against recorded Design integration branch. State: DEPENDENCY-GATED — joined source plus explicit native permissions. Shared contracts: [group](../README.md#frozen-packet-interfaces).
Tasks: T01 → T02 → T03 → T04; selected: none.

## T01 | Exact joined source gate | PROPOSED (readiness/commission pending)
DEPTH=PATCH
Requires: 01–12 integrated (or explicitly owner-ratified exclusions and amended selected artifact); gates G1–G4 closed for selected scope; exact clean Design branch SHA; owner approves bounded native operations and safe capacity.
May write: infra/platform/observability/tests/e2-joint.test.mjs
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: infra/platform/observability/tests/; infra/verification/smoke/observability/tests/; INTEGRATION Acceptance matrix; 08 immutable render receipts
Algorithm: Run focused affected suites once on joined candidate. Validate exact four render IDs, history/phase rows, release equality and pinned promtool `check config` against actual rendered Prometheus ConfigMap (local pinned image only with permission, no cluster access); Grafana JSON/provider/coverage, no forbidden auth/host/secret. Verify all operation refusals, mutation counts and schema compatibility. Record exact SHA and command outputs.
Test: node --test infra/platform/observability/tests/*.test.mjs infra/verification/smoke/observability/tests/*.test.mjs infra/environments/infra-cli.test.mjs infra/environments/platform-plan.test.mjs; relevant object-store tests from 06; pinned promtool per G5
Negative: Any source/refusal/release regression blocks live dispatch; do not regenerate expected inventory to make test pass.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.

## T02 | Qualify occupied dev transition | PROPOSED (readiness/commission pending)
DEPTH=VERIFY
Requires: T01 postcondition and packet prerequisites.
May write: No source writes; owner-authorized evidence only
Must not write: unapproved live resources, release, other Change owners or shared catalogs. Only the explicitly commissioned dev upgrade may mutate.
Read: infra/platform/observability/upgrade.mjs; upgrade-e2.mjs; e2-preservation.mjs; INTEGRATION Occupied installation transition and Acceptance matrix
Algorithm: Acceptance lead rechecks exact clean SHA, dev identity, no incompatible mutators/forwards, memory/headroom, G1–G4, release isolation. Obtain unique positive historical metrics/logs/traces markers within same exclusive upgrade session. Invoke `OFFSCREEN_OBSERVABILITY_UPGRADE=authorized pnpm obs:upgrade --evolution e2` only after explicit owner live approval; prove same claims/PVs/admin/namespace/history and retained markers, exact E2 classification, no unplanned writes, repeat exact E2 nonmutating. Capture actual bounded telemetry interruption. Stop on fence/failed marker/unknown write; preserve evidence and do not auto-rollback.
Test: Owner-authorized live command above; compare receipt and post-observation to exact accepted criteria.
Negative: No release operation, no restart/disruption suite; unsupported/mixed/pending refuses. If fresh proof not authorized, record NOT RUN rather than assert fresh-clone certification.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.

## T03 | Qualify coverage and dashboard experience | PROPOSED (readiness/commission pending)
DEPTH=VERIFY
Requires: T02 postcondition and packet prerequisites.
May write: No source writes; authorized query/forward evidence only
Must not write: unapproved live resources, release, other Change owners or shared catalogs. Read-only queries by default; isolated specimen requires separate explicit authorization.
Read: docs/runbooks/kubernetes-observability.md; TARGET sections 2–4; INTEGRATION Acceptance matrix
Algorithm: Use `pnpm offscreen obs connect --queries` after valid E2. Compare `kubectl --context kind-offscreen-dev get pods -A -o json` and nodes to KSM pod/node identities in bounded stable window; query selected running container CPU/memory on both nodes; each declared installed native family fresh and present, missing/optional/stale honest. Effective authorization negatives on both SAs where feasible; no unrelated RBAC changes. Observe KSM watch confidence, representative TSDB growth, oldest sample, memory/CPU/series and scrape limits. Open provisioned Grafana overview and drill to kube-system, observability, Temporal; compare actual PromQL values/units, stable UIDs after upgrade rollout. Use only separately authorized disposable specimen for dynamic new workload/fresh install; no deletion of current dev/release to manufacture proof.
Test: Actual kubectl/Prometheus/Grafana read results and recorded owner walkthrough; see PROOF.md exact minimum query route.
Negative: Missing scrape or inventory confidence, backend unhealthy despite up, label leak, unsupported metric masquerading as zero or ineffective RBAC fail relevant scope.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.

## T04 | Reconcile durable technical owners and close | PROPOSED (readiness/commission pending)
DEPTH=PATCH
Requires: T03 postcondition and packet prerequisites.
May write: Canonical docs, STATUS.md, actual Design/Change receipts, catalogs and ledger under coordinator ownership
Must not write: other Change owners; live resources; shared catalogs except coordinator lifecycle.
Read: docs/technical/platform/observability-native-infrastructure.md; docs/runbooks/kubernetes-observability.md; docs/technical/platform/object-storage-infrastructure.md; Design EVIDENCE and both committee receipts
Algorithm: Replace E1-only sentences with explicit predecessor/release vs selected dev E2 contracts; document actual exact artifact/metrics/dashboards/upgrade and native limitations. Transfer M01 cache freshness, M02 effective permissions, M03 same-custody markers, M04 effective retention to named owners; preserve historical E1 unrun gates and actual G5 NOT RUN. Record exact qualification SHA, actual evidence, owner acceptance or blocker. Archive only accepted Changes and Design after permanent owner/ledger/link reconciliation, then integrate main via lifecycle policy. No new committee unless material contradiction.
Test: git diff --check; source/documentation links and actual receipt reconciliation; no extra runtime campaign.
Negative: No claimed PASS without evidence; no archive/main merge if indispensable G5 or owner acceptance pending.
Stop: unresolved native facts, drift contradicting the accepted contract, unavailable assigned proof, identity/permission/data-safety failure. Do not redesign or broaden scope.
Receipt: exact diff, postcondition, assigned actual check result or NOT RUN and blocker; coordinator owns commit and join.
