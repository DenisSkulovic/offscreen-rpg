# INF30 route

- T01 One slot operation lock — tools/dev-environments/src/cli/dev-tilt.mjs::runDevTiltLaunch/runDevStopCli; tools/dev-environments/src/domain/dev-environment-session.mjs; tools/dev-environments/src/domain/dev-worktree-registry.mjs::withRegistryLock. Exact edits and negative proof in EXECUTION.md section T01.
- T02 Unified cleanup for startup and exit — tools/dev-environments/src/cli/dev-tilt.mjs::runDevTiltLaunch/rollbackFailedOwnedStartup/rollbackPostReconcileOwnedStartup/runDevStopCli; tools/dev-environments/src/domain/dev-environment-session.mjs::parkSelectedEnvironment; tools/dev-environments/src/application/dev-slot-startup.mjs::reconcileDevSlot. Exact edits and negative proof in EXECUTION.md section T02.
- T03 Keep operator interface small — tools/dev-environments/src/cli/dev-tilt.mjs::formatReadyLines/formatDevFreshnessStatusLine; docs/runbooks/dev-worktree-stacks.md; tools/dev-environments/test/dev-v2-cli-startup.test.mjs. Exact edits and negative proof in EXECUTION.md section T03.

Sequential tasks; dependency INF23, INF35.
