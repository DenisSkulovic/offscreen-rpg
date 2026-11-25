# T01 | Correct all three command builders (PATCH)

Anchors: infra/platform/temporal/dev-bootstrap.mjs execDevPostgresSql; release-install.mjs execReleasePostgresSql; readiness.mjs execTemporalPostgresSql; chart/templates/_postgres.tpl POSTGRES_PASSWORD env; tests/readiness.test.mjs. All three currently interpolate database/query in bash -lc, and TCP psql does not automatically consume POSTGRES_PASSWORD. Replace the trailing remote argv in all three with exactly:

```js
'bash', '-c',
': "${POSTGRES_PASSWORD:?missing database password}"; export PGPASSWORD="$POSTGRES_PASSWORD"; exec psql -w -h 127.0.0.1 -U temporal -d "$1" -Atqc "$2"',
' temporal-sql'.trim(), database, query,
```

Use literal 'temporal-sql' for argv0 (no trim needed). Single-quoted JS string; no JS interpolation. Preserve context, namespace, deployment, timeout and existing result contracts. Password only expanded inside container, no secret value in argv or receipts; no set -x, no host secret reads, no default password. -w forbids interactive prompt. Preserve exact SQL bytes including quotes and shell metacharacters through positional args. No new production helper: these three small builders are temporary and will be removed by INF64–65.

# T02 | Prove command contract (PATCH; after T01)

Anchors: dev-bootstrap.mjs execDevPostgresSql; tests/readiness.test.mjs; tests/release-install.test.mjs; tools/dev-environments/test/dev-temporal-bootstrap.test.mjs. Update command-matching fakes to recognize database/query as separate last two argv elements, not substring shell command. Add source-only test infra/platform/temporal/tests/sql-command.test.mjs: capture actual dev argv via execDevPostgresSql injected run; for private release/readiness builders extract their fixed bash script and argv suffix from source using exact literal matcher (assert each uses same literal and positional args; no production export solely for tests). Execute captured remote suffix locally with spawnSync and a temporary executable psql stub on PATH, using test-only password including spaces, dollar and quotes and a query with shell metacharacters; stub asserts PGPASSWORD matches expected test password, -w present, exact database/query argv, returns 1. Missing/empty POSTGRES_PASSWORD must exit nonzero before stub invocation; stub nonzero propagates; no real DB or kubectl. Clean temp directory in finally. Do not print password. Tests from root: node --test infra/platform/temporal/tests/sql-command.test.mjs infra/platform/temporal/tests/readiness.test.mjs infra/platform/temporal/tests/release-install.test.mjs tools/dev-environments/test/dev-temporal-bootstrap.test.mjs. Receipt exact commands/results, all three source anchors and limitations: stub proof only, real authentication NOT RUN. Stop if existing chart credential differs from POSTGRES_PASSWORD; no alternate auth design.
