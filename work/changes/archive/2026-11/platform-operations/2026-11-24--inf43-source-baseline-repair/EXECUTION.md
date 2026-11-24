# INF43 execution

## T01 Repair retired imports

Anchors: tools/dev-environments/test/dev-fu03-startup.test.mjs; tools/dev-environments/test/dev-slot-operation-lock.test.mjs; tools/dev-environments/src/application/dev-lifecycle.mjs::runDevTiltLaunch.

Change only the retired import of runDevTiltLaunch to ../src/application/dev-lifecycle.mjs; keep other CLI exports at their true owner. No re-export from dev-tilt. Execute node --test tools/dev-environments/test/dev-fu03-startup.test.mjs tools/dev-environments/test/dev-slot-operation-lock.test.mjs. Restore actual same-slot lock contention proof; do not skip suites.

## T02 Update fake image fixtures without weakening INF31

Anchors: tools/dev-environments/test/dev-slot-startup.test.mjs lines 278–453; infra/images/development/tests/load-dev-slot-image.test.mjs; infra/images/development/load-dev-slot-image.sh; infra/images/development/build.sh.

In the two failing tests, compute fingerprint using fingerprintDevImageContext(repoRoot,{roleFilter:UNION_ROLE_FILTER}) or existing same-context helper from load-dev-slot-image.test; assert ok and use full fingerprint for hint and first 16 chars for union tag. Prefer disposable fixture checkout following existing loader tests; do not edit actual checkout while tests run. Fake node handles loader `inspect dev REF NODE` separately from load; return valid configId/manifestDigest/targetDigest with distinct digests and consistent canonical/alias targets, exact node map for load. Fake docker inspect returns absent for first cache miss and build failure; fake build records actual fingerprint from --label argument rather than arbitrary environment, honors temp tag+publish. Preserve existing assertions for build exit7 redaction, control exit8, worker exit9, two independent slot loads exactly one build and second cache hit. Remove old `@offscreen/game-authority` compatibility argument in fixture; use explicit offscreen-dev or default. Isolate TMPDIR and fake commands from real Docker/Kind. Run node --test tools/dev-environments/test/dev-slot-startup.test.mjs infra/images/development/tests/load-dev-slot-image.test.mjs; production loader stale-hint and mid-build-drift negatives must remain. No change to image production logic.

## T03 Remove actual listener leak and join full source suite

Anchors: tools/dev-environments/src/application/dev-lifecycle.mjs::runDevTiltLaunch (SIGINT/SIGTERM registration around 1234–1245, finally); tools/dev-environments/test/dev-tilt.test.mjs; tools/dev-environments/test/dev-v2-cli-startup.test.mjs.

Use named signal handlers and exact removeListener for terminal paths, including early test-return paths exitAfterSession/exitAfterReady and refusal, while leaving handlers installed for active foreground launcher until cleanup/child exit. Do not use removeAllListeners, setMaxListeners or suppress warnings. Add repeated injected launch/refusal test records listenerCount before/after; if warning only caused by test fake holding active lifecycle, ensure fixture explicitly settles child/cleanup. Run four catalog source commands (PROOF). No broad live fix or new runtime features. If actual live INF29 agent reports a different failure, report separately; no concurrent edits to live proof worktree.
