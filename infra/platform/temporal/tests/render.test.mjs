import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { runPlatformCommand } from '../../common/commands.mjs';
import {
  assertPlatformRenderRequest,
  lintPlatformChart,
  renderPlatformDocuments,
} from '../../common/render.mjs';

const temporalRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const chartRoot = join(temporalRoot, 'chart');
const platformRoot = join(temporalRoot, '..');

const pins = readFileSync(join(platformRoot, 'temporal/images.pin'), 'utf8');
const SERVER_IMAGE = pins.match(/^SERVER_IMAGE=(.+)$/m)?.[1];
const ADMIN_IMAGE = pins.match(/^ADMIN_IMAGE=(.+)$/m)?.[1];
const POSTGRES_IMAGE = pins.match(/^POSTGRES_IMAGE=(.+)$/m)?.[1];

function helmRun(command, args, options) {
  if (command !== 'helm') {
    return {
      ok: false,
      status: 1,
      stdout: '',
      stderr: 'unexpected command',
      timedOut: false,
      missing: false,
    };
  }
  return runPlatformCommand(command, args, options);
}

function findDoc(docs, kind, name) {
  return docs.find((doc) => doc.kind === kind && doc.metadata?.name === name);
}

test('renderPlatformDocuments renders dev temporal all without release-only workloads', () => {
  const docs = renderPlatformDocuments(
    { service: 'temporal', profile: 'dev', section: 'all' },
    { chartRoot, run: helmRun },
  );
  assert.equal(docs.length, 9);
  assert.equal(
    findDoc(docs, 'Namespace', 'offscreen-dev-temporal')?.metadata.name,
    'offscreen-dev-temporal',
  );
  const pvc = findDoc(docs, 'PersistentVolumeClaim', 'temporal-postgres');
  assert.equal(pvc?.spec?.storageClassName, 'standard');
  assert.equal(pvc?.spec?.resources?.requests?.storage, '1Gi');
  const postgres = findDoc(docs, 'Deployment', 'temporal-postgres');
  assert.equal(
    postgres?.spec?.template?.spec?.containers[0]?.image,
    POSTGRES_IMAGE,
  );
  assert.deepEqual(
    postgres?.spec?.template?.spec?.containers[0]?.resources?.requests,
    {
      cpu: '50m',
      memory: '128Mi',
    },
  );
  const server = findDoc(docs, 'Deployment', 'temporal-server');
  assert.equal(
    server?.spec?.template?.spec?.containers[0]?.image,
    SERVER_IMAGE,
  );
  assert.equal(
    server?.spec?.template?.spec?.containers[0]?.env?.find(
      (e) => e.name === 'GOMEMLIMIT',
    )?.value,
    '640MiB',
  );
  const schema = findDoc(docs, 'Job', 'temporal-schema');
  assert.equal(schema?.spec?.backoffLimit, 0);
  assert.equal(schema?.spec?.ttlSecondsAfterFinished, undefined);
  assert.equal(findDoc(docs, 'Deployment', 'temporal-admin'), undefined);
  assert.equal(findDoc(docs, 'Job', 'temporal-namespace'), undefined);
  assert.ok(
    docs.every(
      (doc) =>
        !JSON.stringify(doc).match(/kind:\s*Secret/) &&
        !doc.stringData &&
        !doc.data?.password,
    ),
  );
});

test('renderPlatformDocuments renders release temporal all with lab init and schema invariants', () => {
  const docs = renderPlatformDocuments(
    { service: 'temporal', profile: 'release', section: 'all' },
    { chartRoot, run: helmRun },
  );
  assert.equal(docs.length, 12);
  assert.ok(findDoc(docs, 'ConfigMap', 'temporal-postgres-init'));
  const postgres = findDoc(docs, 'Deployment', 'temporal-postgres');
  assert.equal(
    postgres?.spec?.template?.spec?.containers[0]?.resources?.requests?.memory,
    '64Mi',
  );
  const schema = findDoc(docs, 'Job', 'temporal-schema');
  assert.equal(schema?.spec?.backoffLimit, 0);
  assert.equal(schema?.spec?.ttlSecondsAfterFinished, undefined);
  const serverSvc = findDoc(docs, 'Service', 'temporal-server');
  assert.equal(serverSvc?.spec?.ports[0]?.port, 7233);
  const pgSvc = findDoc(docs, 'Service', 'temporal-postgres');
  assert.equal(pgSvc?.spec?.ports[0]?.port, 5432);
  assert.ok(findDoc(docs, 'Deployment', 'temporal-admin'));
  assert.ok(findDoc(docs, 'Job', 'temporal-namespace'));
  for (const dep of [
    'temporal-postgres',
    'temporal-server',
    'temporal-admin',
  ]) {
    const doc = findDoc(docs, 'Deployment', dep);
    const pwdEnv = doc?.spec?.template?.spec?.containers
      ?.flatMap((c) => c.env ?? [])
      .find(
        (e) =>
          e.name === 'POSTGRES_PASSWORD' ||
          e.name === 'POSTGRES_PWD' ||
          e.name === 'SQL_PASSWORD',
      );
    if (pwdEnv) {
      assert.equal(pwdEnv.value, undefined);
      assert.equal(pwdEnv.valueFrom?.secretKeyRef?.name, 'temporal-db');
      assert.equal(pwdEnv.valueFrom?.secretKeyRef?.key, 'password');
    }
  }
});

test('lintPlatformChart succeeds for temporal release profile', () => {
  lintPlatformChart(
    { service: 'temporal', profile: 'release' },
    { chartRoot, run: helmRun },
  );
});

test('assertPlatformRenderRequest rejects temporal dev admin section', () => {
  assert.throws(
    () => assertPlatformRenderRequest('temporal', 'dev', 'admin'),
    /release-only/,
  );
});

test('helm template rejects unresolved image placeholders', () => {
  const result = runPlatformCommand(
    'helm',
    [
      'template',
      'platform-temporal',
      chartRoot,
      '-f',
      join(chartRoot, 'profiles/development.yaml'),
      '-f',
      '-',
    ],
    {
      input: `${JSON.stringify({ section: 'namespace' })}\n`,
      timeoutMs: 30_000,
    },
  );
  assert.equal(result.ok, false);
  assert.match(result.stderr ?? '', /images\.server must be resolved/);
});

test('helm template rejects unsupported temporal section', () => {
  const result = runPlatformCommand(
    'helm',
    [
      'template',
      'platform-temporal',
      chartRoot,
      '-f',
      join(chartRoot, 'profiles/development.yaml'),
      '-f',
      '-',
    ],
    {
      input: `${JSON.stringify({
        section: 'broker',
        images: {
          server: SERVER_IMAGE,
          admin: ADMIN_IMAGE,
          postgres: POSTGRES_IMAGE,
        },
      })}\n`,
      timeoutMs: 30_000,
    },
  );
  assert.equal(result.ok, false);
  assert.match(result.stderr ?? '', /unsupported section/);
});
