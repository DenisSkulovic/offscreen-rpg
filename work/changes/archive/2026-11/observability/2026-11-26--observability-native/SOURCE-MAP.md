# Source map — draft

Pinned main a81e275821496e478ba55ae3dce5e72cf63d5dfd. The following is the defended designer map, with direct confirmation of primary caller lines in this planning session. Caller reconciliation recorded in [CALLERS.md](CALLERS.md) against owner-supplied cb66dfab snapshot.

# Integration / preservation map
Main a81e275821496e478ba55ae3dce5e72cf63d5dfd. Source inspection current at this SHA.
- infra/platform/common/profile.mjs:11–54 add observability namespace per profile, preserve storage and other namespace identities.
- infra/environments/platform-plan.mjs:29–51 catalog/default dev supported; 117–118 legacy shell map; corePhases native Redis dispatch around304; selectedChartServices374, preflight394–550, execution679. Route observability to native installer both profiles, remove legacy shell and shared chart preflight for this service, preserve default selection and unrelated native services.
- infra/environments/infra-cli.mjs:530 legacy lab-a deployment/service branch; observeSelectedServiceState and dev selection path replace with bounded native status; preserve CLI receipts and read-only semantics.
- infra/platform/common/render.mjs:20–31 service registry/release-only, 56–61 namespace mapping, 247–303 render routing, 432–517 render/lint. Retire legacy chart routing for observability or route public render to native validated bundle; never silently render old chart. Compatibility behavior must be explicitly tested.
- infra/platform/observability/install.sh:16 lab namespace helper, 76–95 legacy apply/rollout/image; replace source with native bundle implementation, no runtime delete or migration. Legacy chart exact object names from chart templates retained as refusal inventory, not installation path.
- infra/platform/redis/custody.mjs:82–119 lock identity/path, 249–366 admission/flock, 450 pending durability, 500–513 inherited fd, 605 close. Reference semantics for service-local custody; do not alter Redis or import Redis business policy.
- infra/platform/common/commands.mjs:285 assertPlatformTarget, 340–380 release bootstrap; use existing target checks.
- infra/verification/diagnostic.mjs:87 source render test, 100 service catalog, 121 PL-06. Update registry and structural diagnostic only; diagnostic not query or mutation. Inspect diagnostic-live.mjs and tests during implementation.
- infra/verification/smoke/observability/{setup.sh,smoke.sh,assert_signals.py,hop.py,hops.yaml,tests/setup.test.mjs}: old debug-export proof retired/replaced by bounded query proof, preserve two-hop causal intent where applicable; no legacy setup on new platform. Explicitly reconcile runbooks.
- infra/environments/{platform-plan.test.mjs,infra-cli.test.mjs,infra-cli-operation.test.mjs,infra-presentation.test.mjs}, infra/verification/diagnostic.test.mjs: focused compatibility tests.
- docs/runbooks/kubernetes-observability.md and docs/technical/observability/telemetry-and-diagnostics.md: canonical promotion only after committee/owner; retain protected evidence separation and truth of runtime status.
- Preserve infra/monitoring, workstation runbook/technical doc, all domain telemetry/evidence packages, existing other platform services. No application workload changes.
Caller dispositions: see [CALLERS.md](CALLERS.md). Exact legacy inventory is selected in canonical R30/R33.

## R34 diagnostic integration map (current compatibility main)
Read diagnostic-live.mjs observe (six baseline subprocesses before classifier); diagnostic.mjs diagnosticServices/buildDiagnosticChecks/runDiagnostic; diagnostic-engine.mjs runCommand/commandOutcome/executeChecks; verify.mjs parseVerifyArgs and CLI diagnostic branch; provisioning.mjs observeOutcome/buildProvisioningChecks; common/commands.mjs runPlatformCommand/assertTargetIdentity/assertPlatformTarget; infra-cli.mjs observeSelectedServiceState/runInfraStatus. Exact decisions and proof in [R34](R34.md). Focused tests diagnostic.test.mjs, verify.test.mjs, provisioning.test.mjs, native observation fixtures; add worker seam tests. No change to generic engine aggregation, unrelated optional service policy, cluster prerequisite or other service timeout. Caller classification is recorded in CALLERS.md; task-local symbol/fixture review still required.


## Directly confirmed primary caller lines
- platform-plan.mjs:31,42,118 (catalog and shell dispatch).
- common/render.mjs:20,23,31,60 (registry, release-only and namespace).
- infra-cli.mjs:471,530,554 (release and selected observer).
- diagnostic.mjs:87,100,121,125,327 (test, catalog, capability, build and run).
- diagnostic-live.mjs:9 observe; provisioning.mjs:16,26,30,115,130,155,187; verify.mjs:334 parseVerifyArgs.
- check-lab-manifests.mjs:67; infra-layout.test.mjs:305–310.

RabbitMQ and object-storage native source already joined main, acceptance pending. Preserve shared branch changes; local worktree/cluster occupancy unknown. Scope and scan exclusions documented in CALLERS.md.

## B07 current-main compatibility (ba8f7c0f7bff0beeafd6ff0c6ec8341bfadf1357)
Preserve dirty T01 work on actual branch change/observability-native-source, no reset, stash/pop or overwrite. Owner fast-forwards that branch to the planner amendment only after read-only merge-tree/no-overlap check (local commands provided by planner); no primary checkout switch. Current main retains existing profile.mjs content; common/commands.mjs readPlatformObject now recognizes PV/qualified plural cluster scope and validates vendor RBAC colon names. T02 adds baselineUid without changing those rules. Preserve existing RabbitMQ namespace fixtures and new PV/RBAC regression tests in common/tests/commands.test.mjs; add observability namespace assertions to the current fixture, do not replace it with stale version. Current infra-cli.mjs runInfraUp verifies cluster readiness on cold and warm paths, and wait=true only for newly created cluster; T05 observability-selected missing target refuses before cluster-ensure, uses existing present-target checks with wait=false under the existing 240s scoped preflight, and preserves cold readiness waits, contextName, receipt fields and failure handling for unrelated services. observeSelectedServiceState remains the native status seam. Preserve new infra-cli.test.mjs cold/warm node/storage checks. No change to unrelated bootstrap, RabbitMQ, Postgres or object storage. Current changed shared seams reviewed against original baseline; no observed material contradiction. T01 first, later tasks remain serial and dependency-gated.
