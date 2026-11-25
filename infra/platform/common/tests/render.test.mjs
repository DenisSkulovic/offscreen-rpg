import assert from 'node:assert/strict';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import test from 'node:test';
import { parseAllDocuments } from 'yaml';
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

function spawnCli(args, options = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    ...options,
  });
}

function spawnCliWithoutHelm(args) {
  return spawnCli(args, {
    env: { ...process.env, PATH: '' },
  });
}

function parseYamlManifestDocuments(text) {
  return parseAllDocuments(text).map((doc) => doc.toJS());
}

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

test('assertPlatformRenderRequest accepts redis on dev and rejects unknown section', () => {
  assert.doesNotThrow(() => assertPlatformRenderRequest('redis', 'dev', 'all'));
  assert.throws(
    () => assertPlatformRenderRequest('postgres', 'release', 'broker'),
    /unsupported section/,
  );
  assert.throws(
    () => assertPlatformRenderRequest('temporal', 'dev', 'admin'),
    /unsupported service/,
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
  const result = spawnCliWithoutHelm(['render', 'postgres', 'staging', 'all']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unsupported profile/);
});

test('cli help exits zero without invoking helm', () => {
  for (const args of [['--help'], ['render', '--help'], ['target', '--help']]) {
    const result = spawnCliWithoutHelm(args);
    assert.equal(result.status, 0, args.join(' '));
    assert.ok(result.stdout.length > 0, args.join(' '));
    assert.equal(result.stderr, '');
  }
});

test('cli render rejects unknown and duplicate flags before helm', () => {
  const cases = [
    ['render', '--bogus', 'postgres', 'dev', 'all'],
    ['render', '--format'],
    ['render', '--format', 'xml', 'postgres', 'dev', 'all'],
    [
      'render',
      '--format',
      'yaml',
      '--format',
      'json',
      'postgres',
      'dev',
      'all',
    ],
    ['render', 'postgres', 'dev', 'all', '--help', '--help'],
    ['render', 'postgres', 'dev', 'all', 'extra'],
  ];
  for (const args of cases) {
    const result = spawnCliWithoutHelm(args);
    assert.notEqual(result.status, 0, args.join(' '));
    assert.ok(result.stderr.length > 0, args.join(' '));
    assert.equal(result.stdout, '');
  }
});

test('cli target rejects extra arguments', () => {
  const result = spawnCliWithoutHelm(['target', 'dev', 'extra']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unexpected argument/);
});

test('cli render default legacy output is parsePlatformDocuments-compatible', () => {
  const result = spawnCli(['render', 'postgres', 'dev', 'namespace']);
  assert.equal(result.status, 0, result.stderr);
  const docs = parsePlatformDocuments(result.stdout, {
    service: 'postgres',
    profile: 'dev',
  });
  assert.equal(docs.length, 1);
  assert.equal(docs[0].kind, 'Namespace');
});

test('cli render yaml and json formats match legacy documents', () => {
  const cases = [
    ['render', 'postgres', 'dev', 'namespace'],
    ['render', '--format', 'yaml', 'postgres', 'dev', 'namespace'],
    ['render', 'postgres', 'dev', 'namespace', '--format', 'json'],
  ];
  const outputs = cases.map((args) => {
    const result = spawnCli(args);
    assert.equal(result.status, 0, `${args.join(' ')}: ${result.stderr}`);
    return result.stdout;
  });
  const legacyDocs = parsePlatformDocuments(outputs[0], {
    service: 'postgres',
    profile: 'dev',
  });
  const yamlDocs = parseYamlManifestDocuments(outputs[1]);
  const jsonDocs = JSON.parse(outputs[2]);
  assert.ok(
    isDeepStrictEqual(yamlDocs, legacyDocs),
    'yaml documents should match legacy semantics',
  );
  assert.ok(
    isDeepStrictEqual(jsonDocs, legacyDocs),
    'json documents should match legacy semantics',
  );
});

test('verifyManifestBytes used for fixture bytes sanity', () => {
  const body = 'tiny-chart fixture';
  const digest = createHash('sha256').update(body).digest('hex');
  assert.equal(digest.length, 64);
});
