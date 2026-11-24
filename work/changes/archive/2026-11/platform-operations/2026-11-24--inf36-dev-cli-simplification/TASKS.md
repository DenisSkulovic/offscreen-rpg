# INF36 route

- T01 Extract status and observation use case — tools/dev-environments/src/cli/dev-tilt.mjs::printDevStatus/observeSelectedSlotRuntimeRoles/collectWebDevServerReadiness/readinessFromRemoteObservation/parseRemoteRuntimeObservation; tools/dev-environments/test/dev-tilt.test.mjs; tools/dev-environments/test/dev-web-readiness.test.mjs. Exact edits and negative proof in EXECUTION.md section T01.
- T02 Extract lifecycle use case — tools/dev-environments/src/cli/dev-tilt.mjs::runDevTiltLaunch/rollbackFailedOwnedStartup/scaleDevSlotWorkloads/superviseOwnedWebPortForward/runDevStopCli; tools/dev-environments/src/domain/dev-environment-session.mjs; tools/dev-environments/test/dev-v2-cli-startup.test.mjs. Exact edits and negative proof in EXECUTION.md section T02.

Sequential tasks; dependency INF30, INF34.
