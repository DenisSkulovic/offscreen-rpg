# INF11 | proof

Offline real Helm render/lint and fake runner only. Compare normalized full objects to tracked pre-change baseline by kind/namespace/name; preserve labels, storage, commands, secrets refs and selectors, except explicit selected deltas. Assert negative command traces: no mutation on unreadable/foreign state, no deletes or credential replacement during normal lifecycle, no schema replay. Failure after create retains owned state; next attempt reobserves. No actual secrets in snapshots.

- T01: Temporal chart; exact cases specified in EXECUTION T01; inspect infra/platform/temporal/{postgres.yaml,server.yaml,schema-job.yaml,admin.yaml,namespace-job.yaml,namespace.yaml,images.pin}; tools/dev-environments/src/adapters/dev-temporal-bootstrap.mjs::renderDevTemporal.
- T02: Create-once state machine; exact cases specified in EXECUTION T02; inspect dev-temporal-bootstrap.mjs::assessDevTemporal/ensureDevTemporal/executeAuthorizedDevTemporal; dev-temporal-host-probe.mjs; infra/platform/temporal/install.sh.
- T03: Lifecycle consumers; exact cases specified in EXECUTION T03; inspect dev-temporal-bootstrap.mjs; dev-temporal-host-probe.mjs; dev-temporal-bootstrap-cli.mjs; infra/platform/temporal/install.sh; tools/dev-environments/test/dev-temporal-bootstrap.test.mjs.

Receipt (worktree, live NOT-RUN):

- `node --test infra/platform/temporal/tests/*.mjs tools/dev-environments/test/dev-temporal-bootstrap.test.mjs` — 40 pass, 0 fail.
- `node scripts/repo-tools/check-lab-manifests.mjs` — helm v3.22.1 lint/template; platform charts temporal.
- `bash -n` on `install.sh` and `infra/verification/smoke/temporal/smoke.sh` — pass (child receipt).
- Negatives observed: dev admin section refused; failed schema Job has no delete; unreadable PVC performs no writes; secret conflict stops for reobserve.
