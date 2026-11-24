# INF25 dispatch

Sequential T-IDs; first T01. Dependency: INF18 Done. One child at a time.

- T01: Release credential fence. Read infra/environments/release/install.sh embedded Python; infra/platform/common/commands.mjs; infra/images/release/test/overlay-guard.test.mjs. Exact implementation and proof in [EXECUTION](EXECUTION.md#t01-release-credential-fence).
- T02: Release migration execution identity. Read infra/environments/release/install.sh; infra/workloads/chart/templates/_helpers.tpl::migration Job; infra/images/distribution/kind-image-loader.mjs; scripts/repo-tools/stack-lifecycle.mjs. Exact implementation and proof in [EXECUTION](EXECUTION.md#t02-release-migration-execution-identity).
- T03: Correct rollout selection without mutable-tag ambiguity. Read infra/environments/release/install.sh; infra/workloads/render.mjs; infra/images/release/images.pin; scripts/repo-tools/stack.mjs. Exact implementation and proof in [EXECUTION](EXECUTION.md#t03-correct-rollout-selection-without-mutabletag-ambiguity).
