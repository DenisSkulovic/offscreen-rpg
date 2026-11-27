import assert from 'node:assert/strict';
import process from 'node:process';
import test from 'node:test';

import {
  evaluateObservationReceipt,
  isValidPhasePrefix,
  normalizeDiagnosticResult,
  normalizePlatformResult,
  parseEnsureReceipt,
  toObservationReceipt,
} from '../receipt.mjs';

test('normalizePlatformResult rejects missing exit status', () => {
  const normalized = normalizePlatformResult({
    ok: true,
    stdout: '',
    stderr: '',
  });
  assert.equal(normalized.ok, false);
});

test('normalizePlatformResult preserves nonzero worker output', () => {
  const normalized = normalizePlatformResult({
    ok: false,
    status: 1,
    stdout: '{"schema":1}\n',
    stderr: '',
    timedOut: false,
    missing: false,
  });
  assert.equal(normalized.ok, true);
  if (normalized.ok) {
    assert.equal(normalized.exitCode, 1);
  }
});

test('platform status zero with malformed receipt is not success', () => {
  const normalized = normalizePlatformResult({
    ok: true,
    status: 0,
    stdout: 'not-json\n',
    stderr: '',
    timedOut: false,
    missing: false,
  });
  assert.equal(normalized.ok, true);
  if (!normalized.ok) {
    throw new Error('expected normalized platform result');
  }
  const parsed = parseEnsureReceipt(normalized);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.mutation, 'possible');
  assert.equal(parsed.reasonCode, 'invalid-receipt');
  assert.equal(parsed.pending, true);
});

test('nonzero valid no-mutation refusal stays none', () => {
  const stdout = `${JSON.stringify({
    schema: 1,
    ok: false,
    state: 'refused',
    reasonCode: 'ensure-not-authorized',
    mutation: 'none',
    completedPhases: [],
    pending: false,
  })}\n`;
  const parsed = parseEnsureReceipt({
    ok: true,
    exitCode: 2,
    stdout,
    signal: null,
    timedOut: false,
  });
  assert.equal(parsed.mutation, 'none');
  assert.equal(parsed.ok, false);
});

test('contradictory ok and exit status fails closed', () => {
  const stdout = `${JSON.stringify({
    schema: 1,
    ok: true,
    state: 'ready',
    reasonCode: 'ready',
    mutation: 'confirmed',
    completedPhases: [
      'namespace',
      'secret',
      'obs-prometheus',
      'obs-loki',
      'obs-tempo',
      'obs-collector',
      'obs-grafana',
    ],
    pending: false,
  })}\n`;
  const parsed = parseEnsureReceipt({
    ok: true,
    exitCode: 1,
    stdout,
    signal: null,
    timedOut: false,
  });
  assert.equal(parsed.ok, false);
  assert.equal(parsed.mutation, 'none');
});

test('lost stdout is possible mutation', () => {
  const parsed = parseEnsureReceipt({
    ok: true,
    exitCode: 0,
    stdout: '',
    signal: null,
    timedOut: false,
  });
  assert.equal(parsed.mutation, 'possible');
  assert.equal(parsed.ok, false);
  assert.equal(parsed.pending, true);
});

test('predecessor refusal parses as coherent no-mutation failure', () => {
  const stdout = `${JSON.stringify({
    schema: 1,
    operation: 'ensure',
    profile: 'dev',
    ok: false,
    state: 'not-ready',
    reasonCode: 'upgrade-required',
    mutation: 'none',
    completedPhases: [],
    pending: false,
  })}\n`;
  const parsed = parseEnsureReceipt({
    ok: true,
    exitCode: 1,
    stdout,
    signal: null,
    timedOut: false,
  });
  assert.equal(parsed.ok, false);
  assert.equal(parsed.reasonCode, 'upgrade-required');
  assert.equal(parsed.mutation, 'none');
  assert.equal(parsed.pending, false);
});

test('upgrade ensure receipts are never parsed as ensure success', () => {
  const stdout = `${JSON.stringify({
    schema: 1,
    operation: 'upgrade',
    ok: true,
    state: 'ready',
    reasonCode: 'ready',
    mutation: 'confirmed',
    completedPhases: [],
    pending: false,
  })}\n`;
  const parsed = parseEnsureReceipt({
    ok: true,
    exitCode: 0,
    stdout,
    signal: null,
    timedOut: false,
  });
  assert.equal(parsed.ok, false);
  assert.equal(parsed.reasonCode, 'invalid-receipt');
  assert.equal(parsed.pending, true);
});

