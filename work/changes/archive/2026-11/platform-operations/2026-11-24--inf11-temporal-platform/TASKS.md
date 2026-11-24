# INF11 | dispatch

Gate INF09; branch/worktree guard. Sequential bounded children; forward selected EXECUTION section and named anchors only. No live operations.

| T-ID | Read anchors | Exit proof |
| --- | --- | --- |
| T01 Temporal chart | infra/platform/temporal/{postgres.yaml,server.yaml,schema-job.yaml,admin.yaml,namespace-job.yaml,namespace.yaml,images.pin}; tools/dev-environments/src/adapters/dev-temporal-bootstrap.mjs::renderDevTemporal | Exact positive/negative cases in EXECUTION T01; changed paths and test receipt |
| T02 Create-once state machine | dev-temporal-bootstrap.mjs::assessDevTemporal/ensureDevTemporal/executeAuthorizedDevTemporal; dev-temporal-host-probe.mjs; infra/platform/temporal/install.sh | Exact positive/negative cases in EXECUTION T02; changed paths and test receipt |
| T03 Lifecycle consumers | dev-temporal-bootstrap.mjs; dev-temporal-host-probe.mjs; dev-temporal-bootstrap-cli.mjs; infra/platform/temporal/install.sh; tools/dev-environments/test/dev-temporal-bootstrap.test.mjs | Exact positive/negative cases in EXECUTION T03; changed paths and test receipt |

Parent closes after all required proof; no next packet automatically.
