# OBS-D02 task cards (candidate; dispatch held)

All paths rooted at repository root; P=infra/platform/observability/, V=infra/verification/smoke/observability/. Parent supplies only named card, exact EXECUTION subsection and source anchors, not archived dossier. Each serial predecessor must pass its focused checks; no interim public activation, waived assertions or unsafe fallback. All commands local/offline. Child receipt: ID/base, exact changed paths, commands/results, normal/negative result, contradiction or none; parent owns commit and close.

## T01 | Bounded reads and snapshot capture | PLANNER-BLOCKED

Anchors P/identity.mjs::captureIdentity; common/commands.mjs::assertPlatformTarget (read-only); P/tests/identity.test.mjs; EXECUTION § Capture and Shared platform constants. Write identity.mjs and identity tests only. Add scoped direct SIGKILL read adapter, exact profile/current context, CA/Kind/Docker validation, private snapshot and frozen namespace reads. Test full dev/release capture, malformed user/CA, env overrides, failed read vs absence, deadline/no-launch and owner-only cleanup. Root: node --test infra/platform/observability/tests/identity.test.mjs infra/platform/common/tests/commands.test.mjs. Stop on actual target format contradiction.

## T02 | Recheck and actual namespace UID binding | PLANNER-BLOCKED

Requires T01. Anchors P/identity.mjs::recheckIdentity; P/install.mjs::runObservabilityEnsure/runWrite; P/tests/install.test.mjs; EXECUTION § Recheck and namespace create. Write identity/install and tests. Compare immutable full tuple and snapshot; actual create JSON UID is the only binding, durable advance before later read. Missing/mismatched response or failed advance stops before Secret/Helm. Root: node --test infra/platform/observability/tests/{identity,install}.test.mjs. Negative changed snapshot, owner/UID/CA/Docker/context, late result, replacement after create, no later mutation.

## T03 | Route scoped reads and reconcile fixtures | PLANNER-BLOCKED

Requires T02. Anchors P/artifacts.mjs::loadArtifacts; P/install.mjs::runObservabilityEnsure; P/tests/readiness.test.mjs; V/tests/proof.test.mjs. Write artifacts/install only scoped default runner wiring, explicit fixture fields in named tests including diagnostic-worker. Use explicit offline template60s cap, not identity15s; preserve unrelated common callers and legacy pending API until D03. D04 owns full public budget switch. Root: node --test --test-concurrency=1 infra/platform/observability/tests/{identity,install,readiness,diagnostic-worker,render}.test.mjs infra/verification/smoke/observability/tests/proof.test.mjs. Stop on unlisted caller or mixed tuple. Remaining inventory/public worker migration explicitly D04; no activation.
