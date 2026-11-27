# OBS-D04 task cards (candidate; dispatch held)

All paths rooted at repository root; P=infra/platform/observability/, V=infra/verification/smoke/observability/. Parent supplies only named card, exact EXECUTION subsection and source anchors, not archived dossier. Each serial predecessor must pass its focused checks; no interim public activation, waived assertions or unsafe fallback. All commands local/offline. Child receipt: ID/base, exact changed paths, commands/results, normal/negative result, contradiction or none; parent owns commit and close.

## T01 | Pinned overlay and variants | PLANNER-BLOCKED

Anchors P/artifacts.mjs::loadArtifacts; P/values/collector.yaml (D01); immutable generator in EXECUTION § Artifacts; P/tests/render.test.mjs. Write artifacts, values/profiles/dev/collector.yaml, render tests and scanner overlay path. Generate exact YAML, internal desired/predecessor bundles with shared base render, no public CLI variant. Root node --test infra/platform/observability/tests/render.test.mjs scripts/repo-tools/check-lab-manifests.test.mjs. Positive exact release/predecessor parity; dev only four unchanged Collector identities, five ports; negative invalid overlay/variant/final archive before render. Candidate only; no runtime activation.

## T02 | Frozen inventory projection | PLANNER-BLOCKED

Requires T01 and D02/D03. Anchors P/inventory.mjs::collectInventory/listHelmReleases/fetchHelmManifest; P/tests/inventory.test.mjs; EXECUTION § Inventory. Write inventory and tests only. Use bounded frozen Helm list/history/manifest argv, known release only, Secret metadata no values, exact Collector config and bound PV projection. Root node --test infra/platform/observability/tests/inventory.test.mjs. Negative duplicate/unknown/late/malformed rows, wrong namespace and secret redaction; no read failure as absence.

## T03 | Exact state classifier and rendered fixtures | PLANNER-BLOCKED

Requires T02. Anchors P/readiness.mjs::classifyInventory/observeObservability; P/tests/snapshot-fixtures.mjs; P/tests/readiness.test.mjs; EXECUTION § Readiness. Write those files and deferred classifier assertions in inventory test. Exact four admitted histories, pending never ready, public/owned separation and current projection; artifact-backed actual Helm fixtures. Root node --test infra/platform/observability/tests/{readiness,inventory}.test.mjs. Negative manifest/config/checksum/ports, UID/endpoint/image/PV/Secret/history and wrong pending/operation. No fake archive bypass or live.

## T04 | Install prefix and strict receipts | PLANNER-BLOCKED

Requires T03. Anchors P/install.mjs::verifyCompletedPhasePrefix/runObservabilityEnsure; P/receipt.mjs::parseEnsureReceipt/evaluateObservationReceipt; P/tests/install.test.mjs; EXECUTION § Installer. Write install/receipt and tests. Compare own pending, exact prefix and final shape, predecessor refusal/no writes; closed schema1 expected profile/operation and possible mutation for unknown. Root node --test infra/platform/observability/tests/{install,receipt}.test.mjs. Positive fresh/no-op; negative future release, lost/contradictory receipt, namespace replacement, pending and uncertain close. No interim public dispatch.

## T05 | Public caller join | PLANNER-BLOCKED

Requires T04. Anchors infra/verification/diagnostic-live.mjs::runObservabilityDiagnosticSubprocess; infra/environments/platform-plan.mjs::platformRunnerSpawnTimeout; infra/environments/infra-cli.mjs::observeSelectedServiceState; infra/verification/provisioning.mjs; EXECUTION § Callers. Write only exact caller modules and matching tests in SOURCE-MAP. Apply ratified deadlines, expected operation/profile, readable pending exit0 mapped FAIL, optional release proven absent only NOT-RUN, malformed possible and stops later phases. Root node --test infra/platform/observability/tests/diagnostic-worker.test.mjs infra/environments/{platform-plan,infra-cli,infra-cli-operation}.test.mjs infra/verification/{diagnostic,provisioning}.test.mjs. Parent combined proof. Stop if affected public entrypoint remains unsafe; no activation or legacy fallback.
