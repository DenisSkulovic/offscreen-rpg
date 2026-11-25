import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { execDevPostgresSql } from '../dev-bootstrap.mjs';

const TEMPORAL_SQL_ARGV_LITERAL =
  ': "${POSTGRES_PASSWORD:?missing database password}"; export PGPASSWORD="$POSTGRES_PASSWORD"; exec psql -w -h 127.0.0.1 -U temporal -d "$1" -Atqc "$2"';
const POSITIONAL_TAIL = /'temporal-sql',\s*\n\s*database,\s*\n\s*query,/;

const temporalRoot = dirname(fileURLToPath(import.meta.url));
const testPassword = 'probe pw $ "' + "x'\\";
const testDatabase = 'temporal';
const testQuery = String.raw`SELECT '; DROP TABLE x; $(echo metachar)'`;

/** @param {string} relativePath */
function readModuleSource(relativePath) {
  return readFileSync(join(temporalRoot, '..', relativePath), 'utf8');
}

/** @param {string} source */
function assertBuilderContract(source, label) {
  assert.ok(
    source.includes(`'${TEMPORAL_SQL_ARGV_LITERAL}'`),
    `${label} must use the fixed bash script literal`,
  );
  assert.match(
    source,
    POSITIONAL_TAIL,
    `${label} must pass database and query as argv after temporal-sql`,
  );
}

/** @param {string} stubDir */
function installPsqlStub(stubDir) {
  const stubPath = join(stubDir, 'psql');
  const stubSource = `#!/usr/bin/env bash
set -euo pipefail
expected="$(cat "$PSQL_STUB_EXPECTED")"
if [[ "\${PGPASSWORD-}" != "$expected" ]]; then
  echo "PGPASSWORD mismatch" >&2
  exit 2
fi
have_w=0
have_d=0
have_q=0
prev=""
for arg in "$@"; do
  if [[ "$arg" == "-w" ]]; then have_w=1; fi
  if [[ "$prev" == "-d" && "$arg" == "$PSQL_STUB_DATABASE" ]]; then have_d=1; fi
  if [[ "$prev" == "-Atqc" && "$arg" == "$PSQL_STUB_QUERY" ]]; then have_q=1; fi
  prev="$arg"
done
if [[ "$have_w" -ne 1 || "$have_d" -ne 1 || "$have_q" -ne 1 ]]; then
  echo "psql argv mismatch" >&2
  exit 3
fi
exit 1
`;
  writeFileSync(stubPath, stubSource);
  chmodSync(stubPath, 0o755);
}

/**
 * @param {string} script
 * @param {string} database
 * @param {string} query
 * @param {{ stubDir: string, expectedPath: string, password?: string | null | undefined }} options
 */
function runRemoteSuffixLocally(script, database, query, options) {
  const env = {
    ...process.env,
    PATH: `${options.stubDir}:${process.env.PATH ?? ''}`,
    PSQL_STUB_EXPECTED: options.expectedPath,
    PSQL_STUB_DATABASE: database,
    PSQL_STUB_QUERY: query,
  };
  if (options.password === null) {
    delete env.POSTGRES_PASSWORD;
  } else if (options.password !== undefined) {
    env.POSTGRES_PASSWORD = options.password;
  }
  return spawnSync('bash', ['-c', script, 'temporal-sql', database, query], {
    encoding: 'utf8',
    env,
  });
}

test('chart postgres credential remains POSTGRES_PASSWORD', () => {
  const chart = readFileSync(
    join(temporalRoot, '../chart/templates/_postgres.tpl'),
    'utf8',
  );
  assert.match(chart, /name:\s*POSTGRES_PASSWORD/);
  assert.doesNotMatch(chart, /name:\s*PGPASSWORD/);
});

test('all three builders share the fixed bash script and positional argv', () => {
  assertBuilderContract(readModuleSource('dev-bootstrap.mjs'), 'dev-bootstrap');
  assertBuilderContract(
    readModuleSource('release-install.mjs'),
    'release-install',
  );
  assertBuilderContract(readModuleSource('readiness.mjs'), 'readiness');
});

test('execDevPostgresSql emits temporal-sql argv tail for kubectl exec', () => {
  /** @type {string[] | undefined} */
  let captured;
  execDevPostgresSql(
    {
      run(_command, args) {
        captured = args;
        return { ok: true, stdout: '' };
      },
    },
    testDatabase,
    testQuery,
  );
  assert.ok(captured);
  const marker = captured.indexOf('temporal-sql');
  assert.ok(marker >= 0);
  assert.equal(captured[marker + 1], testDatabase);
  assert.equal(captured[marker + 2], testQuery);
  assert.equal(captured[marker - 2], '-c');
  assert.equal(captured[marker - 1], TEMPORAL_SQL_ARGV_LITERAL);
});

test('local stub proof exercises password, flags, argv, and failures', () => {
  /** @type {import('node:fs').PathLike | undefined} */
  let workDir;
  try {
    workDir = mkdtempSync(join(tmpdir(), 'temporal-sql-command-'));
    const stubDir = join(workDir, 'bin');
    const expectedPath = join(workDir, 'expected.txt');
    mkdirSync(stubDir, { recursive: true });
    writeFileSync(expectedPath, testPassword, 'utf8');
    installPsqlStub(stubDir);

    const success = runRemoteSuffixLocally(
      TEMPORAL_SQL_ARGV_LITERAL,
      testDatabase,
      testQuery,
      { stubDir, expectedPath, password: testPassword },
    );
    assert.notEqual(success.status, 0, 'stub exit 1 must propagate');
    assert.equal(success.stderr?.includes(testPassword), false);

    const missing = runRemoteSuffixLocally(
      TEMPORAL_SQL_ARGV_LITERAL,
      testDatabase,
      testQuery,
      { stubDir, expectedPath, password: null },
    );
    assert.notEqual(
      missing.status,
      0,
      'missing POSTGRES_PASSWORD must fail closed',
    );

    const empty = runRemoteSuffixLocally(
      TEMPORAL_SQL_ARGV_LITERAL,
      testDatabase,
      testQuery,
      { stubDir, expectedPath, password: '' },
    );
    assert.notEqual(
      empty.status,
      0,
      'empty POSTGRES_PASSWORD must fail closed',
    );
  } finally {
    if (workDir) rmSync(workDir, { recursive: true, force: true });
  }
});
