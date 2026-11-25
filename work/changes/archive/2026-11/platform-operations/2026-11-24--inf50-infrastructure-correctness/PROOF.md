# Proof

## Focused source (PASS)

- `node --test tools/dev-environments/test/dev-slot-migrate.test.mjs tools/dev-environments/test/dev-slot-startup.test.mjs tools/dev-environments/test/dev-compile-watch.test.mjs` — T01 behavioral cases PASS; two pre-existing `kind node inventory is empty` failures in startup image integration tests remain (env, not INF50).
- `node --test tools/dev-environments/test/dev-environment-session.test.mjs tools/dev-environments/test/dev-process-identity.test.mjs tools/dev-environments/test/dev-tilt.test.mjs` — **87 pass / 0 fail**.
- Combined migrate+session+compile-watch after lint fix — **57 pass / 0 fail**.
- Image non-regression: `node --test infra/images/distribution/kind-image-loader.test.mjs infra/images/development/tests/load-dev-slot-image.test.mjs` — **42 pass / 0 fail** (no loader edits).

## Suite record

- `pnpm infra:verify --suite source` — **FAIL** exit=1: `dev-environments` 366 pass / 3 fail. Failures pre-existing on clean main: empty kind inventory ×2, `Dockerfile.dockerignore` / pruned-context assertion. Not introduced by INF50. platform-plan/workloads/release PASS.

## Negatives observed

- `buildMigrationPackage` nonzero spawnSync → `migrate-build` refusal; secret redacted.
- Bogus compile stamp line does not start runtime.
- Port-forward readiness timeout → child `SIGTERM`.
- SIGTERM/SIGKILL throw → `reason=signal-failed`, `parkIncomplete`, no scale/release, no raw exception persistence.
- Survive-after-escalation → `process-stop-incomplete`; reused PID before signal → no signal; foreign peer untouched.

## Live

NOT-RUN. INF52 owns owned-lifecycle live evidence. No stack/protected mutation by this Change.

Source SHA (Change commit before archive): `320685a6619510b8492d644a61eabb97fa6596e5`.
