# INF12 | proof

Offline real Helm render/lint and fake runner only. Compare normalized full objects to tracked pre-change baseline by kind/namespace/name; preserve labels, storage, commands, secrets refs and selectors, except explicit selected deltas. Assert negative command traces: no mutation on unreadable/foreign state, no deletes or credential replacement during normal lifecycle, no schema replay. Failure after create retains owned state; next attempt reobserves. No actual secrets in snapshots.

- T01: SeaweedFS chart; exact cases specified in EXECUTION T01; inspect infra/platform/object-storage/store.yaml; tools/dev-environments/src/adapters/dev-object-store-bootstrap.mjs::renderDevObjectStore; dev-object-store-bootstrap.test.mjs.
- T02: Guarded installer; exact cases specified in EXECUTION T02; inspect dev-object-store-bootstrap.mjs; dev-object-store-host-probe.mjs; dev-object-store-bootstrap-cli.mjs; infra/verification/smoke/object-storage/smoke.sh.
- T03: Verification and content bootstrap split; exact cases specified in EXECUTION T03; inspect infra/verification/smoke/object-storage/smoke.sh; infra/environments/release/content-bootstrap/smoke.sh; docs/runbooks/kubernetes-object-storage.md; docs/runbooks/kubernetes-content-bootstrap.md.

Run owner node --test files and named legacy tests, bash -n/node --check, changed-source formatting/quality checks, docs health. Required missing tool = NOT-RUN; failed tests = FAIL. Record actual receipt, live NOT-RUN.
