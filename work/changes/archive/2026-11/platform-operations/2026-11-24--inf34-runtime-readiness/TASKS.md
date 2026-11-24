# INF34 route

- T01 Fail if old runtime does not exit — tools/dev-environments/runtime/compile-watch.mjs::stopChildBounded/enqueueSuccessTransition/dispose; tools/dev-environments/test/dev-compile-watch.test.mjs. Exact edits and negative proof in EXECUTION.md section T01.
- T02 One readiness observation — tools/dev-environments/src/cli/dev-tilt.mjs::collectOwnedWorkloadReadiness/observeSelectedSlotRuntimeRoles/collectWebDevServerReadiness/printDevStatus/runDevTiltLaunch; tools/dev-environments/test/dev-tilt.test.mjs; tools/dev-environments/test/dev-web-readiness.test.mjs. Exact edits and negative proof in EXECUTION.md section T02.

Sequential tasks; dependency INF30, INF31.
