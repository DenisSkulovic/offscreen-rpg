# INF36 execution

## T01 Extract status and observation use case

tools/dev-environments/src/cli/dev-tilt.mjs::printDevStatus/observeSelectedSlotRuntimeRoles/collectWebDevServerReadiness/readinessFromRemoteObservation/parseRemoteRuntimeObservation; tools/dev-environments/test/dev-tilt.test.mjs; tools/dev-environments/test/dev-web-readiness.test.mjs

Move status/readiness functions and their directly private helpers/constants as one cohesive module src/application/dev-status.mjs; shared process/port primitives stay domain or adapters; no import from application back to CLI. Preserve test injections and CLI behavior; re-export existing named test imports temporarily from CLI only if necessary then update tests to actual owner and remove reexports. Move buildReadyUrls/formatDevFreshnessStatusLine with status formatting; keep CLI argument/printing wiring thin. INF34 extracted collectSelectedSlotReadiness moves with it. No semantic changes, focused tests.

## T02 Extract lifecycle use case

tools/dev-environments/src/cli/dev-tilt.mjs::runDevTiltLaunch/rollbackFailedOwnedStartup/scaleDevSlotWorkloads/superviseOwnedWebPortForward/runDevStopCli; tools/dev-environments/src/domain/dev-environment-session.mjs; tools/dev-environments/test/dev-v2-cli-startup.test.mjs

Move launch/park/rollback/forward orchestration and private helpers to src/application/dev-lifecycle.mjs, export runDevTiltLaunch and parkSelectedDevEnvironment, use existing status module; extract actual command adapters into src/adapters/dev-runtime-host.mjs only if used by both status/lifecycle (kubectl/port/process), no generic abstraction. CLI owns parse/selection/reserve/attach/exit/printing, root package commands unchanged. Replace tests imports by actual new module, no compatibility wrappers for private symbols. Keep v1 compatibility isolated in selection/session adapter; no live registry conversion. Existing behavior parity via all dev tool source tests. Stop if predecessor contract changed, mechanical mapping only.
