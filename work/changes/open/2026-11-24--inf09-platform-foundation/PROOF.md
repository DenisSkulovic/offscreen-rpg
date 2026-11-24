# INF09 | proof

Offline real Helm render/lint and fake runner only. Compare normalized full objects to tracked pre-change baseline by kind/namespace/name; preserve labels, storage, commands, secrets refs and selectors, except explicit selected deltas. Assert negative command traces: no mutation on unreadable/foreign state, no deletes or credential replacement during normal lifecycle, no schema replay. Failure after create retains owned state; next attempt reobserves. No actual secrets in snapshots.

- T01: Profile and observation; exact cases specified in EXECUTION T01; inspect infra/clusters/kind/manager/config.mjs; infra/clusters/kind/manager/dev-host-probe.mjs; EXECUTION common contract.
- T02: Pins and local render; exact cases specified in EXECUTION T02; inspect infra/platform/postgres/operator.pin; infra/platform/temporal/images.pin; infra/workloads/render.mjs.
- T03: Validation integration; exact cases specified in EXECUTION T03; inspect scripts/repo-tools/check-lab-manifests.mjs; scripts/repo-tools/check-lab-manifests.test.mjs; .github/workflows/code.yml; .prettierignore.

Run owner node --test files and named legacy tests, bash -n/node --check, changed-source formatting/quality checks, docs health. Required missing tool = NOT-RUN; failed tests = FAIL. Record actual receipt, live NOT-RUN.
