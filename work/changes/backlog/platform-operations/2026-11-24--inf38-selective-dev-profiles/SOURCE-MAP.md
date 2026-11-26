# INF38 source map

Current main c9ad30652dbf43140bc1e8154a786adc8af073b8. Existing anchors and selected edits are in EXECUTION. Future exports are design, not landed source.

T01: infra/workloads/application-profiles.mjs (new); tools/dev-environments/src/domain/dev-environment-session.mjs::parseDevCliArgs; tools/dev-environments/src/cli/dev-tilt.mjs; tools/dev-environments/test/dev-environment-session.test.mjs

T02: tools/dev-environments/src/application/dev-slot-startup.mjs::reconcileDevSlot/reconcileOwnedDevSlot/ensureOwnedSlotImages; tools/dev-environments/src/application/dev-shared-core-readiness.mjs::verifySharedCoreReadiness; tools/dev-environments/src/rendering/dev-slot-project.mjs::projectDevSlot; tools/dev-environments/test/dev-slot-startup.test.mjs

T03: tools/dev-environments/src/rendering/dev-slot-app-graph.mjs::renderDevSlotAppGraph/assertRenderedGraph/renderTiltDeploymentDocuments/selectColdStartDocuments/validateOwnedSlotInventory; tools/dev-environments/src/application/dev-slot-startup.mjs::applyOwnedSlotWorkloads; root Tiltfile; infra/verification/source/tilt/tiltfile.test.mjs

T04: tools/dev-environments/src/application/dev-lifecycle.mjs::runDevTiltLaunch/assessDevLaunch/superviseOwnedWebPortForward/formatReadyLines; tools/dev-environments/src/application/dev-status.mjs::collectSelectedSlotReadiness/applySelectedSlotHostReadiness/printDevStatus; tools/dev-environments/test/dev-tilt.test.mjs; tools/dev-environments/test/dev-web-readiness.test.mjs

Current-source constraints: dev-slot-startup.mjs::reconcileOwnedDevSlot currently performs batched union image preparation with exact alias checks (7322b6f1,102ddc18). Thread selected aliases into that path, not historical per-role load loops. Preserve dev-startup-timing and presentation. Existing session park always scales all six, intentionally retained. All profile and values validation before allocation, use existing values allowlist and normalized content digest. No Redis/Temporal startup on reduced profile; optional cache fallback remains unchanged. Verify selected graph only, full parity and no tenant mutation on invalid inputs.
