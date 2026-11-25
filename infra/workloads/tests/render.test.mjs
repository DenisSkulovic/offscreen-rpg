import assert from 'node:assert/strict';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import test from 'node:test';
import { parseAllDocuments } from 'yaml';
import { deriveDevWorkloadBindings } from './helpers/dev-bindings.mjs';
import {
  assertHelmAvailable,
  documentIdentity,
  parseWorkloadDocuments,
  renderWorkloadDocuments,
  renderWorkloadYaml,
} from '../render.mjs';

function writeValuesFile(contents) {
  const dir = mkdtempSync(join(tmpdir(), 'offscreen-values-'));
  const file = join(dir, 'values.yaml');
  writeFileSync(file, contents, 'utf8');
  return { file, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const renderCli = join(repoRoot, 'infra/workloads/render.mjs');

function spawnWorkloadCli(args, options = {}) {
  return spawnSync(process.execPath, [renderCli, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    ...options,
  });
}

function spawnWorkloadCliWithoutHelm(args) {
  return spawnWorkloadCli(args, {
    env: { ...process.env, PATH: '' },
  });
}

function parseYamlManifestDocuments(text) {
  return parseAllDocuments(text).map((doc) => doc.toJS());
}

test('assertHelmAvailable accepts helm v3/v4', () => {
  const version = assertHelmAvailable();
  assert.match(version, /^v[34]\./);
});

test('renderWorkloadDocuments returns ordered dev-1 graph', () => {
  const { bindings } = deriveDevWorkloadBindings('dev-1', 3100);
  const docs = renderWorkloadDocuments({
    profile: 'development',
    section: 'all',
    bindings,
  });
  assert.equal(docs.length, 10);
  assert.equal(docs[0].kind, 'Namespace');
  assert.deepEqual(
    docs
      .filter((doc) => doc.kind === 'Deployment')
      .map((doc) => doc.metadata.name),
    [
      'game-web',
      'game-api',
      'game-authority',
      'game-control',
      'game-executor',
      'game-relay',
    ],
  );
});

test('renderWorkloadYaml emits JSON documents separated by ---', () => {
  const docs = [
    { apiVersion: 'v1', kind: 'Namespace', metadata: { name: 'x' } },
  ];
  const text = renderWorkloadYaml(docs);
  assert.match(text, /^---\n\{/);
  assert.equal(parseWorkloadDocuments(text).length, 1);
});

test('release CLI help exits zero without invoking helm', () => {
  for (const args of [['--help'], ['release', '--help']]) {
    const result = spawnWorkloadCliWithoutHelm(args);
    assert.equal(result.status, 0, args.join(' '));
    assert.ok(result.stdout.length > 0, args.join(' '));
    assert.equal(result.stderr, '');
  }
});

test('release CLI rejects unknown and duplicate flags before helm', () => {
  const cases = [
    ['release', '--bogus', 'services'],
    ['release', '--format'],
    ['release', '--format', 'xml', 'services'],
    ['release', '--format', 'yaml', '--format', 'json', 'services'],
    ['release', 'services', '--help', '--help'],
    ['release', 'services', 'extra'],
    ['release', '--values'],
  ];
  for (const args of cases) {
    const result = spawnWorkloadCliWithoutHelm(args);
    assert.notEqual(result.status, 0, args.join(' '));
    assert.ok(result.stderr.length > 0, args.join(' '));
    assert.equal(result.stdout, '');
  }
});

test('release CLI yaml and json formats match legacy documents', () => {
  const cases = [
    ['release', 'services'],
    ['release', '--format', 'yaml', 'services'],
    ['release', 'services', '--format', 'json'],
  ];
  const outputs = cases.map((args) => {
    const result = spawnWorkloadCli(args);
    assert.equal(result.status, 0, `${args.join(' ')}: ${result.stderr}`);
    return result.stdout;
  });
  const legacyDocs = parseWorkloadDocuments(outputs[0]);
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

test('release CLI yaml/json with values override match legacy semantics', () => {
  const values = writeValuesFile('replicasByRole:\n  api: 2\n');
  try {
    const baseline = spawnWorkloadCli([
      'release',
      'edge',
      '--values',
      values.file,
    ]);
    assert.equal(baseline.status, 0, baseline.stderr);
    const legacyDocs = parseWorkloadDocuments(baseline.stdout);
    const yamlResult = spawnWorkloadCli([
      'release',
      '--format',
      'yaml',
      'edge',
      '--values',
      values.file,
    ]);
    assert.equal(yamlResult.status, 0, yamlResult.stderr);
    assert.ok(
      isDeepStrictEqual(
        parseYamlManifestDocuments(yamlResult.stdout),
        legacyDocs,
      ),
      'yaml with values should match legacy semantics',
    );

    const jsonResult = spawnWorkloadCli([
      'release',
      'edge',
      '--values',
      values.file,
      '--format',
      'json',
    ]);
    assert.equal(jsonResult.status, 0, jsonResult.stderr);
    assert.ok(
      isDeepStrictEqual(JSON.parse(jsonResult.stdout), legacyDocs),
      'json with values should match legacy semantics',
    );
  } finally {
    values.cleanup();
  }
});

test('release CLI prints manifest only', () => {
  const result = spawnWorkloadCli(['release', 'services']);
  assert.equal(result.status, 0, result.stderr);
  const docs = parseWorkloadDocuments(result.stdout);
  assert.ok(docs.every((doc) => doc.kind === 'Service'));
});

test('release CLI rejects unknown section', () => {
  const result = spawnWorkloadCli(['release', 'not-valid']);
  assert.notEqual(result.status, 0);
});

test('parseWorkloadDocuments rejects duplicates and unknown kinds', () => {
  const ok = parseWorkloadDocuments(
    '---\n# comment\n{"apiVersion":"v1","kind":"Namespace","metadata":{"name":"a"}}\n',
  );
  assert.equal(ok.length, 1);
  assert.throws(
    () =>
      parseWorkloadDocuments(
        '{"apiVersion":"v1","kind":"Namespace","metadata":{"name":"a"}}\n{"apiVersion":"v1","kind":"Namespace","metadata":{"name":"a"}}',
      ),
    /duplicate workload identity/,
  );
  assert.throws(
    () =>
      parseWorkloadDocuments(
        '{"apiVersion":"v1","kind":"ConfigMap","metadata":{"name":"a"}}',
      ),
    /unknown resource kind/,
  );
  assert.equal(
    documentIdentity({
      kind: 'Deployment',
      metadata: { namespace: 'ns', name: 'x' },
    }),
    'Deployment/ns/x',
  );
});

test('renderWorkloadDocuments does not invoke kubectl', () => {
  const calls = [];
  const fakeRun = (cmd, args, opts) => {
    calls.push([cmd, ...args].join(' '));
    return spawnSync(cmd, args, opts);
  };
  const { bindings } = deriveDevWorkloadBindings('dev-2', 3200);
  renderWorkloadDocuments(
    { profile: 'development', section: 'all', bindings },
    { run: fakeRun },
  );
  assert.equal(
    calls.some((line) => line.startsWith('kubectl')),
    false,
  );
  assert.ok(calls.some((line) => line.startsWith('helm template')));
});

test('release values override: custom resources and replicas succeed', () => {
  const values = writeValuesFile(`replicasByRole:
  api: 2
  executor: 3
resources:
  requests:
    cpu: 100m
    api:
      memory: 512Mi
  limits:
    api:
      memory: 768Mi
`);
  try {
    const docs = renderWorkloadDocuments({
      profile: 'release',
      section: 'all',
      valuesPath: values.file,
    });
    const api = docs.find(
      (doc) => doc.kind === 'Deployment' && doc.metadata.name === 'game-api',
    );
    const executor = docs.find(
      (doc) =>
        doc.kind === 'Deployment' && doc.metadata.name === 'game-executor',
    );
    assert.ok(api);
    assert.equal(api.spec.replicas, 2);
    assert.equal(
      api.spec.template.spec.containers[0].resources.requests.cpu,
      '100m',
    );
    assert.equal(
      api.spec.template.spec.containers[0].resources.requests.memory,
      '512Mi',
    );
    assert.equal(executor?.spec.replicas, 3);
  } finally {
    values.cleanup();
  }
});

test('release values override: invalid replica count refused', () => {
  const values = writeValuesFile('replicasByRole:\n  api: 0\n');
  try {
    assert.throws(
      () =>
        renderWorkloadDocuments({
          profile: 'release',
          section: 'edge',
          valuesPath: values.file,
        }),
      /invalid replica count/,
    );
  } finally {
    values.cleanup();
  }
});

test('release values override: forbidden keys refused', () => {
  for (const snippet of [
    'images:\n  web: evil:tag\n',
    'namespaces:\n  edge: evil-ns\n',
    'section: migration\n',
    'commands:\n  web: [echo, hi]\n',
    'workerCommands:\n  control: [echo, hi]\n',
  ]) {
    const values = writeValuesFile(snippet);
    try {
      assert.throws(
        () =>
          renderWorkloadDocuments({
            profile: 'release',
            section: 'all',
            valuesPath: values.file,
          }),
        /values override not permitted/,
      );
    } finally {
      values.cleanup();
    }
  }
});

test('release values override: secret and port changes refused', () => {
  const values = writeValuesFile(`resources:
  requests:
    cpu: 50m
release:
  dbSecret: evil-secret
`);
  const values2 = writeValuesFile(`catalog:
  httpPorts:
    api: 3999
`);
  try {
    assert.throws(
      () =>
        renderWorkloadDocuments({
          profile: 'release',
          section: 'edge',
          valuesPath: values.file,
        }),
      /values override not permitted: release/,
    );
    assert.throws(
      () =>
        renderWorkloadDocuments({
          profile: 'release',
          section: 'all',
          valuesPath: values2.file,
        }),
      /values override not permitted:/,
    );
  } finally {
    values.cleanup();
    values2.cleanup();
  }
});

test('development values override: resource override works', () => {
  const values = writeValuesFile(`resources:
  requests:
    cpu: 75m
    web:
      memory: 256Mi
`);
  try {
    const { bindings } = deriveDevWorkloadBindings('dev-1', 3100);
    const docs = renderWorkloadDocuments({
      profile: 'development',
      section: 'all',
      bindings,
      valuesPath: values.file,
    });
    const web = docs.find(
      (doc) => doc.kind === 'Deployment' && doc.metadata.name === 'game-web',
    );
    assert.ok(web);
    assert.equal(
      web.spec.template.spec.containers[0].resources.requests.cpu,
      '75m',
    );
    assert.equal(
      web.spec.template.spec.containers[0].resources.requests.memory,
      '256Mi',
    );
  } finally {
    values.cleanup();
  }
});

test('development values override: replicas 2 refused', () => {
  const values = writeValuesFile('replicas: 2\n');
  try {
    const { bindings } = deriveDevWorkloadBindings('dev-1', 3100);
    assert.throws(
      () =>
        renderWorkloadDocuments({
          profile: 'development',
          section: 'all',
          bindings,
          valuesPath: values.file,
        }),
      /development requires replicas=1/,
    );
  } finally {
    values.cleanup();
  }
});

test('release CLI accepts --values path', () => {
  const values = writeValuesFile('replicasByRole:\n  api: 2\n');
  try {
    const result = spawnWorkloadCli([
      'release',
      'edge',
      '--values',
      values.file,
    ]);
    assert.equal(result.status, 0, result.stderr);
    const api = parseWorkloadDocuments(result.stdout).find(
      (doc) => doc.kind === 'Deployment' && doc.metadata.name === 'game-api',
    );
    assert.equal(api?.spec.replicas, 2);
    assert.doesNotMatch(result.stderr, /replicasByRole|memory:|cpu:/);
  } finally {
    values.cleanup();
  }
});
