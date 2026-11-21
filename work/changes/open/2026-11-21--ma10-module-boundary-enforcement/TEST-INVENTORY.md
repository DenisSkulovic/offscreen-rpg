# MA10 | verified 112-file relocation ledger

Source: MA08-integrated ZIP `6dd1276131a813f694ec3bccf4f9062ad3708208`. Every listed basename exists under `packages/application/test/` in source. Relocate exactly once to `tools/api-integration/legacy-engine-tests/`, preserving basename. This document fixes inventory and execution-classification, not behavior; source-specific non-dist import exceptions are in SOURCE-MAP. **Do not drop tests or indiscriminately execute the 36 integration/live files.**

## unit (76)

- `adaptive-recipe.test.mjs`
- `admin-compat.test.mjs`
- `branch-pinned-memory.test.mjs`
- `canonical-knowledge-root-pin.test.mjs`
- `chamber-lab-catalog.test.mjs`
- `connected-rig.test.mjs`
- `delegated-decision.test.mjs`
- `document-store-capability-guard.test.mjs`
- `eng03-c1r-provisional-recovery.test.mjs`
- `eng03-context-capture.test.mjs`
- `fixture-specimens.test.mjs`
- `gm01-custom-intent-matcher.test.mjs`
- `gm07-delegated-admission.test.mjs`
- `gm07-delegated-expiry.test.mjs`
- `gm07-delegated-offer-capture.test.mjs`
- `gm07-delegated-worker-path.test.mjs`
- `gm07-delegation-policy.test.mjs`
- `historical-fork-v2.test.mjs`
- `historical-fork.test.mjs`
- `item-transfer-transition.test.mjs`
- `lab-clock.test.mjs`
- `lab-evidence.test.mjs`
- `lab-faults.test.mjs`
- `lab-observation.test.mjs`
- `lab-run.test.mjs`
- `lab-workbench-service.test.mjs`
- `lexical-story-index-cache.test.mjs`
- `library-navigation-v2.test.mjs`
- `library-navigation.test.mjs`
- `library-read-v2.test.mjs`
- `library-v2-admit.test.mjs`
- `library-v2-fork.test.mjs`
- `live-comparison.test.mjs`
- `live-evaluation.test.mjs`
- `long-story-memory-evaluation.test.mjs`
- `ma05a-storyteller-kinds.test.mjs`
- `ma05b-outbox-compat.test.mjs`
- `ma05d-wake-parity.test.mjs`
- `ma05e-continuity-compat.test.mjs`
- `ma05f-authority-entry-identity.test.mjs`
- `ma05g-authority-identity.test.mjs`
- `ma06a-story-engine-compatibility.test.mjs`
- `mechanics-coverage.test.mjs`
- `memory-provider-runtime.test.mjs`
- `obs00-b-current-authority-contract.test.mjs`
- `obs00-b-fail-closed-authority.test.mjs`
- `obs00-dispatch-forward.test.mjs`
- `obs03-prompt-provenance.test.mjs`
- `packet-lab.test.mjs`
- `playability-harness.test.mjs`
- `qa-lab-bridge.test.mjs`
- `replay-compare.test.mjs`
- `resolution-receipt.test.mjs`
- `sa03-context-efficiency.test.mjs`
- `sa07-alias-disambiguation.test.mjs`
- `sandbox-materializer.test.mjs`
- `saved-repair-plan.test.mjs`
- `saved-response-inspection.test.mjs`
- `saved-response-settlement.test.mjs`
- `scene-appearance.test.mjs`
- `scene-checkpoint-publication.test.mjs`
- `scene-checkpoint.test.mjs`
- `story-publication-documents.test.mjs`
- `story02-task-claim.test.mjs`
- `story03-generation-adoption.test.mjs`
- `story03-notice-selector.test.mjs`
- `story03-notice-topic-freeze.test.mjs`
- `story03-stale-saved-publish.test.mjs`
- `storyteller-control.test.mjs`
- `storyteller-loop-lifecycle.test.mjs`
- `storyteller-public-resolution-reason.test.mjs`
- `storyteller-runtime-blocked.test.mjs`
- `v2-active-fork.test.mjs`
- `world-obligation-transition.test.mjs`
- `wr04-writer-research.test.mjs`
- `wr07b-launch-source.test.mjs`

## integration (14)

- `obs00-b-current-authority-loader.integration.test.mjs`
- `obs00-b-dispatch-authority.integration.test.mjs`
- `p3b-writer-provider-custody.integration.test.mjs`
- `saved-repair-apply.integration.test.mjs`
- `saved-repair-plan.integration.test.mjs`
- `wr03-writer-library-tools.integration.test.mjs`
- `wr03-writer-loop.integration.test.mjs`
- `wr03-writer-mission-custody.integration.test.mjs`
- `wr03-writer-mission.migration.integration.test.mjs`
- `wr03-writer-proposal.integration.test.mjs`
- `wr03-writer-workdesk.integration.test.mjs`
- `wr07b-joined-play.integration.test.mjs`
- `wr07b-launch-admission.integration.test.mjs`
- `wr07b-launch-publication.integration.test.mjs`

