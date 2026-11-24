# INF20 dispatch

Sequential T-IDs; first T01. Dependency: INF18 Done. One child at a time.

- T01: Read-only launch admission. Read tools/dev-environments/src/cli/dev-tilt.mjs::runDevTiltLaunch; tools/dev-environments/test/dev-tilt.test.mjs; scripts/repo-tools/stack-preflight.mjs. Exact implementation and proof in [EXECUTION](EXECUTION.md#t01-readonly-launch-admission).
- T02: Separate observation from build. Read tools/dev-environments/src/application/dev-slot-startup.mjs::reconcileDevSlot/reconcileOwnedDevSlot; tools/dev-environments/test/dev-slot-startup.test.mjs; tools/dev-environments/src/domain/dev-host-output-guard.mjs. Exact implementation and proof in [EXECUTION](EXECUTION.md#t02-separate-observation-from-build).
- T03: Failure and rollback coverage. Read tools/dev-environments/src/cli/dev-tilt.mjs::runDevTiltLaunch/rollbackFailedOwnedStartup; tools/dev-environments/test/dev-tilt.test.mjs; tools/dev-environments/test/dev-v2-cli-startup.test.mjs. Exact implementation and proof in [EXECUTION](EXECUTION.md#t03-failure-and-rollback-coverage).
