import assert from 'node:assert/strict';
import test from 'node:test';
import { buildInfraEnsurePreview } from './infra-cli.mjs';
import { formatInfraResult } from './infra-presentation.mjs';

const MALICIOUS = 'SECRET_ECHO_INJECTED_DO_NOT_PRINT';
const ANSI = '\x1b[31m';

function assertNoLeak(text) {
  assert.equal(text.includes(MALICIOUS), false);
  assert.equal(text.includes(ANSI), false);
  assert.equal(/\x1b\[[0-9;]*m/.test(text), false);
  assert.equal(text.includes('argv'), false);
  assert.match(text, /^OFFSCREEN\nPLATFORM/m);
}

function assertNarrowBodyLines(text, maxCols = 40) {
  for (const line of text.split('\n')) {
    if (line.startsWith('next:')) {
      continue;
    }
    assert.ok(
      line.length <= maxCols,
      `line too wide (${line.length}): ${line}`,
    );
  }
}

test('status formats absent cluster and absent services', () => {
  const text = formatInfraResult(
    'status',
    'dev',
    {
      ok: true,
      phase: 'status',
      profileId: 'dev',
      contextName: 'kind-offscreen-dev',
      cluster: 'absent',
      selectedServices: ['postgres', 'redis'],
      services: {
        postgres: { state: 'not-installed', detail: MALICIOUS },
        redis: { state: 'not-installed', detail: MALICIOUS },
      },
    },
    { services: 'postgres,redis' },
  );
  assertNoLeak(text);
  assertNarrowBodyLines(text);
  assert.match(text, /cluster: ABSENT/);
  assert.match(text, /postgres ABSENT/);
  assert.match(text, /redis ABSENT/);
  assert.match(text, /counts: absent 2/);
  assert.doesNotMatch(text, /healthy/i);
  assert.match(
    text,
    /next: node infra\/environments\/infra-cli\.mjs status --env dev/,
  );
});

test('status formats unreadable cluster as unknown service states', () => {
  const text = formatInfraResult('status', 'release', {
    ok: true,
    cluster: 'unreadable',
    contextName: 'kind-offscreen-release',
    selectedServices: ['postgres'],
    services: {
      postgres: { state: 'unreadable', detail: MALICIOUS },
    },
  });
  assertNoLeak(text);
  assert.match(text, /cluster: UNREADABLE/);
  assert.match(text, /postgres UNKNOWN/);
  assert.match(text, /counts: unknown 1/);
});

test('status mixed ready and not-ready counts', () => {
  const text = formatInfraResult('status', 'release', {
    ok: true,
    cluster: 'present',
    contextName: 'kind-offscreen-release',
    selectedServices: ['postgres', 'redis'],
    services: {
      postgres: { state: 'installed' },
      redis: { state: 'not-ready', detail: 'stale deployment' },
    },
  });
  assertNoLeak(text);
  assert.match(text, /postgres READY/);
  assert.match(text, /redis NOT READY/);
  assert.match(text, /counts: ready 1 not ready 1/);
  assert.doesNotMatch(text, /all healthy/i);
});

test('status with empty selection', () => {
  const text = formatInfraResult('status', 'dev', {
    ok: true,
    cluster: 'present',
    contextName: 'kind-offscreen-dev',
    selectedServices: [],
    services: {},
  });
  assert.match(text, /services: none selected/);
  assert.match(text, /counts: none observed/);
});

test('status refusal omits refusal message', () => {
  const text = formatInfraResult('status', 'dev', {
    ok: false,
    phase: 'selection',
    refusals: [
      {
        id: 'unsupported-service',
        message: `Refusing ${MALICIOUS}`,
      },
    ],
  });
  assertNoLeak(text);
  assert.match(text, /result: REFUSED/);
  assert.match(text, /refusals: unsupported-service/);
});

test('plan refusal uses static ids only', () => {
  const text = formatInfraResult('plan', 'dev', {
    ok: false,
    phase: 'selection',
    refusals: [
      {
        id: 'unsupported-service',
        message: MALICIOUS,
      },
    ],
  });
  assertNoLeak(text);
  assert.match(text, /preview: read-only/);
  assert.match(text, /result: REFUSED/);
});

test('plan preview from ensure preview payload', () => {
  const preview = buildInfraEnsurePreview({
    profileId: 'dev',
    services: 'core',
  });
  assert.equal(preview.ok, true);
  const text = formatInfraResult('plan', 'dev', preview);
  assertNoLeak(text);
  assert.match(text, /live: not observed/);
  assert.match(text, /services: postgres object-storage temporal/);
  assert.match(text, /phases:/);
  assert.match(text, /cnpg MUTATE/);
  assert.doesNotMatch(text, /PRESENT/);
  assert.doesNotMatch(text, /dev-cnpg-bootstrap/);
});

test('plan release profile context from options when missing', () => {
  const text = formatInfraResult(
    'plan',
    'release',
    {
      ok: true,
      selectedServices: ['postgres'],
      preflight: ['target', 'memory', 'helm', 'chart-render'],
      phases: [{ id: 'postgres', argv: ['bash', MALICIOUS], mutate: true }],
    },
    { contextName: 'kind-offscreen-release' },
  );
  assertNoLeak(text);
  assert.match(text, /ctx: kind-offscreen-release/);
  assert.match(text, /preflight: target memory helm chart-render/);
});

test('up failure partial state and no data unchanged claim', () => {
  const text = formatInfraResult('up', 'dev', {
    ok: false,
    phase: 'cluster-ensure',
    message: MALICIOUS,
    ran: ['cluster-ensure'],
  });
  assertNoLeak(text);
  assert.match(text, /result: FAILURE/);
  assert.match(text, /partial: UNKNOWN/);
  assert.match(text, /data: not asserted/);
  assert.doesNotMatch(text, /unchanged/i);
});

test('up refusal at selection', () => {
  const text = formatInfraResult('up', 'dev', {
    ok: false,
    exitCode: 2,
    phase: 'selection',
    refusals: [{ id: 'invalid-services', message: MALICIOUS }],
    ran: [],
  });
  assertNoLeak(text);
  assert.match(text, /result: REFUSED/);
  assert.match(text, /refusals: invalid-services/);
  assert.match(text, /partial: UNKNOWN/);
});

test('up success with receipt skipped phases', () => {
  const text = formatInfraResult('up', 'release', {
    ok: true,
    phase: 'complete',
    contextName: 'kind-offscreen-release',
    cluster: 'present',
    selectedServices: ['postgres', 'object-storage'],
    ran: ['cluster-verify', 'postgres', 'object-storage'],
    receipt: {
      ok: true,
      exitCode: 0,
      ran: [
        { id: 'postgres', argv: [MALICIOUS], mutate: true },
        { id: 'object-storage', argv: [MALICIOUS], mutate: true },
      ],
      skipped: [{ id: 'temporal', argv: [MALICIOUS] }],
      phases: [
        { id: 'postgres', ok: true, detail: MALICIOUS },
        { id: 'object-storage', ok: true, detail: MALICIOUS },
      ],
      refusals: [],
      rollback: false,
    },
  });
  assertNoLeak(text);
  assert.match(text, /result: OK/);
  assert.match(text, /skipped: temporal/);
  assert.doesNotMatch(text, /partial:/);
});

test('parse-level payload never prints raw message', () => {
  const text = formatInfraResult(
    'status',
    'dev',
    { ok: false, message: MALICIOUS },
    { contextName: 'kind-offscreen-dev' },
  );
  assertNoLeak(text);
  assert.match(text, /reason: parse-error/);
});

test('malicious phase detail in status never printed', () => {
  const text = formatInfraResult('status', 'dev', {
    ok: true,
    cluster: 'present',
    contextName: 'kind-offscreen-dev',
    selectedServices: ['postgres'],
    services: {
      postgres: {
        state: 'not-ready',
        detail: `{"password":"${MALICIOUS}"}`,
      },
    },
  });
  assertNoLeak(text);
  assert.match(text, /postgres NOT READY/);
});
