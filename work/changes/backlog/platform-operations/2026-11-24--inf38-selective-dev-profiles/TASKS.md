> Deferred by owner 2026-11-26. Historical design only; no current commission or dispatch readiness.

# INF38 dispatch

Sequential T-IDs. Dependency INF43, INF37, INF39; INF29 live verifier no active writer to same paths. Each child reads exact EXECUTION section and listed anchors, no broad discovery.

- T01: One shared profile resolver and CLI contract. infra/workloads/application-profiles.mjs (new); tools/dev-environments/src/domain/dev-environment-session.mjs::parseDevCliArgs; tools/dev-environments/src/cli/dev-tilt.mjs; tools/dev-environments/test/dev-environment-session.test.mjs. See EXECUTION T01.
- T02: Dependency-scoped preparation. tools/dev-environments/src/application/dev-slot-startup.mjs::reconcileDevSlot/reconcileOwnedDevSlot/ensureOwnedSlotImages; tools/dev-environments/src/application/dev-shared-core-readiness.mjs::verifySharedCoreReadiness; tools/dev-environments/src/rendering/dev-slot-project.mjs::projectDevSlot; tools/dev-environments/test/dev-slot-startup.test.mjs. See EXECUTION T02.
- T03: One role selection through graph and Tilt. tools/dev-environments/src/rendering/dev-slot-app-graph.mjs::renderDevSlotAppGraph/assertRenderedGraph/renderTiltDeploymentDocuments/selectColdStartDocuments/validateOwnedSlotInventory; tools/dev-environments/src/application/dev-slot-startup.mjs::applyOwnedSlotWorkloads; root Tiltfile; infra/verification/source/tilt/tiltfile.test.mjs. See EXECUTION T03.
- T04: Profile-aware status, endpoints and lifecycle. tools/dev-environments/src/application/dev-lifecycle.mjs::runDevTiltLaunch/assessDevLaunch/superviseOwnedWebPortForward/formatReadyLines; tools/dev-environments/src/application/dev-status.mjs::collectSelectedSlotReadiness/applySelectedSlotHostReadiness/printDevStatus; tools/dev-environments/test/dev-tilt.test.mjs; tools/dev-environments/test/dev-web-readiness.test.mjs. See EXECUTION T04.
