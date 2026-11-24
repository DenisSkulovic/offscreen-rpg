# INF13 | proof

Offline real Helm render/lint and fake runner only. Compare normalized full objects to tracked pre-change baseline by kind/namespace/name; preserve labels, storage, commands, secrets refs and selectors, except explicit selected deltas. Assert negative command traces: no mutation on unreadable/foreign state, no deletes or credential replacement during normal lifecycle, no schema replay. Failure after create retains owned state; next attempt reobserves. No actual secrets in snapshots.

- T01: Gateway fixture split; exact cases specified in EXECUTION T01; inspect infra/platform/gateway/{install.sh,routes.yaml,values.yaml}; infra/verification/smoke/gateway/{backends.yaml,smoke.sh}.
- T02: Collector chart and fixture split; exact cases specified in EXECUTION T02; inspect infra/platform/observability/{collector.yaml,collector-config.yaml,install.sh}; infra/verification/smoke/observability/{hops.yaml,hop.py,smoke.sh}.
- T03: Boundary proof; exact cases specified in EXECUTION T03; inspect gateway/install.sh; observability/install.sh; verification/smoke/{gateway,observability}/setup.sh.

Run owner node --test files and named legacy tests, bash -n/node --check, changed-source formatting/quality checks, docs health. Required missing tool = NOT-RUN; failed tests = FAIL. Record actual receipt, live NOT-RUN.
