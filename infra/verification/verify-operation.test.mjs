import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { parseVerifyArgs, runVerifyCli } from './verify.mjs';

function tempStateRoot() {
  return mkdtempSync(join(tmpdir(), 'offscreen-monitor-'));
}

function readOperationRecords(stateRoot) {
  return readdirSync(stateRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith('events-op-'))
    .map((entry) => JSON.parse(readFileSync(join(stateRoot, entry.name), 'utf8')));
}

test('infra verify source success records operation end', () => {
  const stateRoot = tempStateRoot();
  let written = '';
  const exitCode = runVerifyCli(['--suite', 'source'], {
    write: (chunk) => {
      written += chunk;
    },
    runVerification: () => ({
      suite: 'source',
      exitCode: 0,
      helm: { available: false },
      suites: [],
      scenarios: [],
    }),
    operationDeps: { stateRoot, skipGit: true },
  });
  assert.equal(exitCode, 0);
  assert.match(written, /infra:verify suite=source/);
  assert.ok(readOperationRecords(stateRoot).some((record) => record.operation.event === 'end'));
  rmSync(stateRoot, { recursive: true, force: true });
});

test('infra verify source failure records operation failure', () => {
  const stateRoot = tempStateRoot();
  const exitCode = runVerifyCli(['--suite', 'source'], {
    write: () => {},
    runVerification: () => ({
      suite: 'source',
      exitCode: 1,
      helm: { available: false },
      suites: [
        {
          id: 'platform-plan',
          status: 'FAIL',
          durationMs: 1,
          command: [],
          exitCode: 1,
          signal: null,
          counts: {
            tests: 1,
            pass: 0,
            fail: 1,
            skipped: 0,
            complete: true,
          },
          files: [],
        },
      ],
      scenarios: [],
    }),
    operationDeps: { stateRoot, skipGit: true },
  });
  assert.equal(exitCode, 1);
  const failure = readOperationRecords(stateRoot).find(
    (record) => record.operation.event === 'failure',
  );
  assert.equal(failure.operation.result, 'failure');
  rmSync(stateRoot, { recursive: true, force: true });
});

test('infra verify args refusal is not wrapped', () => {
  const stateRoot = tempStateRoot();
  const previousRoot = process.env.OFFSCREEN_MONITOR_STATE_ROOT;
  process.env.OFFSCREEN_MONITOR_STATE_ROOT = stateRoot;
  try {
    const exitCode = runVerifyCli([], { operationDeps: { skipGit: true } });
    assert.equal(exitCode, 2);
    assert.equal(readOperationRecords(stateRoot).length, 0);
    assert.equal(parseVerifyArgs([]).ok, false);
  } finally {
    if (previousRoot === undefined) delete process.env.OFFSCREEN_MONITOR_STATE_ROOT;
    else process.env.OFFSCREEN_MONITOR_STATE_ROOT = previousRoot;
    rmSync(stateRoot, { recursive: true, force: true });
  }
});

test('disabled monitor leaves verify cli exit code unchanged', () => {
  const exitCode = runVerifyCli(['--suite', 'source'], {
    write: () => {},
    runVerification: () => ({
      suite: 'source',
      exitCode: 0,
      helm: { available: false },
      suites: [],
      scenarios: [],
    }),
    operationDeps: { disabled: true, existsSync: () => false },
  });
  assert.equal(exitCode, 0);
});