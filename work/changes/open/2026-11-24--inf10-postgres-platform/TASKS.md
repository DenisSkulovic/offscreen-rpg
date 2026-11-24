# INF10 | dispatch

Gate INF09; branch/worktree guard. Sequential bounded children; forward selected EXECUTION section and named anchors only. No live operations.

| T-ID | Read anchors | Exit proof |
| --- | --- | --- |
| T01 CNPG chart | infra/platform/postgres/{cluster.yaml,namespace.yaml,operator.pin}; tools/dev-environments/src/adapters/dev-cnpg-bootstrap.mjs::renderDevCnpgCluster/renderDevCnpgNamespace | Exact positive/negative cases in EXECUTION T01; changed paths and test receipt |
| T02 Dev ownership and readiness | tools/dev-environments/src/adapters/dev-cnpg-bootstrap.mjs; dev-cnpg-host-probe.mjs; dev-cnpg-bootstrap-cli.mjs; tools/dev-environments/test/dev-cnpg-bootstrap.test.mjs | Exact positive/negative cases in EXECUTION T02; changed paths and test receipt |
| T03 Release lifecycle | infra/platform/postgres/install.sh; infra/platform/common/cli.mjs; postgres/chart; docs/runbooks/kubernetes-postgres.md | Exact positive/negative cases in EXECUTION T03; changed paths and test receipt |

Parent closes after all required proof; no next packet automatically.
