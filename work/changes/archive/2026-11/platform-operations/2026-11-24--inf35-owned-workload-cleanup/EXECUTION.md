# INF35 execution

## T01 Validate slot workload inventory

tools/dev-environments/src/application/dev-slot-startup.mjs::applyOwnedSlotWorkloads; tools/dev-environments/src/rendering/dev-slot-app-graph.mjs::selectColdStartDocuments; tools/dev-environments/test/dev-slot-startup.test.mjs

Read JSON exact Namespace and Deployment/Service list in selected namespace; verify expected names+ownership labels against rendered docs (existing chart labels authoritative), reject unexpected managed-name collision or malformed read before writes. Namespace already projected by INF22, do not reapply it. Create missing initial Deployments only (kubectl create individually or List); existing Deployment never applied by startup, Tilt remains writer. Services apply only after existing identity verified; preserve allocated ports. Return {ok,workloadsTouched} including partial failure after first mutation; no deletion. Test foreign collision, absent create, existing active no overwrite, partial apply failure. INF30 consumes touched flag. No new RBAC or UID deletion abstraction.

## T02 Smoke cleanup only what this run creates

infra/verification/smoke/release.sh; infra/verification/source/test/volume-guard.test.mjs; infra/verification/fixtures/probes

Move cleanup registration after target/namespace validation; preflight fixed named smoke objects must be absent, refuse existing objects; create rather than apply probe resources where possible, track successfully created names and observed UIDs per object (not namespace) in trap, delete only if current UID matches recorded; unknown read/UID skip diagnostic, no shared tenant/PVC deletion. Use existing shell helpers; no new universal delete framework. Test shell fake kubectl early refusal zero delete, partial create cleanup only recorded, same-name replacement skipped; bash -n. stack:down retains existing narrow release allowlist and target confirmation, additional UID conditional API deletion deferred to later hardening.
