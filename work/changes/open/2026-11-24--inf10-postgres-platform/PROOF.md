# INF10 | proof

Offline real Helm render/lint and fake runner only. Compare normalized full objects to tracked pre-change baseline by kind/namespace/name; preserve labels, storage, commands, secrets refs and selectors, except explicit selected deltas. Assert negative command traces: no mutation on unreadable/foreign state, no deletes or credential replacement during normal lifecycle, no schema replay. Failure after create retains owned state; next attempt reobserves. No actual secrets in snapshots.

- T01: CNPG chart; exact cases specified in EXECUTION T01; inspect infra/platform/postgres/{cluster.yaml,namespace.yaml,operator.pin}; tools/dev-environments/src/adapters/dev-cnpg-bootstrap.mjs::renderDevCnpgCluster/renderDevCnpgNamespace.
- T02: Dev ownership and readiness; exact cases specified in EXECUTION T02; inspect tools/dev-environments/src/adapters/dev-cnpg-bootstrap.mjs; dev-cnpg-host-probe.mjs; dev-cnpg-bootstrap-cli.mjs; tools/dev-environments/test/dev-cnpg-bootstrap.test.mjs.
- T03: Release lifecycle; exact cases specified in EXECUTION T03; inspect infra/platform/postgres/install.sh; infra/platform/common/cli.mjs; postgres/chart; docs/runbooks/kubernetes-postgres.md.

Run owner node --test files and named legacy tests, bash -n/node --check, changed-source formatting/quality checks, docs health. Required missing tool = NOT-RUN; failed tests = FAIL. Record actual receipt, live NOT-RUN.
