import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { REPO_ROOT } from './catalog.mjs';
import { parseCliArgs, runVerifyCli } from './cli.mjs';

const CLI_PATH = join(dirname(fileURLToPath(import.meta.url)), 'cli.mjs');

function captureRun(argv, io = {}) {
  const stdout = [];
  const stderr = [];
  const exitCode = runVerifyCli(argv, {
    ...io,
    write: (chunk) => stdout.push(chunk),
    writeErr: (chunk) => stderr.push(chunk),
  });
  return {
    exitCode,
    stdout: stdout.join(''),
    stderr: stderr.join(''),
  };
}

test('parseCliArgs rejects unknown and duplicate flags', () => {
  const unknown = parseCliArgs(['infra', '--wat']);
  assert.equal(unknown.ok, false);
  assert.match(unknown.message, /unknown option/);

  const duplicate = parseCliArgs(['infra', '--plan', '--plan']);
  assert.equal(duplicate.ok, false);
  assert.match(duplicate.message, /duplicate option/);

  const conflict = parseCliArgs(['infra', '--plan', '--live']);
  assert.equal(conflict.ok, false);
  assert.match(conflict.message, /mutually exclusive/);
});

test('list and --plan perform no filesystem side effects', () => {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'verify-cli-'));
  const before = existsSync(join(tmpRoot, '.offscreen'));

  const list = captureRun(['list'], { repoRoot: tmpRoot });
  assert.equal(list.exitCode, 0);
  assert.match(list.stdout, /verification catalog/);

  const plan = captureRun(['infra', '--plan'], { repoRoot: REPO_ROOT });
  assert.equal(plan.exitCode, 0);
  assert.match(plan.stdout, /verify plan/);

  assert.equal(existsSync(join(tmpRoot, '.offscreen')), before);

  const spawned = spawnSync(process.execPath, [CLI_PATH, 'list'], {
    stdio: 'pipe',
    env: { ...process.env, VERIFY_NO_SPAWN: '1' },
  });
  assert.equal(spawned.status, 0);
});

test('invalid profile and missing suite exit codes', () => {
  const invalidProfile = captureRun(
    ['package', '@offscreen/db', '--profile', 'bogus', '--plan'],
    { repoRoot: REPO_ROOT },
  );
  assert.equal(invalidProfile.exitCode, 2);
  assert.match(invalidProfile.stderr, /unknown profile/);

  const missingSuite = captureRun(['package', '@offscreen/cache'], {
    repoRoot: REPO_ROOT,
  });
  assert.equal(missingSuite.exitCode, 1);
  assert.match(missingSuite.stderr, /suite not implemented/);
});

test('parseCliArgs rejects ambiguous duplicate --profile values', () => {
  const parsed = parseCliArgs([
    'package',
    '@offscreen/db',
    '--profile',
    'standard',
    '--profile',
    'stress',
  ]);
  assert.equal(parsed.ok, false);
  assert.match(parsed.message, /duplicate option: --profile/);
});

test('infra rejects positional name', () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'verify-cli-infra-'));
  mkdirSync(join(repoRoot, 'packages'), { recursive: true });
  mkdirSync(join(repoRoot, 'apps'), { recursive: true });
  writeFileSync(join(repoRoot, 'packages', '.gitkeep'), '');
  writeFileSync(join(repoRoot, 'apps', '.gitkeep'), '');

  const result = captureRun(['infra', 'extra'], { repoRoot });
  assert.equal(result.exitCode, 2);
  assert.match(result.stderr, /unexpected positional/);
});
