import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  appendScenarioRow,
  createVerificationReport,
  finalizeReport,
  normalizeEngineStatus,
  persistReport,
  reportContainsForbiddenSecrets,
  sanitizeChildScenarioResult,
  SECRET_SENTINEL,
  validateChildReportPath,
} from './report.mjs';

test('normalizeEngineStatus maps TIMEOUT to FAIL for dependency engine', () => {
  const mapped = normalizeEngineStatus({
    status: 'TIMEOUT',
    reason: 'timeout',
  });
  assert.equal(mapped.engine.status, 'FAIL');
  assert.equal(mapped.publicStatus, 'TIMEOUT');
  assert.equal(mapped.reasonCode, 'timeout');
});

test('sanitizeChildScenarioResult strips secret sentinel from reason', () => {
  const row = sanitizeChildScenarioResult(
    {
      status: 'FAIL',
      reason: SECRET_SENTINEL,
      detail: 'password=abc connection string postgres://u:p@host/db',
    },
    { scenarioId: 'DB-S01', sectionId: 'source', tier: 'SOURCE' },
  );
  assert.equal(row.status, 'FAIL');
  assert.ok(!String(row.reason ?? '').includes('SUPERSECRET'));
  assert.ok(!String(row.reason ?? '').includes('password'));
});

test('validateChildReportPath rejects arbitrary URLs and foreign paths', () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'verify-report-'));
  const allowed = validateChildReportPath(
    repoRoot,
    '.offscreen/verification/run-abc/report.json',
  );
  assert.equal(allowed.ok, true);

  const url = validateChildReportPath(
    repoRoot,
    'https://evil.example/report.json',
  );
  assert.equal(url.ok, false);

  const foreign = validateChildReportPath(repoRoot, '/tmp/report.json');
  assert.equal(foreign.ok, false);
});

test('createVerificationReport persists atomically without secrets', () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'verify-report-'));
  const { report, path, persist } = createVerificationReport({
    repoRoot,
    subject: { kind: 'package', manifestName: '@offscreen/db' },
    profile: 'source',
    live: false,
    selectedSections: ['source'],
  });
  appendScenarioRow(
    report,
    sanitizeChildScenarioResult(
      { status: 'NOT-RUN', reason: 'scenario-not-implemented' },
      { scenarioId: 'DB-S01', sectionId: 'source', tier: 'SOURCE' },
    ),
    repoRoot,
  );
  finalizeReport(report);
  persist();
  const onDisk = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(onDisk.complete, true);
  assert.equal(reportContainsForbiddenSecrets(onDisk), false);
  assert.ok(path.includes('.offscreen/verification/run-'));
});
