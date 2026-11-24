import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '../../../..');

const TRIAL_NAMES = [
  'dev-s3-tenant-trial.mjs',
  'dev-sql-tenant-trial.mjs',
  'dev-sql-tenant-migrate-trial.mjs',
  'dev-temporal-tenant-trial.mjs',
];

const RETIRED_PREFIX = 'tools/dev-environments/src/adapters/';
const VERIFICATION_DIR = join(REPO_ROOT, 'infra/verification/dev-environments');

function gitGrep(pattern, paths = ['.']) {
  try {
    return execFileSync('git', ['grep', '-n', pattern, '--', ...paths], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    }).trim();
  } catch (error) {
    return error.status === 1
      ? ''
      : (() => {
          throw error;
        })();
  }
}

describe('tenant trial scripts retired from runtime adapters', () => {
  for (const name of TRIAL_NAMES) {
    test(`${name} exists under verification`, () => {
      assert.equal(existsSync(join(VERIFICATION_DIR, name)), true);
    });

    test(`${name} absent from runtime adapters path`, () => {
      assert.equal(existsSync(join(REPO_ROOT, RETIRED_PREFIX, name)), false);
    });
  }

  test('runtime src does not import verification dev-environments', () => {
    const hits = gitGrep('infra/verification/dev-environments', [
      'tools/dev-environments/src',
    ]);
    assert.equal(hits, '');
  });

  test('trial scripts retain authorization guards', () => {
    const sqlTrial = readFileSync(
      join(VERIFICATION_DIR, 'dev-sql-tenant-trial.mjs'),
      'utf8',
    );
    assert.match(sqlTrial, /OFFSCREEN_DEV_SQL_TENANT_LIVE/);
    assert.match(
      sqlTrial,
      /refusing live SQL tenant trial without authorization/,
    );

    const migrateTrial = readFileSync(
      join(VERIFICATION_DIR, 'dev-sql-tenant-migrate-trial.mjs'),
      'utf8',
    );
    assert.match(migrateTrial, /OFFSCREEN_DEV_SQL_MIGRATE_LIVE/);
    assert.match(
      migrateTrial,
      /refusing live dev_1 migration without authorization/,
    );
  });

  test('no tracked source still points at retired adapter trial paths', () => {
    for (const name of TRIAL_NAMES) {
      const needle = `${RETIRED_PREFIX}${name}`;
      const hits = gitGrep(needle, [
        'docs',
        'infra',
        'tools',
        'scripts',
        'packages',
      ]);
      const filtered = hits
        .split('\n')
        .filter(Boolean)
        .filter((line) => !line.includes('work/changes/'))
        .filter((line) => !line.includes('work/undertakings/'));
      assert.deepEqual(filtered, []);
    }
  });
});
