# INF39 dispatch

Sequential T-IDs. Dependency INF36 Done. Each child reads exact EXECUTION section and listed anchors, no broad discovery.

- T01: Per-role replicas without new config language. infra/workloads/chart/values.yaml; infra/workloads/chart/values.schema.json; infra/workloads/chart/templates/_helpers.tpl; infra/workloads/tests/workload-chart.test.mjs. See EXECUTION T01.
- T02: Helm values file with constrained effects. infra/workloads/render.mjs::renderWorkloadDocuments/runReleaseCli; infra/workloads/tests/render.test.mjs; infra/workloads/profiles/{development,release}.yaml. See EXECUTION T02.
- T03: Measured preset target and example. infra/workloads/profiles; docs/runbooks/local-development-platform.md; infra/workloads/tests/workload-chart.test.mjs. See EXECUTION T03.
