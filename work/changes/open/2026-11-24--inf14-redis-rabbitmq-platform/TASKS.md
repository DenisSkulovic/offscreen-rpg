# INF14 | dispatch

Gate INF09; branch/worktree guard. Sequential bounded children; forward selected EXECUTION section and named anchors only. No live operations.

| T-ID | Read anchors | Exit proof |
| --- | --- | --- |
| T01 Redis optional chart and smoke fence | infra/platform/redis/redis.yaml; infra/verification/smoke/redis/{client.yaml,smoke.sh}; docs/runbooks/kubernetes-redis.md | Exact positive/negative cases in EXECUTION T01; changed paths and test receipt |
| T02 RabbitMQ lifecycle | infra/platform/rabbitmq/{broker.yaml,namespace.yaml,definitions.json,install.sh,vendor/}; infra/verification/smoke/rabbitmq/smoke.sh | Exact positive/negative cases in EXECUTION T02; changed paths and test receipt |
| T03 Optional boundary and proof | infra/platform/{redis,rabbitmq}; docs/runbooks/kubernetes-{redis,rabbitmq}.md | Exact positive/negative cases in EXECUTION T03; changed paths and test receipt |

Parent closes after all required proof; no next packet automatically.
