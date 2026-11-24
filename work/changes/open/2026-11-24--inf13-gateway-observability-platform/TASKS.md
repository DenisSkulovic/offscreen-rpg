# INF13 | dispatch

Gate INF09; branch/worktree guard. Sequential bounded children; forward selected EXECUTION section and named anchors only. No live operations.

| T-ID | Read anchors | Exit proof |
| --- | --- | --- |
| T01 Gateway fixture split | infra/platform/gateway/{install.sh,routes.yaml,values.yaml}; infra/verification/smoke/gateway/{backends.yaml,smoke.sh} | Exact positive/negative cases in EXECUTION T01; changed paths and test receipt |
| T02 Collector chart and fixture split | infra/platform/observability/{collector.yaml,collector-config.yaml,install.sh}; infra/verification/smoke/observability/{hops.yaml,hop.py,smoke.sh} | Exact positive/negative cases in EXECUTION T02; changed paths and test receipt |
| T03 Boundary proof | gateway/install.sh; observability/install.sh; verification/smoke/{gateway,observability}/setup.sh | Exact positive/negative cases in EXECUTION T03; changed paths and test receipt |

Parent closes after all required proof; no next packet automatically.
