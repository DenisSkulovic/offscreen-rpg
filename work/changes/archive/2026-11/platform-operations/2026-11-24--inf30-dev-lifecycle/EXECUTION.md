# INF30 execution

## T01 One slot operation lock

tools/dev-environments/src/cli/dev-tilt.mjs::runDevTiltLaunch/runDevStopCli; tools/dev-environments/src/domain/dev-environment-session.mjs; tools/dev-environments/src/domain/dev-worktree-registry.mjs::withRegistryLock

Reuse INF23 kernel flock helper for per-slot lock under registryRoot/operations/dev-N.lock, separate from short global registry lock. Hold during admission, reconcile, spawn and initial readiness, release only when running session atomically published or rollback finished. dev:stop takes same lock before parking, refuses busy with clear retry message (no waiting 15min); normal running foreground launcher does not hold operation lock. Keep existing PID+ticks fence. All paths release fd finally including injected errors. Refuse duplicate launch under lock after rereading session; v1 launch uses same resolved slot lock, do not retire v1 here. Test two processes same slot only one reconcile, different slots independently admitted, lock released on failure. No new daemon.

## T02 Unified cleanup for startup and exit

tools/dev-environments/src/cli/dev-tilt.mjs::runDevTiltLaunch/rollbackFailedOwnedStartup/rollbackPostReconcileOwnedStartup/runDevStopCli; tools/dev-environments/src/domain/dev-environment-session.mjs::parkSelectedEnvironment; tools/dev-environments/src/application/dev-slot-startup.mjs::reconcileDevSlot

Use one owned park operation for explicit stop, startup failure after workloadsTouched, SIGINT/SIGTERM and unexpected Tilt exit. Install signal handlers before reconcile, record cancellation, check after each awaited phase and before spawning; no further mutation after cancellation, finish current bounded call then park if touched. Session tracks launcher-owned children using existing PID+ticks; stop Tilt and forward before scaling, verify zero replicas/ports via existing park predicate; failure explicit, retain recoverable session, never say parked if unknown. For no session yet but touched, pass selected owner and ephemeral child handles to existing rollback helper; no tenant cleanup. Serialize cleanup once via promise/idempotent guard; explicit stop holds operation lock, launcher exit callback seeing stop-in-progress must not independently scale; after running release lock, cleanup acquires it or observes stop owner completion. Do not process.exit before cleanup settled. Test reconcile partial failure, SIGINT during start, normal stop, duplicate exit callback, failed scale, foreign PID unchanged. node --test tools/dev-environments/test/dev-tilt.test.mjs tools/dev-environments/test/dev-v2-cli-startup.test.mjs tools/dev-environments/test/dev-environment-session.test.mjs.

## T03 Keep operator interface small

tools/dev-environments/src/cli/dev-tilt.mjs::formatReadyLines/formatDevFreshnessStatusLine; docs/runbooks/dev-worktree-stacks.md; tools/dev-environments/test/dev-v2-cli-startup.test.mjs

Preserve pnpm dev/dev:new/dev:reserve/dev:attach/dev:status/dev:stop and --instance. Print selected slot, failing phase and next action (busy retry, stop, missing platform) once. No new commands, profile activation or auto-retry loops. Mark source-only, historical live proof unchanged.
