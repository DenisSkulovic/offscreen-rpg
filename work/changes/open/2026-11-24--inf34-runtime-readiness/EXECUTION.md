# INF34 execution

## T01 Fail if old runtime does not exit

tools/dev-environments/runtime/compile-watch.mjs::stopChildBounded/enqueueSuccessTransition/dispose; tools/dev-environments/test/dev-compile-watch.test.mjs

Second timeout must reject, never spawn replacement if old exit unconfirmed. Catch transition queue failure once, invalidate desired/loaded receipts, stop compiler/runtime bounded via allSettled, signal nonzero supervisor exit; ensure no unhandled rejection and no success receipt. Compiler exit and signal disposal share same path. Existing child kill only own spawned process, no new OS PID discovery. Test fake child ignores TERM/KILL, no new runtime, no ready receipt, nonzero; successful TERM and KILL paths. node --test tools/dev-environments/test/dev-compile-watch.test.mjs.

## T02 One readiness observation

tools/dev-environments/src/cli/dev-tilt.mjs::collectOwnedWorkloadReadiness/observeSelectedSlotRuntimeRoles/collectWebDevServerReadiness/printDevStatus/runDevTiltLaunch; tools/dev-environments/test/dev-tilt.test.mjs; tools/dev-environments/test/dev-web-readiness.test.mjs

Extract collectSelectedSlotReadiness from actual status observation path: six expected role readiness + image + remote v2 generation per compiled role + web HTTP in-pod; reuse same result for startup readiness and status, no host cached receipt. Start forward once web Pod ready, announce URLs only after verified own forward and HTTP on host (not arbitrary occupied port), avoid startup deadlock by distinguishing pre-forward pod readiness from final host check. Use INF31 node identity mapping for image evidence. Keep bounded existing startup window and low memory backoff; probe once per poll, avoid duplicated status calls. Test stale generation despite K8s Ready, wrong image, host forward unavailable, compile failure/recovery and all six roles. node --test tools/dev-environments/test/dev-tilt.test.mjs tools/dev-environments/test/dev-web-readiness.test.mjs tools/dev-environments/test/dev-v2-cli-startup.test.mjs.
