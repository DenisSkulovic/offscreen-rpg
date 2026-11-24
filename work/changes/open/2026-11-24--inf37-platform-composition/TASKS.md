# INF37 dispatch

Sequential T-IDs. Dependency INF36 Done. Each child reads exact EXECUTION section and listed anchors, no broad discovery.

- T01: Selected platform plan. infra/environments/platform-plan.mjs::buildPlatformPlan/corePhases/runEnsurePreflight/runChartRenderPreflight/runPlatformPlan; infra/environments/platform-plan.test.mjs; infra/platform/common/render.mjs. See EXECUTION T01.
- T02: Thin infrastructure CLI. infra/environments/platform-plan.mjs; infra/clusters/kind/manager/dev-cli.mjs; infra/clusters/kind/release/up.sh; infra/platform/common/commands.mjs; package.json. See EXECUTION T02.
- T03: Enable Redis independently on dev. infra/platform/redis/chart/profiles/release.yaml; infra/platform/redis/chart/templates/_helpers.tpl; infra/platform/common/render.mjs::allowedNamespacesForService/RELEASE_ONLY_SERVICES; infra/platform/common/profile.mjs; infra/platform/redis/install.sh. See EXECUTION T03.