## live (22)

- `connected-rig.live.test.mjs`
- `eng01-item-transfer.live.test.mjs`
- `eng03-c1-committed-capture.live.test.mjs`
- `eng03-c1r-provisional-recovery.live.test.mjs`
- `eng03-c2-interrupted-capture.live.test.mjs`
- `eng03-lock-measurement.live.test.mjs`
- `eng03-narrow-capture.live.test.mjs`
- `eng03-resolution-lock-measurement.live.test.mjs`
- `eng03-t04-campaign-consequence-capture.live.test.mjs`
- `eng03-t05-historical-report-capture.live.test.mjs`
- `eng04-bounded-activity-reads.live.test.mjs`
- `gm01-custom-intent.live.test.mjs`
- `gm02-custom-intent-accept.live.test.mjs`
- `gm03-quiet-repeat.live.test.mjs`
- `gm05-public-events.live.test.mjs`
- `gm06-visit-checkpoint.live.test.mjs`
- `obs01-operation-coverage.live.test.mjs`
- `obs02-execution-stages.live.test.mjs`
- `obs02-h-stage-integrity.live.test.mjs`
- `obs03-prompt-provenance.live.test.mjs`
- `pw01-appearance-projection.live.test.mjs`
- `sandbox-postgres.live.test.mjs`


## Final execution-mode correction: 76 filenames are NOT 76 safe unit tests

Static source examination found **16 filename-unit tests that actually call `createDatabase` and `provisionDisposableSandboxDatabase`**, with destructive sandbox provisioning guarded inside the test. They must **not** run on the default test command. Their exact names: `gm07-delegated-admission.test.mjs`, `gm07-delegated-expiry.test.mjs`, `gm07-delegated-offer-capture.test.mjs`, `gm07-delegated-worker-path.test.mjs`, `gm07-delegation-policy.test.mjs`, `historical-fork-v2.test.mjs`, `historical-fork.test.mjs`, `library-v2-admit.test.mjs`, `library-v2-fork.test.mjs`, `scene-checkpoint-publication.test.mjs`, `scene-checkpoint.test.mjs`, `story03-generation-adoption.test.mjs`, `story03-notice-topic-freeze.test.mjs`, `story03-stale-saved-publish.test.mjs`, `v2-active-fork.test.mjs`, `wr04-writer-research.test.mjs`.

**Final selection rule** for the runner `run-legacy-engine-tests.mjs`:
- `--mode=pure` (**default**, and `test:legacy-engine:pure`): **60 files**. Filename ends `.test.mjs`, excludes the 16 static SQL test names, and excludes `.integration.test.mjs` and `.live.test.mjs`. Safe local tests only.
- `--mode=disposable`: **16** named SQL-provisioning `.test.mjs` cases, requires an explicit operator-controlled disposable/local environment; preserve the existing `confirmDisposableProvision:true` guards inside tests; do **not** run as routine default.
- `--mode=integration`: **14** `.integration.test.mjs`; explicit local disposable credentials/capabilities or existing test-level guarded provisioning.
- `--mode=live`: **22** `.live.test.mjs`; explicit named sandbox/DB, not automatic.
Therefore **60 + 16 + 14 + 22 = 112**. Package scripts should be `test:legacy-engine:pure`, `test:legacy-engine:disposable`, `test:legacy-engine:integration`, `test:legacy-engine:live`; `test:legacy-engine:unit` if retained must alias **pure 60 only** (never 76).
- The runner uses a **frozen explicit set** of these sixteen SQL basenames. It must verify every supplied file exists, calculate all four disjoint sets, and reject a total other than 112. Do not infer "pure" solely from suffix or use a broad wildcard shell invocation. For other three modes require a separate explicit allow-run option/environment validated as local disposable **before spawning**; individual tests retain their own authorizations. Do not give the runner default `DATABASE_TEST_URL`.
- `story03-notice-topic-freeze.test.mjs` builds `srcRoot=join(here,'..','src')` from old package location. After relocation it would point to `tools/api-integration/src`, not Story Engine. Replace **only that source-root assignment** with `resolve(here,'../../../packages/story-engine/src')` and preserve its frozen-topic negative assertions.

**Falsifiable default negative:** with no SQL env present, `pnpm --filter @offscreen/api-integration test:legacy-engine:pure` selects exactly **60** basenames and never imports a test that provisions Postgres. Attempt `--mode=disposable` without explicit safe environment must refuse before loading a test. This mode correction supersedes any earlier packet section implying all 76 filename-unit tests are automatic.

## Accounting

After `git mv`, compare actual sorted source/destination filenames with this ledger, verify `76 + 14 + 22 = 112`, and record every nonexact rename or replaced compatibility-only test case explicitly. An absent source filename or duplicate destination blocks retirement.