test('status observation fails upgrade-required and pending distinctly', () => {
  for (const [reasonCode, expectedReason] of [
    ['upgrade-required', 'upgrade-required'],
    ['pending', 'pending'],
  ]) {
    const stdout = `${JSON.stringify({
      schema: 1,
      operation: 'status',
      profile: 'dev',
      ok: true,
      state: 'not-ready',
      reasonCode,
      mutation: 'none',
      completedPhases: [],
      pending: true,
    })}\n`;
    const receipt = evaluateObservationReceipt(
      { code: 0, signal: null, stdout, stderr: '' },
      { expectedProfile: 'dev' },
    );
    assert.equal(receipt.status, 'FAIL');
    assert.equal(receipt.reason, expectedReason);
  }
});

test('duplicate or non-prefix phases are rejected', () => {
  assert.equal(
    isValidPhasePrefix([
      'namespace',
      'secret',
      'obs-prometheus',
      'obs-prometheus',
    ]),
    false,
  );
  assert.equal(isValidPhasePrefix(['namespace', 'obs-prometheus']), false);
  const stdout = `${JSON.stringify({
    schema: 1,
    ok: false,
    state: 'partial',
    reasonCode: 'phase-failed',
    mutation: 'confirmed',
    completedPhases: ['namespace', 'obs-prometheus'],
    pending: true,
  })}\n`;
  const parsed = parseEnsureReceipt({
    ok: true,
    exitCode: 1,
    stdout,
    signal: null,
    timedOut: false,
  });
  assert.equal(parsed.ok, false);
  assert.equal(parsed.reasonCode, 'invalid-receipt');
});

test('diagnostic stdout after timeout is not success', () => {
  const stdout = `${JSON.stringify({
    schema: 1,
    operation: 'status',
    ok: true,
    state: 'ready',
    reasonCode: 'ready',
    mutation: 'none',
    completedPhases: [],
    pending: false,
  })}\n`;
  const normalized = normalizeDiagnosticResult({
    code: 0,
    signal: 'SIGKILL',
    stdout,
    stderr: '',
    reason: 'timeout',
  });
  const receipt = evaluateObservationReceipt(normalized, { allowAbsent: true });
  assert.equal(receipt.status, 'FAIL');
});

test('toObservationReceipt allowAbsent only for default release caller', () => {
  const without = toObservationReceipt({
    state: 'absent',
    reasonCode: 'absent',
    pending: false,
  });
  assert.equal(without.status, 'FAIL');
  assert.equal(without.reason, 'not-installed');

  const withAllow = toObservationReceipt(
    { state: 'absent', reasonCode: 'absent', pending: false },
    { allowAbsent: true },
  );
  assert.equal(withAllow.status, 'NOT-RUN');
  assert.equal(withAllow.reason, 'optional-observability-absent');
});

test('successful ensure parse accepts repeat and full install', () => {
  const repeat = `${JSON.stringify({
    schema: 1,
    ok: true,
    state: 'ready',
    reasonCode: 'ready',
    mutation: 'none',
    completedPhases: [],
    pending: false,
  })}\n`;
  const repeatParsed = parseEnsureReceipt({
    ok: true,
    exitCode: 0,
    stdout: repeat,
    signal: null,
    timedOut: false,
  });
  assert.equal(repeatParsed.ok, true);
  assert.equal(repeatParsed.mutation, 'none');

  const full = `${JSON.stringify({
    schema: 1,
    ok: true,
    state: 'ready',
    reasonCode: 'ready',
    mutation: 'confirmed',
    completedPhases: [
      'namespace',
      'secret',
      'obs-prometheus',
      'obs-loki',
      'obs-tempo',
      'obs-collector',
      'obs-grafana',
    ],
    pending: false,
  })}\n`;
  const fullParsed = parseEnsureReceipt({
    ok: true,
    exitCode: 0,
    stdout: full,
    signal: null,
    timedOut: false,
  });
  assert.equal(fullParsed.ok, true);
  assert.equal(fullParsed.mutation, 'confirmed');
});
