# INF38 source map

Baseline source 91bc2af40a94, HEAD 21ed6630e8a8f60a9a3e2bc49054eb5a0bec916e. Existing anchors and selected edits are in EXECUTION. Future exports are design, not landed source.

T01: infra/workloads/application-profiles.mjs (new); tools/dev-environments/src/domain/dev-environment-session.mjs::parseDevCliArgs; tools/dev-environments/src/cli/dev-tilt.mjs; tools/dev-environments/test/dev-environment-session.test.mjs

T02: tools/dev-environments/src/application/dev-slot-startup.mjs::reconcileDevSlot/reconcileOwnedDevSlot/ensureOwnedSlotImages; tools/dev-environments/src/application/dev-shared-core-readiness.mjs::verifySharedCoreReadiness; tools/dev-environments/src/rendering/dev-slot-project.mjs::projectDevSlot; tools/dev-environments/test/dev-slot-startup.test.mjs

T03: tools/dev-environments/src/rendering/dev-slot-app-graph.mjs::renderDevSlotAppGraph/assertRenderedGraph/renderTiltDeploymentDocuments/selectColdStartDocuments/validateOwnedSlotInventory; tools/dev-environments/src/application/dev-slot-startup.mjs::applyOwnedSlotWorkloads; root Tiltfile; infra/verification/source/tilt/tiltfile.test.mjs

T04: tools/dev-environments/src/application/dev-lifecycle.mjs::runDevTiltLaunch/assessDevLaunch/superviseOwnedWebPortForward/formatReadyLines; tools/dev-environments/src/application/dev-status.mjs::collectSelectedSlotReadiness/applySelectedSlotHostReadiness/printDevStatus; tools/dev-environments/test/dev-tilt.test.mjs; tools/dev-environments/test/dev-web-readiness.test.mjs
