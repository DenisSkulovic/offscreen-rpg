# INF14 | proof

Offline real Helm render/lint and fake runner only. Compare normalized full objects to tracked pre-change baseline by kind/namespace/name; preserve labels, storage, commands, secrets refs and selectors, except explicit selected deltas. Assert negative command traces: no mutation on unreadable/foreign state, no deletes or credential replacement during normal lifecycle, no schema replay. Failure after create retains owned state; next attempt reobserves. No actual secrets in snapshots.

- T01: Redis optional chart and smoke fence; exact cases specified in EXECUTION T01; inspect infra/platform/redis/redis.yaml; infra/verification/smoke/redis/{client.yaml,smoke.sh}; docs/runbooks/kubernetes-redis.md.
- T02: RabbitMQ lifecycle; exact cases specified in EXECUTION T02; inspect infra/platform/rabbitmq/{broker.yaml,namespace.yaml,definitions.json,install.sh,vendor/}; infra/verification/smoke/rabbitmq/smoke.sh.
- T03: Optional boundary and proof; exact cases specified in EXECUTION T03; inspect infra/platform/{redis,rabbitmq}; docs/runbooks/kubernetes-{redis,rabbitmq}.md.

Run owner node --test files and named legacy tests, bash -n/node --check, changed-source formatting/quality checks, docs health. Required missing tool = NOT-RUN; failed tests = FAIL. Record actual receipt, live NOT-RUN.
