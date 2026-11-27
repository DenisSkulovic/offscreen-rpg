# OBS-D01 tasks — owner-released offline source only

**Dispatch authority:** [CHANGE](CHANGE.md) and [joint offline release](../../../../designs/open/observability-developer/ACCEPTANCE.md) govern. Owner-released implementation, not independent READY or live permission. Verify predecessor receipt and branch/worktree, then execute the serial tasks. Do not wait for another approval; stop only for concrete contradiction, ownership conflict or required cheap proof failure. No real cluster or Docker commands. No main merge or Done.


Parent: run [before snapshot](PROOF.md#render-parity) before edits; serial cards on dedicated worktree, no live operations. Verify T01/T02 together before commit; children do not commit. Exact scope in [SOURCE-MAP](SOURCE-MAP.md). Receipt: task/base, changed paths, commands/results, negative evidence, contradiction or none. No broader source discovery or new behavior.

## T01 | Move maintained inputs and unify descriptor

Anchors: [move and runtime map](SOURCE-MAP.md#runtime-migration); `infra/platform/observability/artifacts.mjs::loadArtifacts, OBSERVABILITY_RELEASE_ORDER`; `infra/platform/observability/install.mjs::helmInstallArgv`; `infra/platform/observability/tests/render.test.mjs`.

Execute eight exact moves. Rename specFile to valuesFile, use valuesRoot/locksRoot, singleton valuesPaths arrays, add chartName/appVersion, preserve chartVersion/hash/image/documents. Require nonempty string pin name/version/appVersion/hash; retain existing archive and image checks. Validate each values document before rendering (all five plans first). Export helmValuesArgv(release) returning ordered `valuesPaths.flatMap(path => ['-f', path]).concat(helmValueArgs)`; both template and install use it, preserve other args. Update stale comments that call maintained inputs candidates, not semantic values. No overlay or variant. Migrate direct platform render/readiness/install tests using exact map, strengthen final input negative coverage and argv test per PROOF. Run from root `node --test --test-concurrency=1 infra/platform/observability/tests/{render,readiness,install}.test.mjs`. Stop on render/hash or fixture contradiction; report known remaining T02 consumer tests, do not disable them.

## T02 | Reconcile maintained callers and prove parity

Prerequisite: T01 exact descriptor and focused tests. Anchors: [caller map](SOURCE-MAP.md#caller-and-test-migration); `scripts/repo-tools/check-lab-manifests.mjs::NATIVE_OBSERVABILITY_VALUES_PATHS`; `scripts/repo-tools/infra-layout.test.mjs` native observability replacement test; `infra/verification/smoke/observability/tests/proof.test.mjs` descriptor mocks; [PROOF](PROOF.md).

Update only enumerated paths, fixture descriptor fields, raw scan exclusions, layout assertions, vendor/infra README and canonical realization wording. Do not change historical references. Confirm all eight retired paths absent and no remaining operational old descriptor readers. Run T02 focused suites and parent parity in PROOF, including full baseline/after installer argv for every release in both profiles, then combined focused checks. Stop on unexpected operational reference, nonidentical render or missing test. No changes to proof behavior or partial-install wrapper: it already delegates helmInstallArgv. Parent checks diff, receipt and closure; no merge until authorized.
