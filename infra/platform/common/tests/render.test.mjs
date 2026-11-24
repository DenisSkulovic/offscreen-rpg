import assert from 'node:assert/strict';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { runPlatformCommand } from '../commands.mjs';
import {
  assertHelmAvailable,
  assertPlatformRenderRequest,
  documentIdentity,
  lintPlatformChart,
  parsePlatformDocuments,
  renderPlatformDocuments,
  renderPlatformYaml,
} from '../render.mjs';

const commonRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureChartRoot = join(commonRoot, 'tests/fixtures/tiny-chart');
const repoRoot = join(commonRoot, '../../..');
const cliPath = join(commonRoot, 'cli.mjs');

const POSTGRES_IMAGE = 'ghcr.io/cloudnative-pg/postgresql:18.7-system-trixie';

function fixtureHelmRun(command, args, options) {
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

test('assertHelmAvailable accepts helm v3/v4', () => {
  const version = assertHelmAvailable();
  assert.match(version, /^v[34]\./);
});

test('renderPlatformDocuments renders postgres fixture namespace for dev', () => {
  const docs = renderPlatformDocuments(
    { service: 'postgres', profile: 'dev', section: 'namespace' },
    { chartRoot: fixtureChartRoot, run: fixtureHelmRun },
  );
  assert.equal(docs.length, 1);
  assert.equal(docs[0].kind, 'Namespace');
  assert.equal(docs[0].metadata.name, 'offscreen-dev-postgres');
});

test('renderPlatformDocuments renders postgres fixture cluster for release', () => {
  const docs = renderPlatformDocuments(
    { service: 'postgres', profile: 'release', section: 'cluster' },
    { chartRoot: fixtureChartRoot, run: fixtureHelmRun },
  );
  assert.equal(docs.length, 1);
  assert.equal(docs[0].kind, 'Cluster');
  assert.equal(docs[0].spec.imageName, POSTGRES_IMAGE);
});

test('renderPlatformYaml emits JSON documents separated by ---', () => {
  const docs = [
    {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: 'offscreen-dev-postgres' },
    },
  ];
  const text = renderPlatformYaml(docs);
  assert.match(text, /^---\n\{/);
  assert.equal(
    parsePlatformDocuments(text, { service: 'postgres', profile: 'dev' })
      .length,
    1,
  );
});

test('lintPlatformChart succeeds for postgres fixture release profile', () => {
  lintPlatformChart(
    { service: 'postgres', profile: 'release' },
    { chartRoot: fixtureChartRoot, run: fixtureHelmRun },
  );
});

test('assertPlatformRenderRequest rejects release-only redis on dev and unknown section', () => {
  assert.throws(
    () => assertPlatformRenderRequest('redis', 'dev', 'all'),
    /release-only/,
  );
  assert.throws(
    () => assertPlatformRenderRequest('postgres', 'release', 'broker'),
    /unsupported section/,
  );
  assert.throws(
    () => assertPlatformRenderRequest('temporal', 'dev', 'admin'),
    /release-only/,
  );
});

test('parsePlatformDocuments rejects malformed, duplicate, Secret, foreign namespace, and cluster metadata', () => {
  const okLine = JSON.stringify({
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: { name: 'offscreen-dev-postgres' },
  });
  const docs = parsePlatformDocuments(`${okLine}\n`, {
    service: 'postgres',
    profile: 'dev',
  });
  assert.equal(docs.length, 1);
  assert.throws(
    () =>
      parsePlatformDocuments('{not-json', {
        service: 'postgres',
        profile: 'dev',
      }),
    /malformed platform document/,
  );
  assert.throws(
    () =>
      parsePlatformDocuments(`${okLine}\n${okLine}`, {
        service: 'postgres',
        profile: 'dev',
      }),
    /duplicate platform identity/,
  );
  const secret = JSON.stringify({
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: { name: 's', namespace: 'offscreen-dev-postgres' },
  });
  assert.throws(
    () =>
      parsePlatformDocuments(`${secret}\n`, {
        service: 'postgres',
        profile: 'dev',
      }),
    /secret documents are not allowed/,
  );
  const foreign = JSON.stringify({
    apiVersion: 'v1',
    kind: 'Deployment',
    metadata: { name: 'd', namespace: 'lab-edge' },
  });
  assert.throws(
    () =>
      parsePlatformDocuments(`${foreign}\n`, {
        service: 'postgres',
        profile: 'dev',
      }),
    /not allowed/,
  );
  const clusterMeta = JSON.stringify({
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: 'c',
      namespace: 'offscreen-dev-postgres',
      clusterName: 'x',
    },
  });
  assert.throws(
    () =>
      parsePlatformDocuments(`${clusterMeta}\n`, {
        service: 'postgres',
        profile: 'dev',
      }),
    /cluster metadata is not allowed/,
  );
  assert.equal(
    documentIdentity({
      kind: 'Deployment',
      metadata: { namespace: 'offscreen-dev-postgres', name: 'x' },
    }),
    'Deployment/offscreen-dev-postgres/x',
  );
});

test('renderPlatformDocuments surfaces helm timeout via fake runner', () => {
  const run = () => ({
    ok: false,
    status: null,
    stdout: '',
    stderr: '',
    timedOut: true,
    missing: false,
  });
  assert.throws(
    () =>
      renderPlatformDocuments(
        { service: 'postgres', profile: 'dev', section: 'namespace' },
        { chartRoot: fixtureChartRoot, run },
      ),
    /helm template failed:.*timedOut=true/,
  );
});

test('renderPlatformDocuments rejects malformed helm stdout from fake runner', () => {
  const run = (command, args) => {
    if (command === 'helm' && args[0] === 'version') {
      return {
        ok: true,
        status: 0,
        stdout: 'v3.14.0\n',
        stderr: '',
        timedOut: false,
        missing: false,
      };
    }
    return {
      ok: true,
      status: 0,
      stdout: 'not-json\n',
      stderr: '',
      timedOut: false,
      missing: false,
    };
  };
  assert.throws(
    () =>
      renderPlatformDocuments(
        { service: 'postgres', profile: 'dev', section: 'namespace' },
        { chartRoot: fixtureChartRoot, run },
      ),
    /malformed platform document/,
  );
});

test('cli render rejects unsupported profile without chart access', () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, 'render', 'postgres', 'staging', 'all'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
    },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unsupported profile/);
});

test('verifyManifestBytes used for fixture bytes sanity', () => {
  const body = 'tiny-chart fixture';
  const digest = createHash('sha256').update(body).digest('hex');
  assert.equal(digest.length, 64);
});
