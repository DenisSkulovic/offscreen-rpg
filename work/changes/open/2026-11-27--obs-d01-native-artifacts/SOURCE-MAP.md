# Source map

Source map at `40b44b3909f0226e075dad70fe053aba55e37a88`; refreshed comparison to `627ed819dbae86bee934700f50ee879682bc0b12` showed no executable source changes. Reopened current loadArtifacts, helmInstallArgv and the existing install argv test. Remote branch `change/observability-native-source` is an ancestor (167 commits behind, zero ahead at review); no remote OBS-D Change branch found. This is not proof of clean local worktrees. Remote code search returned no matches even for known symbols; repository-wide tracked census remains unverified. Current D01 owner scope; earlier R5 operational census retained at [immutable baseline](https://github.com/DenisSkulovic/offscreen-rpg/blob/270a3b6e323872e4735f8d5ceac4a71027433ffd/work/designs/open/observability-developer/R5-GEOGRAPHY.md). Local tracked grep/worktree collision still requires confirmation before commission.

## Runtime migration

All paths below relative to infra/platform/observability/.

| Source | Destination |
| --- | --- |
| specimens/collector.yaml | values/collector.yaml |
| specimens/prometheus.yaml | values/prometheus.yaml |
| specimens/loki.yaml | values/loki.yaml |
| specimens/tempo.yaml | values/tempo.yaml |
| specimens/grafana.yaml | values/grafana.yaml |
| specimens/pins.yaml | locks/charts.yaml |
| specimens/image-lock-candidate.tsv | locks/images.tsv |
| specimens/expected-inventory.json | expected-inventory.json |

- artifacts.mjs lines 10, 49–55, 178, 494, 501, 508, 524, 547, 570, 596: runtime constants, pin load, path plan, template and descriptor. Keep bundle profile/releases/documents/expectedInventory/imageLocks; release fields name/role/chartPath/chartVersion/sha256/helmValueArgs/expectedImage/documents; replace valuesPath with valuesPaths and add chartName/appVersion. Pin appVersion present for all five. Remove obsolete candidate comment in charts.yaml. No chart bytes or values content change except misleading comments.
- install.mjs::helmInstallArgv (244–260): replace -f / single path / spread args with shared helper; preserve context/namespace/wait/180s.
- partial-install.mjs::buildExpectedPrometheusInstallArgv/buildExpectedLokiInstallArgv already call helmInstallArgv; no edit. inventory/readiness consume documents, image/inventory fields, not values path. No new public CLI option.

## Caller and test migration

| Owner | Exact edit |
| --- | --- |
| infra/platform/observability/tests/render.test.mjs | specimensRoot split valuesRoot/locksRoot; LOCK_PATH; pins reads 167/197/218; malformed values fixture 553; final Grafana negative, helper/descriptor assertions |
| infra/platform/observability/tests/readiness.test.mjs | lock path 29–34 only |
| infra/platform/observability/tests/install.test.mjs | helm install argv test 339: assert exact contiguous helper slice including -f and all ordered flags across both profiles and every release; independent full argv snapshot in PROOF |
| infra/verification/smoke/observability/tests/proof.test.mjs | mocks 166/177: singleton valuesPaths in new paths; add chartName/appVersion with existing exact Prometheus/Loki pins |
| scripts/repo-tools/check-lab-manifests.mjs | five NATIVE_OBSERVABILITY_VALUES_PATHS entries at 72–76; no dev overlay yet |
| scripts/repo-tools/check-lab-manifests.test.mjs | line 109 pins path becomes locks/charts.yaml; values exclusions unchanged in meaning |
| scripts/repo-tools/infra-layout.test.mjs | native observability replacement test 932–964: replace three old input paths, add five values positives and eight old negatives; retain retired chart and legacy path assertions |
| infra/platform/observability/vendor/README.md | lock link ../locks/charts.yaml |
| infra/README.md | line 46 replace frozen specimens and old runtime folder list; no live claim |
| docs/technical/platform/observability-native-infrastructure.md | artifact ownership: record normalized source realization only, overlay remains selected target, no broader rewrite |

T01 owns first three platform tests and artifacts/install/moves; T02 owns remaining callers/docs. No other writes without planner correction. Historical work, evidence and prior design references are not operational paths; do not perform global rename. No unrelated chart changes.
